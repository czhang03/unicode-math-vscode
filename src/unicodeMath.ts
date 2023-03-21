import {
    TextDocument, Position, Range, CompletionItem, TextEditor,
    TextEditorEdit, commands, window, CompletionItemKind, workspace, SnippetString, Diagnostic, DiagnosticCollection
} from "vscode"
import { supsMap, subsMap, boldMap, italicMap, calMap, frakMap, bbMap, sfMap, ttMap, scrMap } from "./charMaps"
import { symbols } from './symbols'

/**
 * Give the max of an array with respect to some function
 *
 * @param by compute the values to compare 
 * @param arr the array to compare
 * @returns the max element in arr with respect to `by`, and `null` if the array is empty
 */
function maxBy<T, TComp>(by: (elem: T) => TComp, arr: Array<T>): T | null {
    if (arr.length === 0) { return null }
    else {
        const [head, tail] = [arr[0], arr.slice(1)]
        return tail.reduce(
            (elem, curMax) => by(curMax) >= by(elem) ? curMax : elem, head
        )
    }
}


const SPACE_KEY = 'space'

/**
 * Types of string mappings, usually used for math fonts
 */
enum Font {
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
type StrWithRange = { str: string; range: Range }

/**
 * Given a font type, find the configuration ID for its fontCommands.
 * 
 * @param font The type of the font
 * @returns the configuration ID for the font prefix
 */
function getFontCommandSettingID(font: Font): string {
    switch (font) {
        case Font.subscript:
            return "unicodeMathInput.SubscriptFontCommands"
        case Font.superscript:
            return "unicodeMathInput.SuperscriptFontCommands"
        case Font.italic:
            return "unicodeMathInput.ItalicFontCommands"
        case Font.bold:
            return "unicodeMathInput.BoldFontCommands"
        case Font.mathCal:
            return "unicodeMathInput.MathCalFontCommands"
        case Font.mathFrak:
            return "unicodeMathInput.MathFrakFontCommands"
        case Font.mathBB:
            return "unicodeMathInput.MathBBFontCommands"
        case Font.mathsf:
            return "unicodeMathInput.mathsfFontCommands"
        case Font.mathtt:
            return "unicodeMathInput.mathttFontCommands"
        case Font.mathscr:
            return "unicodeMathInput.mathscrFontCommands"
    }
}

/**
 * A map that map the prefix to its corresponding maps
 */
const prefixToFontType: Map<string, Font> = new Map(
    Object.values(Font)
        .map(type => (workspace.getConfiguration().get(getFontCommandSettingID(type)) as string[])
            .map(prefix => [prefix, type] as [string, Font]))
        .flat()
)

// all the possible fontCommands
const fontCommands: string[] = Array.from(prefixToFontType.keys())


/**
 * Given a font, get the map corresponding to that type
 * 
 * @param font the type of the map
 * @returns a map mapping a "char" to its corresponding formatted version 
 *  The key and value of the map needs to be singleton strings
 */
function fontToMap(font: Font): Map<string, string> {
    switch (font) {
        case Font.superscript: return supsMap
        case Font.subscript: return subsMap
        case Font.bold: return boldMap
        case Font.italic: return italicMap
        case Font.mathCal: return calMap
        case Font.mathFrak: return frakMap
        case Font.mathBB: return bbMap
        case Font.mathsf: return sfMap
        case Font.mathtt: return ttMap
        case Font.mathscr: return scrMap
    }
}


/**
 * Given a string, and get the font type corresponding to the command
 * and the content of the string without the command
 * 
 * Notice that this function assume there is no ambiguity in the matching. 
 * i.e. the string can only be matched with at most one font
 * 
 * @param word the pre-converted ascii word that the user typed, does not include the trigger string
 * @returns the font type corresponding of the command, and the string with command stripped
 */
function getFont(word: string): [Font, string] | null {

    const matchedFonts = Array.from(prefixToFontType.entries())
        // matches all the prefix
        .map(([prefix, font]) => [font, word.match(`${prefix}{(.*)}`)] as [Font, RegExpMatchArray | null])
        // filters out the match failure
        .filter((res): res is [Font, RegExpMatchArray] => (res[1] !== null))
        // return the matched string (first match group after the entire string) and the font to convert
        .map(([font, match]) => [font, match[1]] as [Font, string])

    if (matchedFonts.length === 0) {return null} 
    else if (matchedFonts.length === 1) {return matchedFonts[0]}
    else {
        console.debug("this should not happen, multiple font matched the current string")
        console.debug(`current string is ${word}`)
        return matchedFonts[0]
    } 
}

/**
 * Given a string and a font, convert it to its corresponding unicode version.
 * When there is unknown characters the function will fail.
 * 
 * @param str the input string, typed by the user
 * @param type the conversion type (typically math fonts)
 * @returns the unicode version of the converted string
 */
function toFont(str: string, type: Font): string | null {
    const mappedArr = str.split("")
        .map(char => fontToMap(type).get(char) ?? null)


    if (mappedArr.filter((elem) => elem === null).length !== 0) {
        // if there is string that cannot be converted
        // return a failure
        return null
    } else {
        // otherwise return a string
        return mappedArr.join("")
    }
}

/**
 * Given a user inputted string, convert it into unicode, 
 * return null if it cannot be converted
 * 
 * @param str a input string, typed in the editor by the user
 * @returns the unicode version of the input string
 */
function convertString(str: string): string | null {

    const [font, content] = getFont(str) ?? [null, null]

    // if a prefix cannot be found, then fallback to search in symbols
    if (font === null && content === null) { return symbols.get(str) || null }

    // if prefix can be found, using prefix
    else { return toFont(content, font) }
}


export class UnicodeMath {
    constructor(private readonly triggerStrs: string[]) { }


    /**
     * Generate completion based on the string at cursor
     * 
     * @param trigger the trigger string that triggered current completion, for example "\"
     * @param word the word following the trigger string, but not including
     * @param totalRange the range from the start of the trigger string to then end of the word
     * @returns a list of completion items that are available in the current context
     */
    private genCompletions(trigger: string, word: string, totalRange: Range): CompletionItem[] {
        console.debug(`completion triggered by ${trigger}, current word is ${word}`)

        // compute all the possible completion items (all the unicode and fontCommands)
        const prefixCompletionItems = fontCommands.map(prefix => {
            const completion =
                new CompletionItem(`${trigger}${prefix}{}`, CompletionItemKind.Snippet)
            completion.detail = prefixToFontType.get(prefix)?.concat(" prefix")
            completion.range = totalRange
            // retrigger completion after prefix, to complete the map string
            completion.insertText = new SnippetString(`${trigger}${prefix}{$1}`)
            return completion
        })

        const symbolCompletionsItems =
            Array.from(symbols.entries()).map(([inpStr, unicodeChar]) => {
                const completion: CompletionItem =
                    new CompletionItem(trigger.concat(inpStr), CompletionItemKind.Constant)
                completion.detail = unicodeChar
                completion.insertText = unicodeChar
                completion.range = totalRange
                return completion
            })


        return prefixCompletionItems.concat(symbolCompletionsItems)
    }

    /**
     * Provide the completion items given the current document and cursor position
     * 
     * @param document the current document on the editor
     * @param position the cursor position
     * @returns a list of completion item that is valid to the current position
     */
    public provideCompletion(document: TextDocument, position: Position): CompletionItem[] {
        const [triggerWithRange, wordWithRange] = this.evalPosition(document, position) ?? [null, null]
        if (!triggerWithRange || !wordWithRange) { return [] }

        const triggerRange = triggerWithRange.range
        const wordRange = wordWithRange.range
        return this.genCompletions(
            triggerWithRange.str, wordWithRange.str, triggerRange.union(wordRange)
        )
    }

    /**
     * check the word (from the last `triggerStr`, like "\", to current cursor) at the current cursor position
     * TODO: this function is slightly too long
     * 
     * @param document the text document that is on the screen
     * @param position position of the cursor
     * @returns  the trigger string with its range, and the word with its range
     */
    private evalPosition(document: TextDocument, position: Position): [StrWithRange, StrWithRange] | null {
        // at the start of the line, there is nothing in front.
        if (position.character === 0) { return null }
        try {
            const lineStart = new Position(position.line, 0)
            const lnRange = new Range(lineStart, position)
            const line = document.getText(lnRange)

            // all the trigger strings with its end index
            const triggerStrsWithStarts: [string, number][] = this.triggerStrs
                .map((trigger) => [trigger, line.lastIndexOf(trigger)] as [string, number])
                .filter(([_trigger, start]) => start !== -1)
            const lastStrEndIdx = maxBy(
                ([trigger, start]) => start + trigger.length,
                triggerStrsWithStarts)

            // there is no trigger available, then return.
            // probably not efficient, a better way is to check at the front.
            if (lastStrEndIdx === null) { return null }
            const [trigger, triggerStartIdx] = lastStrEndIdx
            const triggerEndIdx = triggerStartIdx + trigger.length - 1

            // compute the word, slice from the end of the trigger string
            // do not include the last character of the trigger str.
            const wordStartIdx = triggerEndIdx + 1
            const word = line.slice(wordStartIdx)

            // compute the range, start from the start of trigger string
            // end at the end of the entire word.
            const triggerStart = new Position(position.line, triggerStartIdx)
            const triggerEnd = new Position(position.line, triggerEndIdx)
            const wordStart = new Position(position.line, wordStartIdx)
            const wordEnd = wordStart.translate(0, word.length)

            return [
                { str: trigger, range: new Range(triggerStart, triggerEnd) },
                { str: word, range: new Range(wordStart, wordEnd) }
            ]
        } catch (e) {
            // this part is legacy code, just in case it can really catch some error.
            console.error("unexpected error, while finding word in front of the cursor", e)
            return null
        }
    }


    /**
     * I am not quiet happy with how this code looks, the null handling in Typescript doesn't seem to be great
     * 
     * This function do the real editing when user commit using a tab
     * Notice that this do not handle the completion functionality
     * and its mutually exclusive with completion, 
     * i.e. if user get a unicode char using completion, then they don't need to invoke this function
     * 
     * @param key the keypress that triggered this function
     * @returns nothing
     */
    public async commit(key: string): Promise<void> {
        if (!key || !window.activeTextEditor || !window.activeTextEditor.selection) { return }

        const editor: TextEditor = window.activeTextEditor
        const doKey = async () => {
            if (key === SPACE_KEY) {
                await commands.executeCommand('type', { source: 'keyboard', text: ' ' })
            } else {
                await commands.executeCommand(key)
            }
        }

        // TODO: I don't like variables, but there seems to be no way to get the result out.
        let c = false
        await editor.edit((editor: TextEditorEdit) => {
            window.activeTextEditor?.selections.map((v) => {
                const position = v.start
                if (window.activeTextEditor) {
                    const [triggerWithRange, wordWithRange] =
                        this.evalPosition(window.activeTextEditor.document, position) ?? [null, null]

                    if (wordWithRange && triggerWithRange) {
                        console.debug(`trying to commit ${wordWithRange.str}`)
                        // the total range of word including trigger
                        const totalRange = triggerWithRange.range.union(wordWithRange.range)
                        const changed = convertString(wordWithRange.str)
                        console.debug(changed ? `committing to ${changed}` : `nothing matched`)
                        if (changed) {
                            editor.delete(totalRange)
                            editor.insert(totalRange.start, changed)
                            c = true
                        }
                    }
                }
            })
        })
        // always propagate the space key, or propagate tab
        // only if not used to insert a character
        if (!c || key === SPACE_KEY) { return doKey() }
    }

    private genDiagnostic(document: TextDocument): DiagnosticCollection {
        return 
    }

}


