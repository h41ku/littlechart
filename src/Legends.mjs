import mergeObjects from './mergeObjects.mjs'

function defaultLegendsSettings() {
    return {
        color: {
            border: '#eeeeee',
            background: '#ffffff',
            text: '#000000',
        },
        padding: {
            left: 5,
            right: 5,
            top: 5,
            bottom: 5
        },
        itemPadding: {
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
        }
    }
}

const defaultSettings = defaultLegendsSettings()

function createLegends(ctx, viewport, datasets, opts) {
    // settings
    const { legendText, settings: passedSettings } = opts.legends
    const settings = mergeObjects(defaultSettings, passedSettings)
    const { itemPadding, padding, mark } = settings
    const { fontFamily, fontSize } = opts
    // create legends
    let list = []
    let maxWidth = 0
    let correction = 0
    const fs = fontSize * viewport.pixelRatio
    ctx.font = `${fs}px/1 ${fontFamily}`
    for (let i = 0, n = datasets.length; i < n; i ++) {
        const dataset = datasets[i]
        const content = legendText(dataset, opts)
        if (content) {
            const metrics = ctx.measureText(content)
            const width = metrics.width + itemPadding.left + itemPadding.right
            const ascent = -Math.abs(metrics.actualBoundingBoxAscent)
            const descent = Math.abs(metrics.actualBoundingBoxDescent)
            correction = Math.max(correction, opts.fontSize - (descent - ascent)) // TODO
            list.push({
                text: {
                    content,
                    offsetLeft: itemPadding.left,
                    offsetTop: itemPadding.top,
                },
                mark: { ...mark },
                dataset,
                width,
                left: 0,
                top: 0
            })
            if (maxWidth < width) {
                maxWidth = width
            }
        }
    }
// list = [ ...list.map(item => ({ ...item })), ...list.map(item => ({ ...item })), ...list.map(item => ({ ...item })), ...list.map(item => ({ ...item })), ...list.map(item => ({ ...item })) ]
    // displace legends
    const availWidth = viewport.width - padding.left - padding.right
    const numColumns = Math.floor(availWidth / maxWidth)
// const numColumns = 2
    let maxColumnsUsed = 0
    let maxRowsUsed = 0
    const rowHeight = fontSize + itemPadding.top + itemPadding.bottom + correction
    for (let i = 0, n = list.length; i < n; i ++) {
        const item = list[i]
        const columnIndex = i % numColumns
        const rowIndex = Math.floor(i / numColumns)
        if (maxColumnsUsed < columnIndex) {
            maxColumnsUsed = columnIndex
        }
        if (maxRowsUsed < rowIndex) {
            maxRowsUsed = rowIndex
        }
        item.left = columnIndex * maxWidth
        item.top = rowIndex * rowHeight
    }
    const legendsHeight = (maxRowsUsed + 1) * rowHeight + padding.top + padding.bottom
    const shiftX = padding.left + (availWidth - (maxColumnsUsed + 1) * maxWidth) / 2
    const shiftY = viewport.height - legendsHeight + padding.top
    for (let i = 0, n = list.length; i < n; i ++) {
        const item = list[i]
        item.left += shiftX
        item.top += shiftY
    }
    // clip viewport
    viewport.clip(0, 0, viewport.width, viewport.height - legendsHeight)
    // result
    return {
        ctx,
        // rowHeight,
        area: {
            left: 0,
            right: viewport.width,
            top: viewport.height - legendsHeight,
            bottom: viewport.height
        },
        viewport: {
            ...viewport,
            backgroundColor: opts.backgroundColor
        },
        settings: mergeObjects(settings, {
            font: {
                family: fontFamily,
                size: fontSize
            }
        }),
        list
    }
}

function renderLegends(legends) {
    // settings
    const {
        ctx,
        // rowHeight,
        area,
        settings: { font, color },
        viewport: { pixelRatio, backgroundColor },
        list
    } = legends
    // draw area
    if (color.background) {
        const { left, top, right, bottom } = area
        ctx.fillStyle = color.background
        ctx.fillRect(left, top, right - left, bottom - top)
        if (color.border) {
            ctx.fillStyle = color.border
            ctx.fillRect(left, top, right - left, 1 * pixelRatio)
        }
    }
    // draw legends
    const fs = font.size * pixelRatio
    ctx.font = `${fs}px/1 ${font.family}`
    for (let i = 0, n = list.length; i < n; i ++) {
        let { left, top, text, mark, dataset: { options: { lineColor } } } = list[i]
// ctx.fillStyle = 'rgba(255,0,0,0.1)'
// ctx.fillRect(left,top,list[i].width,rowHeight)
        ctx.fillStyle = color.text
        {
            let { offsetLeft, offsetTop, content } = text
            offsetLeft += left
            offsetTop += top
            ctx.fillText(
                content,
                offsetLeft,
                offsetTop + font.size
            )
        }
        {
            const { offsetLeft, offsetTop, innerRadius, outerRadius } = mark
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
    defaultLegendsSettings,
    createLegends,
    renderLegends
}
