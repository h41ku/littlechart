const dropEvent = evt => {

    evt.preventDefault()
    evt.stopPropagation()

    console.log('drop', evt.type)
}

const EVT_NAME_POINTERDOWN = 'sim:pointerdown'
const EVT_NAME_POINTERMOVE = 'sim:pointermove'
const EVT_NAME_POINTERUP = 'sim:pointerup'
const EVT_NAME_POINTERZOOM = 'sim:pointerzoom'

const defaultOptions = {
    listenerElement: null,
    invertMouseWheel: false,
    mouseWheelStep: 0.1
}

class TouchGestures {

    constructor(element, options = {}) {

        const opts = { ...defaultOptions, ...options }

        this.element = element
        this.listenerElement = opts.listenerElement !== null ? opts.listenerElement : element

        const fireEvent = (name, detail) => {
            return this.element.dispatchEvent(new CustomEvent(name, { detail })) // TODO it does not returns false when evt.preventDefault() is called
        }

        const pointerdown = (originalEvent, x, y) => fireEvent(EVT_NAME_POINTERDOWN, { originalEvent, clientX: x, clientY: y })
        const pointerup = (originalEvent, x, y) => fireEvent(EVT_NAME_POINTERUP, { originalEvent, clientX: x, clientY: y })
        const pointerzoom = (originalEvent, x, y, deltaScale) => fireEvent(EVT_NAME_POINTERZOOM, { originalEvent, clientX: x, clientY: y, deltaScale })
        const pointermove = (originalEvent, x, y, dx, dy) => fireEvent(EVT_NAME_POINTERMOVE, { originalEvent, clientX: x, clientY: y, movementX: dx, movementY: dy })

        let touchId = null
        let secondTouchId = null
        const touchPoint = { x: 0, y: 0 }
        const secondTouchPoint = { x: 0, y: 0 }
        const wheelDirection = opts.invertMouseWheel ? -1 : 1
        const wheelStep = opts.mouseWheelStep

        this.listeners = {

            touchstart: evt => {
                let result
                const clientRect = evt.target.getBoundingClientRect()
                if (touchId !== null) {
                    const touch = evt.changedTouches[0]
                    if (touch.identifier !== touchId) {
                        secondTouchId = touch.identifier
                        secondTouchPoint.x = touch.clientX - clientRect.left
                        secondTouchPoint.y = touch.clientY - clientRect.top
                        let res
                        res = pointerup(evt, touchPoint.x, touchPoint.y)
                        if (res === false) {
                            result = false
                        }
                        res = pointerdown(
                            evt,
                            touchPoint.x + (secondTouchPoint.x - touchPoint.x) / 2,
                            touchPoint.y + (secondTouchPoint.y - touchPoint.y) / 2
                        )
                        if (res === false) {
                            result = false
                        }
                    }
                } else {
                    const touch = evt.changedTouches[0]
                    touchId = touch.identifier
                    touchPoint.x = touch.clientX - clientRect.left
                    touchPoint.y = touch.clientY - clientRect.top
                    let res
                    res = pointerdown(evt, touchPoint.x, touchPoint.y)
                    if (res === false) {
                        result = false
                    }
                }
                if (result === false) {
                    evt.stopPropagation()
                    evt.preventDefault()
                }
                return result
            },

            touchend: evt => {
                let result
                let touches = Array.from(evt.changedTouches)
                if (touchId !== null && secondTouchId !== null) {
                    const touch = touches.find(touch => touchId === touch.identifier)
                    const secondTouch = touches.find(touch => secondTouchId === touch.identifier)
                    let res
                    res = pointerup(
                        evt,
                        touchPoint.x + (secondTouchPoint.x - touchPoint.x) / 2,
                        touchPoint.y + (secondTouchPoint.y - touchPoint.y) / 2
                    )
                    if (res === false) {
                        result = false
                    }
                    if (touch && secondTouch) {
                        touchId = null
                        secondTouchId = null
                    } else if (touch && !secondTouch) {
                        touchId = secondTouchId
                        touchPoint.x = secondTouchPoint.x
                        touchPoint.y = secondTouchPoint.y
                        secondTouchId = null
                    } else if (!touch && secondTouch) {
                        secondTouchId = null
                    }
                    if (touchId !== null) {
                        res = pointerdown(evt, touchPoint.x, touchPoint.y)
                        if (res === false) {
                            result = false
                        }
                    }
                } else if (touchId !== null) {
                    const touch = touches.find(touch => touchId === touch.identifier)
                    if (touch) {
                        touchId = null
                        let res
                        res = pointerup(evt, touchPoint.x, touchPoint.y)
                        if (res === false) {
                            result = false
                        }
                    }
                }
                if (result === false) {
                    evt.stopPropagation()
                    evt.preventDefault()
                }
                return result
            },

            touchmove: evt => {
                let result
                const clientRect = evt.target.getBoundingClientRect()
                if (touchId !== null && secondTouchId !== null) {
                    const touchNewPoint = { x: touchPoint.x, y: touchPoint.y }
                    const secondTouchNewPoint = { x: secondTouchPoint.x, y: secondTouchPoint.y }
                    const touch = Array.from(evt.changedTouches).find(touch => touchId === touch.identifier)
                    const secondTouch = Array.from(evt.changedTouches).find(touch => secondTouchId === touch.identifier)
                    if (touch) {
                        touchNewPoint.x = touch.clientX - clientRect.left
                        touchNewPoint.y = touch.clientY - clientRect.top
                    }
                    if (secondTouch) {
                        secondTouchNewPoint.x = secondTouch.clientX - clientRect.left
                        secondTouchNewPoint.y = secondTouch.clientY - clientRect.top
                    }
                    const dx = secondTouchPoint.x - touchPoint.x
                    const dy = secondTouchPoint.y - touchPoint.y
                    const dxNew = secondTouchNewPoint.x - touchNewPoint.x
                    const dyNew = secondTouchNewPoint.y - touchNewPoint.y
                    const previousLength = Math.hypot(dx, dy)
                    const length = Math.hypot(dxNew, dyNew)
                    const deltaScale = (1 - (previousLength / length))
                    const point = {
                        x: touchPoint.x + dx / 2,
                        y: touchPoint.y + dy / 2
                    }
                    const pointNew = {
                        x: touchNewPoint.x + dxNew / 2,
                        y: touchNewPoint.y + dyNew / 2
                    }
                    let res
                    res = pointermove(
                        evt,
                        pointNew.x,
                        pointNew.y,
                        pointNew.x - point.x,
                        pointNew.y - point.y
                    )
                    if (res === false) {
                        result = false
                    }
                    res = pointerup(evt, pointNew.x, pointNew.y)
                    if (res === false) {
                        result = false
                    }
                    res = pointerzoom(evt, pointNew.x, pointNew.y, deltaScale)
                    if (res === false) {
                        result = false
                    }
                    res = pointerdown(evt, pointNew.x, pointNew.y)
                    if (res === false) {
                        result = false
                    }
                    touchPoint.x = touchNewPoint.x
                    touchPoint.y = touchNewPoint.y
                    secondTouchPoint.x = secondTouchNewPoint.x
                    secondTouchPoint.y = secondTouchNewPoint.y
                } else if (touchId !== null) {
                    const touchNewPoint = { x: touchPoint.x, y: touchPoint.y }
                    const touch = Array.from(evt.changedTouches)
                        .find(touch => touchId === touch.identifier)
                    if (!touch) {
                        return
                    }
                    touchNewPoint.x = touch.clientX - clientRect.left
                    touchNewPoint.y = touch.clientY - clientRect.top
                    let res
                    res = pointermove(
                        evt,
                        touchNewPoint.x,
                        touchNewPoint.y,
                        touchNewPoint.x - touchPoint.x,
                        touchNewPoint.y - touchPoint.y
                    )
                    if (res === false) {
                        result = false
                    }
                    touchPoint.x = touchNewPoint.x
                    touchPoint.y = touchNewPoint.y
                }
                if (result === false) {
                    evt.stopPropagation()
                    evt.preventDefault()
                }
                return result
            },

            mousedown: evt => {
                touchPoint.x = evt.clientX
                touchPoint.y = evt.clientY
                let result = pointerdown(evt, touchPoint.x, touchPoint.y)
                if (result === false) {
                    evt.stopPropagation()
                    evt.preventDefault()
                }
                return result
            },

            mouseup: evt => {
                touchPoint.x = evt.clientX
                touchPoint.y = evt.clientY
                let result = pointerup(evt, touchPoint.x, touchPoint.y)
                if (result === false) {
                    evt.stopPropagation()
                    evt.preventDefault()
                }
                return result
            },

            mousemove: evt => {
                let touchNewPoint = { x: evt.clientX, y: evt.clientY }
                let result = pointermove(evt,
                    touchNewPoint.x,
                    touchNewPoint.y,
                    touchNewPoint.x - touchPoint.x,
                    touchNewPoint.y - touchPoint.y
                )
                touchPoint.x = touchNewPoint.x
                touchPoint.y = touchNewPoint.y
                if (result === false) {
                    evt.stopPropagation()
                    evt.preventDefault()
                }
                return result
            },

            wheel: evt => {
                const deltaScale = wheelStep * (evt.deltaY > 0 ? 1 : -1) * wheelDirection
                const result = pointerzoom(evt, evt.clientX, evt.clientY, deltaScale)
                if (result === false) {
                    evt.stopPropagation()
                    evt.preventDefault()
                }
                return result
            }

        }
    }

    enableNativeGestures() {

        document.removeEventListener('gesturestart', dropEvent)
        document.removeEventListener('gesturechange', dropEvent)
        document.removeEventListener('gestureend', dropEvent)
    }

    disableNativeGestures() {

        document.addEventListener('gesturestart', dropEvent)
        document.addEventListener('gesturechange', dropEvent)
        document.addEventListener('gestureend', dropEvent)
    }

    enableTouchGestures() {

        this.listenerElement.addEventListener('touchstart', this.listeners.touchstart)
        document.addEventListener('touchend', this.listeners.touchend)
        document.addEventListener('touchmove', this.listeners.touchmove)
    }

    disableTouchGestures() {

        this.listenerElement.removeEventListener('touchstart', this.listeners.touchstart)
        document.removeEventListener('touchend', this.listeners.touchend)
        document.removeEventListener('touchmove', this.listeners.touchmove)
    }

    enableMouseGestures() {

        this.listenerElement.addEventListener('mousedown', this.listeners.mousedown)
        document.addEventListener('mouseup', this.listeners.mouseup)
        document.addEventListener('mousemove', this.listeners.mousemove)
        this.listenerElement.addEventListener('wheel', this.listeners.wheel)
        document.addEventListener('mouseleave', this.listeners.mouseup) // TODO test it
    }

    disableMouseGestures() {

        this.listenerElement.removeEventListener('mousedown', this.listeners.mousedown)
        document.removeEventListener('mouseup', this.listeners.mouseup)
        document.removeEventListener('mousemove', this.listeners.mousemove)
        document.removeEventListener('wheel', this.listeners.wheel)
        document.removeEventListener('mouseleave', this.listeners.mouseup) // TODO test it
    }
}

TouchGestures.EVT_NAME_POINTERDOWN = EVT_NAME_POINTERDOWN
TouchGestures.EVT_NAME_POINTERMOVE = EVT_NAME_POINTERMOVE
TouchGestures.EVT_NAME_POINTERUP = EVT_NAME_POINTERUP
TouchGestures.EVT_NAME_POINTERZOOM = EVT_NAME_POINTERZOOM

export default TouchGestures
