/**
 * SVGTransform - Coordinate transform helpers.
 *
 * Provides conversions between an element's local coordinate system and the
 * canvas/root SVG coordinate system.
 */
class SVGTransform {
    static _identityMatrix() {
        return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
    }

    static _createMatrix(a, b, c, d, e, f) {
        return { a, b, c, d, e, f };
    }

    static _multiplyMatrices(m1, m2) {
        // SVG 2D affine: [a c e; b d f; 0 0 1]
        return {
            a: m1.a * m2.a + m1.c * m2.b,
            b: m1.b * m2.a + m1.d * m2.b,
            c: m1.a * m2.c + m1.c * m2.d,
            d: m1.b * m2.c + m1.d * m2.d,
            e: m1.a * m2.e + m1.c * m2.f + m1.e,
            f: m1.b * m2.e + m1.d * m2.f + m1.f
        };
    }

    static _inverseMatrix(m) {
        const det = m.a * m.d - m.b * m.c;
        if (!det) return null;
        return {
            a: m.d / det,
            b: -m.b / det,
            c: -m.c / det,
            d: m.a / det,
            e: (m.c * m.f - m.d * m.e) / det,
            f: (m.b * m.e - m.a * m.f) / det
        };
    }

    static _applyToPoint(matrix, x, y) {
        return {
            x: matrix.a * x + matrix.c * y + matrix.e,
            y: matrix.b * x + matrix.d * y + matrix.f
        };
    }

    static _parseTransform(transformStr) {
        if (!transformStr || typeof transformStr !== 'string') return SVGTransform._identityMatrix();

        // Parse a limited subset robustly: rotate(angle[,cx,cy]) and scale(sx[,sy])
        // Multiple transforms are applied left-to-right.
        const re = /([a-zA-Z]+)\s*\(([^)]*)\)/g;
        let match;
        let out = SVGTransform._identityMatrix();

        const parseNums = (s) => {
            if (!s) return [];
            return s
                .trim()
                .split(/(?:\s*,\s*|\s+)/)
                .filter(Boolean)
                .map((v) => parseFloat(v))
                .filter((n) => Number.isFinite(n));
        };

        while ((match = re.exec(transformStr)) !== null) {
            const name = match[1].toLowerCase();
            const nums = parseNums(match[2]);

            if (name === 'scale') {
                const sx = nums.length >= 1 ? nums[0] : 1;
                const sy = nums.length >= 2 ? nums[1] : sx;
                const m = SVGTransform._createMatrix(sx, 0, 0, sy, 0, 0);
                out = SVGTransform._multiplyMatrices(out, m);
            } else if (name === 'rotate') {
                const angle = nums.length >= 1 ? nums[0] : 0;
                const rad = (angle * Math.PI) / 180;
                const cos = Math.cos(rad);
                const sin = Math.sin(rad);

                const r = SVGTransform._createMatrix(cos, sin, -sin, cos, 0, 0);

                if (nums.length >= 3) {
                    const cx = nums[1];
                    const cy = nums[2];
                    const t1 = SVGTransform._createMatrix(1, 0, 0, 1, cx, cy);
                    const t2 = SVGTransform._createMatrix(1, 0, 0, 1, -cx, -cy);
                    // T(cx,cy) * R * T(-cx,-cy)
                    const m = SVGTransform._multiplyMatrices(SVGTransform._multiplyMatrices(t1, r), t2);
                    out = SVGTransform._multiplyMatrices(out, m);
                } else {
                    out = SVGTransform._multiplyMatrices(out, r);
                }
            }
        }

        return out;
    }

    static _isIdentityMatrix(m) {
        if (!m) return true;
        return m.a === 1 && m.b === 0 && m.c === 0 && m.d === 1 && m.e === 0 && m.f === 0;
    }

    static getElementMatrix(element, svgRoot) {
        if (!element) return SVGTransform._identityMatrix();

        // In some test environments (e.g., happy-dom), getCTM may be null/identity even when
        // a transform attribute is present. Prefer parsing the transform attribute when it exists.
        let transformAttr = '';
        try {
            transformAttr = (element.getAttribute && element.getAttribute('transform')) || '';
        } catch (e) {
            transformAttr = '';
        }

        // Prefer native CTM matrices when available and meaningful.
        try {
            const ctm = (element.getCTM && element.getCTM()) || (element.getScreenCTM && element.getScreenCTM());
            if (ctm && typeof ctm.a === 'number') {
                const m = SVGTransform._createMatrix(ctm.a, ctm.b, ctm.c, ctm.d, ctm.e, ctm.f);
                if (!transformAttr || !transformAttr.trim()) {
                    return m;
                }
                // If transform attribute exists, use it unless CTM is clearly non-identity.
                if (!SVGTransform._isIdentityMatrix(m)) {
                    return m;
                }
            }
        } catch (e) {
            // ignore and fall back
        }

        // Fallback: parse transform attribute (limited subset).
        if (transformAttr && transformAttr.trim()) {
            return SVGTransform._parseTransform(transformAttr);
        }

        return SVGTransform._identityMatrix();
    }

    /**
     * Convert a point from element-local coordinates to canvas (svgRoot) coordinates.
     *
     * @param {SVGGraphicsElement} element - The element whose local space the point is in
     * @param {number} x
     * @param {number} y
     * @param {SVGSVGElement} svgRoot - The root SVG element representing the canvas
     * @returns {{x:number,y:number}}
     */
    static localToCanvas(element, x, y, svgRoot) {
        const m = SVGTransform.getElementMatrix(element, svgRoot);
        return SVGTransform._applyToPoint(m, x, y);
    }

    /**
     * Convert a point from canvas (svgRoot) coordinates to element-local coordinates.
     *
     * @param {SVGGraphicsElement} element
     * @param {number} x
     * @param {number} y
     * @param {SVGSVGElement} svgRoot
     * @returns {{x:number,y:number}}
     */
    static canvasToLocal(element, x, y, svgRoot) {
        const m = SVGTransform.getElementMatrix(element, svgRoot);
        const inv = SVGTransform._inverseMatrix(m);
        if (!inv) return { x, y };
        return SVGTransform._applyToPoint(inv, x, y);
    }
}