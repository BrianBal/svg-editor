import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const jsDir = join(__dirname, '..', '..', 'js');

// Selection isn't loaded into globalThis by test/setup.js; load it here.
const selectionCode = readFileSync(join(jsDir, 'Selection.js'), 'utf-8');
const wrappedSelectionCode = `\n    with (this) {\n        ${selectionCode}\n        return typeof Selection !== 'undefined' ? Selection : undefined;\n    }\n`;
const selectionFn = new Function(wrappedSelectionCode);
const SelectionClass = selectionFn.call(globalThis);
if (SelectionClass) {
    globalThis.Selection = SelectionClass;
}

function expectClose(actual, expected, tol = 0.001) {
    expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tol);
}

function rectCenter(rectEl) {
    const x = parseFloat(rectEl.getAttribute('x'));
    const y = parseFloat(rectEl.getAttribute('y'));
    const w = parseFloat(rectEl.getAttribute('width'));
    const h = parseFloat(rectEl.getAttribute('height'));
    return { x: x + w / 2, y: y + h / 2 };
}

function circleCenter(circleEl) {
    return {
        x: parseFloat(circleEl.getAttribute('cx')),
        y: parseFloat(circleEl.getAttribute('cy'))
    };
}

describe('Selection - handle placement under flip-like scale transforms', () => {
    let selection;
    let shapesLayer;

    beforeEach(() => {
        selection = new globalThis.Selection(null);
        shapesLayer = document.getElementById('shapes-layer');
    });

    it('polyline anchor handles follow element transform scale(-1,1) (horizontal flip)', () => {
        const poly = new Polyline([
            { x: 0, y: 0 },
            { x: 20, y: 0 },
            { x: 20, y: 10 }
        ]);
        shapesLayer.appendChild(poly.createSVGElement());

        // Mimic a flip implementation via scale on the element.
        poly.element.setAttribute('transform', 'scale(-1, 1)');

        selection.showHandles(poly);

        const handles = Array.from(document.querySelectorAll('#handles-layer rect.handle-point'));
        expect(handles.length).toBe(3);

        // Handle centers should match transformed point positions.
        const expected0 = SVGTransform.localToCanvas(poly.element, poly.points[0].x, poly.points[0].y);
        const actual0 = rectCenter(handles[0]);
        expectClose(actual0.x, expected0.x);
        expectClose(actual0.y, expected0.y);
    });

    it('polyline anchor handles follow element transform scale(1,-1) (vertical flip)', () => {
        const poly = new Polyline([
            { x: 0, y: 0 },
            { x: 20, y: 0 },
            { x: 20, y: 10 }
        ]);
        shapesLayer.appendChild(poly.createSVGElement());

        poly.element.setAttribute('transform', 'scale(1, -1)');

        selection.showHandles(poly);

        const handles = Array.from(document.querySelectorAll('#handles-layer rect.handle-point'));
        expect(handles.length).toBe(3);

        const expected2 = SVGTransform.localToCanvas(poly.element, poly.points[2].x, poly.points[2].y);
        const actual2 = rectCenter(handles[2]);
        expectClose(actual2.x, expected2.x);
        expectClose(actual2.y, expected2.y);
    });

    it('path control handles follow element transform scale(-1,1) (horizontal flip)', () => {
        const path = new Path([
            { x: 0, y: 0, handleIn: null, handleOut: { x: 10, y: 0 } },
            { x: 20, y: 0, handleIn: { x: 10, y: 10 }, handleOut: null }
        ]);
        shapesLayer.appendChild(path.createSVGElement());

        path.element.setAttribute('transform', 'scale(-1, 1)');

        selection.showHandles(path);

        const control = document.querySelector('#handles-layer circle.handle-path-handle-out');
        expect(control).toBeTruthy();

        const expected = SVGTransform.localToCanvas(path.element, path.points[0].handleOut.x, path.points[0].handleOut.y);
        const actual = circleCenter(control);
        expectClose(actual.x, expected.x);
        expectClose(actual.y, expected.y);
    });
});