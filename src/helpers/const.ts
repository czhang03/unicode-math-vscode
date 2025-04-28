import { Font } from "./types"

/**
 * The regular expression to match a word.
 * We currently allow `|()[]:!#$%&*+./<=>?@^-~\;` and all the word character in the definition of symbols and font command
 * Finally we add `{` and `}` because it is used in font commands
 */
export const wordRegex = new RegExp(/(\w|\||\(|\)|\[|\]|:|!|#|\$|%|&|\*|\+|\.|\/|<|=|>|\?|@|\^|-|~|\\|;|\{|\})+/, "gmu")

export const SPACE_KEY = 'space'


/**
 * Given a font type, find the configuration ID for its fontCommands.
 * @param font The type of the font
 * @returns the configuration ID for the font prefix
 */
export function getFontCommandSettingID(font: Font): string {
    switch (font) {
        case Font.subscript:
            return "unicodeMathInput.SubscriptFontCommands"
        case Font.superscript:
            return "unicodeMathInput.SuperscriptFontCommands"
        case Font.italic:
            return "unicodeMathInput.ItalicFontCommands"
        case Font.bold:
            return "unicodeMathInput.BoldFontCommands"
        case Font.mathcal:
            return "unicodeMathInput.MathCalFontCommands"
        case Font.mathfrak:
            return "unicodeMathInput.MathFrakFontCommands"
        case Font.mathbb:
            return "unicodeMathInput.MathBBFontCommands"
        case Font.mathsf:
            return "unicodeMathInput.mathsfFontCommands"
        case Font.mathtt:
            return "unicodeMathInput.mathttFontCommands"
        case Font.mathscr:
            return "unicodeMathInput.mathscrFontCommands"
        case Font.smallcaps:
            return "unicodeMathInput.smallcapsFontCommands"
    }
}

export const doNotWarnCurLineString = "UNICODE-MATH-INPUT: Do not warn current line"

export const convertibleDiagnosticsCode = "unicode-math-input.convertible-symbol"
