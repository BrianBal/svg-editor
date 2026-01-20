import { describe, it, expect } from 'vitest';

function closeToPoint(pt, exp, eps = 1e-6) {
    expect(pt.x).toBeCloseTo(exp.x, Math.abs(Math.log10(eps)));
    expect(pt.y).toBeCloseTo(exp.y, Math.abs(Math.log10(eps)));
}

describe('SVGTransform', () => {
    it('gracefully handles null element (identity)', () => {
        const pt = SVGTransform.localToCanvas(null, 10, 20);
        closeToPoint(pt, { x: 10, y: 20 });

        const back = SVGTransform.canvasToLocal(null, 10, 20);
        closeToPoint(back, { x: 10, y: 20 });
    });

    it('maps rotate(angle,cx,cy) forward and inverse', () => {
        const el = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        el.setAttribute('transform', 'rotate(90, 10, 10)');

        const p = SVGTransform.localToCanvas(el, 20, 10);
        // Point (20,10) rotated 90deg about (10,10) => (10,20)
        closeToPoint(p, { x: 10, y: 20 });

        const back = SVGTransform.canvasToLocal(el, p.x, p.y);
        closeToPoint(back, { x: 20, y: 10 });
    });

    it('supports scale(sx,sy) forward and inverse', () => {
        const el = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        el.setAttribute('transform', 'scale(2, 3)');

        const p = SVGTransform.localToCanvas(el, 4, 5);
        closeToPoint(p, { x: 8, y: 15 });

        const back = SVGTransform.canvasToLocal(el, p.x, p.y);
        closeToPoint(back, { x: 4, y: 5 });
    });
});