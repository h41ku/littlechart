import { isZero, vec2, vec2copy, vec2add, vec2sub, vec2mul, vec2div, vec2muladd, vec2neglerp } from './vec2.mjs'
import TouchGestures from './TouchGestures.mjs'

function isIntersects(r1, r2) {
    return r1.bottom > r2.top 
        && r1.right > r2.left 
        && r1.top < r2.bottom 
        && r1.left < r2.right
}

function isNodesIntersects(nodes) { // TODO optimize, test only half of array
    const n = nodes.length 
    for (let i = 0; i < n; i ++) {
        for (let j = 0; j < n; j ++) {
            if (i === j) {
                continue
            }
            if (isIntersects(nodes[i].boundingRect, nodes[j].boundingRect)) {
                return true
            }
        }
    }
    return false
}

class Chart {

    constructor(elCanvas, options = {}) {
        if (!('xCanvasStep' in options)) {
            options.xCanvasStep = 25
        }
        if (!('yCanvasStep' in options)) {
            options.yCanvasStep = 25
        }
        if (!('xAxisStep' in options)) {
            options.xAxisStep = 1
        }
        if (!('yAxisStep' in options)) {
            options.yAxisStep = 1
        }
        if (!('xOffset' in options)) {
            options.xOffset = 0
        }
        if (!('yOffset' in options)) {
            options.yOffset = 0
        }
        if (!('xScale' in options)) {
            options.xScale = 1
        }
        if (!('yScale' in options)) {
            options.yScale = 1
        }
        if (!('xAxisSubdivisions' in options)) {
            options.xAxisSubdivisions = 10.0
        }
        if (!('yAxisSubdivisions' in options)) {
            options.yAxisSubdivisions = 10.0
        }
        if (!('fontSize' in options)) {
            options.fontSize = 15
        }
        if (!('fontFamily' in options)) {
            options.fontFamily = 'monospace'
        }
        if (!('xAxisLabelXOffset' in options)) {
            options.xAxisLabelXOffset = 0
        }
        if (!('xAxisLabelYOffset' in options)) {
            options.xAxisLabelYOffset = 0
        }
        if (!('xAxisLabelDynamicPosition' in options)) {
            options.xAxisLabelDynamicPosition = true
        }
        if (!('xAxisLabelSpacing' in options)) {
            options.xAxisLabelSpacing = options.fontSize
        }
        if (!('xAxisLabelFormat' in options)) {
            options.xAxisLabelFormat = x => x.toFixed(4)
        }
        if (!('xAxisLabelJoiningStep' in options)) {
            options.xAxisLabelJoiningStep = 5.0
        }
        if (!('xAxisLabelMarkOffset' in options)) {
            options.xAxisLabelMarkOffset = -2
        }
        if (!('xAxisLabelMarkSize' in options)) {
            options.xAxisLabelMarkSize = 4
        }
        if (!('xAxisLabelDisplayZero' in options)) {
            options.xAxisLabelDisplayZero = true
        }
        if (!('xAxisLabelEnable' in options)) {
            options.xAxisLabelEnable = true
        }
        if (!('yAxisLabelXOffset' in options)) {
            options.yAxisLabelXOffset = 0
        }
        if (!('yAxisLabelYOffset' in options)) {
            options.yAxisLabelYOffset = 0
        }
        if (!('yAxisLabelDynamicPosition' in options)) {
            options.yAxisLabelDynamicPosition = true
        }
        if (!('yAxisLabelSpacing' in options)) {
            options.yAxisLabelSpacing = 0
        }
        if (!('yAxisLabelFormat' in options)) {
            options.yAxisLabelFormat = y => y.toFixed(4)
        }
        if (!('yAxisLabelJoiningStep' in options)) {
            options.yAxisLabelJoiningStep = 5.0
        }
        if (!('yAxisLabelMarkOffset' in options)) {
            options.yAxisLabelMarkOffset = -2
        }
        if (!('yAxisLabelMarkSize' in options)) {
            options.yAxisLabelMarkSize = 4
        }
        if (!('yAxisLabelDisplayZero' in options)) {
            options.yAxisLabelDisplayZero = true
        }
        if (!('yAxisLabelEnable' in options)) {
            options.yAxisLabelEnable = true
        }
        if (!('backgroundColor' in options)) {
            options.backgroundColor = '#ffffff'
        }
        if (!('gridColor' in options)) {
            options.gridColor = 'rgba(0,0,0,0.1)'
        }
        if (!('axesColor' in options)) {
            options.axesColor = 'rgba(0,0,0,0.5)'
        }
        if (!('userTranslateX' in options)) {
            options.userTranslateX = true
        }
        if (!('userTranslateY' in options)) {
            options.userTranslateY = true
        }
        if (!('userScaleX' in options)) {
            options.userScaleX = true
        }
        if (!('userScaleY' in options)) {
            options.userScaleY = true
        }
        if (!('canvasRatio' in options)) {
            options.canvasRatio = 1
        }
        if (!('canvasPixelRatio' in options)) {
            options.canvasPixelRatio = 1
        }
        if (!('clearFrame' in options)) {
            options.clearFrame = false
        }
        if (!('bindEventHandlers' in options)) {
            options.bindEventHandlers = true
        }
        this.options = options
        this.elCanvas = elCanvas
        this.ctx = elCanvas.getContext('2d')
        this.scale = vec2(options.xScale, options.yScale)
        this.translate = vec2(options.xOffset, options.yOffset)
        this.datasets = []

        const mouseState = {
            down: false,
            pt0: vec2(0, 0),
            pt: vec2(0, 0),
            delta: vec2(0, 0)
        }

        const pointFromMouseEvent = (r, evt) => {
            const bRect = elCanvas.getBoundingClientRect()
            r[0] = (evt.clientX - bRect.left) / options.canvasRatio
            r[1] = (evt.clientY - bRect.top) / options.canvasRatio
        }

        this.isListening = false
        this.listeners = { }
        this.listeners[TouchGestures.EVT_NAME_POINTERDOWN] = evt => {
            evt.detail.originalEvent.preventDefault()
            mouseState.down = true
            pointFromMouseEvent(mouseState.pt0, evt.detail)
        }
        this.listeners[TouchGestures.EVT_NAME_POINTERUP] = evt => {
            mouseState.down = false
        }
        this.listeners[TouchGestures.EVT_NAME_POINTERMOVE] = evt => {
            if (mouseState.down) {
                pointFromMouseEvent(mouseState.pt, evt.detail)
                vec2sub(mouseState.delta, mouseState.pt, mouseState.pt0)
                vec2copy(mouseState.pt0, mouseState.pt)
                const delta = vec2(
                    options.userTranslateX ? mouseState.delta[0] : 0,
                    options.userTranslateY ? mouseState.delta[1] : 0
                )
                this.move(delta)
                this.repaint()
            }
        }
        this.listeners[TouchGestures.EVT_NAME_POINTERZOOM] = evt => {
            evt.detail.originalEvent.preventDefault()
            const deltaScale = evt.detail.deltaScale
            const delta = vec2(
                options.userScaleX ? deltaScale : 0,
                options.userScaleY ? deltaScale : 0
            )
            pointFromMouseEvent(mouseState.pt, evt.detail)
            this.zoomAroundPoint(delta, mouseState.pt)
            this.repaint()
        }

        this.touchGestures = new TouchGestures(elCanvas)

        if (options.bindEventHandlers) {
            this.bind()
        }
    }

    bind() {

        if (this.isListening) {
            return
        }

        for (let evtName in this.listeners) {
            this.elCanvas.addEventListener(evtName, this.listeners[evtName])
        }
        this.touchGestures.enableTouchGestures()
        this.touchGestures.enableMouseGestures()
        
        this.isListening = true
    }

    unbind() {

        if (!this.isListening) {
            return
        }

        for (let evtName in this.listeners) {
            this.elCanvas.removeEventListener(evtName, this.listeners[evtName])
        }
        this.touchGestures.disableTouchGestures()
        this.touchGestures.disableMouseGestures()

        this.isListening = false
    }

    fitView(boundingRect, keepAspectRatio = true) { 

        let w = this.elCanvas.width
        let h = this.elCanvas.height

        if (w <= 0 || h <= 0 || Math.abs(boundingRect.width) <= 0 || Math.abs(boundingRect.height) <= 0) {
            return false
        }

        const bRect = new DOMRect( // flip by Y
            boundingRect.x,
            -boundingRect.y - boundingRect.height,
            boundingRect.width,
            boundingRect.height
        )

        const opts = this.options

        const px = opts.canvasRatio * opts.canvasPixelRatio
        const canvasStep = vec2(opts.xCanvasStep, opts.yCanvasStep)
        const axesStep = vec2(opts.xAxisStep, opts.yAxisStep)
        w = (w / px / canvasStep[0]) * axesStep[0]
        h = (h / px / canvasStep[1]) * axesStep[1]

        this.scale[0] = w / bRect.width
        this.scale[1] = h / bRect.height
        if (keepAspectRatio) {
            if (this.scale[1] > this.scale[0]) {
                this.scale[1] = this.scale[0]
            } else {
                this.scale[0] = this.scale[1]
            }
        }

        this.translate[0] = -(bRect.x / axesStep[0]) * canvasStep[0] * this.scale[0]
        this.translate[1] = -(bRect.y / axesStep[1]) * canvasStep[1] * this.scale[1]
        if (keepAspectRatio) {
            const dw = (w / this.scale[0] - bRect.width) / 2
            const dh = (h / this.scale[1] - bRect.height) / 2
            this.translate[0] += dw * canvasStep[0] * this.scale[0] / axesStep[0]
            this.translate[1] += dh * canvasStep[1] * this.scale[1] / axesStep[1]
        }

        return true
    }

    fitViewAuto(keepAspectRatio = true) {

        this.fitView(this.getBoundingRect(null, 0, null, 0), keepAspectRatio)
        this.repaint()
    }

    getBoundingRect(initialMinX = null, initialMinY = null, initialMaxX = null, initialMaxY = null) {

        let minX = initialMinX
        let maxX = initialMaxX
        let minY = initialMinY
        let maxY = initialMaxY

        for (let j = 0, m = this.datasets.length; j < m; j ++) {
            const dataset = this.datasets[j]
            for (let i = 0, points = dataset.points, n = points.length; i < n; i ++) {
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
        }

        const rect = new DOMRect(minX, minY, maxX - minX, maxY - minY)
        rect.minX = minX
        rect.minY = minY
        rect.maxX = maxX
        rect.maxY = maxY
        
        return rect
    }

    move(delta) {

        vec2add(this.translate, this.translate, delta)
    }

    zoomAroundPoint(deltaScale, pt) {

        const o = this.translate
        const s = this.scale

        vec2neglerp(o, o, pt, deltaScale)
        vec2muladd(s, s, deltaScale, s)
    }

    repaint() {

        let x
        let y

        const opts = this.options
        const ctx = this.ctx
        const w = this.elCanvas.width
        const h = this.elCanvas.height
        const s = this.scale

        if (w <= 0 || h <= 0 || s[0] === 0 || s[1] === 0) {
            return
        }

        const px = opts.canvasRatio * opts.canvasPixelRatio
        const canvasStep = vec2(opts.xCanvasStep * px, opts.yCanvasStep * px)

        const o = vec2(this.translate[0] * px, this.translate[1] * px)
        const su = vec2(canvasStep[0] * s[0], canvasStep[1] * s[1])
        const u = vec2(opts.xAxisStep, opts.yAxisStep)
        const gridScale = vec2(1, 1)
        const subdivisions = vec2(opts.xAxisSubdivisions, opts.yAxisSubdivisions)

        while (su[0] > canvasStep[0] * subdivisions[0]) { // TODO optimize, remove loop
            su[0] /= subdivisions[0]
            gridScale[0] /= subdivisions[0]
        }
        while (su[1] > canvasStep[1] * subdivisions[1]) { // TODO optimize, remove loop
            su[1] /= subdivisions[1]
            gridScale[1] /= subdivisions[1]
        }
        while (su[0] < canvasStep[0]) { // TODO optimize, remove loop
            su[0] *= subdivisions[0]
            gridScale[0] *= subdivisions[0]
        }
        while (su[1] < canvasStep[1]) { // TODO optimize, remove loop
            su[1] *= subdivisions[1]
            gridScale[1] *= subdivisions[1]
        }

        const stx = o[0] - (Math.floor(o[0] / su[0]) + (o[0] > 0 ? 1 : 0)) * su[0]
        const sty = o[1] - (Math.floor(o[1] / su[1]) + (o[1] > 0 ? 1 : 0)) * su[1]

        // clear
        if (opts.clearFrame) {
            ctx.clearRect(0, 0, w, h)
        }
        ctx.fillStyle = opts.backgroundColor
        ctx.fillRect(0, 0, w, h)

        // draw grid
        ctx.fillStyle = opts.gridColor
        for (let x = stx; x <= w; x += su[0]) {
            ctx.fillRect(x, 0, 1 * px, h)
        }
        for (let y = sty; y <= h; y += su[1]) {
            ctx.fillRect(0, y, w, 1 * px)
        }

        // draw axes
        ctx.fillStyle = opts.axesColor
        ctx.fillRect(o[0], 0, 1 * px, h)
        ctx.fillRect(0, o[1], w, 1 * px)

        // draw datasets
        const transform = (r, p) => {
            vec2mul(r, p, canvasStep)
            vec2div(r, r, u)
            r[1] = -r[1]
            vec2muladd(r, r, s, o)
        }
        const p = vec2()
        for (let i = 0, n = this.datasets.length; i < n; i ++) {
            const dataset = this.datasets[i]
            const points = dataset.points
            const m = points.length
            if (m > 1) {
                ctx.strokeStyle = dataset.options.lineColor
                ctx.lineWidth = dataset.options.lineWidth * px
                ctx.beginPath()
                transform(p, points[0])
                ctx.moveTo(p[0], p[1])
                if (dataset.options.isStepped) {
                    y = p[1]
                    for (let j = 1; j < m; j ++) {
                        transform(p, points[j])
                        ctx.lineTo(p[0], y)
                        ctx.lineTo(p[0], p[1])
                        y = p[1]
                    }
                } else {
                    for (let j = 1; j < m; j ++) {
                        transform(p, points[j])
                        ctx.lineTo(p[0], p[1])
                    }
                }
                ctx.stroke()
            }
        }

        // draw labels
        if (opts.xAxisLabelEnable || opts.yAxisLabelEnable) {
            const fs = opts.fontSize * px
            ctx.font = `${fs}px/1 ${opts.fontFamily}`
            ctx.fillStyle = opts.axesColor
            if (opts.xAxisLabelEnable) {
                const xOffset = opts.xAxisLabelXOffset * px
                const yOffset = opts.xAxisLabelYOffset * px
                const markOffset = opts.xAxisLabelMarkOffset * px
                const markSize = opts.xAxisLabelMarkSize * px
                const spacing = opts.xAxisLabelSpacing * px
                const halfSpacing = spacing / 2
                let labels = []
                let labelsOutOfTopBound = false
                let labelsOutOfBottomBound = false
                for (let x = stx; x <= w; x += su[0]) {
                    const delta = x - o[0]
                    const i = Math.round(delta / su[0]) // index of grid line
                    const t = i * gridScale[0] // parametric value of grid line
                    const v = t * u[0] // value of grid line
                    const text = opts.xAxisLabelFormat(v)
                    const textMetrics = ctx.measureText(text)
                    const label = {
                        i,
                        gridX: x,
                        text,
                        textMetrics,
                        x: x - textMetrics.width / 2 + xOffset,
                        y: o[1] + fs + yOffset
                    }
                    labels.push(label)
                    if (label.y - fs - yOffset < 0) {
                        labelsOutOfTopBound = true
                    }
                    if (label.y + yOffset > h) {
                        labelsOutOfBottomBound = true
                    }
                }
                for (let i = 0, n = labels.length; i < n; i ++) { // TODO compute y once for all x-labels
                    const label = labels[i]
                    y = label.y
                    if (opts.xAxisLabelDynamicPosition) {
                        y = labelsOutOfTopBound
                            ? fs + yOffset
                            : labelsOutOfBottomBound
                                ? h - yOffset
                                : y
                    }
                    const boundingRect = new DOMRect(
                        label.x - halfSpacing,
                        y - fs,
                        label.textMetrics.width + spacing,
                        fs
                    )
                    label.y = y
                    label.boundingRect = boundingRect
                }
                // remove intersected labels
                let joiningStep = opts.xAxisLabelJoiningStep
                let srcLabels = labels
                while (isNodesIntersects(labels)) {
                    labels = srcLabels.filter(label => isZero(Math.abs(label.i) % joiningStep))
                    joiningStep += opts.xAxisLabelJoiningStep
                }
                // render labels
                for (let i = 0, n = labels.length; i < n; i ++) {
                    const label = labels[i]
                    if (!opts.xAxisLabelDisplayZero && label.i === 0) {
                        continue
                    }
                    ctx.fillRect(label.gridX, o[1] + markOffset, px, markSize)
                    ctx.fillText(
                        label.text,
                        label.x,
                        label.y
                    )
                }
            }
            if (opts.yAxisLabelEnable) {
                const xOffset = opts.yAxisLabelXOffset * px
                const yOffset = opts.yAxisLabelYOffset * px
                const markOffset = opts.yAxisLabelMarkOffset * px
                const markSize = opts.yAxisLabelMarkSize * px
                const spacing = opts.yAxisLabelSpacing * px
                const halfSpacing = spacing / 2
                let labels = []
                let maxWidth = 0
                let labelsOutOfLeftBound = false
                let labelsOutOfRightBound = false
                for (let y = sty; y <= h; y += su[1]) {
                    const delta = o[1] - y
                    const i = Math.round(delta / su[1]) // index of grid line
                    const t = i * gridScale[1] // parametric value of grid line
                    const v = t * u[1] // value of grid line
                    const text = opts.yAxisLabelFormat(v)
                    const textMetrics = ctx.measureText(text)
                    const label = {
                        i,
                        gridY: y,
                        text,
                        textMetrics,
                        x: o[0] - textMetrics.width + xOffset,
                        y: y + fs/2 + yOffset
                    }
                    labels.push(label)
                    if (maxWidth < textMetrics.width) {
                        maxWidth = textMetrics.width
                    }
                    if (label.x + xOffset < 0) {
                        labelsOutOfLeftBound = true
                    }
                    if (label.x + label.textMetrics.width - xOffset > w) {
                        labelsOutOfRightBound = true
                    }
                }
                for (let i = 0, n = labels.length; i < n; i ++) { // TODO compute x once for all y-labels
                    const label = labels[i]
                    x = label.x
                    if (opts.yAxisLabelDynamicPosition) {
                        x = labelsOutOfLeftBound
                            ? maxWidth - label.textMetrics.width - xOffset
                            : labelsOutOfRightBound
                                ? w - label.textMetrics.width + xOffset
                                : x
                    }
                    const boundingRect = new DOMRect(
                        x,
                        label.y - fs - halfSpacing,
                        label.textMetrics.width,
                        fs + spacing
                    )
                    label.x = x
                    label.boundingRect = boundingRect
                }
                // remove intersected labels
                let joiningStep = opts.yAxisLabelJoiningStep
                let srcLabels = labels
                while (isNodesIntersects(labels)) {
                    labels = srcLabels.filter(label => isZero(Math.abs(label.i) % joiningStep))
                    joiningStep += opts.yAxisLabelJoiningStep
                }
                labels = labels.filter(label => label.boundingRect.bottom > 0 && label.boundingRect.top < h)
                // recompute intersections after removing intersected labels
                maxWidth = 0
                labelsOutOfLeftBound = false
                labelsOutOfRightBound = false
                for (let i = 0, n = labels.length; i < n; i ++) {
                    const label = labels[i]
                    label.x = o[0] - label.textMetrics.width + xOffset
                    if (maxWidth < label.textMetrics.width) {
                        maxWidth = label.textMetrics.width
                    }
                    if (label.x + xOffset < 0) {
                        labelsOutOfLeftBound = true
                    }
                    if (label.x + label.textMetrics.width - xOffset > w) {
                        labelsOutOfRightBound = true
                    }
                }
                for (let i = 0, n = labels.length; i < n; i ++) { // TODO compute x once for all y-labels
                    const label = labels[i]
                    x = label.x
                    if (opts.yAxisLabelDynamicPosition) {
                        x = labelsOutOfLeftBound
                            ? maxWidth - label.textMetrics.width - xOffset
                            : labelsOutOfRightBound
                                ? w - label.textMetrics.width + xOffset
                                : x
                    }
                    label.x = x
                }
                // render labels
                for (let i = 0, n = labels.length; i < n; i ++) {
                    const label = labels[i]
                    if (!opts.yAxisLabelDisplayZero && label.i === 0) {
                        continue
                    }
                    ctx.fillRect(o[0] + markOffset, label.gridY, markSize, px)
                    ctx.fillText(
                        label.text,
                        label.x,
                        label.y
                    )
                }
            }
        }
    }
}

export default Chart
