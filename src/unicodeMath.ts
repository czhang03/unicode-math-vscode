import {
    TextDocument, Position, Range, CompletionItem, 
    TextEditorEdit, commands, window, CompletionItemKind, workspace, SnippetString, Diagnostic, TextLine, TextDocumentChangeEvent, DiagnosticSeverity
} from "vscode"
import { supsMap, subsMap, boldMap, italicMap, calMap, frakMap, bbMap, sfMap, ttMap, scrMap, scMap } from "./charMaps"
import { symbols } from './symbols'
import { Font, StrWithRange } from "./helpers/types"
import { convertibleDiagnosticsCode, doNotWarnCurLineString, getFontCommandSettingID, SPACE_KEY, wordRegex } from "./helpers/const"
import { maxBy, range, unique } from "./helpers/functions"


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
        case Font.mathcal: return calMap
        case Font.mathfrak: return frakMap
        case Font.mathbb: return bbMap
        case Font.mathsf: return sfMap
        case Font.mathtt: return ttMap
        case Font.mathscr: return scrMap
	case Font.smallcaps: return scMap
    }
}


/**
 * Given a string, and get the font type corresponding to the command
 * and the content of the string without the command
 *
 * Notice that this function assume there is no ambiguity in the matching. 
 * i.e. the string can only be matched with at most one font
 * @param word the pre-converted ascii word that the user typed, does not include the trigger string
 * @returns the font type corresponding of the command, and the string with command stripped
 */
function getFont(word: string): [Font, string] | null {

    const matchedFonts = Array.from(prefixToFontType)
        // matches all the prefix
        .map(([prefix, font]) => [font, word.match(`^${prefix}{(.*)}$`)] as [Font, RegExpMatchArray | null])
        // filters out the match failure
        .filter((res): res is [Font, RegExpMatchArray] => (res[1] !== null))
        // return the matched string (first match group after the entire string) and the font to convert
        .map(([font, match]) => [font, match[1]] as [Font, string])

    if (matchedFonts.length === 0) {return null} 
    else {
        // return the longest matches
        return matchedFonts[0]
    } 
}

/**
 * Given a string and a font, convert it to its corresponding unicode version.
 * When there is unknown characters the function will fail.
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
 * @param str a input string, typed in the editor by the user
 * @returns the unicode version of the input string
 */
function convertString(str: string): string | null {

    const [font, content] = getFont(str) ?? [null, null]

    // if a prefix cannot be found, then fallback to search in symbols
    if (font === null && content === null) { return symbols.get(str) ?? null }

    // if prefix can be found, using prefix
    else { return toFont(content, font) }
}

/**
 * Get all the lines that was changed from the text change event
 * @param event the text on document changed
 * @returns a set of changed line numbers.
 */
function getChangedLineNums(event: TextDocumentChangeEvent): Set<number> {
    return new Set(
        event.contentChanges
        .map(change => range(change.range.start.line, change.range.end.line + 1))
        .flat()
    )
        
}


/**
 * A helper function that pick the trigger and package the information nicely into StrWithRange
 * given all the possible splits of trigger and string,
 * pick the "last trigger" (defined by the end of the trigger string)
 * and package the result nicely into StrWithRange.
 * @param possibleTriggers each trigger with its rest of the string, and the range of the entire string with trigger
 * @returns range and str of the trigger and the rest of the string
 */
function pickTrigger(possibleTriggers: [string, string, Range][]): [StrWithRange, StrWithRange] | null{
    const pickedTrigger = maxBy(([trigger, _str, range]) => range.start.character + trigger.length, possibleTriggers)

    if (pickedTrigger === null) {return null}  // the input `possibleTriggers` is empty
    else {
        const [trigger, str, range] = pickedTrigger

        const triggerEnd = range.start.translate(0, trigger.length - 1)
        const triggerRange = new Range(range.start, triggerEnd)

        const strStart = triggerEnd.translate(0, 1)
        const strRange = new Range(strStart, range.end)

        return [
            {str: trigger, range: triggerRange},
            {str: str, range: strRange}
        ]
    }
}




export class UnicodeMath {

    constructor(private readonly triggerStrs: string[]) {}


    /**
     * Generate completion based on the string at cursor
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
     * @param document the current document on the editor
     * @param position the cursor position
     * @returns a list of completion item that is valid to the current position
     */
    public provideCompletion(document: TextDocument, position: Position): CompletionItem[] {
        const [triggerWithRange, wordWithRange] = this.evalPosition(document, position) ?? [null, null]
        if (triggerWithRange === null || wordWithRange === null) { return [] }

        const triggerRange = triggerWithRange.range
        const wordRange = wordWithRange.range
        return this.genCompletions(
            triggerWithRange.str, wordWithRange.str, triggerRange.union(wordRange)
        )
    }
    
    /**
     * check the word (from the last `triggerStr`, like "\", to current cursor) at the current cursor position
     * TODO: this function is slightly too long
     * @param document the text document that is on the screen
     * @param cursorPosition position of the cursor
     * @returns  the trigger string with its range, and the word with its range
     */
    private evalPosition(document: TextDocument, cursorPosition: Position): [StrWithRange, StrWithRange] | null {
        // at the start of the line, there is nothing in front.
        if (cursorPosition.character === 0) { return null }
        const lineStart = new Position(cursorPosition.line, 0)
        const lnRange = new Range(lineStart, cursorPosition)
        const line = document.getText(lnRange)

        // all the trigger strings with its end index
        const triggerStrsWithRange = this.triggerStrs
            .map((trigger) => [trigger, line.lastIndexOf(trigger)] as [string, number])
            .filter(([_trigger, start]) => start !== -1)
            .map(([trigger, triggerStart]) => {
                const triggerEnd = triggerStart + trigger.length - 1
                const content = line.slice(triggerEnd + 1)
                const totalRange = new Range(new Position(cursorPosition.line, triggerStart), cursorPosition)
                return [trigger, content, totalRange] as [string, string, Range]
            })
        
        return pickTrigger(triggerStrsWithRange)
    }


    /**
     * I am not quiet happy with how this code looks, the null handling in Typescript doesn't seem to be great
     *
     * This function do the real editing when user commit using a tab
     * Notice that this do not handle the completion functionality
     * and its mutually exclusive with completion, 
     * i.e. if user get a unicode char using completion, then they don't need to invoke this function
     * @param key the keypress that triggered this function
     * @returns nothing
     */
    public async commit(key: string): Promise<void> {
        // if the editor is unavailable stop the process
        const editor = window.activeTextEditor
        if (editor === undefined) { return }

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
                if (window.activeTextEditor !== undefined) {
                    const [triggerWithRange, wordWithRange] =
                        this.evalPosition(window.activeTextEditor.document, position) ?? [null, null]

                    if (wordWithRange !== null && triggerWithRange !== null) {
                        console.debug(`trying to commit ${wordWithRange.str}`)
                        // the total range of word including trigger
                        const totalRange = triggerWithRange.range.union(wordWithRange.range)
                        const changed = convertString(wordWithRange.str)
                        console.debug(changed !== null && changed !== "" ? `committing to ${changed}` : `nothing matched`)
                        if (changed !== null && changed !== "") {
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

    /**
     * Generate all the possible conversions for a string including triggers
     * @param stringWithTrigger a string with triggers
     * @returns a list of possible unicode conversions
     */
    public getPossibleConversions(stringWithTrigger: string): string[] {
        const validTriggers = this.triggerStrs.filter(trigger => stringWithTrigger.startsWith(trigger))

        const contents = validTriggers.map((trigger) => stringWithTrigger.slice(trigger.length))
        return contents
            .map((content) => convertString(content))
            .filter((res): res is string => res !== null)
    } 

    /**
     * Generate diagnostic for given lines
     * the diagnostic includes all the symbols that can be converted
     * @param lines the TextLines that needs to generate diagnostics
     * @returns a list of diagnostics 
     */
    private genLinesDiagnostics(lines: TextLine[]): Diagnostic[] {
        return lines
            .filter(line => ! line.text.includes(doNotWarnCurLineString))
            .map(line => [...line.text.matchAll(wordRegex)]
            .map(match => {

                const word = match[0]
                const wordStart = match.index

                const possibleConversions = this.getPossibleConversions(word)

                if (possibleConversions.length === 0 || wordStart === undefined) {return null}
                else {
                    const lineNum = line.lineNumber
                    const range = new Range(lineNum, wordStart, lineNum, wordStart + word.length)
                    const diagnostic = new Diagnostic(range, `${word} can be converted to ${unique(possibleConversions).join()}`, DiagnosticSeverity.Information)
                    diagnostic.code = convertibleDiagnosticsCode
                    return diagnostic
                }
            })).flat()
            .filter((res): res is Diagnostic => res !== null)
    }

    /**
     * Given a change in the text, update the list of diagnostics for these changed lines
     * @param event the document change event
     * @param document the text document
     * @param origDiagnostics the original diagnostics of the file
     * @returns a new list of diagnostics that refreshes the lines that have been changed
     */
    public updateChangedLinesDiagnostic(event: TextDocumentChangeEvent, document: TextDocument, origDiagnostics: readonly Diagnostic[]): Diagnostic[] {
        const changedLineNums = getChangedLineNums(event)

        // TODO: we are assuming the diagnostic is only on a single line, 
        // we should test this during testing
        const previousDiag = origDiagnostics
            .filter(diag => ! changedLineNums.has(diag.range.start.line))

        const changedLines = [...changedLineNums]
            .map(lineNum => document.lineAt(lineNum))
        
        const newDiag = this.genLinesDiagnostics(changedLines)

        return previousDiag.concat(newDiag)

    }

    /**
     * Generate diagnostics for the entire document
     * @param document the entire text document currently being edited
     * @returns a list of diagnostic data
     */
    public genAllDiagnostic(document: TextDocument): Diagnostic[] {
        const allLines = range(0, document.lineCount)
            .map(lineNum => document.lineAt(lineNum))

        return this.genLinesDiagnostics(allLines)
        
    }

}
