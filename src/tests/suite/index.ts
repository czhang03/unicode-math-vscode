/* eslint-disable @typescript-eslint/no-unsafe-call */
import * as path from 'path'
import * as Mocha from 'mocha'
import * as glob from 'glob'

/**
 * Runs all tests in this folder, see
 * https://code.visualstudio.com/api/working-with-extensions/testing-extension
 * for detail.
 */
export function run(): Promise<void> {
	// Create the mocha test
	const mocha = new Mocha({
		ui: 'tdd'
	})
 
	const testsRoot = path.resolve(__dirname, '..')

	return new Promise((c, e) => {
		glob('**/**.test.js', { cwd: testsRoot }, (err, files: string[]) => {
			if (err === null) {
				return e(err)
			}

			// Add files to the test suite
			files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)))

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
	})
}
