import { window, ExtensionContext, languages, TextDocument, Position, commands, Uri, workspace } from "vscode"
import { UnicodeMath } from "./unicodeMath"

/**
 * Function to run when the extension is activated 
 * 
 * @param context the editor context
 */
export function activate(context: ExtensionContext) {

    // get trigger string from setting
    const triggerStrs = workspace.getConfiguration().get("unicodeMath.TriggerStrings") as string[]

    const unicodeMath = new UnicodeMath(triggerStrs)

    // register config change 
    workspace.onDidChangeConfiguration(async (changeEvent) => {        
        if (changeEvent.affectsConfiguration("unicodeMath.TriggerStrings")) {
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
	})

    // register the completion provider
    const completionProvider = languages.registerCompletionItemProvider(
        '*',
        {
            provideCompletionItems(document: TextDocument, position: Position) {
                return unicodeMath.provideCompletion(document, position)
            }
        },
        ...triggerStrs  // trigger completion on slash
    )
    context.subscriptions.push(completionProvider)

    // register tab commit
    context.subscriptions.push(commands.registerCommand('unicode-math-input.commit', () => unicodeMath.commit('tab')))
    context.subscriptions.push(commands.registerCommand('unicode-math-input.symbols_html', () => {
        void commands.executeCommand('open', Uri.parse('https://github.com/mvoidex/UnicodeMath/blob/master/table.md'))
    }))

    console.debug("extension activated")
}
