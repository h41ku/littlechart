const findLess = (getter, low, high, key) => {
    let result = -1
    while (low <= high) {
        let mid = low + Math.floor((high - low + 1) / 2)
        let midVal = getter(mid)
        if (midVal < key) {
            result = mid
            low = mid + 1
        } else if (midVal > key) {
            high = mid - 1
        } else if (midVal === key) {
            high = mid - 1
        }
    }
    return result
}

export {

    findLess
}
