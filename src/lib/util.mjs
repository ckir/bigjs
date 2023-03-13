// From https://github.com/paul1278/nicetables
class NiceTable {
    /**
     * Initializes the new table.
     */
    constructor() {
        this.cols = -1;
        this.rows = [];
        this.dimensions = [];
        this.colWidths = [];
        this.titles = [];
        this.linesPerRow = 2;
        this.fixedWidth = -1;
        this.outputWriter = (str) => process.stdout.write(str);
    }

    /**
     * Set the lines per row, after those lines the output will be trimmed.
     * @param {number} i must be a positive integer.
     * @returns {NiceTable} instance.
     */
    setLinesPerRow(i) {
        if (!Number.isInteger(i)) {
            throw new Error("LinesPerRow must be a positive integer");
        }
        if (i < 1) {
            throw new Error("LinesPerRow must be a positive integer");
        }
        this.linesPerRow = i;
        return this;
    }

    /**
     * Function to initialize all values of the table.
     */
    autoCalc() {
        this.cols = Math.max(...this.rows.map((r) => r.length));
        if (this.titles.length == 0) {
            this.titles = new Array(this.cols).fill("Col");
        } else if (this.titles.length < this.cols) {
            this.titles = [
                ...this.titles,
                ...new Array(this.cols - this.titles.length).fill("Col"),
            ];
        }
        if (this.dimensions.length == 0) {
            this.dimensions = new Array(this.cols).fill(1 / this.cols);
        } else if (this.dimensions.length < this.cols) {
            let left = 1 - this.dimensions.reduce((a, b) => a + b);
            this.dimensions = [
                ...this.dimensions,
                ...new Array(this.cols - this.dimensions.length).fill(
                    left / (this.cols - this.dimensions.length)
                ),
            ];
        }
        this.calculateColWidths();
    }

    /**
     * Set the percentual dimensions of the table.
     * If this function is never called, each column will have equal width.
     * @param {...number} dimensions Percent (0.0-1.0). Must be lower than 1 when summed up.
     * @returns {NiceTable} instance.
     */
    setDimensions(...dimensions) {
        let goodDimensions = dimensions.filter((a) => typeof a === "number");
        if (dimensions.length > 0) {
            if (goodDimensions.reduce((a, b) => a + b) > 1) {
                throw new Error("All dimensions summed up must be lower or equal to 1");
            }
        }
        this.dimensions = goodDimensions;
        return this;
    }

    /**
     * This function recalculates the column widths based on the console screen.
     */
    calculateColWidths() {
        this.colWidths = [];
        let width;
        if (this.fixedWidth != -1) {
            width = this.fixedWidth - this.cols - 1;
        } else {
            width = process.stdout.columns - this.cols - 1;
        }
        let lastWidth = width;
        for (let i = 0; i < this.cols; i++) {
            if (i == this.cols - 1) {
                this.colWidths.push(lastWidth);
            } else {
                let w = Math.floor(this.dimensions[i] * width);
                lastWidth -= w;
                this.colWidths.push(w);
            }
        }
    }

    /**
     * Set the column titles.
     * @param {...string} titles All the titles, should be equal to the amount of colums.
     * @returns {NiceTable} instance.
     */
    setTitles(...titles) {
        let goodTitles = titles.map((title) => title + "");
        this.titles = goodTitles;
        return this;
    }

    /**
     * Add a new row with data to the table.
     * @param {...string} data An array of strings to add. Length should be equal to amount of colums.
     * @returns {NiceTable} instance.
     */
    addRow(...data) {
        this.rows.push(data.map((d) => d + ""));
        return this;
    }

    /**
     * Print the table finally.
     * @returns {NiceTable} instance.
     */
    print() {
        this.autoCalc();
        let rows = [...this.rows];
        this.printLine("=");
        this.printRow(this.titles);
        this.printLine("=");
        for (let i = 0; i < rows.length; i++) {
            let lines = 1;
            let next = this.printRow(rows[i], lines > this.linesPerRow - 1);
            while (next.length == 0 ? false : next.reduce((a, b) => a || b) != null) {
                next = this.printRow(next, lines >= this.linesPerRow - 1);
                lines++;
            }
            this.printLine();
        }
        return this;
    }

    /**
     * Print one single line.
     * @param {string} icon The icon to use when writing out the line, defaults to '-'
     * @param {string} separator The icon to use when printing a separator.
     */
    printLine(icon = "-", separator = "+") {
        this.outputWriter("|");
        this.colWidths.forEach((w, i) => {
            this.outputWriter(
                icon.repeat(w) + (i == this.colWidths.length - 1 ? "|" : separator)
            );
        });
        this.outputWriter("\n");
    }

    /**
     * Print one row of the table out.
     * @param {string[]} row An array of row-data.
     * @param {boolean} trim Tells the function if the row should be trimmed.
     * @returns {string[]} The overflow-row if any.
     */
    printRow(row, trim = true) {
        this.outputWriter("|");
        let next = [];
        for (let j = 0; j < this.cols; j++) {
            let colWidth = this.colWidths[j];
            let output = row[j];
            if (output == null) {
                output = "";
            }
            if (output.length > colWidth) {
                if (trim) {
                    output = output.substr(0, colWidth - 3) + "...";
                    next.push(null);
                } else {
                    next.push(output.substr(colWidth));
                    output = output.substr(0, colWidth);
                }
            } else {
                next.push(null);
            }
            output = output.padEnd(colWidth, " ");
            this.outputWriter(output + "|");
        }
        this.outputWriter("\n");
        return next;
    }
};

class ArrayOfObjects {

    static getUniqueValues(arrayOfObjects, propertyName) {
        const output = [];
        arrayOfObjects.map(obj => {
            if (obj[propertyName] !== undefined) {
                if (output.find(val => JSON.stringify(obj[propertyName]) === JSON.stringify(val)) === undefined) {
                    output.push(obj[propertyName]);
                }
            }
        });
        return output;
    }

    static findFirstOneMatching(arrayOfObjects, propertyName, propertyValue) {
        let output = null;
        arrayOfObjects.some(obj => {
            if (obj[propertyName] !== undefined) {
                if (JSON.stringify(obj[propertyName]) === JSON.stringify(propertyValue)) {
                    output = obj;
                    return true;
                }
            }

            return false;
        });
        return output;
    }

    static findLastOneMatching(arrayOfObjects, propertyName, propertyValue) {
        let output = null;
        arrayOfObjects.map(obj => {
            if (obj[propertyName] !== undefined) {
                if (JSON.stringify(obj[propertyName]) === JSON.stringify(propertyValue)) {
                    output = obj;
                }
            }
        });
        return output;
    }

    static findAllMatching(arrayOfObjects, propertyName, propertyValue) {
        const output = [];
        arrayOfObjects.map(obj => {
            if (obj[propertyName] !== undefined) {
                if (JSON.stringify(obj[propertyName]) === JSON.stringify(propertyValue)) {
                    output.push(obj);
                }
            }
        });
        return output;
    }

    static removeFirstOneMatching(arrayOfObjects, propertyName, propertyValue) {
        let flag = false;
        return arrayOfObjects.filter(obj => {
            if (obj[propertyName] !== undefined && !flag) {
                if (JSON.stringify(obj[propertyName]) === JSON.stringify(propertyValue)) {
                    flag = true;
                    return false;
                }
            }

            return true;
        });
    }

    static removeLastOneMatching(arrayOfObjects, propertyName, propertyValue) {
        let lastOneMatchingIndex = -1;
        arrayOfObjects.map((obj, index) => {
            if (obj[propertyName] !== undefined) {
                if (JSON.stringify(obj[propertyName]) === JSON.stringify(propertyValue)) {
                    lastOneMatchingIndex = index;
                }
            }
        });
        const output = JSON.parse(JSON.stringify(arrayOfObjects));

        if (lastOneMatchingIndex != -1) {
            output.splice(lastOneMatchingIndex, 1);
        }

        return output;
    }

    static removeAllMatching(arrayOfObjects, propertyName, propertyValue) {
        return arrayOfObjects.filter(obj => {
            if (obj[propertyName] !== undefined) {
                if (JSON.stringify(obj[propertyName]) === JSON.stringify(propertyValue)) {
                    return false;
                }
            }

            return true;
        });
    }

} // ArrayOfObjects

//
// From: https://gitlab.com/davideblasutto/words-array
// ## Returns array of words in text
// ## For CJK languages almost every char is a word,
// ## for other languages words are separated by spaces
//
const wordsArray = (text) => {

    // Test for CJK characters
    if (/[\u3400-\u9FBF]/.test(text)) {

        // Contains CJK characters
        var words = []
        const characters = text.split('');
        for (var i = 0; i <= characters.length - 1; i++)
            if (!containsPunctations(characters[i + 1])) {
                // Next character is "normal"
                words.push(characters[i])
            } else {
                // Next character isn't a single word
                words.push(characters[i] + characters[i + 1])
                i++;
            }

        return words

    } else {

        // Other language
        // Converts returns in spaces, removes double spaces
        text = text.replace(/(\r\n|\n|\r)/gm, ' ').replace(/\s+/g, ' ')
        // Simply split by spaces
        return text.split(' ')

    }

} // wordsArray

//
// ## Returns true if text contains puntaction characters
//
const containsPunctations = (text) => {
    // Test string against regexp for many punctactions characters, including CJK ones
    return /[\uFF01-\uFF07,\u0021,\u003F,\u002E,\u002C,\u003A,\u003B,\uFF1A-\uFF1F,\u3002,\uFF0C-\uFF0E,\u2000-\u206F,\uFFED-\uFFEF,\u0028,\u0029]/.test(text)
} // containsPunctations

export { ArrayOfObjects, NiceTable, wordsArray }