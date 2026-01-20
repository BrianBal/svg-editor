import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const jsDir = join(__dirname, '..', '..', 'js');

// SVGCanvas and Selection aren't loaded into globalThis by test/setup.js; load them here.
function loadClass(file, className) {
    const code = readFileSync(join(jsDir, file), 'utf-8');
    const wrapped = `\n        with (this) {\n            ${code}\n            return typeof ${className} !== 'undefined' ? ${className} : undefined;\n        }\n    `;
    const fn = new Function(wrapped);
    return fn.call(globalThis);
}

const SelectionClass = loadClass('Selection.js', 'Selection');
if (SelectionClass) globalThis.Selection = SelectionClass;

const SVGCanvasClass = loadClass('SVGCanvas.js', 'SVGCanvas');
if (SVGCanvasClass) globalThis.SVGCanvas = SVGCanvasClass;

function closeToPoint(pt, exp, eps = 1e-3) {
    expect(pt.x).toBeCloseTo(exp.x, Math.abs(Math.log10(eps)));
    expect(pt.y).toBeCloseTo(exp.y, Math.abs(Math.log10(eps)));
}

describe('SVGCanvas - point dragging accounts for transforms', () => {
    let canvas;
    let shapesLayer;

    beforeEach(() => {
        canvas = new globalThis.SVGCanvas();
        shapesLayer = document.getElementById('shapes-layer');
    });

    it('converts canvas coords to local coords when dragging a rotated polyline point', () => {
        const poly = new Polyline([
            { x: 0, y: 0 },
            { x: 20, y: 0 },
            { x: 20, y: 10 }
        ]);
        shapesLayer.appendChild(poly.createSVGElement());

        poly.setRotation(90);
        appState.addShape(poly);
        appState.selectShape(poly.id);

        // Drag point 0 to a new canvas position that corresponds to local (5,5)
        const desiredLocal = { x: 5, y: 5 };
        const desiredCanvas = SVGTransform.localToCanvas(poly.element, desiredLocal.x, desiredLocal.y);

        canvas.activeHandle = { type: 'point', data: '0' };
        canvas.handlePolylinePointMove(poly, desiredCanvas);

        closeToPoint(poly.points[0], desiredLocal);
    });
});