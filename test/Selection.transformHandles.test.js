import { describe, it, expect, beforeEach, vi } from 'vitest';

// Load Selection source into global scope for tests
beforeEach(() => {
    const handlesLayer = document.getElementById('handles-layer');
    expect(handlesLayer).toBeTruthy();
});

describe('Selection point handles under transforms', () => {
    it('maps polyline point handles using SVGTransform.localToCanvas()', () => {
        // Arrange
        const canvasStub = {};
        const selection = new Selection(canvasStub);

        const shape = new Polyline([
            { x: 10, y: 20 },
            { x: 30, y: 40 }
        ]);
        shape.createSVGElement();

        const spy = vi.spyOn(SVGTransform, 'localToCanvas').mockImplementation((_el, x, y) => ({
            x: x + 100,
            y: y + 200
        }));

        // Act
        selection.showPolylineHandles(shape);

        // Assert
        expect(spy).toHaveBeenCalledTimes(2);
        const handles = [...document.querySelectorAll('#handles-layer .handle-point')];
        expect(handles).toHaveLength(2);

        // createHandle renders rect centered on point with handleSize=8 => x-4, y-4
        expect(handles[0].getAttribute('x')).toBe(String(10 + 100 - 4));
        expect(handles[0].getAttribute('y')).toBe(String(20 + 200 - 4));
        expect(handles[1].getAttribute('x')).toBe(String(30 + 100 - 4));
        expect(handles[1].getAttribute('y')).toBe(String(40 + 200 - 4));
    });

    it('maps path anchor + control handles and control lines using SVGTransform.localToCanvas()', () => {
        // Arrange
        const canvasStub = {};
        const selection = new Selection(canvasStub);

        const shape = new Path([
            {
                x: 10,
                y: 20,
                handleIn: { x: 5, y: 15 },
                handleOut: { x: 15, y: 25 }
            }
        ]);
        shape.createSVGElement();

        const spy = vi.spyOn(SVGTransform, 'localToCanvas').mockImplementation((_el, x, y) => ({
            x: x * 2,
            y: y * 3
        }));

        // Act
        selection.showPathHandles(shape);

        // Assert
        // Called for anchor + handleIn + handleOut (and anchor mapping reused for each control line)
        expect(spy).toHaveBeenCalledTimes(5);

        const anchorHandles = [...document.querySelectorAll('#handles-layer .handle-path-point')];
        expect(anchorHandles).toHaveLength(1);
        expect(anchorHandles[0].getAttribute('x')).toBe(String(10 * 2 - 4));
        expect(anchorHandles[0].getAttribute('y')).toBe(String(20 * 3 - 4));

        const inHandles = [...document.querySelectorAll('#handles-layer .handle-path-handle-in')];
        const outHandles = [...document.querySelectorAll('#handles-layer .handle-path-handle-out')];
        expect(inHandles).toHaveLength(1);
        expect(outHandles).toHaveLength(1);

        expect(inHandles[0].getAttribute('cx')).toBe(String(5 * 2));
        expect(inHandles[0].getAttribute('cy')).toBe(String(15 * 3));
        expect(outHandles[0].getAttribute('cx')).toBe(String(15 * 2));
        expect(outHandles[0].getAttribute('cy')).toBe(String(25 * 3));

        const lines = [...document.querySelectorAll('#handles-layer line')];
        // Two control lines: anchor->in and anchor->out
        expect(lines).toHaveLength(2);

        // Order: handleIn line then handleOut line
        expect(lines[0].getAttribute('x1')).toBe(String(10 * 2));
        expect(lines[0].getAttribute('y1')).toBe(String(20 * 3));
        expect(lines[0].getAttribute('x2')).toBe(String(5 * 2));
        expect(lines[0].getAttribute('y2')).toBe(String(15 * 3));

        expect(lines[1].getAttribute('x1')).toBe(String(10 * 2));
        expect(lines[1].getAttribute('y1')).toBe(String(20 * 3));
        expect(lines[1].getAttribute('x2')).toBe(String(15 * 2));
        expect(lines[1].getAttribute('y2')).toBe(String(25 * 3));
    });
});