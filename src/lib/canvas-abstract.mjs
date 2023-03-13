import os from 'node:os'
import fs from 'node:fs'
import { URL, fileURLToPath } from 'node:url'
import path from 'node:path'
const __dirname = fileURLToPath(new URL('.', import.meta.url))

import { registerFont, createCanvas } from 'canvas'
import opentype from 'opentype.js'
import { PNG } from 'pngjs'

import { NiceTable } from './util.mjs'

/**
 * Registers non-system fonts and creates node-cambas canvases
 * 
 */
class CreateCanvas {

    /**
     * Default fonts folder
     * 
     * @private
     * @static
     * @type {string}
     */
    static #_defaultFontsFolderPath = path.resolve(__dirname + path.join('..', 'assets', 'fonts', 'regular'))

    /**
     * Holds parced font files info
     * 
     * @private
     * @static
     * @typedef {#_parcedFontFolders} 
     */
    static #_parcedFontFolders = {}

    /**
     * Parse font files in the given folder
     * and declares them for use in canvas
     * 
     * @private
     * @static
     * @param {string} fontsFolderPath 
     */
    static #_parseFolder(fontsFolderPath) {

        fontsFolderPath = path.resolve(fontsFolderPath)
        if (CreateCanvas.#_parcedFontFolders[fontsFolderPath]) return CreateCanvas.#_parcedFontFolders[fontsFolderPath]
        // console.log(`Parsing ${fontsFolderPath}`)

        const parsedFonts = {}
        fs.readdirSync(fontsFolderPath).forEach(fontFile => {
            if ((!fontFile.toLowerCase().endsWith('.ttf')) && (!fontFile.toLowerCase().endsWith('.otf'))) return
            const fontRealpath = path.join(fontsFolderPath, fontFile)
            const font = opentype.loadSync(fontRealpath)
            if (!font.supported) return
            let fontFamily = font.names.fontFamily.en
            if (font.names.fontSubfamily.en != 'Regular') {
                fontFamily = fontFamily + '_' + font.names.fontSubfamily.en
            }
            registerFont(fontRealpath, { family: fontFamily, style: font.names.fontSubfamily.en })

            parsedFonts[fontRealpath] = font
        })
        return parsedFonts

    }

    static {
        // Load default fonts
        CreateCanvas.#_parcedFontFolders[CreateCanvas.#_defaultFontsFolderPath] = CreateCanvas.#_parseFolder(CreateCanvas.#_defaultFontsFolderPath)
    }

    /**
     * Rasterize canvas and returns pixels lines
     * 
     * @public
     * @param {object} canvas - The canvas object to convert
     * @param {string} ch - The character to use for rendering
     * @param {boolean} removeEmptyLines - Remove empty lines from output
     * @returns {string}
     */
    static toBitmapString = (canvas, ch = '#', removeEmptyLines = false) => {

        const buf = canvas.toBuffer()
        const png = PNG.sync.read(buf)
        const pixels = Array.from(png.data)

        let rows = []
        while (pixels.length != 0) {
            let row = pixels.splice(0, png.width * 4)
            var rowBinary = ''
            while (row.length != 0) {
                let pixel = row.splice(0, 4)
                rowBinary = rowBinary + (255 - pixel.reduce((partial_sum, a) => partial_sum + a, 0) ? '1' : '0')
            }
            if (rowBinary.split('').reduce((partial_sum, a) => partial_sum + a, 0) != 0) {
                rows.push(rowBinary.replace(/0/g, ' ').replace(/1/g, ch).trimEnd())
            }
        }
        rows.push(rowBinary.replace(/0/g, ' ').replace(/1/g, ch).trimEnd())
        if (removeEmptyLines) rows = rows.filter(entry => /\S/.test(entry))
        return rows.join(os.EOL)

    }

    /**
     * Get font families and other info of the registered fonts
     * 
     * @public
     * @static
     * @returns {Map}
     */
    static getFontFamilies() {
        const families = {}
        for (const [fontsFolderPath, fontsFolderFonts] of Object.entries(CreateCanvas.#_parcedFontFolders)) {
            for (const [fontRealpath, font] of Object.entries(fontsFolderFonts)) {
                let fontFamily = font.names.fontFamily.en
                if (font.names.fontSubfamily.en != 'Regular') {
                    fontFamily = fontFamily + '_' + font.names.fontSubfamily.en
                }
                // console.log(fontFamily)
                families[fontFamily] = { fontsFolderPath: fontsFolderPath, fontRealpath: fontRealpath, opentype: font }
            }
        }
        const ordered = new Map()
        Object.keys(families).sort().forEach(function (key) {
            ordered.set(key, families[key])
        })
        return ordered

    }

    /**
     * Parse font files in the given folder
     * and declares them for use in canvas
     * 
     * @public
     * @static
     * @param {string} fontsFolderPath 
     */
    static addFontsFolder(fontsFolderPath) {

        fontsFolderPath = path.resolve(fontsFolderPath)
        const fonts = CreateCanvas.#_parseFolder(fontsFolderPath)
        CreateCanvas.#_parcedFontFolders[fontsFolderPath] = fonts

    }

    /**
     * Create and return a node-canvas Canvas object
     * 
     * @public
     * @param  {...any} args 
     * @returns {object} Canvas
     */
    static getCanvas(...args) {

        const canvas = createCanvas(...args)
        Object.defineProperty(canvas, 'fonts', { value: CreateCanvas.getFontFamilies(), writable: false })
        Object.defineProperty(canvas, 'toBitmapString', { value: CreateCanvas.toBitmapString, writable: false })
        Object.defineProperty(canvas, 'calculateFontOffset', { value: CreateCanvas.calculateFontOffset, writable: false })
        Object.defineProperty(canvas, 'printFontSamples', { value: CreateCanvas.printFontSamples, writable: false })
        return canvas

    }

    /**
     * Calculates the difference between requested font size
     * and actual output lines
     * 
     * @public
     * @static
     * @param {string} fontFamily
     * @param {number} fontSize
     * @param {string} text
     * @returns {object}
     */  
    static calculateFontOffset(fontFamily, fontSize, text = 'Hello World') {

        const applyStyles = (ctx) => {
            ctx.patternQuality = 'best'
            ctx.quality = 'best'
            ctx.antialias = 'gray'
            ctx.font = `${fontSize}px "${fontFamily}"`
            ctx.textAlign = 'left'
            ctx.textBaseline = 'bottom'
        }

        // const text = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        const canvas = CreateCanvas.getCanvas()
        const ctx = canvas.getContext('2d', { pixelFormat: 'A1' })
        applyStyles(ctx)
        const width = ctx.measureText(text).width * 2
        const height = fontSize * 5
        const y = Math.round((height * 3) / 4)
        canvas.width = width
        canvas.height = height
        applyStyles(ctx) // After changing the canvas dimensions the styles get reset
        ctx.fillText(text, 2, y)
        let lines = CreateCanvas.toBitmapString(canvas).split(os.EOL)
        // Remove any empty lines
        lines = lines.filter(entry => /\S/.test(entry))
        // console.log(lines.map(line => { return line.substring(1, 180) }).join(os.EOL))
        const offset = fontSize - lines.length
        return {fontFamily:fontFamily, fontSize:fontSize, outputHeight: lines.length, offset: offset, lines: lines }

    }

    /**
     * Prints samples of registered fonts
     * in various sizes
     * 
     * @public
     * @static
     * @param {number} fromFontSize
     * @param {number} toFontSize
     * @param {string} text
     */    
    static printFontSamples(fromFontSize = 8, toFontSize = 14, text = 'Hello World') {

        const table = new NiceTable()
        table.setTitles('Font Family', 'Font Type', 'Font File', 'Font Size', 'Output Height', 'Offset')
        const fonts = CreateCanvas.getFontFamilies()
        for (let fontFamily of fonts.keys()) {
            let font = fonts.get(fontFamily)
            for (let fontSize = fromFontSize; fontSize < toFontSize; fontSize++) {
                console.log('Font file:', font.fontRealpath)
                let info = CreateCanvas.calculateFontOffset(fontFamily, fontSize, text)
                console.log(`fontFamily: [${fontFamily}], fontSize: [${fontSize}], outputHeight:[${info.lines.length}] fontOffset: [${info.offset}]`)
                console.log(info.lines)
                table.addRow(fontFamily, font.opentype.names.fontSubfamily.en, path.basename(font.fontRealpath), fontSize, info.lines.length, info.offset)
            }
        }

        console.log(`\nSUMMARY`)
        table.print()

    }

}

export default CreateCanvas
// const cnv = new CreateCanvas()
// cnv.addFontsFolder('/home/user/blessed-bigtext/src/assets/fonts/bad')
// const cnv2 = new CreateCanvas()
// cnv2.addFontsFolder('/home/user/blessed-bigtext/src/assets/fonts/bad')
// .addFontsFolder('/home/user/blessed-bigtext/src/assets/fonts/bad')

// console.log(CreateCanvas.calculateFontOffset('Pixeland', 8))
// CreateCanvas.printFontSamples()

