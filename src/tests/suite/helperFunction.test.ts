import { assert, property, string, func, integer, array, float, double} from "fast-check"
import {maxBy, all} from "../../helpers/functions"

suite("Test Cases For maxby Function", () => {

    test('will return null when given a empty list', () => {
        assert(property(func(float()) , (by) => {
            return maxBy(by, []) === null
        }))
    })

    test('maxBy cannot be null when the input array is not empty', () => {
        assert(property(array(float(), {minLength: 1}), func(double()) , (strArr, by) => {
            return maxBy(by, strArr) !== null
        }))
    })

    test('The element mapped should be larger than any other element', () => {
        assert(property(array(string()), func(integer()) , (strArr, by) => {
            const max = maxBy(by, strArr)
            if (max !== null){
                return all(strArr.map(elem => by(max) >= by(elem)))
            }
            else {return true}
        }))
    })

})