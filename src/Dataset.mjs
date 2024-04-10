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
        this.points = []
    }

    getBoundingRect() {
        let minX = null
        let maxX = null
        let minY = null
        let maxY = null
        for (let i = 0, points = this.points, n = points.length; i < n; i ++) {
            const [ x, y ] = points[i]
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
