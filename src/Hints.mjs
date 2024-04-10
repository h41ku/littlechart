import { vec2 } from './vec2.mjs'
import mergeObjects from './mergeObjects.mjs'

function defaultHintsSettings() {
    return {
        focus: {
            points: {
                innerRadius: dataset => dataset.options.lineWidth * 2,
                outerRadius: dataset => dataset.options.lineWidth * 2 + dataset.options.lineWidth,
            },
            axes: {
                x: {
                    color: 'rgba(0,0,0,0.1)',
                    lineWidth: 1
                },
                y: {
                    color: 'rgba(0,0,0,0.1)',
                    lineWidth: 1
                }
            }
        },
        color: {
            border: 'rgba(0,0,0,0)',
            background: '#000000',
            text: '#ffffff',
        },
        shadow: {
            offsetX: 0,
            offsetY: 15,
            blur: 5, // 20,
            color: 'rgba(0,0,0,0.2)',
        },
        borderRadius: {
            leftTop: 5,
            rightTop: 5,
            leftBottom: 5,
            rightBottom: 5
        },
        viewportPadding: {
            left: 15,
            right: 15,
            top: 15,
            bottom: 15
        },
        padding: {
            left: 25,
            right: 10,
            top: 5,
            bottom: 5
        },
        mark: {
            offsetLeft: 15,
            offsetTop: 15,
            innerRadius: 0,
            outerRadius: 3
        },
        unitInvisibleHints: true,
        maxNumIterations: 20
    }
}

const defaultSettings = defaultHintsSettings()

function createHints(ctx, focusPoint, viewport, datasets, opts, helpers) {
    // settings
    const { fontFamily, fontSize } = opts
    const { hintText, settings: passedSettings } = opts.hints
    const settings = mergeObjects(defaultSettings, passedSettings)
    const {
        focus,
        borderRadius,
        padding,
        mark
    } = settings
    const { innerRadius, outerRadius } = focus.points
    // create hints
    const p = vec2()
    const { transform } = helpers
    const list = []
    const fs = fontSize * viewport.pixelRatio
    ctx.font = `${fs}px/1 ${fontFamily}`
    for (let i = 0, n = datasets.length; i < n; i ++) {
        const dataset = datasets[i]
        const focusPoint = dataset.focusPoint
        if (focusPoint) {
            transform(p, focusPoint)
            const contents = hintText(focusPoint[0], focusPoint[1], dataset, opts).split('\n')
            let fullWidth = 0
            let fullHeight = 0
            let correction = 0
            for (let j = 0, m = contents.length; j < m; j ++) {
                const metrics = ctx.measureText(contents[j])
                const width = metrics.width
                if (fullWidth < width)
                    fullWidth = width
                fullHeight += opts.fontSize
                const ascent = -Math.abs(metrics.actualBoundingBoxAscent)
                const descent = Math.abs(metrics.actualBoundingBoxDescent)
                correction = opts.fontSize - (descent - ascent) // TODO
            }
            fullHeight += padding.top + padding.bottom + correction // TODO
            fullWidth += padding.left + padding.right
            const offsetX = p[0] + 20 // - fullWidth / 2 // TODO use func
            const offsetY = p[1] - fullHeight / 2 // TODO use func
            list.push({
                focusPoints: [{
                    x: p[0],
                    y: p[1],
                    innerRadius: innerRadius(dataset),
                    outerRadius: outerRadius(dataset),
                    dataset
                }],
                left: offsetX,
                top: offsetY,
                right: offsetX + fullWidth,
                bottom: offsetY + fullHeight,
                correction, // TODO
                texts: [{
                    offsetLeft: padding.left,
                    offsetTop: padding.top,
                    contents
                }],
                padding,
                marks: [{
                    ...mark,
                    dataset
                }]
            })
        }
    }
    transform(p, focusPoint)
    return {
        ctx,
        focus: {
            origin: focusPoint,
            x: p[0],
            y: p[1]
        },
        viewport: {
            ...viewport,
            backgroundColor: opts.backgroundColor
        },
        settings: mergeObjects(settings, {
            font: {
                family: fontFamily,
                size: fontSize
            },
            borderRadius: borderRadius ? [
                borderRadius.leftTop,
                borderRadius.rightTop,
                borderRadius.rightBottom,
                borderRadius.leftBottom
            ] : null,
        }),
        helpers,
        list
    }
}

const displaceHints = hints => {
    const { list, settings, viewport: { width, height }, helpers: { isIntersects } } = hints
    const padding = settings.viewportPadding
    const viewport = {
        left: padding.left,
        right: width - padding.right,
        top: padding.top,
        bottom: height - padding.bottom
    }
    let listNext = [ ...list ].sort((a, b) => a.focusPoints[a.focusPoints.length - 1].y - b.focusPoints[0].y)
    let isChanged = true
    let numIterations = 0
    while (isChanged) {
        numIterations ++
        isChanged = false
        for (let i = 0, n = listNext.length; i < n; i ++) {
            const a = listNext[i]
            if (a === null) {
                continue
            }
            for (let j = i + 1; j < n; j ++) {
                const b = listNext[j]
                if (b === null) {
                    continue
                }
                if (isIntersects(a, b)) {
                    const delta = a.bottom - a.top - a.padding.bottom - b.padding.top - b.padding.bottom
                    for (let k = 0, m = b.texts.length; k < m; k ++) {
                        b.texts[k].offsetTop += delta
                    }
                    for (let k = 0, m = b.marks.length; k < m; k ++) {
                        b.marks[k].offsetTop += delta
                    }
                    a.right = Math.max(a.right, a.left + (b.right - b.left))
                    a.bottom += (b.bottom - b.top - a.padding.bottom - b.padding.top - a.correction)
                    a.texts = a.texts.concat(b.texts)
                    a.focusPoints = a.focusPoints.concat(b.focusPoints)
                    a.marks = a.marks.concat(b.marks)
                    listNext[j] = null
                    isChanged = true
                }
            }
            listNext[i] = a
        }
        if (!settings.unitInvisibleHints) {
            for (let i = 0, n = listNext.length; i < n; i ++) {
                const a = listNext[i]
                if (a === null) {
                    continue
                }
                if (a.right < viewport.left
                    || a.left > viewport.right
                    || a.bottom < viewport.top
                    || a.top > viewport.bottom)
                {
                    listNext[i] = null
                    isChanged = true
                }
            }
        }
        listNext = listNext.filter(a => a)
        for (let i = 0, n = listNext.length; i < n; i ++) {
            const a = listNext[i]
            if (a.left < viewport.left) {
                const delta = (viewport.left - a.left)
                a.left += delta
                a.right += delta
                isChanged = true
            } else if (a.right > viewport.right) {
                const delta = (a.right - viewport.right)
                a.left -= delta
                a.right -= delta
                isChanged = true
            }
            if (a.top < viewport.top) {
                const delta = (viewport.top - a.top)
                a.top += delta
                a.bottom += delta
                isChanged = true
            } else if (a.bottom > viewport.bottom) {
                const delta = (a.bottom - viewport.bottom)
                a.top -= delta
                a.bottom -= delta
                isChanged = true
            }
        }
        if (listNext.length <= 1 || numIterations >= settings.maxNumIterations) {
            break
        }
    }
    return { ...hints, list: listNext }
}

const renderHints = hints => {
    // settings
    const {
        ctx,
        list,
        settings: {
            font,
            color,
            shadow,
            borderRadius,
            focus: { axes },
        },
        viewport: { width, height, pixelRatio, backgroundColor }
    } = hints
    // draw focus axes
    if (axes.y) {
        const { color, lineWidth } = axes.y
        ctx.fillStyle = color
        for (let i = 0, n = list.length; i < n; i ++) {
            const { focusPoints } = list[i]
            for (let j = 0, m = focusPoints.length; j < m; j ++) {
                const { y } = focusPoints[j]
                ctx.fillRect(0, y, width, lineWidth * pixelRatio)
            }
        }
    }
    if (axes.x) {
        const { color, lineWidth } = axes.x
        ctx.fillStyle = color
        ctx.fillRect(hints.focus.x, 0, lineWidth * pixelRatio, height)
    }
    // draw shadows
    if (shadow) {
        const { offsetX, offsetY, blur, color } = shadow
        ctx.fillStyle = 'rgb(255,255,255)'
        ctx.shadowColor = color
        ctx.shadowOffsetX = offsetX
        ctx.shadowOffsetY = offsetY
        ctx.shadowBlur = blur
        for (let i = 0, n = list.length; i < n; i ++) {
            const { left, top, right, bottom } = list[i]
            if (borderRadius) {
                ctx.beginPath()
                ctx.roundRect(left, top, right - left, bottom - top, borderRadius)
                ctx.fill()
            } else {
                ctx.fillRect(left, top, right - left, bottom - top)
            }
        }
        ctx.shadowColor = 'transparent'
    }
    // draw focus points
    for (let i = 0, n = list.length; i < n; i ++) {
        const { focusPoints } = list[i]
        for (let j = 0, m = focusPoints.length; j < m; j ++) {
            const { x, y, innerRadius, outerRadius, dataset: { options: { lineColor } } } = focusPoints[j]
            ctx.fillStyle = lineColor.toString()
            ctx.beginPath()
            ctx.arc(x, y, outerRadius * pixelRatio, 0, 2 * Math.PI, false)
            ctx.fill()
            ctx.fillStyle = backgroundColor
            ctx.beginPath()
            ctx.arc(x, y, innerRadius * pixelRatio, 0, 2 * Math.PI, false)
            ctx.fill()
        }
    }
    // draw hints
    const { border, background, text } = color
    const fs = font.size * pixelRatio
    ctx.font = `${fs}px/1 ${font.family}`
    for (let i = 0, n = list.length; i < n; i ++) {
        const { left, top, right, bottom, texts, marks } = list[i]
        ctx.strokeStyle = border
        ctx.fillStyle = background
        if (borderRadius) {
            ctx.beginPath()
            ctx.roundRect(left, top, right - left, bottom - top, borderRadius)
            ctx.fill()
            ctx.stroke()
        } else {
            ctx.fillRect(left, top, right - left, bottom - top)
        }
        ctx.fillStyle = text
        for (let j = 0, m = texts.length; j < m; j ++) {
            const { offsetLeft, offsetTop, contents } = texts[j]
            let x = offsetLeft + left
            let y = offsetTop + top
            for (let k = 0, l = contents.length; k < l; k ++) {
                ctx.fillText(
                    contents[k],
                    x,
                    y + font.size // TODO font.size or fs?
                )
                y += font.size // TODO font.size or fs?
            }
        }
        for (let j = 0, m = marks.length; j < m; j ++) {
            const { offsetLeft, offsetTop, innerRadius, outerRadius, dataset: { options: { lineColor } } } = marks[j]
            const x = offsetLeft + left
            const y = offsetTop + top
            ctx.fillStyle = lineColor.toString()
            ctx.beginPath()
            ctx.arc(x, y, outerRadius * pixelRatio, 0, 2 * Math.PI, false)
            ctx.fill()
            ctx.fillStyle = backgroundColor
            ctx.beginPath()
            ctx.arc(x, y, innerRadius * pixelRatio, 0, 2 * Math.PI, false)
            ctx.fill()
        }
    }
}

export {
    defaultHintsSettings,
    createHints,
    displaceHints,
    renderHints
}
