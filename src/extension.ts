import { window, ExtensionContext, languages, TextDocument, Position, commands, workspace, CodeActionKind, CodeActionProvider, Range, Selection, CodeActionContext, CancellationToken, CodeAction, WorkspaceEdit } from "vscode"
import { convertibleDiagnosticsCode } from "./helpers/const"
import { UnicodeMath} from "./unicodeMath"

const triggerStrs = 
        (workspace.getConfiguration().get("unicodeMath.TriggerStrings") as string[])
        .concat(workspace.getConfiguration().get("unicodeMathInput.TriggerStrings") as string[])

/**
 * Dynamically check whether the extension should be enabled in current document
 * 
 * @param document the current active document
 * @returns whether the extension should be disabled in current document
 */
function enabled(document?: TextDocument) : boolean {
    const disabledLanguageIDs = new Set(workspace.getConfiguration().get("unicodeMathInput.disableInLanguages") as string[])

    const docLanguageID = document?.languageId ?? window.activeTextEditor?.document.languageId

    // when no document was provided, extension should not enabled
    if (docLanguageID === undefined) {return false}
    // check if the language of current document is disabled
    else if (disabledLanguageIDs.has(docLanguageID)) {return false}
    // if it does not match all the condition above, then it should be enabled
    else {return true}
}



/**
 * Function to run when the extension is activated 
 * 
 * @param context the editor context
 */
export function activate(context: ExtensionContext) {

    // create class with trigger string
    const unicodeMath = new UnicodeMath(triggerStrs)

    // register the completion provider
    const completionProvider = languages.registerCompletionItemProvider(
        '*',
        {
            provideCompletionItems(document: TextDocument, position: Position) {
                // return completion only when it is enabled
                return enabled(document) ? unicodeMath.provideCompletion(document, position) : []
            }
        },
        ...triggerStrs  // trigger completion on slash
    )
    context.subscriptions.push(completionProvider)

    // register tab commit
    context.subscriptions.push(commands.registerCommand('unicode-math-input.commit', async () => 
        { if (enabled()) { await unicodeMath.commit('tab') } 
            else {await commands.executeCommand("tab")} 
        }))

    // register diagnostic
    const convertibleDiagnostics = languages.createDiagnosticCollection("unicode-math-input.convertible")
    context.subscriptions.push(convertibleDiagnostics)
    // generate all the diagnostics
    if (window.activeTextEditor !== undefined && enabled(window.activeTextEditor.document)) {
        convertibleDiagnostics.set(
            window.activeTextEditor.document.uri,
            unicodeMath.genAllDiagnostic(window.activeTextEditor.document)
        )
    }

    // refresh diagnostic on editor change
    context.subscriptions.push(
        window.onDidChangeActiveTextEditor(editor => {
            const enabledInCurEditor = enabled(editor?.document)
            if (editor !== undefined && 
                ! convertibleDiagnostics.has(editor.document.uri) && 
                enabledInCurEditor) {

                convertibleDiagnostics.set(
                    editor.document.uri,
                    unicodeMath.genAllDiagnostic(editor.document)
                )

            }
            else if (editor !== undefined && ! enabledInCurEditor) {
                convertibleDiagnostics.delete(editor.document.uri)
            }
            else if (editor !== undefined) {  // when not enabled
                convertibleDiagnostics.delete(editor?.document.uri)
            }
        })
    )
    // refresh diagnostic on text change
    context.subscriptions.push(
        workspace.onDidChangeTextDocument(e => {
            // TODO: we are generating new diagnostic all the time after a text change
            // probably not efficient, but the logic of moving around diagnostics are complicated
            const curDocument = e.document
            const curURI = curDocument.uri
            const curEnabled = enabled(curDocument)
            if (curEnabled) {
                convertibleDiagnostics.set(
                    curURI,
                    unicodeMath.genAllDiagnostic(curDocument)
                )
            }
            // do nothing if current document is not enabled
            // the diagnostic for current document should already be removed
        })
    )
    // remove diagnostic data when closed
    context.subscriptions.push(
        workspace.onDidCloseTextDocument(doc => convertibleDiagnostics.delete(doc.uri))
    )
    
    // register code action 
    context.subscriptions.push(
		languages.registerCodeActionsProvider('*', new UnicodeConvertAction(), {
			providedCodeActionKinds: [ CodeActionKind.QuickFix ]
		})
	)

    // register config change 
    //  - changing trigger string requires reloading window to re-register the completion provider.
    //      TODO: think about if there is a way to change trigger string without reloading.
    //  - on change the disabled language, check the current active editor, and delete the diagnostic when necessary
    workspace.onDidChangeConfiguration(async (changeEvent) => {
        if (changeEvent.affectsConfiguration("unicodeMath.TriggerStrings") ||
            changeEvent.affectsConfiguration("unicodeMathInput.TriggerStrings")) {
            console.debug("Trigger Strings updated, reloading the extension")
            const selection =
                await window.showWarningMessage(
                    "Trigger string changed, please reload window for the change to take effect",
                    "reload"
                )

            if (selection === "reload") {
                console.debug("reload selected, trying to reload current window")
                void commands.executeCommand("workbench.action.reloadWindow")
            }
        }

        if (changeEvent.affectsConfiguration("unicodeMathInput.disableInLanguages") ) {
            const curDocument = window.activeTextEditor?.document
            if (! (curDocument === undefined) && ! enabled(curDocument)) {
                convertibleDiagnostics.delete(curDocument.uri)
            }
        }
    })

    console.debug("extension activated")
}

export class UnicodeConvertAction implements CodeActionProvider {

    private unicodeMath = new UnicodeMath(triggerStrs)

	provideCodeActions(document: TextDocument, _range: Range | Selection, context: CodeActionContext, _token: CancellationToken): CodeAction[] {

		// for each diagnostic entry that has the matching `code`, create a code action command
		return context.diagnostics
			.filter(diagnostic => diagnostic.code === convertibleDiagnosticsCode)
			.map(diagnostic => {
                // generate the possible conversion corresponding to the diagnostic
                const text = document.getText(diagnostic.range)
                const possibleConversions = this.unicodeMath.getPossibleConversions(text)

                // generate a code action for each diagnostic
                return possibleConversions.map((unicode) => {

                    const action = new CodeAction(`convert to ${unicode}`, CodeActionKind.QuickFix)
                    action.diagnostics = [diagnostic]
                    action.isPreferred = true                    
                    action.edit = new WorkspaceEdit()
                    action.edit.replace(document.uri, diagnostic.range, unicode)

                    return action
                })
            }).flat()
	}
}