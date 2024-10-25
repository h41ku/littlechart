const buildTree = (source, s, e, T) => {
    const isLeaf = (e - s) <= T
    let [ minX, minY ] = source.at(s)
    let [ maxX, maxY ] = source.at(e)
    let left
    let right
    if (isLeaf) {
        for (let i = s; i <= e; i ++) {
            const y = source.at(i)[1]
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
        left = buildTree(source, s, m, T)
        right = buildTree(source, m, e, T)
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
        if (!('groupId' in options)) {
            options.groupId = null
        }
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
        if (!('lineDash' in options)) {
            options.lineDash = []
        }
        if (!('pointRadius' in options)) {
            options.pointRadius = 0
        }
        this.legend = legend
        this.options = options
    }

    compile(source, T) {
        this.source = source
        this.rebuild(T)
    }

    rebuild(T = 100) {
        const source = this.source
        const length = source.length
        this.tree = length > 0 ? buildTree(source, 0, length - 1, T) : null
    }

    getExtrems(initialMinX = null, initialMinY = null, initialMaxX = null, initialMaxY = null) { // TODO use tree
        let minX = initialMinX
        let maxX = initialMaxX
        let minY = initialMinY
        let maxY = initialMaxY
        const { source } = this
        for (let i = 0, n = source.length; i < n; i ++) {
            const [ x, y ] = source.at(i)
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
        return { minX, minY, maxX, maxY }
    }

    getBoundingRect() { // DEPRECATED
        const { minX, minY, maxX, maxY } = this.getExtrems()
        const rect = new DOMRect(minX, minY, maxX - minX, maxY - minY)
        rect.minX = minX
        rect.minY = minY
        rect.maxX = maxX
        rect.maxY = maxY
        return rect
    }
}

export default Dataset
