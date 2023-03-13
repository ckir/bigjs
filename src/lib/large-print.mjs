import os from 'node:os'
import fs from 'node:fs'
import { URL, fileURLToPath } from 'node:url'
import path from 'node:path'
const __dirname = fileURLToPath(new URL('.', import.meta.url))

import { createCanvas } from 'canvas'
import opentype from 'opentype.js'


class LargePrint {

    static #_defaultFontsFolderPath = path.resolve(__dirname + path.join('..', 'assets', 'fonts', 'regular'))
    static #_loadedFonts = {}
    static #_canvas = createCanvas(1920, 100)
    static #_ctx = LargePrint.#_canvas.getContext('2d')

    static #_loadFont(fontRealpath) {
        if (!LargePrint.#_loadedFonts[fontRealpath]) LargePrint.#_loadedFonts[fontRealpath] = opentype.loadSync(fontRealpath)
        if (!LargePrint.#_loadedFonts[fontRealpath].supported) {
            throw new ValueError(`${fontRealpath}: Font not supported`)
        }
        return LargePrint.#_loadedFonts[fontRealpath]
    }

    static _drawLine(fontRealpath, fontSize, text) {

        const applyStyles = () => {
            LargePrint.#_ctx.patternQuality = 'best' // 'fast'|'good'|'best'|'nearest'|'bilinear'
            LargePrint.#_ctx.quality = 'best'        // 'fast'|'good'|'best'|'nearest'|'bilinear'
            LargePrint.#_ctx.antialias = 'gray'      // 'default'|'none'|'gray'|'subpixel'
        }

        const toBitmapString = (canvas, ch = '#', removeEmptyLines = true, trim = true) => { // "█"
            const imageData = Array.from(canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data)
            let rows = []
            do {
                let rowImageData = imageData.splice(0, canvas.width * 4)
                let rowBinary = ''
                do {
                    let pixel = rowImageData.splice(0, 4)
                    rowBinary = rowBinary + (pixel.reduce((partial_sum, a) => partial_sum + a, 0) ? ch : ' ')
                } while (rowImageData.length != 0)
                rows.push(rowBinary)
            } while (imageData.length != 0)
            if (removeEmptyLines) rows = rows.filter(entry => /\S/.test(entry))
            if (trim) {
                rows = rows.map((row) => { return row.trimEnd() })
                let longest = rows.reduce((a, b) => a.length > b.length ? a : b, '').length
                rows = rows.map((row) => { return row.padEnd(longest, ' ') })
            }
            return rows.join(os.EOL)
        }

        const font = LargePrint.#_loadFont(fontRealpath)
        LargePrint.#_ctx.clearRect(0, 0, LargePrint.#_ctx.canvas.width, LargePrint.#_ctx.canvas.height)
        applyStyles()
        const path = font.getPath(text, 0, 60, fontSize)
        font.draw(LargePrint.#_ctx, text, 0, 60, fontSize)
        const lines = toBitmapString(LargePrint.#_canvas)
        // console.log(fontRealpath, lines.split(os.EOL).length)
        // console.log(lines)
        return lines

    }

    static print(text, maxOutputWidth, maxOutputHeight, style = {}) {

        const defaults = {
            fontFile: path.join(LargePrint.#_defaultFontsFolderPath, 'Acme 9 Regular Xtnd.ttf'),
            wordWrap: 'none', // 'none' | 'word' | 'letter',
            textAlign: 'left' // 'left' | 'center' | 'right
        }
        style = { ...defaults, ...style }

        let rows = []

        const calculateFontSize = (text, fontRealpath, maxOutputHeight) => {

            // Converts returns in spaces, removes double spaces
            text = text.replace(/(\r\n|\n|\r)/gm, ' ').replace(/\s+/g, ' ')
            let fontSize = maxOutputHeight + 1
            let outputHeight = 0
            let lines = ''
            do {
                fontSize--
                lines = LargePrint._drawLine(fontRealpath, fontSize, text)
                outputHeight = lines.split(os.EOL).length
            } while (outputHeight >= maxOutputHeight)
            return { fontSize: fontSize, lines: lines }

        }

        const splitCharacters = (text, font, fontSize, maxOutputWidth) => {

            const characters = text.split('')
            const rows = []
            let row = ''
            do {
                let character = characters.splice(0, 1)
                if (character == '\n') {
                    rows.push(row)
                    row = ''
                    continue
                }
                row = row + character
                let lineWidth = font.getAdvanceWidth(row, fontSize) // This corresponds to canvas2dContext.measureText(text).width
                if (lineWidth < maxOutputWidth) continue
                row = row.slice(0, -1)
                rows.push(row)
                row = character

            } while (characters.length != 0)

            rows.push(row)
            return rows

        }

        const formatLines = (rows, style, maxOutputWidth) => {

            rows.forEach((row, index) => {
                lines = row.split(os.EOL)
                const longest = lines.reduce((a, b) => a.length > b.length ? a : b, '').length
                // Apply style
                if (style.textAlign == 'center') {
                    lines = lines.map(line => { return ' '.repeat((maxOutputWidth - longest) / 2) + line })
                    rows[index] = lines.join(os.EOL)
                }
                if (style.textAlign == 'right') {
                    lines = lines.map(line => { return line.padStart(maxOutputWidth) })
                    rows[index] = lines.join(os.EOL)
                }
            })

            return rows
        }

        const splitWords = (text, font, fontSize, maxOutputWidth) => {

            const separateLines = text.split(/\r?\n|\r|\n/g)
            let totalLines = []

            separateLines.forEach((line) => {
                let rows = []
                let row = ''
                let rowWidth = 0
                // Converts returns in spaces, removes double spaces and split by spaces
                const words = line.replace(/(\r\n|\n|\r)/gm, ' ').replace(/\s+/g, ' ').split(' ')
                do {
                    let word = words.splice(0, 1)[0]
                    let wordWidth = font.getAdvanceWidth(word, fontSize)
                    // Is this word alone is too long
                    if (wordWidth > maxOutputWidth) {
                        if (row.length != 0) row = row + ' '                     
                        let characters = word.split('')
                        do {
                            let character = characters.splice(0, 1)
                            rowWidth = font.getAdvanceWidth((row + character).trim(), fontSize)
                            if (rowWidth < maxOutputWidth) {
                                row = (row + character)
                                continue
                            }
                            rows.push(row)
                            row = character
                        } while (characters.length != 0)
                        continue
                    }
                    rowWidth = font.getAdvanceWidth(row + ' ' + word, fontSize)
                    if (rowWidth < maxOutputWidth) {
                        row = (row + ' ' + word).trim()
                        continue
                    }
                    rows.push(row)
                    row = word

                } while (words.length != 0)
                rows.push(row)
                totalLines = totalLines.concat(rows)
            })

            return totalLines

        }

        const font = LargePrint.#_loadFont(style.fontFile)
        let { fontSize, lines } = calculateFontSize(text, style.fontFile, maxOutputHeight)

        if (style.wordWrap == 'none') {
            lines = lines.split(os.EOL)
            const longest = lines.reduce((a, b) => a.length > b.length ? a : b, '').length
            // Truncate output if longer than maxOutputWidth
            if (longest > maxOutputWidth) {
                lines = lines.map(line => { return line.substring(0, maxOutputWidth) })
            }
            lines = formatLines([lines.join(os.EOL)], style, maxOutputWidth)
            return lines
        }

        if (style.wordWrap == 'letter') {
            rows = splitCharacters(text, font, fontSize, maxOutputWidth)
            rows = rows.map((row) => { return LargePrint._drawLine(style.fontFile, fontSize, row) })
            rows = formatLines(rows, style, maxOutputWidth)
            return rows
        }

        if (style.wordWrap == 'word') {
            rows = splitWords(text, font, fontSize, maxOutputWidth)
            rows = rows.map((row) => { return LargePrint._drawLine(style.fontFile, fontSize, row) })
            rows = formatLines(rows, style, maxOutputWidth)
            return rows
        }
    }

    static printFontSamples(text, fontsFolderPath = LargePrint.#_defaultFontsFolderPath, fontSize = 8, maxOutputWidth = process.stdout.columns) {

        fontsFolderPath = path.resolve(fontsFolderPath)

        const files = fs.readdirSync(fontsFolderPath).sort((a, b) => a.localeCompare(b, undefined, {sensitivity: 'base'}))
        files.forEach(fontFile => {
            if ((!fontFile.toLowerCase().endsWith('.ttf')) && (!fontFile.toLowerCase().endsWith('.otf'))) return
            const fontRealpath = path.join(fontsFolderPath, fontFile)
            let lines = LargePrint._drawLine(fontRealpath, fontSize, text).split(os.EOL)
            console.log(`Font: [${fontFile}] - Font size: [${fontSize}] - Output Height: [${lines.length}]`)
            lines = lines.map(line => { return line.substring(0, maxOutputWidth) })
            console.log(lines.join(os.EOL))
            console.log('\n')
        })

    }

}

export default LargePrint

// LargePrint.printFontSamples('Hello world SjqWM', '/home/user/blessed-bigtext/src/assets/fonts/regular', 12)
// const style = {
//     // fontFile: '/home/user/blessed-bigtext/src/assets/fonts/regular/PixelOperatorMonoHB8.ttf',
//     wordWrap: 'word', // 'none' | 'word' | 'letter',
//     textAlign: 'center' // 'left' | 'center' | 'right
// }
// // const output = ConsolePrintBase.print('Ελληνικά\nThe quick brown fox jumps over the lazy dog', 211, 14, style)
// const output = LargePrint.print('Hello ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 World Ελληνικά\nThe quick brown fox jumps over the lazy dog', 211, 14, style)
// output.forEach((line) => console.log(line, '\n'))