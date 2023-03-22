import * as fc from "fast-check"
import {testing} from "../../unicodeMath"
import { symbols } from '../../symbols'


// strings with prefix from prefixes
// for example, "\Bbb", "\_" etc. 
const prefixedString = fc.constantFrom(...testing.prefixes)
                        .chain((prefix) => 
                            fc.string().map((str) => prefix.concat(str)))

// simply random strings
const randString = fc.string()

// a random symbol
const symbolStrings = fc.constantFrom(...symbols.keys())

// either a prefixed string or a random string with 50/50 chance on each
const prefixedOrRandStr = fc.oneof(prefixedString, randString)



suite("Test Cases For `stripPrefix` function", () => {
    test('original string should ends with striped string', () => {
        fc.assert(fc.property(prefixedOrRandStr, (original) => {
            const [type, withoutPrefix] = testing.stripPrefix(original) ?? [null, null]
            if (type !== null && withoutPrefix !== null) {
                return original.endsWith(withoutPrefix)
            }
            else {return true}
        }))
    })

    test('string cannot be striped cannot start with any prefix', () => {
        fc.assert(fc.property(prefixedOrRandStr, (original) => {
            const [type, withoutPrefix] = testing.stripPrefix(original) ?? [null, null]

            if (type === null || withoutPrefix === null) {
                return testing.prefixes
                    .filter((prefix) => original.startsWith(prefix))
                    .length === 0
            }   

            else {return true}
        }))
    })
})


suite("Test Cases For `convertString` function", () => {
    test('if a symbol does not start with prefix, it will be converted to its unicode in symbols', () =>{
        fc.assert(fc.property(symbolStrings, (symbolStr) => {
            const notStartWithPrefix = 
                testing.prefixes.filter((prefix) => symbolStr.startsWith(prefix)).length === 0
            
            const converted = testing.convertString(symbolStr)

            if (notStartWithPrefix) {
                return converted !== null && 
                    testing.convertString(symbolStr) === symbols.get(symbolStr)
            } else {return true}
        }))
    })
})