/**
 * Give the max of an array with respect to some function
 *
 * @param by compute the values to compare
 * @param arr the array to compare
 * @returns the max element in arr with respect to `by`, and `null` if the array is empty
 */
export function maxBy<T, TComp>(by: (elem: T) => TComp, arr: Array<T>): T | null {
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
 * 
 * @param start the starting number, inclusive
 * @param end the ending number, noninclusive
 * @returns a list that contains all the numbers in between (do not include the end)
 */
export function range(start: number, end: number): number[] {
    const length = end - start + 1 
    return [...Array(length).keys()].map(elem => elem + start)
}

/**
 * Return the unique elements of a array
 * This function do not guarantee the order of the elements
 * 
 * @param arr the input array
 * @returns a array that contains all the unique elements of the input array 
 */
export function unique<T>(arr: T[]): T[] {
    return [...new Set(arr)]
}