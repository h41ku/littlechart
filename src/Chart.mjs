import { isZero, vec2, vec2copy, vec2add, vec2sub, vec2mul, vec2div, vec2muladd, vec2neglerp, vec2subdiv, vec2lerp, vec2clone } from './vec2.mjs'
import { findLess } from './BinarySearch.mjs'
import TouchGestures from './TouchGestures.mjs'
import { defaultHintsSettings, createHints, displaceHints, renderHints } from './Hints.mjs'
import { defaultLegendsSettings, createLegends, renderLegends } from './Legends.mjs'
import mergeObjects from './mergeObjects.mjs'

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

const defaultOptions = {
    xCanvasStep: 25,
    yCanvasStep: 25,
    xAxisStep: 1,
    yAxisStep: 1,
    xOffset: 0,
    yOffset: 0,
    xScale: 1,
    yScale: 1,
    xAxisSubdivisions: 10.0,
    yAxisSubdivisions: 10.0,
    lineWidth: 1,
    pointSize: 0,
    fontSize: 15,
    fontFamily: 'monospace',
    xAxisLabelXOffset: 0,
    xAxisLabelYOffset: 0,
    xAxisLabelDynamicPosition: true,
    xAxisLabelSpacing: 15,
    xAxisLabelFormat: x => x.toFixed(4),
    xAxisLabelJoiningStep: 5.0,
    xAxisLabelMarkOffset: -2,
    xAxisLabelMarkSize: 4,
    xAxisLabelDisplayZero: true,
    xAxisLabelEnable: true,
    yAxisLabelXOffset: 0,
    yAxisLabelYOffset: 0,
    yAxisLabelDynamicPosition: true,
    yAxisLabelSpacing: 0,
    yAxisLabelFormat: y => y.toFixed(4),
    yAxisLabelJoiningStep: 5.0,
    yAxisLabelMarkOffset: -2,
    yAxisLabelMarkSize: 4,
    yAxisLabelDisplayZero: true,
    yAxisLabelEnable: true,
    backgroundColor: '#ffffff',
    gridColor: 'rgba(0,0,0,0.1)',
    axesColor: 'rgba(0,0,0,0.5)',
    userTranslateX: true,
    userTranslateY: true,
    userScaleX: true,
    userScaleY: true,
    canvasRatio: 1,
    canvasPixelRatio: 1,
    clearFrame: false,
    hints: {
        settings: defaultHintsSettings(),
        hintText: (x, y, dataset, opts, pointSource) => `X: ${opts.xAxisLabelFormat(x)}\nY: ${opts.yAxisLabelFormat(y)}`,
        createHints,
        displaceHints,
        renderHints,
    },
    legends: {
        settings: defaultLegendsSettings(),
        legendText: (dataset, opts) => `${dataset.legend}`,
        createLegends,
        renderLegends,
    },
    cursorPointer: 'pointer',
    cursorGrabbing: 'grabbing',
    bindEventHandlers: true,
    invertMouseWheel: false,
    mouseWheelStep: 0.1,
    afterRepaint: null
}

class Chart {

    constructor(elCanvas, options = {}) {

        this.options = options = mergeObjects(defaultOptions, options)
        this.elCanvas = elCanvas
        this.ctx = elCanvas.getContext('2d')
        this.scale = vec2(options.xScale, options.yScale)
        this.translate = vec2(options.xOffset, options.yOffset)
        this.focusPoint = vec2(0, 0)
        this.datasets = []
        this.currentXBounds = vec2()

        elCanvas.style.cursor = options.cursorPointer

        const mouseState = {
            down: false,
            pt0: vec2(0, 0),
            pt: vec2(0, 0),
            delta: vec2(0, 0)
        }

        const pointFromMouseEvent = (r, evt) => {
            const { clientX: x, clientY: y } = evt
            const { left, right, top, bottom } = elCanvas.getBoundingClientRect()
            r[0] = (x - left) / options.canvasRatio
            r[1] = (y - top) / options.canvasRatio
            const isInsideCanvas = left <= x && x <= right
                && top <= y && y <= bottom
            return isInsideCanvas
        }

        this.isListening = false
        this.listeners = { }
        this.listeners[TouchGestures.EVT_NAME_POINTERDOWN] = evt => {
            elCanvas.style.cursor = options.cursorGrabbing
            evt.detail.originalEvent.preventDefault()
            mouseState.down = true
            pointFromMouseEvent(mouseState.pt0, evt.detail)
        }
        this.listeners[TouchGestures.EVT_NAME_POINTERUP] = evt => {
            mouseState.down = false
            elCanvas.style.cursor = options.cursorPointer
        }
        this.listeners[TouchGestures.EVT_NAME_POINTERMOVE] = evt => {
            const isInsideCanvas = pointFromMouseEvent(mouseState.pt, evt.detail)
            if (mouseState.down) {
                vec2sub(mouseState.delta, mouseState.pt, mouseState.pt0)
                vec2copy(mouseState.pt0, mouseState.pt)
                const delta = vec2(
                    options.userTranslateX ? mouseState.delta[0] : 0,
                    options.userTranslateY ? mouseState.delta[1] : 0
                )
                this.move(delta)
                this.repaint()
            } else if (isInsideCanvas) {
                const r = vec2()
                vec2subdiv(r, mouseState.pt, vec2(options.xCanvasStep, options.yCanvasStep), this.translate)
                r[1] = -r[1]
                vec2mul(r, r, vec2(options.xAxisStep, options.yAxisStep))
                vec2div(r, r, this.scale)
                this.computeFocusPoints(r)
                this.repaint()
            }
        }
        this.listeners[TouchGestures.EVT_NAME_POINTERZOOM] = evt => {
            evt.detail.originalEvent.preventDefault()
            const deltaScale = evt.detail.deltaScale
            const doScaleX = options.userScaleX === true
                || (typeof options.userScaleX === 'function' && options.userScaleX(evt))
            const doScaleY = options.userScaleY === true
                || (typeof options.userScaleY === 'function' && options.userScaleY(evt))
            const delta = vec2(
                doScaleX ? deltaScale : 0,
                doScaleY ? deltaScale : 0
            )
            pointFromMouseEvent(mouseState.pt, evt.detail)
            this.zoomAroundPoint(delta, mouseState.pt)
            this.repaint()
        }

        this.touchGestures = new TouchGestures(elCanvas, {
            invertMouseWheel: options.invertMouseWheel,
            mouseWheelStep: options.mouseWheelStep
        })

        if (options.bindEventHandlers) {
            this.bind()
        }
    }

    computeFocusPoints(p) {

        this.datasets.forEach(dataset => {
            const { source } = dataset
            const length = source.length
            const i0 = findLess(i => source.at(i)[0], 0, length - 1, p[0])
            const i1 = i0 + 1
            if (i0 >= 0 && i1 < length) {
                const r = vec2()
                const p1 = source.at(i0)
                const p2 = source.at(i1)
                const t = (p[0] - p1[0]) / (p2[0] - p1[0])
                const s = vec2(t, dataset.options.isStepped ? 0 : t)
                vec2lerp(r, p1, p2, s)
                r.source = { i0, i1, s }
                dataset.focusPoint = r
            } else {
                dataset.focusPoint = null
            }
        })
        vec2copy(this.focusPoint, p)
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

    getViewportXBounds() {

        return vec2clone(this.currentXBounds)
    }

    fitView(boundingRect, keepAspectRatio = true) { 

        let w = this.elCanvas.width
        let h = this.elCanvas.height

        if (w <= 0 || h <= 0 || Math.abs(boundingRect.width) <= 0 || Math.abs(boundingRect.height) <= 0) {
            return false
        }

        const opts = this.options

        if (opts.legends) {
            opts.legends.createLegends(
                this.ctx,
                {
                    width: w,
                    height: h,
                    pixelRatio: opts.canvasRatio * opts.canvasPixelRatio,
                    clip(left, top, right, bottom) {
                        w = right - left
                        h = bottom - top
                        // TODO left, top is not used later
                    }
                },
                this.datasets,
                opts,
                {
                    isIntersects,
                    // measureText: text => ctx.measureText(text)
                }
            )
        }

        const bRect = new DOMRect( // flip by Y
            boundingRect.x,
            -boundingRect.y - boundingRect.height,
            boundingRect.width,
            boundingRect.height
        )

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

    getExtrems(initialMinX = null, initialMinY = null, initialMaxX = null, initialMaxY = null) {

        let minX = initialMinX
        let maxX = initialMaxX
        let minY = initialMinY
        let maxY = initialMaxY

        this.datasets.forEach(dataset => {
            const extrems = dataset.getExtrems()
            if (minX === null || minX > extrems.minX) {
                minX = extrems.minX
            }
            if (maxX === null || maxX < extrems.maxX) {
                maxX = extrems.maxX
            }
            if (minY === null || minY > extrems.minY) {
                minY = extrems.minY
            }
            if (maxY === null || maxY < extrems.maxY) {
                maxY = extrems.maxY
            }
        })

        return { minX, minY, maxX, maxY }
    }

    getBoundingRect(initialMinX = null, initialMinY = null, initialMaxX = null, initialMaxY = null) { // DEPRECATED

        const { minX, minY, maxX, maxY } = this.getExtrems()

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
        let w = this.elCanvas.width
        let h = this.elCanvas.height
        const s = this.scale
        const datasets = this.datasets

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

        const transform = (r, p) => {
            vec2mul(r, p, canvasStep)
            vec2div(r, r, u)
            r[1] = -r[1]
            vec2muladd(r, r, s, o)
        }

        // clear
        if (opts.clearFrame) {
            ctx.clearRect(0, 0, w, h)
        }
        ctx.fillStyle = opts.backgroundColor
        ctx.fillRect(0, 0, w, h)

        let clipPath = null

        // draw legends
        if (opts.legends) {
            const { createLegends, renderLegends } = opts.legends
            const legends = createLegends(
                ctx,
                {
                    width: w,
                    height: h,
                    pixelRatio: px,
                    clip(left, top, right, bottom) {
                        w = right - left
                        h = bottom - top
                        clipPath = new Path2D()
                        clipPath.rect(left, top, w, h)
                    }
                },
                datasets,
                opts,
                {
                    isIntersects,
                    // measureText: text => ctx.measureText(text)
                }
            )
            renderLegends(legends)
        }

        // clip
        if (clipPath) {
            ctx.save()
            ctx.clip(clipPath)
        }

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
        for (let i = 0, n = datasets.length; i < n; i ++) {
            const dataset = datasets[i]
            const { source, tree } = dataset

            if (source.length > 1) {
                ctx.strokeStyle = dataset.options.lineColor
                ctx.lineWidth = dataset.options.lineWidth * px

                const p0 = vec2()
                const p1 = vec2()

                const renderNode = (ctx, node, source) => {
                    transform(p1, [ node.maxX, node.maxY ])
                    if (p1[0] < 0) { return }
                    transform(p0, [ node.minX, node.minY ])
                    if (p0[0] > w) { return }
                    const x0 = Math.round(p0[0])
                    const x1 = Math.round(p1[0])
                    if (x0 === x1) {
                        ctx.beginPath()
                        ctx.setLineDash(dataset.options.lineDash.map(x => x * px))
                        ctx.moveTo(x0, p0[1])
                        ctx.lineTo(x1, p1[1])
                        ctx.stroke()
                    } else if (node.left && node.right) {
                        renderNode(ctx, node.left, source)
                        renderNode(ctx, node.right, source)
                    } else {
                        ctx.beginPath()
                        ctx.setLineDash(dataset.options.lineDash.map(x => x * px))
                        transform(p0, source.at(node.s))
                        ctx.moveTo(p0[0], p0[1])
                        for (let j = node.s + 1; j <= node.e; j ++) { // TODO use source.forEach
                            transform(p0, source.at(j))
                            ctx.lineTo(p0[0], p0[1])
                        }
                        ctx.stroke()
                    }
                    ctx.setLineDash([])
                }

                const renderNodeStepped = (ctx, node, source) => {
                    transform(p1, [ node.maxX, node.maxY ])
                    if (p1[0] < 0) { return }
                    transform(p0, [ node.minX, node.minY ])
                    if (p0[0] > w) { return }
                    const x0 = Math.round(p0[0])
                    const x1 = Math.round(p1[0])
                    if (x0 === x1) {
                        ctx.beginPath()
                        ctx.setLineDash(dataset.options.lineDash.map(x => x * px))
                        ctx.moveTo(x0, p0[1])
                        ctx.lineTo(x1, p1[1])
                        ctx.stroke()
                    } else if (node.left && node.right) {
                        renderNodeStepped(ctx, node.left, source)
                        renderNodeStepped(ctx, node.right, source)
                    } else {
                        ctx.beginPath()
                        ctx.setLineDash(dataset.options.lineDash.map(x => x * px))
                        transform(p0, source.at(node.s))
                        ctx.moveTo(p0[0], p0[1])
                        let y = p0[1]
                        for (let j = node.s + 1; j <= node.e; j ++) { // TODO use source.forEach
                            transform(p0, source.at(j))
                            ctx.lineTo(p0[0], y)
                            ctx.lineTo(p0[0], p0[1])
                            y = p0[1]
                        }
                        ctx.stroke()
                    }
                    ctx.setLineDash([])
                }

                const PI2 = 2 * Math.PI

                const renderNodePoints = (ctx, node, source, r) => {
                    transform(p1, [ node.maxX, node.maxY ])
                    if (p1[0] < 0) { return }
                    transform(p0, [ node.minX, node.minY ])
                    if (p0[0] > w) { return }
                    const x0 = Math.round(p0[0])
                    const x1 = Math.round(p1[0])
                    if (x0 === x1) {
                        ctx.beginPath()
                        ctx.arc(x0, p0[1], r, 0, PI2, false)
                        ctx.fill()
                        ctx.beginPath()
                        ctx.arc(x1, p1[1], r, 0, PI2, false)
                        ctx.stroke()
                    } else if (node.left && node.right) {
                        renderNodePoints(ctx, node.left, source, r)
                        renderNodePoints(ctx, node.right, source, r)
                    } else {
                        for (let j = node.s; j <= node.e; j ++) {
                            transform(p0, source.at(j))
                            ctx.beginPath()
                            ctx.arc(p0[0], p0[1], r, 0, PI2, false)
                            ctx.fill()
                        }
                        ctx.stroke()
                    }
                }

                if (dataset.options.isStepped) {
                    renderNodeStepped(ctx, tree, source)
                } else {
                    renderNode(ctx, tree, source)
                }
                const r = dataset.options.pointRadius
                if (r > 0) {
                    ctx.fillStyle = dataset.options.lineColor
                    renderNodePoints(ctx, tree, source, r)
                }
            }
        }

        // draw labels
        if (opts.xAxisLabelEnable || opts.yAxisLabelEnable) {
            const fs = opts.fontSize * px
            ctx.font = `${fs}px/1 ${opts.fontFamily}`
            ctx.fillStyle = opts.axesColor
            this.currentXBounds[0] = (0 - o[0]) / su[0] * gridScale[0] * u[0]
            this.currentXBounds[1] = (w - o[0]) / su[0] * gridScale[0] * u[0]
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

        // draw hints
        if (opts.hints) {
            const { createHints, displaceHints, renderHints } = opts.hints
            let hints = createHints(
                ctx,
                this.focusPoint,
                { width: w, height: h, pixelRatio: px },
                datasets,
                opts,
                {
                    transform,
                    isIntersects,
                    // measureText: text => ctx.measureText(text)
                }
            )
            hints = displaceHints(hints)
            renderHints(hints)
        }

        // unclip
        if (clipPath) {
            ctx.restore()
        }

        // callback
        if (opts.afterRepaint) {
            opts.afterRepaint()
        }
    }
}

export default Chart
