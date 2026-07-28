/* eslint-disable jsdoc/require-jsdoc */
import * as path from 'path'
import Mocha from 'mocha'
import { glob } from 'glob'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const curDir = dirname(fileURLToPath(import.meta.url))

export async function run(): Promise<void> {
	// Create the mocha test
	const mocha = new Mocha({
		ui: 'tdd'
	})

	const testsRoot = path.resolve(curDir, '..')
	const testFiles = await glob('**/**.test.js', { cwd: testsRoot })

	return new Promise((resolve, reject) => {
		testFiles.forEach(f => mocha.addFile(path.resolve(testsRoot, f)))
		// Run the mocha test
		mocha.run(failures => {
			if (failures > 0) {
				reject(new Error(`${String(failures)} tests failed.`))
			} else {
				resolve()
			}
		})
	})
}
