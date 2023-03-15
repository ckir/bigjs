'use strict';
import os from 'node:os'
import blessed from '@blessed/neo-blessed'
var Node = blessed.Node
var Box = blessed.Box



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
        content: 'Hello world!',
        tags: true,
        border: {
            type: 'line'
        },
        style: {
            fg: 'white',
            bg: 'black',
            fontFamily: 'ANSI_Regular.flf',
            fontStyle: 'normal',
            fontWeight: 'normal',
            fontVariant: 'normal',
            fontSize: 'auto',
            textAlign: 'left',
            textBaseline: 'bottom',
            textColor: 'black',
            wordWrap: false
        }
    }

    options = options || {};
    this.options = { ...this.defaults, ...options };
    // this.options.style.align = this.options.textAlign
    Box.call(this, this.options);

    this.on('attach', function () {
        self.calcSize();
        const style = this.style
        if (style.fontSize == 'auto') {
            style.fontSize = this.height - 2
        }
        if (style.wordWrap === true) {
            style.wordWrap = this.width - 2
        }
        this._canvas = new Print(this.text, style, 1)

    });

}

BigTextFiglet.prototype.__proto__ = Box.prototype;

BigTextFiglet.prototype.type = 'bigtextfonts';

BigTextFiglet.prototype.calcSize = function () {
    this.canvasSize = { width: this.width * 2 - 12, height: this.height * 4 };
};

BigTextFiglet.prototype.setContent = function (content) {
    this.content = '';
    this.text = content || '';
    if (this._canvas) {
        this._canvas._text = content;
    }
};

BigTextFiglet.prototype.render = function () {
    const currentBoxHeight = this.height - 1
    const currentBoxWidth = this.width - 2
    // Box too small to draw
    if ((currentBoxHeight < 8) || (currentBoxWidth < (this.text.length * 6))) {
        if (this.style.textAlign == 'center') {
            this.align = 'center'
        }
        this.content = this.text // `${currentBoxWidth}x${currentBoxHeight}`
        return this._render();       
    }
    
    this.align = 'left'
    this._canvas._canvas.width = this.width - 2
    this._canvas._canvas.height = this.height
    let lines = this._canvas.print()
    let linesArray = lines.split(os.EOL)

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
