import BigTextFonts from './bigtextfonts.mjs'
import BigTextFiglet from './bigtextfiglet.mjs'
import FigletPrint from '../lib/print-figlet.mjs'
import FontsPrint from '../lib/print-fonts.mjs'

const BigBlessed = { BigTextFonts,  BigTextFiglet}
const LargePrint = {FontsPrint, FigletPrint}

export {BigBlessed, LargePrint}
export default BigBlessed