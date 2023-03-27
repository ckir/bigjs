

import os from 'node:os'
import fs from 'node:fs'
import { URL, fileURLToPath } from 'node:url'
import path from 'node:path'
const __dirname = fileURLToPath(new URL('.', import.meta.url))

import Figlet from './figlet-parser.mjs'

class FigletPrint {

    static #_defaultFontsFolderPath = path.resolve(__dirname + path.join('..', 'assets', 'fonts', 'figlet'))
    static #_figlet = new Figlet(FigletPrint.#_defaultFontsFolderPath, 'ANSI_Regular')

    static getFontNames() {

        return FigletPrint.#_figlet.getFontNames()

    }

    static getFontInfo() {

        return FigletPrint.#_figlet.getFontInfo()
        
    }

    static #_drawLine(text, font, removeEmptyLines = true, trim = true) {

        let lines = FigletPrint.#_figlet.write(text, font, removeEmptyLines, trim)
        return lines

    }

    static print(text, maxOutputWidth, style = {}) {

        const defaults = {
            fontName: 'ANSI Regular',
            wordWrap: 'letter', // 'none' | 'word' | 'letter',
            textAlign: 'left', // 'left' | 'center' | 'right
        }
        style = { ...defaults, ...style }

        let rows = []

        const formatLines = (rows, style, maxOutputWidth) => {

            rows.forEach((row, index) => {
                let lines = row.split(os.EOL)
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

        const splitCharacters = (text, fontName, maxOutputWidth) => {

            const characters = text.split('')
            const rows = []
            let row = ''
            do {
                let character = characters.splice(0, 1)[0]
                if (character == '\n') {
                    rows.push(row)
                    row = ''
                    continue
                }
                row = row + character
                let output = FigletPrint.#_drawLine(row, fontName).split(os.EOL)
                let lineWidth = output.reduce((a, b) => a.length > b.length ? a : b, '').length
                if (lineWidth < maxOutputWidth) continue
                row = row.slice(0, -1)
                rows.push(row)
                row = character

            } while (characters.length != 0)

            rows.push(row)
            return rows

        }

        const splitWords = (text, fontName, maxOutputWidth) => {

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
                    let output = FigletPrint.#_drawLine(word, fontName).split(os.EOL)
                    let wordWidth = output.reduce((a, b) => a.length > b.length ? a : b, '').length
                    // Is this word alone is too long
                    if (wordWidth > maxOutputWidth) {
                        if (row.length != 0) row = row + ' '
                        let characters = word.split('')
                        do {
                            let character = characters.splice(0, 1)
                            output = FigletPrint.#_drawLine((row + character).trim(), fontName).split(os.EOL).length
                            rowWidth = output.reduce((a, b) => a.length > b.length ? a : b, '').length
                            if (rowWidth < maxOutputWidth) {
                                row = (row + character)
                                continue
                            }
                            rows.push(row)
                            row = character
                        } while (characters.length != 0)
                        continue
                    }
                    output = FigletPrint.#_drawLine(row + ' ' + word, fontName).split(os.EOL)
                    rowWidth = output.reduce((a, b) => a.length > b.length ? a : b, '').length
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

        if (style.wordWrap == 'none') {
            let lines = null
            // Convert returns to spaces and remove double spaces
            rows = FigletPrint.#_drawLine(text.replace(/(\r\n|\n|\r)/gm, ' ').replace(/\s+/g, ' '), style.fontName)
            // Truncate output if longer than maxOutputWidth
            lines = rows.split(os.EOL)
            const longest = lines.reduce((a, b) => a.length > b.length ? a : b, '').length
            if (longest > maxOutputWidth) {
                lines = lines.map(line => { return line.substring(0, maxOutputWidth) })
            }
            lines = formatLines([lines.join(os.EOL)], style, maxOutputWidth)
            return lines
        }

        if (style.wordWrap == 'letter') {
            rows = splitCharacters(text, style.fontName, maxOutputWidth)
            rows = rows.map((row) => { return FigletPrint.#_drawLine(row, style.fontName) })
            rows = formatLines(rows, style, maxOutputWidth)
            return rows
        }

        if (style.wordWrap == 'word') {
            rows = splitWords(text, style.fontName, maxOutputWidth)
            rows = rows.map((row) => { return FigletPrint.#_drawLine(row, style.fontName) })
            rows = formatLines(rows, style, maxOutputWidth)
            return rows
        }

    }

    static printFontSamples(text, fontsFolderPath = FigletPrint.#_defaultFontsFolderPath, maxOutputWidth = process.stdout.columns) {

        fontsFolderPath = path.resolve(fontsFolderPath)

        const files = fs.readdirSync(fontsFolderPath).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
        files.forEach(fontFile => {
            if (!fontFile.toLowerCase().endsWith('.flf')) return
            const fontRealpath = path.join(fontsFolderPath, fontFile)
            const font = path.parse(fontRealpath).name
            let lines = FigletPrint.#_drawLine(text, font).split(os.EOL)
            console.log(`Font: [${fontRealpath}] - Output Height: [${lines.length}]`)
            lines = lines.map(line => { return line.substring(0, maxOutputWidth) })
            console.log(lines.join(os.EOL))
            console.log('\n')
        })

    }
}

export { FigletPrint }
export default FigletPrint

// const fonts = FigletPrint.getFontNames()
// const wordWraps = ['none', 'word', 'letter']
// const textAligns = ['left', 'center', 'right']

// wordWraps.forEach((wordWrap) => {
//     textAligns.forEach((textAlign) => {
//         const style = {
//             fontName: 'ANSI_Regular',
//             wordWrap: wordWrap, // 'none' | 'word' | 'letter',
//             textAlign: textAlign, // 'left' | 'center' | 'right
//         }
//         console.log(`textScale: [wordWrap: [${wordWrap}] - textAlign: [${textAlign}]`)
//         let output = FigletPrint.print('The quick brown fox jumps over the lazy dog.', 211, style)
//         output.forEach((line) => console.log(line, '\n'))
//     })
// })
