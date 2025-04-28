import { Range } from "vscode"

/**
 * Types of string mappings, usually used for math fonts
 */
export enum Font {
    subscript = "subscript",
    superscript = "superscript",
    bold = "bold",
    italic = "italic",
    mathcal = "mathcal",
    mathfrak = "mathfrak",
    mathbb = "mathbb",
    mathsf = "mathsf",
    mathtt = "mathtt",
    mathscr = "mathscr",
    smallcaps = "smallcaps"
}

/**
 * A string with its range on the document.
 */
export type StrWithRange = { str: string; range: Range }