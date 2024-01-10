/* eslint-disable jsdoc/require-jsdoc */
import * as path from 'path'
import * as Mocha from 'mocha'
import { glob } from 'glob'

export async function run(): Promise<void> {
	// Create the mocha test
	const mocha = new Mocha({
		ui: 'tdd'
	})
 
	const testsRoot = path.resolve(__dirname, '..')
	const testFiles = await glob('**/**.test.js', { cwd: testsRoot })

	return new Promise((c, e) => {
		testFiles.forEach(f => mocha.addFile(path.resolve(testsRoot, f)))
		try {
			// Run the mocha test
			mocha.run(failures => {
				if (failures > 0) {
					e(new Error(`${failures} tests failed.`))
				} else {
					c()
				}
			})
		} catch (err) {
			console.error(err)
			e(err)
		}
	})
}
