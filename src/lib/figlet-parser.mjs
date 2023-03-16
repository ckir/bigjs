
/*
    All FIGlet fonts must contain chars 32-126, 196, 214, 220, 228, 246, 252, 223

The FIGfont Version 2 FIGfont and FIGdriver Standard (http://www.jave.de/docs/figfont.txt)
The FIGfont Version 2 FIGfont and FIGdriver Standard (http://www.jave.de/figlet/figfont.html)

THE HEADER LINE

The header line gives information about the FIGfont.  Here is an example
showing the names of all parameters:

          flf2a$ 6 5 20 15 3 0 143 229    NOTE: The first five characters in
            |  | | | |  |  | |  |   |     the entire file must be "flf2a".
           /  /  | | |  |  | |  |   \
  Signature  /  /  | |  |  | |   \   Codetag_Count
    Hardblank  /  /  |  |  |  \   Full_Layout*
         Height  /   |  |   \  Print_Direction
         Baseline   /    \   Comment_Lines
          Max_Length      Old_Layout*

  * The two layout parameters are closely related and fairly complex.
      (See "INTERPRETATION OF LAYOUT PARAMETERS".)

*/

import os from 'node:os'
import fs from 'node:fs'
import { URL, fileURLToPath } from 'node:url'
import path from 'node:path'
const __dirname = fileURLToPath(new URL('.', import.meta.url))


class Figlet {

    constructor(fontFoldersPath = null, defaultFont = null) {
        this.fonts = new Map();
        if (fontFoldersPath && (! defaultFont)) throw new ValueError('If you set fontFoldersPath you must set defaultFont as well');
        this.fontsFolderPath = fontFoldersPath || path.resolve(__dirname + path.join('..', 'assets', 'fonts', 'figlet'));
        this.font = defaultFont || 'ANSI_Regular';
        this.parseFont(this.font);
    }

    getFontNames() {
        let files = fs.readdirSync(this.fontsFolderPath).sort((a, b) => a.localeCompare(b, undefined, {sensitivity: 'base'}));
        files = files.map((filename) => { return path.parse(filename).name});
        return files;
    }

    getFontInfo() {
        return this.fonts.get(this.font);
    }

    setFont(name) {
        this.font = name;
        this.parseFont(this.font);
    }

    parseFont(name) {
        if (this.fonts.has(name)) return;
        return this._parseFont(name, this.loadFont(name));
    }

    loadFont(name) {
        return fs.readFileSync(path.join(this.fontsFolderPath, name + ".flf"), "utf-8");
    }

    loadFonts() {
        let files = fs.readdirSync(this.fontsFolderPath);
        for (const file of files) {
            if (file.endsWith('.flf')) {
                let name = file.slice(0, file.length - 4);
                this.parseFont(name);
            }
        }
        return;
    }

    _parseFont(name, defn) {
        let lines = defn.split("\n"),
            header = lines[0].split(" "),
            hardblank = header[0].charAt(header[0].length - 1),
            height = +header[1],
            comments = +header[5];

        this.fonts.set(name, {
            defn: lines.slice(comments + 1),
            hardblank: hardblank,
            height: height,
            char: {}
        });
        return;
    }

    parseChar(char, font) {
        let fontDefn = this.fonts.get(font);

        if (char in fontDefn.char) {
            return fontDefn.char[char];
        }

        let height = fontDefn.height,
            start = (char - 32) * height,
            charDefn = [],
            i;

        for (i = 0; i < height; i++) {
            charDefn[i] = fontDefn.defn[start + i]
                .replace(/@/g, "")
                .replace(RegExp("\\" + fontDefn.hardblank, "g"), " ");
        }
        fontDefn.char[char] = charDefn
        this.fonts.set(font, fontDefn);
        return charDefn;
    }

    write(str, font = null, removeEmptyLines = true, trim = true) {
        if (font) this.parseFont(font)
        if (!font) font = this.font;
        let chars = [],
            result = "",
            len, i, height;
        for (i = 0, len = str.length; i < len; i++) {
            chars[i] = this.parseChar(str.charCodeAt(i), font);
        }
        for (i = 0, height = chars[0].length; i < height; i++) {
            for (var j = 0; j < len; j++) {
                result += chars[j][i];
            }
            result += os.EOL;
        }
        let rows = result.split(os.EOL);
        if (removeEmptyLines) rows = rows.filter(entry => /\S/.test(entry));
        if (trim) {
            rows = rows.map((row) => { return row.trimEnd() });
            let longest = rows.reduce((a, b) => a.length > b.length ? a : b, '').length;
            rows = rows.map((row) => { return row.padEnd(longest, ' ') });
        }
        return rows.join(os.EOL);
    }
};

export default Figlet
