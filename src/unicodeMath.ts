import {
    TextDocument, Position, Range, CompletionItem, TextEditor,
    TextEditorEdit, commands, window, CompletionItemKind
} from "vscode"
import { supsMap, subsMap, boldMap, italicMap, calMap, frakMap, bbMap } from "./maps"
import { symbols } from './symbols'


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
    ["\\^", StringMapType.superscript],
    ["\\_", StringMapType.subscript],

    ["\\b:", StringMapType.bold],
    ["\\bf:", StringMapType.bold],
    ["\\mathbf:", StringMapType.bold],
    ["\\mathbf", StringMapType.bold],

    ["\\i:", StringMapType.italic],
    ["\\it:", StringMapType.italic],
    ["\\mathit:", StringMapType.italic],
    ["\\mathit", StringMapType.italic],

    ["\\cal:", StringMapType.mathCal],
    ["\\mathcal:", StringMapType.mathCal],
    ["\\mathcal", StringMapType.mathCal],

    ["\\frak:", StringMapType.mathFrak],
    ["\\mathfrak:", StringMapType.mathFrak],
    ["\\mathfrak", StringMapType.mathFrak],

    ["\\Bbb:", StringMapType.mathBB],
    ["\\mathbb:", StringMapType.mathBB],
    ["\\mathbb", StringMapType.mathBB],
])

// all the possible prefixes
const prefixes: string[] = Array.from(prefixToMapType.keys())

// Give the map type its corresponding map.
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
    const longestPrefix = validPrefix.reduce((p1, p2) => p1.length >= p2.length ? p1 : p2, "")
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
function mapString(str: string, type: StringMapType): string {
    return str.split("")
        .map(char => mapTypeToMap(type).get(char) ?? char)
        .join("")
}

/**
 * Given a user inputted string, convert it into unicode, 
 * return null if it cannot be converted
 * @param str a input string, typed in the editor by the user
 * @returns the unicode version of the input string
 */
function convertString(str: string): string | null {

    const [mapType, withoutPrefix] = stripPrefix(str) ?? [null, null]

    // if a prefix cannot be found, then fallback to search in symbols
    if (mapType === null && withoutPrefix === null) { return symbols[str] || null }

    // if prefix can be found, using prefix
    else { return mapString(withoutPrefix, mapType) }
}


/**
 * Generate completion based on the string at cursor
 * @param str the user inputted string at the cursor
 * @param target the range (starting position to end position) of the str including the slash in the beginning
 * @returns a list of completion items from the current string.
 */
export function genCompletions(str: string, target: Range): CompletionItem[] {
    console.debug(`generating completion for ${str}`)

    // special case if the string matches any prefix
    // then just return how current string will be converted
    const [mapType, withoutPrefix] = stripPrefix(str) ?? [null, null]
    if (mapType && withoutPrefix) {
        console.debug(`matched prefix of ${mapType}`)

        const converted = mapString(withoutPrefix, mapType)
        const completion = new CompletionItem(str, CompletionItemKind.Text)
        completion.range = target
        completion.detail = converted
        completion.insertText = converted

        return [completion]
    }

    // default case, return all the possible completion items (all the unicode and prefixes)
    else {
        const prefixCompletionItems = prefixes.map(prefix => {
            const completion = new CompletionItem(prefix, CompletionItemKind.Keyword)
            completion.range = target
            // retrigger completion after prefix, to complete the map string
            completion.command =
                { command: 'editor.action.triggerSuggest', title: 'completing after prefix' }
            return completion
        })

        const symbolCompletionsItems =
            Object.entries<string>(symbols).map(([inpStr, unicodeChar]) => {
                const completion: CompletionItem = new CompletionItem(inpStr, CompletionItemKind.Constant)
                completion.detail = unicodeChar
                completion.insertText = unicodeChar
                completion.range = target
                return completion
            })

        return prefixCompletionItems.concat(symbolCompletionsItems)
    }
}


/**
 * check the word (from the last "\" to current cursor) at the current cursor position
 * @param document the text document that is on the screen
 * @param position position of the cursor
 * @returns the "word" in front of the cursor and its range, starting from (including) "\"
 */
export function evalPosition(document: TextDocument, position: Position): [Range, string] | null {
    // at the start of the line, there is nothing in front.
    if (position.character === 0) { return null }
    try {
        const lineStart = new Position(position.line, 0)
        const lnRange = new Range(lineStart, position)
        const line = document.getText(lnRange)

        const slash = line.lastIndexOf('\\')
        if (slash < 0) {console.error(`unexpected error, "\\" is not found before the cursor: \n${line}`); return null}

        const word = line.slice(slash)
        const start = new Position(position.line, slash)
        const end = start.translate(undefined, word.length)

        return [new Range(start, end), word]

    } catch (e) {
        console.error("unexpected error, while finding word in front of the cursor", e)
        return null
    }
}

// legacy code
// I am not quiet happy with how this code looks, the null handling in Typescript doesn't seem to be great
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


