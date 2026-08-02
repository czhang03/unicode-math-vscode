import {
    TextDocument, Position, Range, CompletionItem,
    TextEditorEdit, commands, window, CompletionItemKind, SnippetString, Diagnostic, TextLine, TextDocumentChangeEvent, DiagnosticSeverity
} from "vscode"
import { supsMap, subsMap, boldMap, italicMap, calMap, frakMap, bbMap, sfMap, ttMap, scrMap, scMap } from "./charMaps.js"
import { symbols } from './symbols.js'
import { Font, StrWithRange, Triggers } from "./helpers/types.js"
import { convertibleDiagnosticsCode, doNotWarnCurLineString, SPACE_KEY, wordRegex } from "./helpers/const.js"
import { maxBy, range, regexEscape, unique } from "./helpers/functions.js"
import { fontCommands, prefixToFontType } from "./extension.js"

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
        .map(([prefix, font]) => [font, word.match(`^${regexEscape(prefix)}{(.*)}$`)] as [Font, RegExpMatchArray | null])
        // filters out the match failure
        .filter((res): res is [Font, RegExpMatchArray] => (res[1] !== null))
        // return the matched string (first match group after the entire string) and the font to convert
        .map(([font, match]) => [font, match[1]] as [Font, string])

    if (matchedFonts.length === 0) { return null }
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
 * A helper function that pick where given a trigger, a string prefixed with trigger, and the total range of the trigger,
 * pick the "last trigger" (defined by the end of the trigger string),
 * then split the trigger and the rest of the string into two `StrWithRange`, each with its content and ranges.
 * @param possibleTriggers each trigger with its rest of the string, and the range of the entire string with trigger
 * @returns range and str of the trigger and the rest of the string
 */
function pickTrigger(possibleTriggers: [string, string, Range][]): [StrWithRange, StrWithRange] | null {
    const pickedTrigger = maxBy(([trigger, _str, range]) => range.start.character + trigger.length, possibleTriggers)

    if (pickedTrigger === null) { return null }  // the input `possibleTriggers` is empty
    else {
        const [trigger, str, range] = pickedTrigger

        const triggerEnd = range.start.translate(0, trigger.length - 1)
        const triggerRange = new Range(range.start, triggerEnd)

        const strStart = triggerEnd.translate(0, 1)
        const strRange = new Range(strStart, range.end)

        return [
            { str: trigger, range: triggerRange },
            { str: str, range: strRange }
        ]
    }
}




export class UnicodeMath {
    /**
     * All possible trigger string
     * 
     * Invariant: allTriggerStr should be equal to `this.genericTriggers + fontTriggers.keys()`
     */
    private readonly allTriggerStrs: string[]
    /**
     * Generic trigger string, used to trigger completion and commit
     */
    private readonly genericTriggers: string[]
    /**
     * Font trigger string, used to trigger a font command. 
     */
    private readonly fontTriggers: Map<string, Font>

    constructor(allTriggerStrs: string[], triggers: Triggers) {
        this.allTriggerStrs = allTriggerStrs
        this.genericTriggers = triggers.generic
        this.fontTriggers = triggers.fonts

        console.debug("unicode math input object created")
        console.debug(`all trigger strings are as follows: ${allTriggerStrs.toString()}`)
        console.debug(`generic trigger strings are as follows: ${this.genericTriggers.toString()}`)
        console.debug(`font trigger strings are as follows: ${Array.from(this.fontTriggers).toString()}`)
    }

    /**
     * Given a user inputted string, convert it into unicode, 
     * return null if it cannot be converted
     * @param trigger the trigger string, used to see if it is a font trigger
     * @param str a input string, typed in the editor by the user
     * @returns the unicode version of the input string
     */
    private convertString(trigger: string, str: string): string | null {

        // if the trigger is a font trigger then add the trigger back        
        // TODO: This logic is not ideal, as we already know the font when the trigger is a font trigger
        // but we off load getting the font from prefix to the `getFont` function again.
        const font = this.fontTriggers.get(trigger)
        const contentWithFontPrefix =
            font !== undefined ? trigger + str : str

        // if the trigger string is a generic trigger
        const tryFontStr = getFont(contentWithFontPrefix)

        // if a prefix cannot be found, then fallback to search in symbols
        if (tryFontStr === null) {
            return symbols.get(contentWithFontPrefix) ?? null
        }
        // if prefix can be found, using prefix
        else {
            const [font, content] = tryFontStr
            console.debug(`converting string ${content} with font ${font}`)
            return toFont(content, font)
        }
    }



    /**
     * Generate generic completion from a generic trigger string
     * @param trigger the trigger string that triggered current completion, for example "\"
     * @param totalRange the range from the start of the trigger string to then end of the word
     * @returns a list of completion items that are available in the current context
     */
    private genGenericCompletions(trigger: string, totalRange: Range): CompletionItem[] {
        console.debug(`generic completion triggered by ${trigger}`)

        // completion for all the font command
        // ignoring all the trigger font command, because trigger font command will not commit/diagnositic properly
        // since the commit and diagnostic looks for the closest trigger string.
        const prefixCompletionItems = fontCommands
            .filter(prefix => this.fontTriggers.get(prefix) === undefined)
            .map(prefix => {
                // readable font displayed to the user
                const font = prefixToFontType.get(prefix)
                const completionLabel = trigger.concat(prefix).concat(`{...${font ?? ""}}`)
                const completion =
                    new CompletionItem(completionLabel, CompletionItemKind.Snippet)
                // ensure that prefix completion are ranked first
                completion.sortText = `00-${completionLabel}`
                completion.detail = font?.concat(" prefix")
                completion.filterText = trigger.concat(prefix)
                completion.range = totalRange
                // insert text will contain either the font as template or `...`
                completion.insertText = new SnippetString(`${trigger}${prefix}{\${1:${font ?? "..."}}}`)
                return completion
            })

        console.debug(`prefix completions: 
            ${prefixCompletionItems
                .map(completion => {
                    if ((typeof completion.label) === "string") {
                        return completion.label
                    } else { return completion.label.label }
                }).toString()
            }`)

        // generate completion item for unicode symbols
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
     * Generate the completion item for font trigger strings
     * @param fontTrigger the string that triggered this font completion
     * @param font the font indicated by the trigger string
     * @param totalRange the range of all the word until the cursor.
     * @returns a list of completion items that includes font command prefix and single character after the font command
     */
    private genFontTriggerCompletions(fontTrigger: string, font: Font, totalRange: Range): CompletionItem[] {

        // generate completion for prefix command
        const completionLabel = fontTrigger.concat(`{${font}}`)
        const prefixCompletion = new CompletionItem(completionLabel, CompletionItemKind.Snippet)
        // ensure prefix completion is at the top
        prefixCompletion.sortText = `00-${completionLabel}`
        prefixCompletion.filterText = fontTrigger
        prefixCompletion.detail = `${font} prefix`
        prefixCompletion.range = totalRange
        // insert text will contain either the font as template or `...`
        prefixCompletion.insertText = new SnippetString(`${fontTrigger}{\${1:${font}}}`)

        // generate completion for single character
        const fontCharCompletions = Array.from(fontToMap(font).entries()).map(
            ([char, unicodeChar]) => {
                const completionLabel = fontTrigger.concat(char)
                const prefixCompletion = new CompletionItem(completionLabel, CompletionItemKind.Constructor)
                prefixCompletion.detail = `${char} in ${font} font: ${unicodeChar}`
                prefixCompletion.range = totalRange
                // insert text will contain either the font as template or `...`
                prefixCompletion.insertText = unicodeChar

                return prefixCompletion
            }
        )

        return fontCharCompletions.concat([prefixCompletion])
    }

    /**
     * Provide the completion items given the current document and cursor position
     * @param document the current document on the editor
     * @param position the cursor position
     * @returns a list of completion item that is valid to the current position
     */
    public provideCompletion(document: TextDocument, position: Position): CompletionItem[] {
        const posContext = this.evalPosition(document, position)
        if (posContext === null) {
            return []
        }
        else {
            const [triggerWithRange, wordWithRange] = posContext
            const triggerRange = triggerWithRange.range
            const wordRange = wordWithRange.range
            // use generic trigger strings
            if (this.genericTriggers.includes(triggerWithRange.str)) {
                return this.genGenericCompletions(
                    triggerWithRange.str, triggerRange.union(wordRange)
                )
            }
            // provide font trigger strings
            const font = this.fontTriggers.get(triggerWithRange.str)
            if (font !== undefined) {
                return this.genFontTriggerCompletions(
                    triggerWithRange.str, font, triggerRange.union(wordRange)
                )
            }

            console.error("provide completion failed")
            return []
        }
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
        const triggerStrsWithRange = this.allTriggerStrs
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

                    const posContext = this.evalPosition(window.activeTextEditor.document, position)

                    if (posContext !== null) {
                        const [triggerWithRange, wordWithRange] = posContext
                        console.debug(`trying to commit ${wordWithRange.str} with trigger ${triggerWithRange.str}`)
                        // the total range of word including trigger
                        const totalRange = triggerWithRange.range.union(wordWithRange.range)
                        const changed = this.convertString(triggerWithRange.str, wordWithRange.str)
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
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!c || key === SPACE_KEY) { return doKey() }
    }

    /**
     * Generate all the possible conversions for a string including triggers
     * @param stringWithTrigger a string with triggers
     * @returns a list of possible unicode conversions
     */
    public getPossibleConversions(stringWithTrigger: string): string[] {
        const validTriggers = this.allTriggerStrs.filter(trigger => stringWithTrigger.startsWith(trigger))

        return validTriggers
            .map((trigger) => {
                const content = stringWithTrigger.slice(trigger.length)
                return this.convertString(trigger, content)
            })
            .filter(res => res !== null)
    }

    /**
     * Generate diagnostic for given lines
     * the diagnostic includes all the symbols that can be converted
     * @param lines the TextLines that needs to generate diagnostics
     * @returns a list of diagnostics 
     */
    private genLinesDiagnostics(lines: TextLine[]): Diagnostic[] {
        return lines
            .filter(line => !line.text.includes(doNotWarnCurLineString))
            .map(line => [...line.text.matchAll(wordRegex)]
                .map(match => {

                    const word = match[0]
                    const wordStart = match.index

                    const possibleConversions = this.getPossibleConversions(word)

                    if (possibleConversions.length === 0) { return null }
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
            .filter(diag => !changedLineNums.has(diag.range.start.line))

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
