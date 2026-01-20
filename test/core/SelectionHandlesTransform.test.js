import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const jsDir = join(__dirname, '..', '..', 'js');

// Selection isn't loaded into globalThis by test/setup.js; load it here similarly.
const selectionCode = readFileSync(join(jsDir, 'Selection.js'), 'utf-8');
const wrappedSelectionCode = `
    with (this) {
        ${selectionCode}
        return typeof Selection !== 'undefined' ? Selection : undefined;
    }
`;
const selectionFn = new Function(wrappedSelectionCode);
const SelectionClass = selectionFn.call(globalThis);
if (SelectionClass) {
    globalThis.Selection = SelectionClass;
}

// Helper: compare numbers with tolerance
function expectClose(actual, expected, tol = 0.001) {
    expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tol);
}

// Helper: rotate a point around center by degrees
function rotatePoint({ x, y }, { cx, cy }, degrees) {
    const rad = (degrees * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const dx = x - cx;
    const dy = y - cy;
    return {
        x: cx + dx * cos - dy * sin,
        y: cy + dx * sin + dy * cos
    };
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

describe('Selection - handle placement under rotation/flip (polyline/path)', () => {
    let selection;
    let shapesLayer;

    beforeEach(() => {
        selection = new globalThis.Selection(null);
        shapesLayer = document.getElementById('shapes-layer');
    });

    it('polyline anchor handle matches rotated geometry (90deg)', () => {
        const poly = new Polyline([
            { x: 0, y: 0 },
            { x: 20, y: 0 },
            { x: 20, y: 10 }
        ]);
        shapesLayer.appendChild(poly.createSVGElement());

        // rotate about bounds center
        poly.setRotation(90);

        selection.showHandles(poly);

        const handles = Array.from(document.querySelectorAll('#handles-layer rect.handle-point'));
        expect(handles.length).toBe(3);

        const bounds = poly.getBounds();
        const center = { cx: bounds.x + bounds.width / 2, cy: bounds.y + bounds.height / 2 };

        // Check first point handle
        const expected = rotatePoint(poly.points[0], center, 90);
        const actual = rectCenter(handles[0]);

        expectClose(actual.x, expected.x);
        expectClose(actual.y, expected.y);
    });

    it('polyline anchor handle matches geometry after rotation + flipHorizontal', () => {
        const poly = new Polyline([
            { x: 0, y: 0 },
            { x: 20, y: 0 },
            { x: 20, y: 10 }
        ]);
        shapesLayer.appendChild(poly.createSVGElement());

        poly.setRotation(90);
        poly.flipHorizontal(); // rotation should become 90 (180-90)

        selection.showHandles(poly);

        const handles = Array.from(document.querySelectorAll('#handles-layer rect.handle-point'));
        expect(handles.length).toBe(3);

        const bounds = poly.getBounds();
        const center = { cx: bounds.x + bounds.width / 2, cy: bounds.y + bounds.height / 2 };

        const expected = rotatePoint(poly.points[0], center, poly.rotation);
        const actual = rectCenter(handles[0]);

        expectClose(actual.x, expected.x);
        expectClose(actual.y, expected.y);
    });

    it('path control handle matches rotated geometry (90deg)', () => {
        const path = new Path([
            { x: 0, y: 0, handleIn: null, handleOut: { x: 10, y: 0 } },
            { x: 20, y: 0, handleIn: { x: 10, y: 10 }, handleOut: null }
        ]);
        shapesLayer.appendChild(path.createSVGElement());

        path.setRotation(90);

        selection.showHandles(path);

        const control = document.querySelector('#handles-layer circle.handle-path-handle-out');
        expect(control).toBeTruthy();

        const bounds = path.getBounds();
        const center = { cx: bounds.x + bounds.width / 2, cy: bounds.y + bounds.height / 2 };

        const expected = rotatePoint(path.points[0].handleOut, center, 90);
        const actual = circleCenter(control);

        expectClose(actual.x, expected.x);
        expectClose(actual.y, expected.y);
    });
});