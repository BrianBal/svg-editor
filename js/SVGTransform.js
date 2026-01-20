// Utility helpers for mapping points between an element's local coordinate system
// and the SVG canvas (user units).
//
// This module is intentionally standalone and does not use ES module exports;
// tests load it via test/setup.js and it is attached to globalThis.

class SVGTransform {
    static _identityMatrix() {
        if (typeof DOMMatrix !== 'undefined') return new DOMMatrix();
        // Minimal fallback for environments without DOMMatrix
        return {
            a: 1, b: 0, c: 0, d: 1, e: 0, f: 0,
            multiply(other) {
                return SVGTransform._multiplyMatrices(this, other);
            },
            inverse() {
                return SVGTransform._inverseMatrix(this);
            }
        };
    }

    static _createMatrix(a, b, c, d, e, f) {
        if (typeof DOMMatrix !== 'undefined') return new DOMMatrix([a, b, c, d, e, f]);
        return {
            a, b, c, d, e, f,
            multiply(other) {
                return SVGTransform._multiplyMatrices(this, other);
            },
            inverse() {
                return SVGTransform._inverseMatrix(this);
            }
        };
    }

    static _multiplyMatrices(m1, m2) {
        // 2D affine multiply
        return SVGTransform._createMatrix(
            m1.a * m2.a + m1.c * m2.b,
            m1.b * m2.a + m1.d * m2.b,
            m1.a * m2.c + m1.c * m2.d,
            m1.b * m2.c + m1.d * m2.d,
            m1.a * m2.e + m1.c * m2.f + m1.e,
            m1.b * m2.e + m1.d * m2.f + m1.f
        );
    }

    static _inverseMatrix(m) {
        const det = m.a * m.d - m.b * m.c;
        if (!det) return SVGTransform._identityMatrix();
        const a = m.d / det;
        const b = -m.b / det;
        const c = -m.c / det;
        const d = m.a / det;
        const e = (m.c * m.f - m.d * m.e) / det;
        const f = (m.b * m.e - m.a * m.f) / det;
        return SVGTransform._createMatrix(a, b, c, d, e, f);
    }

    static _applyToPoint(matrix, x, y) {
        // DOMMatrix supports transformPoint; fallback uses affine math.
        if (matrix && typeof matrix.transformPoint === 'function') {
            const pt = matrix.transformPoint({ x, y });
            return { x: pt.x, y: pt.y };
        }
        return {
            x: matrix.a * x + matrix.c * y + matrix.e,
            y: matrix.b * x + matrix.d * y + matrix.f,
        };
    }

    static _parseTransform(transformStr) {
        // Supports a minimal subset: rotate(angle[,cx,cy]) and scale(sx[,sy]).
        if (!transformStr || typeof transformStr !== 'string') return SVGTransform._identityMatrix();

        let matrix = SVGTransform._identityMatrix();
        const re = /(rotate|scale)\(([^)]*)\)/g;
        let match;
        while ((match = re.exec(transformStr)) !== null) {
            const type = match[1];
            const rawArgs = match[2]
                .split(/[,\s]+/)
                .map(s => s.trim())
                .filter(Boolean)
                .map(Number);

            if (type === 'rotate') {
                const angle = rawArgs[0] || 0;
                const cx = rawArgs.length >= 3 ? rawArgs[1] : 0;
                const cy = rawArgs.length >= 3 ? rawArgs[2] : 0;
                const rad = angle * Math.PI / 180;
                const cos = Math.cos(rad);
                const sin = Math.sin(rad);

                // Rotation about (cx, cy): T(cx,cy) * R * T(-cx,-cy)
                const t1 = SVGTransform._createMatrix(1, 0, 0, 1, cx, cy);
                const r = SVGTransform._createMatrix(cos, sin, -sin, cos, 0, 0);
                const t2 = SVGTransform._createMatrix(1, 0, 0, 1, -cx, -cy);
                const rot = t1.multiply(r).multiply(t2);
                matrix = matrix.multiply(rot);
            } else if (type === 'scale') {
                const sx = rawArgs[0];
                const sy = rawArgs.length >= 2 ? rawArgs[1] : sx;
                const s = SVGTransform._createMatrix(sx, 0, 0, sy, 0, 0);
                matrix = matrix.multiply(s);
            }
        }

        return matrix;
    }

    static getElementMatrix(element, svgRoot) {
        if (!element) return SVGTransform._identityMatrix();

        // Prefer SVG native matrices when available.
        try {
            if (typeof element.getCTM === 'function') {
                const ctm = element.getCTM();
                if (ctm) {
                    // happy-dom returns SVGMatrix-like object; DOMMatrix can ingest it.
                    if (typeof DOMMatrix !== 'undefined') return new DOMMatrix([ctm.a, ctm.b, ctm.c, ctm.d, ctm.e, ctm.f]);
                    return SVGTransform._createMatrix(ctm.a, ctm.b, ctm.c, ctm.d, ctm.e, ctm.f);
                }
            }

            if (typeof element.getScreenCTM === 'function' && svgRoot && typeof svgRoot.getScreenCTM === 'function') {
                const el = element.getScreenCTM();
                const root = svgRoot.getScreenCTM();
                if (el && root && typeof root.inverse === 'function') {
                    const m = root.inverse().multiply(el);
                    if (typeof DOMMatrix !== 'undefined') return new DOMMatrix([m.a, m.b, m.c, m.d, m.e, m.f]);
                    return SVGTransform._createMatrix(m.a, m.b, m.c, m.d, m.e, m.f);
                }
            }
        } catch (e) {
            // ignore and fall back to parsing transform attribute
        }

        const transformStr = element.getAttribute ? element.getAttribute('transform') : null;
        return SVGTransform._parseTransform(transformStr);
    }

    static localToCanvas(element, x, y, svgRoot) {
        const m = SVGTransform.getElementMatrix(element, svgRoot);
        return SVGTransform._applyToPoint(m, x, y);
    }

    static canvasToLocal(element, x, y, svgRoot) {
        const m = SVGTransform.getElementMatrix(element, svgRoot);
        const inv = (m && typeof m.inverse === 'function') ? m.inverse() : SVGTransform._identityMatrix();
        return SVGTransform._applyToPoint(inv, x, y);
    }
}