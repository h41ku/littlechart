const isObject = o => typeof o === 'object'
const isArray = a => a instanceof Array

export default function mergeObjects(a, b) {
    const result = { ...a, ...b }
    Object.entries(b).forEach(({ 0: k, 1: v }) => {
        if (k in a && isObject(v) && !isArray(v) && v !== null) {
            result[k] = mergeObjects(a[k], v)
        }
    })
    return result
}
