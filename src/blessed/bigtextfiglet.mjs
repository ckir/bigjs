'use strict';
import os from 'node:os'
import blessed from '@blessed/neo-blessed'
var Node = blessed.Node
var Box = blessed.Box

import FigletPrint from '../lib/print-figlet.mjs'

function BigTextFiglet(options) {

    var self = this;

    if (!(this instanceof Node)) {
        return new BigTextFiglet(options);
    }

    this.defaults = {
        width: 'shrink',
        height: 'shrink',
        // align: 'center',
        valign: 'middle',
        content: ' ',
        tags: true,
        border: {
            type: 'line'
        },
        style: {
            fg: 'white',
            bg: 'black',
            fontName: 'ANSI_Regular',
            wordWrap: 'letter', // 'none' | 'word' | 'letter',
            textAlign: 'left', // 'left' | 'center' | 'right
        }
    }

    options = options || {};
    this.options = { ...this.defaults, ...options };
    // this.options.style.align = this.options.textAlign
    Box.call(this, this.options);

    this.on('attach', function () {
        self.calcSize();
    });

}

BigTextFiglet.prototype.__proto__ = Box.prototype;

BigTextFiglet.prototype.type = 'bigtextfiglet';

BigTextFiglet.prototype.calcSize = function () {
    this.canvasSize = { width: this.width * 2 - 12, height: this.height * 4 };
};

BigTextFiglet.prototype.setContent = function (content) {
    this.content = '';
    this.text = content || '';
};

BigTextFiglet.prototype.render = function () {
    const currentBoxHeight = this.height - 1
    const currentBoxWidth = this.width - 2
    const currentFontInfo = FigletPrint.getFontInfo()
    const currentFontHeight = currentFontInfo.height
    // Box too small to draw
    if ((currentBoxHeight < currentFontHeight) || (currentBoxWidth < (this.text.length * 6))) {
        if (this.style.textAlign == 'center') {
            this.align = 'center'
        }
        this.content = this.text // `${currentBoxWidth}x${currentBoxHeight}`
        return this._render();       
    }
    
    this.align = 'left'
    let lines = FigletPrint.print(this.text, this.width, this.options.style)
    let linesArray = lines[0].split(os.EOL)

    let longest = linesArray.reduce((a, b) => a.length > b.length ? a : b, '');
    if (longest.length > (this.width - 2)) {
        this.content = this.text
        return this._render();
    }
    linesArray = linesArray.map((line) => { return line.padEnd(longest)})
    this.content = linesArray.join(os.EOL);
    return this._render();
};


export default BigTextFiglet;
