/* eslint-disable jsdoc/require-jsdoc */
import * as path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { runTests } from '@vscode/test-electron'

const curDir = dirname(fileURLToPath(import.meta.url))

async function main() {
	try {
		// The folder containing the Extension Manifest package.json
		// Passed to `--extensionDevelopmentPath`
		const extensionDevelopmentPath = path.resolve(curDir, '../../')

		// The path to the extension test script
		// Passed to --extensionTestsPath
		const extensionTestsPath = path.resolve(curDir, './suite/index.js')

		// Download VS Code, unzip it and run the integration test
		await runTests({ extensionDevelopmentPath, extensionTestsPath })
	} catch (err) {
		console.error(err)
		console.error("Failed to run tests.")
		process.exit(1)
	}
}

void main()
