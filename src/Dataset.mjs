const buildTree = (f, s, e, T) => {
    const isLeaf = (e - s) <= T
    let [ minX, minY ] = f(s)
    let [ maxX, maxY ] = f(e)
    let left
    let right
    if (isLeaf) {
        for (let i = s; i <= e; i ++) {
            const y = f(i)[1]
            if (minY > y) {
                minY = y
            }
            if (maxY < y) {
                maxY = y
            }
        }
    } else {
        const h = Math.floor((e - s) / 2)
        const m = s + h
        left = buildTree(f, s, m, T)
        right = buildTree(f, m, e, T)
        minY = Math.min(left.minY, right.minY)
        maxY = Math.max(left.maxY, right.maxY)
    }
    return {
        s,
        e,
        minX,
        minY,
        maxX,
        maxY,
        left,
        right
    }
}

class Dataset {

    constructor(legend = '', options = {}) { // TODO use mergeOptions
        if (!('lineColor' in options)) {
            const f = () => Math.round(Math.random() * 256)
            options.lineColor = `rgb(${f()},${f()},${f()})`
        }
        if (!('isStepped' in options)) {
            options.isStepped = false
        }
        if (!('lineWidth' in options)) {
            options.lineWidth = 1
        }
        if (!('pointRadius' in options)) {
            options.pointRadius = 0
        }
        this.legend = legend
        this.options = options
    }

    compile(extract, size, T = 100) {
        this.extract = extract
        this.size = size
        this.tree = buildTree(extract, 0, size - 1, T)
    }

    getBoundingRect() { // TODO use tree
        let minX = null
        let maxX = null
        let minY = null
        let maxY = null
        const { extract, size } = this
        for (let i = 0; i < size; i ++) {
            const [ x, y ] = extract(i)
            if (minX === null || minX > x) {
                minX = x
            }
            if (maxX === null || maxX < x) {
                maxX = x
            }
            if (minY === null || minY > y) {
                minY = y
            }
            if (maxY === null || maxY < y) {
                maxY = y
            }
        }
        const rect = new DOMRect(minX, minY, maxX - minX, maxY - minY)
        rect.minX = minX
        rect.minY = minY
        rect.maxX = maxX
        rect.maxY = maxY
        return rect
    }
}

export default Dataset
