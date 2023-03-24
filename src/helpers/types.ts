import { Range } from "vscode"

/**
 * Types of string mappings, usually used for math fonts
 */
export enum Font {
    subscript = "subscript",
    superscript = "superscript",
    bold = "bold",
    italic = "italic",
    mathCal = "mathcal",
    mathFrak = "mathfrak",
    mathBB = "mathbb",
    mathsf = "mathsf",
    mathtt = "mathtt",
    mathscr = "mathscr"
}

/**
 * A string with its range on the document.
 */
export type StrWithRange = { str: string; range: Range }