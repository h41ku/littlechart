import mergeObjects from './mergeObjects.js'

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
    const { itemPadding: itemPaddingOrigin, padding: paddingOrigin, mark: markOrigin } = settings
    const { fontFamily, fontSize } = opts
    // create legends
    let list = []
    let maxWidth = 0
    let correction = 0
    const pixelRatio = viewport.pixelRatio
    const fs = fontSize * pixelRatio
    const mark = { ...markOrigin }
    mark.offsetLeft *= pixelRatio
    mark.offsetTop *= pixelRatio
    mark.innerRadius *= pixelRatio
    mark.outerRadius *= pixelRatio
    const padding = { ...paddingOrigin }
    padding.left *= pixelRatio
    padding.top *= pixelRatio
    padding.right *= pixelRatio
    padding.bottom *= pixelRatio
    const itemPadding = { ...itemPaddingOrigin }
    itemPadding.left *= pixelRatio
    itemPadding.top *= pixelRatio
    itemPadding.right *= pixelRatio
    itemPadding.bottom *= pixelRatio
    ctx.font = `${fs}px/1 ${fontFamily}`
    const legends = [ ...Object.values(datasets.reduce((groups, dataset, i) => {
        const groupId = dataset.options.groupId === null ? i : dataset.options.groupId
        if (!(groupId in groups)) {
            groups[groupId] = { dataset, i }
        }
        return groups
    }, {})) ].sort((a, b) => a.i - b.i)
    for (let i = 0, n = legends.length; i < n; i ++) {
        const dataset = legends[i].dataset
        const content = legendText(dataset, opts)
        if (content) {
            const metrics = ctx.measureText(content)
            const width = metrics.width + itemPadding.left + itemPadding.right * pixelRatio
            const ascent = -Math.abs(metrics.actualBoundingBoxAscent)
            const descent = Math.abs(metrics.actualBoundingBoxDescent)
            correction = Math.max(correction, fs - (descent - ascent)) // TODO
            list.push({
                text: {
                    content,
                    offsetLeft: itemPadding.left,
                    offsetTop: itemPadding.top,
                },
                mark,
                lineColor: dataset.options.lineColor,
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
    const rowHeight = fs + itemPadding.top + itemPadding.bottom + correction
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
                size: fs
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
    // variables
    // draw area
    if (color.background) {
        const left = Math.round(area.left)
        const top = Math.round(area.top)
        const right = Math.round(area.right)
        const bottom = Math.round(area.bottom)    
        ctx.fillStyle = color.background
        ctx.fillRect(
            left,
            top,
            right - left,
            bottom - top
        )
        if (color.border) {
            ctx.fillStyle = color.border
            ctx.fillRect(
                left,
                top,
                right - left,
                Math.round(1 * pixelRatio)
            )
        }
    }
    // draw legends
    const fs = font.size
    ctx.font = `${Math.round(fs)}px/1 ${font.family}`
    for (let i = 0, n = list.length; i < n; i ++) {
        let { left, top, text, mark, lineColor } = list[i]
// ctx.fillStyle = 'rgba(255,0,0,0.1)'
// ctx.fillRect(left,top,list[i].width,rowHeight)
        ctx.fillStyle = color.text
        {
            let { offsetLeft, offsetTop, content } = text
            offsetLeft += left
            offsetTop += top
            ctx.fillText(
                content,
                Math.round(offsetLeft),
                Math.round(offsetTop + font.size)
            )
        }
        {
            const { offsetLeft, offsetTop, innerRadius, outerRadius } = mark
            const x = Math.round(offsetLeft + left)
            const y = Math.round(offsetTop + top)
            ctx.fillStyle = lineColor.toString()
            ctx.beginPath()
            ctx.arc(x, y, Math.round(outerRadius), 0, 2 * Math.PI, false)
            ctx.fill()
            ctx.fillStyle = backgroundColor
            ctx.beginPath()
            ctx.arc(x, y, Math.round(innerRadius), 0, 2 * Math.PI, false)
            ctx.fill()
        }
    }
}

export {
    defaultLegendsSettings,
    createLegends,
    renderLegends
}
