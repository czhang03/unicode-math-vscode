import {
    TextDocument, Position, Range, CompletionItem, TextEditor,
    TextEditorEdit, commands, window, CompletionItemKind
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
function maxBy<T, TComp>(by: (elem:T) => TComp, arr: Array<T>): T | null {
    if (arr.length === 0) {return null}
    else{
        const [head, tail] = [arr[0], arr.slice(1)]
        return tail.reduce(
            (elem1, elem2) => by(elem1) >= by(elem2) ? elem1 : elem2, head
        )
    }
}

export const triggerStrs = ['.']

const SPACE_KEY = 'space'

/**
 * Types of string mappings, usually used for math fonts
 */
enum StringMapType {
    superscript = "Superscript",
    subscript = "Subscript",
    bold = "Bold",
    italic = "Italic",
    mathCal = "mathcal",
    mathFrak = "mathfrak",
    mathBB = "mathbb",
}


/**
 * A map that map the prefix to its corresponding maps
 */
const prefixToMapType: Map<string, StringMapType> = new Map([
    ["^", StringMapType.superscript],
    ["_", StringMapType.subscript],

    ["b:", StringMapType.bold],
    ["bf:", StringMapType.bold],
    ["mathbf:", StringMapType.bold],
    ["mathbf", StringMapType.bold],

    ["i:", StringMapType.italic],
    ["it:", StringMapType.italic],
    ["mathit:", StringMapType.italic],
    ["mathit", StringMapType.italic],

    ["cal:", StringMapType.mathCal],
    ["mathcal:", StringMapType.mathCal],
    ["mathcal", StringMapType.mathCal],

    ["frak:", StringMapType.mathFrak],
    ["mathfrak:", StringMapType.mathFrak],
    ["mathfrak", StringMapType.mathFrak],

    ["Bbb:", StringMapType.mathBB],
    ["mathbb:", StringMapType.mathBB],
    ["mathbb", StringMapType.mathBB],
])

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
    switch(mapType) {
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
    if (longestPrefix === null) {return null}

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


/**
 * Generate completion based on the string at cursor
 * 
 * @param str the user inputted string at the cursor
 * @param target the range (starting position to end position) of the str including the slash in the beginning
 * @returns a list of completion items from the current string.
 */
function genCompletions(str: string, target: Range): CompletionItem[] {
    console.debug(`completion triggered, current word is ${str}`)

    // special case if the string matches any prefix
    // then just return how current string will be converted
    const [mapType, withoutPrefix] = stripPrefix(str) ?? [null, null]
    if (mapType && withoutPrefix) {
        console.debug(`matched prefix of ${mapType}`)

        const converted = mapString(withoutPrefix, mapType)
        // do not generate completion if the string cannot be converted
        if (converted === null) {return []}
        else {
            const completion = new CompletionItem(str, CompletionItemKind.Text)
            completion.range = target
            completion.detail = converted
            completion.insertText = converted

            return [completion]
        }
    }

    // default case, return all the possible completion items (all the unicode and prefixes)
    else {

        const prefixCompletionItems = prefixes.map(prefix => {
            const completion = new CompletionItem(prefix, CompletionItemKind.Keyword)
            completion.range = target
            // filter by the current word excluding trigger str
            completion.filterText = str  
            // retrigger completion after prefix, to complete the map string
            completion.command =
                { command: 'editor.action.triggerSuggest', title: 'completing after prefix' }
            return completion
        })

        const symbolCompletionsItems =
            Array.from(symbols.entries()).map(([inpStr, unicodeChar]) => {
                const completion: CompletionItem = new CompletionItem(inpStr, CompletionItemKind.Constant)
                completion.detail = unicodeChar
                completion.insertText = unicodeChar
                completion.range = target
                // filter by the current word excluding trigger str
                completion.filterText = str  
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
export function provideCompletion(document: TextDocument, position: Position): CompletionItem[] {
    const [target, word] = evalPosition(document, position) ?? [null, null]
    if (!target || !word) { return [] }
    console.debug(`trying to provide completion for ${word}`)
    return genCompletions(word, target)
}


/**
 * check the word (from the last `triggerStr`, like "\", to current cursor) at the current cursor position
 * IMPORTANT: The return range includes trigger string, and the word do not include the trigger string
 * 
 * @param document the text document that is on the screen
 * @param position position of the cursor
 * @returns the "word" in front of the cursor, do not include the trigger string;
 *  the range of the word, including the trigger string.
 */
function evalPosition(document: TextDocument, position: Position): [Range, string] | null {
    // at the start of the line, there is nothing in front.
    if (position.character === 0) { return null }
    try {
        const lineStart = new Position(position.line, 0)
        const lnRange = new Range(lineStart, position)
        const line = document.getText(lnRange)

        // all the trigger strings with its end index
        const triggerStrsRange = triggerStrs.map((str) => {
            const triggerStrStart = line.lastIndexOf(str)
            return [triggerStrStart, triggerStrStart + str.length - 1]
        })
        const lastStrEndIdx = maxBy(([_, end]) => end, triggerStrsRange)
        // there is no trigger available, then return.
        // probably not efficient, a better way is to check at the front.
        if (lastStrEndIdx === null) {return null}
        const [triggerStart, triggerEnd] = lastStrEndIdx
        // cannot find the trigger word
        if (triggerStart === -1) {return null}

        // compute the word, slice from the end of the trigger string
        // do not include the last character of the trigger str.
        const wordStart = triggerEnd + 1
        const word = line.slice(wordStart)  

        // compute the range, start from the start of trigger string
        // end at the end of the entire word.
        const start = new Position(position.line, triggerStart)
        const end = new Position(position.line, wordStart).translate(0, word.length)

        return [new Range(start, end), word]
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
export async function tabCommit(key: string): Promise<void> {
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
                const [target, word] = evalPosition(window.activeTextEditor.document, position) ?? [null, null]
                if (target && word) {
                    console.debug(`trying to commit ${word}`)
                    const changed = convertString(word)
                    console.debug(changed ? `committing to ${changed}` : `nothing matched`)
                    if (changed) {
                        editor.delete(target)
                        editor.insert(target.start, changed)
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


export const testing = {
    prefixes,
    stripPrefix,
    convertString
}
