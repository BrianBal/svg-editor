/**
 * SVGTransform - Coordinate transform helpers.
 *
 * Provides conversions between an element's local coordinate system and the
 * canvas/root SVG coordinate system.
 */
class SVGTransform {
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
        if (!element || !svgRoot) return { x, y };

        // Use getCTM() to map element local coords into root SVG coords.
        // Note: happy-dom may not fully implement SVG matrices; in that case, we fall back.
        try {
            const ctm = element.getCTM && element.getCTM();
            if (!ctm) return { x, y };

            // DOMMatrix-like interface
            if (typeof ctm.a === 'number') {
                return {
                    x: ctm.a * x + ctm.c * y + ctm.e,
                    y: ctm.b * x + ctm.d * y + ctm.f
                };
            }
        } catch (e) {
            // ignore
        }

        return { x, y };
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
        if (!element || !svgRoot) return { x, y };

        try {
            const ctm = element.getCTM && element.getCTM();
            if (!ctm) return { x, y };

            // Invert matrix manually for SVGMatrix-like interface
            const det = ctm.a * ctm.d - ctm.b * ctm.c;
            if (!det) return { x, y };

            const invA = ctm.d / det;
            const invB = -ctm.b / det;
            const invC = -ctm.c / det;
            const invD = ctm.a / det;
            const invE = (ctm.c * ctm.f - ctm.d * ctm.e) / det;
            const invF = (ctm.b * ctm.e - ctm.a * ctm.f) / det;

            return {
                x: invA * x + invC * y + invE,
                y: invB * x + invD * y + invF
            };
        } catch (e) {
            // ignore
        }

        return { x, y };
    }
}