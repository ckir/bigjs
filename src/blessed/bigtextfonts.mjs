'use strict';
import os from 'node:os'
import blessed from '@blessed/neo-blessed'
var Node = blessed.Node
var Box = blessed.Box

// import Print from './canvas-print.mjs';
import FontsPrint from '../lib/print-fonts.mjs'

function BigTextFonts(options) {

    var self = this;

    if (!(this instanceof Node)) {
        return new BigTextFonts(options);
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
            fontFamily: 'Grixel Acme 9 Regular',
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
        // self.calcSize();
        const style = this.style
        if (style.fontSize == 'auto') {
            style.fontSize = this.height - 2
        }
        if (style.wordWrap === true) {
            style.wordWrap = this.width - 2
        }

    });

}

BigTextFonts.prototype.__proto__ = Box.prototype;

BigTextFonts.prototype.type = 'bigtextfonts';

// BigTextFonts.prototype.calcSize = function () {
//     this.canvasSize = { width: this.width * 2 - 12, height: this.height * 4 };
// };

BigTextFonts.prototype.setContent = function (content) {
    this.content = '';
    this.text = content || '';
    this.screen.render()
};

BigTextFonts.prototype.render = function () {
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
    if ((this.height) > 10 && (this.text.length > 0) ) {
        this.content = FontsPrint.print(this.text, this.width - 2, this.height + 2)[0]
    } else {
        this.content = this.text
    }
    
    return this._render();
};


export default BigTextFonts;
