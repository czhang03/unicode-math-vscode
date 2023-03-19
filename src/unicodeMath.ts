import { string } from "fast-check"
import {
    TextDocument, Position, Range, CompletionItem, TextEditor,
    TextEditorEdit, commands, window, CompletionItemKind, workspace
} from "vscode"
import { supsMap, subsMap, boldMap, italicMap, calMap, frakMap, bbMap } from "./charMaps"
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
enum StringMapType {
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
 * Given a font type, find the configuration ID for its prefixes.
 * 
 * @param mapType The type of the font
 * @returns the configuration ID for the font prefix
 */
function getPrefixSettingID(mapType: StringMapType): string {
    switch (mapType) {
        case StringMapType.subscript:
            return "unicodeMathInput.SubscriptPrefixes"
        case StringMapType.superscript:
            return "unicodeMathInput.SuperscriptPrefixes"
        case StringMapType.italic:
            return "unicodeMathInput.ItalicPrefixes"
        case StringMapType.bold:
            return "unicodeMathInput.BoldPrefixes"
        case StringMapType.mathCal:
            return "unicodeMathInput.MathCalPrefixes"
        case StringMapType.mathFrak:
                return "unicodeMathInput.MathFrakPrefixes"
        case StringMapType.mathBB:
                return "unicodeMathInput.MathBBPrefixes"
        case StringMapType.mathsf:
            return "unicodeMathInput.mathsfPrefixes"
        case StringMapType.mathtt:
            return "unicodeMathInput.mathttPrefixes"
        case StringMapType.mathscr:
            return "unicodeMathInput.mathscrPrefixes"
    }
}

/**
 * A map that map the prefix to its corresponding maps
 */
const prefixToMapType: Map<string, StringMapType> = new Map(
    Object.values(StringMapType)
        .map(type => (workspace.getConfiguration().get(getPrefixSettingID(type)) as string[])
        .map(prefix => [prefix, type] as [string, StringMapType]))
        .flat()
)

// all the possible prefixes
const prefixes: string[] = Array.from(prefixToMapType.keys())


/**
 * Given a map type, get the map corresponding to that type
 * 
 * @param mapType the type of the map
 * @returns a map mapping a "char" to its corresponding formatted version 
 *  The key and value of the map needs to be singleton strings
 */
function mapTypeToMap(mapType: StringMapType): Map<string, string> {
    switch (mapType) {
        case StringMapType.superscript: return supsMap
        case StringMapType.subscript: return subsMap
        case StringMapType.bold: return boldMap
        case StringMapType.italic: return italicMap
        case StringMapType.mathCal: return calMap
        case StringMapType.mathFrak: return frakMap
        case StringMapType.mathBB: return bbMap
    }
}


/**
 * Given a word, strip the prefix, and get the map type that prefix correspond to 
 * Notice this will automatically match the longest prefix to avoid ambiguity in the prefix
 * 
 * @param word the pre-converted ascii word that the user typed
 * @returns the map type corresponding to the string, and the string with prefix striped
 */
function stripPrefix(word: string): [StringMapType, string] | null {
    const validPrefix = prefixes.filter((prefix) => word.startsWith(prefix))

    // compute the longest prefix, if there is no valid prefix, return null
    const longestPrefix = maxBy((prefix) => prefix.length, validPrefix)
    if (longestPrefix === null) { return null }

    const wordWithoutPrefix = word.slice(longestPrefix.length)
    const mapType = prefixToMapType.get(longestPrefix)

    return mapType ? [mapType, wordWithoutPrefix] : null
}

/**
 * Given a string and a map type, convert it to its corresponding unicode version.
 * This function will ignoring unknown characters
 * 
 * @param str the input string, typed by the user
 * @param type the conversion type (typically math fonts)
 * @returns the unicode version of the converted string
 */
function mapString(str: string, type: StringMapType): string | null {
    const mappedArr = str.split("")
        .map(char => mapTypeToMap(type).get(char) ?? null)


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

    const [mapType, withoutPrefix] = stripPrefix(str) ?? [null, null]

    // if a prefix cannot be found, then fallback to search in symbols
    if (mapType === null && withoutPrefix === null) { return symbols.get(str) || null }

    // if prefix can be found, using prefix
    else { return mapString(withoutPrefix, mapType) }
}


export class UnicodeMath {
    constructor(private readonly triggerStrs: string[]) {
    }


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

        // special case if the string matches any prefix
        // then just return how current string will be converted
        const [mapType, withoutPrefix] = stripPrefix(word) ?? [null, null]
        if (mapType && withoutPrefix) {
            console.debug(`matched prefix of ${mapType}`)

            const converted = mapString(withoutPrefix, mapType)
            // do not generate completion if the string cannot be converted
            if (converted === null) { return [] }
            else {
                const completion = new CompletionItem(trigger.concat(word), CompletionItemKind.Text)
                completion.range = totalRange
                completion.detail = converted
                completion.insertText = converted

                return [completion]
            }
        }

        // default case, return all the possible completion items (all the unicode and prefixes)
        else {

            const prefixCompletionItems = prefixes.map(prefix => {
                const completion =
                    new CompletionItem(trigger.concat(prefix), CompletionItemKind.Keyword)
                completion.range = totalRange
                // retrigger completion after prefix, to complete the map string
                completion.command =
                    { command: 'editor.action.triggerSuggest', title: 'completing after prefix' }
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

}


export const testing = {
    prefixes,
    stripPrefix,
    convertString
}
