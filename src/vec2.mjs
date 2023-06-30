function clamp(min, max, x) {
    return Math.max(min, Math.min(x, max))
}

function isZero(x, eps = 0.001) {
    return Math.abs(x) < eps
}

function vec2(x = 0, y = 0) {
    return [ x, y ]
}

function vec2clone(p) {
    return vec2(p[0], p[1])
}

function vec2set(r, x, y) {
    r[0] = x
    r[1] = y
    return r
}

function vec2copy(r, p) {
    r[0] = p[0]
    r[1] = p[1]
    return r
}

function vec2add(r, p1, p2) {
    r[0] = p1[0] + p2[0]
    r[1] = p1[1] + p2[1]
    return r
}

function vec2sub(r, p1, p2) {
    r[0] = p1[0] - p2[0]
    r[1] = p1[1] - p2[1]
    return r
}

function vec2mul(r, p1, p2) {
    r[0] = p1[0] * p2[0]
    r[1] = p1[1] * p2[1]
    return r
}

function vec2div(r, p1, p2) {
    r[0] = p1[0] / p2[0]
    r[1] = p1[1] / p2[1]
    return r
}

function vec2lerp(r, p1, p2, s) {
    r[0] = p1[0] + s[0] * (p2[0] - p1[0])
    r[1] = p1[1] + s[1] * (p2[1] - p1[1])
    return r
}

function vec2neglerp(r, p1, p2, s) {
    r[0] = p1[0] - s[0] * (p2[0] - p1[0])
    r[1] = p1[1] - s[1] * (p2[1] - p1[1])
    return r
}

function vec2clamp(r, min, max, p) {
    r[0] = clamp(min, max, p[0])
    r[1] = clamp(min, max, p[1])
    return r
}

function vec2muladd(r, p, s, t) {
    r[0] = p[0] * s[0] + t[0]
    r[1] = p[1] * s[1] + t[1]
    return r
}

function vec2subdiv(r, p, s, t) {
    r[0] = (p[0] - t[0]) / s[0]
    r[1] = (p[1] - t[1]) / s[1]
    return r
}

export {

    clamp,
    isZero,
    vec2,
    vec2clone,
    vec2set,
    vec2copy,
    vec2add,
    vec2sub,
    vec2mul,
    vec2div,
    vec2lerp,
    vec2neglerp,
    vec2clamp,
    vec2muladd,
    vec2subdiv
}