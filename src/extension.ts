import {ExtensionContext, languages, TextDocument, Position, commands, Uri } from "vscode"
import {evalPosition, genCompletions, tabCommit} from "./unicodeMath"

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
                console.debug("completion triggered, evaluating current position...")
                const [target, word] = evalPosition(document, position) ?? [null, null]
                if (!target || !word) { return [] }
                console.log(`trying to provide completion for ${word}`)
                return genCompletions(word, target)
            }
        },
        "\\"  // trigger completion on slash
    )
    context.subscriptions.push(completionProvider)

    // register tab commit
    context.subscriptions.push(commands.registerCommand('unicode-math-input.commit', () => tabCommit('tab')))
    context.subscriptions.push(commands.registerCommand('unicode-math-input.symbols_html', () => {
        void commands.executeCommand('open', Uri.parse('https://github.com/mvoidex/UnicodeMath/blob/master/table.md'))
    }))

    console.debug("extension activated")
}
