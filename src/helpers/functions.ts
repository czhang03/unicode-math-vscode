/**
 * Give the max of an array with respect to some function
 * @param by compute the values to compare
 * @param arr the array to compare
 * @returns the max element in arr with respect to `by`, and `null` if the array is empty
 */
export function maxBy<T>(by: (elem: T) => number, arr: T[]): T | null {
    if (arr.length === 0) { return null }
    else {
        const [head, tail] = [arr[0], arr.slice(1)]
        return tail.reduce(
            (elem, curMax) => by(curMax) >= by(elem) ? curMax : elem, head
        )
    }
}


/**
 * get the range from start to end
 * @param start the starting number, inclusive
 * @param end the ending number, noninclusive
 * @returns a list that contains all the numbers in between (do not include the end)
 */
export function range(start: number, end: number): number[] {
    const length = end - start
    return [...Array(length).keys()].map(elem => elem + start)
}

/**
 * Return the unique elements of a array
 * This function do not guarantee the order of the elements
 * @param arr the input array
 * @returns a array that contains all the unique elements of the input array 
 */
export function unique<T>(arr: T[]): T[] {
    return [...new Set(arr)]
}


/**
 * Given a list of conditions, return if any of them are equal to true
 * @param conditions a list of conditions
 * @returns whether any of the given condition is true
 */
export function any(conditions: boolean[]): boolean {
    for (const condition of conditions) {
        if (condition) { return true }
    }
    return false
}


/**
 * Given a list of conditions, return if all of them are equal to true
 * @param conditions a list of conditions
 * @returns whether any of the given condition is true
 */
export function all(conditions: boolean[]): boolean {
    for (const condition of conditions) {
        if (!condition) { return false }
    }
    return true
}

/**
 * Take the cartesian product of multiple arrays
 * @param arrs a collection of arrays
 * @returns The cartition product of these arrays
 */
export function product<T>(...arrs: T[][]): T[][] {
    return arrs.reduce<T[][]>((acc, lastArr) =>
        acc.flatMap(productEle => lastArr.map(ele => [...productEle, ele]))
        , [[]])
}


/**
 * escape a string for regex
 * 
 * TODO: use `Regex.escape` when using newer version of js
 * @param str input string
 * @returns the escaped regex string
 */
export function regexEscape(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}