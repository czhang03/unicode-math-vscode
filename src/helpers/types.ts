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
export interface StrWithRange { str: string; range: Range }


/**
 * A collction of triggers including generic triggers for completion, and font triggers for specific font command.
 */
export interface Triggers {
    generic: string[],
    fonts: Map<string, Font>
}

/**
 * Standard trigger consists of a trigger immediately followed by content
 * 
 * For example `\al`, the trigger string is `\` the trigger and `al` is the content
 */
interface StandardRange {
    kind: "standard",
    /**
     * The range and str of the trigger string, like `\`
     */ 
    triggerWithRange: StrWithRange
    /**
     * The range and str of the content, excluding trigger, like `al` after `\`
     */
    contentWithRange: StrWithRange
    /**
     * Total range of the entire position, including the range of the trigger and content
     */
    totalRange: Range
}

/**
 * Font Conversion with bracket.
 * 
 * For example, in `_{this}`, where `_` is the both the trigger and font command, and `this` is the content.
 */
interface BracketRange {
    kind: "bracket",
    /**
     * The range and str of the trigger string, like `\`
     */ 
    triggerWithRange: StrWithRange
    /**
     * The range and str of the font prefix, like `mathbb` after `\`
     */ 
    prefixWithRange: StrWithRange
    /**
     * The range and str of the content, excluding bracket, prefix, and trigger, like `N` in `\mathbb{...}`
     */
    contentWithRange: StrWithRange
    /**
     * Total range of the entire position, including the range of the trigger, prefix, content, and bracket
     */
    totalRange: Range
}

/**
 * Context of the current position, 
 * 
 * extracts all the position details including trigger, font prefix, and content.
 */
export type PositionContext = StandardRange | BracketRange