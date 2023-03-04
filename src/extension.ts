import {ExtensionContext, languages, TextDocument, Position, commands, Uri } from "vscode"
import {provideCompletion, tabCommit, triggerStrs} from "./unicodeMath"

/**
 * Function to run when the extension is activated 
 * 
 * @param context the editor context
 */
export function activate(context: ExtensionContext) {
    console.debug("activating extension")

    // register the completion provider
    const completionProvider = languages.registerCompletionItemProvider(
        '*',
        {
            provideCompletionItems(document: TextDocument, position: Position) {
                return provideCompletion(document, position)
            }
        },
        ...triggerStrs  // trigger completion on slash
    )
    context.subscriptions.push(completionProvider)

    // register tab commit
    context.subscriptions.push(commands.registerCommand('unicode-math-input.commit', () => tabCommit('tab')))
    context.subscriptions.push(commands.registerCommand('unicode-math-input.symbols_html', () => {
        void commands.executeCommand('open', Uri.parse('https://github.com/mvoidex/UnicodeMath/blob/master/table.md'))
    }))

    console.debug("extension activated")
}
