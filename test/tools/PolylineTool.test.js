import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('PolylineTool', () => {
    let polylineTool;
    let mockCanvas;
    let emitSpy;

    beforeEach(() => {
        emitSpy = vi.spyOn(window.eventBus, 'emit');

        mockCanvas = {
            handlesLayer: document.getElementById('handles-layer'),
            shapesLayer: document.getElementById('shapes-layer'),
            addShape: vi.fn((shape) => {
                const el = shape.createSVGElement();
                mockCanvas.shapesLayer.appendChild(el);
                appState.addShape(shape);
            }),
            removeShape: vi.fn((shape) => {
                if (shape.element) shape.element.remove();
                appState.removeShape(shape.id);
            })
        };

        polylineTool = new PolylineTool(mockCanvas);
    });

    const createMouseEvent = (type, pos) => ({
        type,
        target: document.getElementById('svg-canvas'),
        clientX: pos.x,
        clientY: pos.y,
        preventDefault: vi.fn()
    });

    describe('preview line', () => {
        it('shows preview line from last point to mouse position', () => {
            // Start drawing - first click
            polylineTool.onMouseDown(createMouseEvent('mousedown', { x: 100, y: 100 }), { x: 100, y: 100 });

            expect(polylineTool.previewLine).not.toBeNull();

            // Move mouse - preview should update
            polylineTool.onMouseMove(createMouseEvent('mousemove', { x: 200, y: 150 }), { x: 200, y: 150 });

            expect(polylineTool.previewLine.getAttribute('x1')).toBe('100');
            expect(polylineTool.previewLine.getAttribute('y1')).toBe('100');
            expect(polylineTool.previewLine.getAttribute('x2')).toBe('200');
            expect(polylineTool.previewLine.getAttribute('y2')).toBe('150');

            // Second click - adds point and resets preview
            polylineTool.onMouseDown(createMouseEvent('mousedown', { x: 200, y: 150 }), { x: 200, y: 150 });

            expect(polylineTool.previewLine.getAttribute('x1')).toBe('200');
            expect(polylineTool.previewLine.getAttribute('y1')).toBe('150');
            expect(polylineTool.previewLine.getAttribute('x2')).toBe('200');
            expect(polylineTool.previewLine.getAttribute('y2')).toBe('150');

            // Move mouse again - preview should update from new point
            polylineTool.onMouseMove(createMouseEvent('mousemove', { x: 150, y: 200 }), { x: 150, y: 200 });

            expect(polylineTool.previewLine.getAttribute('x1')).toBe('200');
            expect(polylineTool.previewLine.getAttribute('y1')).toBe('150');
            expect(polylineTool.previewLine.getAttribute('x2')).toBe('150');
            expect(polylineTool.previewLine.getAttribute('y2')).toBe('200');
        });

        it('sets fill to none for visibility', () => {
            polylineTool.onMouseDown(createMouseEvent('mousedown', { x: 100, y: 100 }), { x: 100, y: 100 });

            expect(polylineTool.previewLine.getAttribute('fill')).toBe('none');
        });
    });

    describe('tool switching cleanup', () => {
        it('cancels drawing when switching to another tool', () => {
            // Start drawing
            polylineTool.onMouseDown(createMouseEvent('mousedown', { x: 100, y: 100 }), { x: 100, y: 100 });

            expect(polylineTool.isDrawing).toBe(true);
            expect(polylineTool.currentPolyline).not.toBeNull();
            expect(polylineTool.previewLine).not.toBeNull();

            // Simulate what SVGCanvas does when switching tools
            polylineTool.cancel();

            // Should have cancelled
            expect(polylineTool.isDrawing).toBe(false);
            expect(polylineTool.currentPolyline).toBeNull();
            expect(polylineTool.previewLine).toBeNull();
            expect(mockCanvas.removeShape).toHaveBeenCalled();
        });

        it('cleans up preview line when switching tools', () => {
            polylineTool.onMouseDown(createMouseEvent('mousedown', { x: 100, y: 100 }), { x: 100, y: 100 });

            const previewElement = polylineTool.previewLine;
            expect(mockCanvas.handlesLayer.contains(previewElement)).toBe(true);

            // Simulate tool switch cleanup
            polylineTool.cancel();

            // Preview should be removed from DOM
            expect(mockCanvas.handlesLayer.contains(previewElement)).toBe(false);
        });
    });

    describe('close path feature', () => {
        beforeEach(() => {
            // Create polyline with 3 points (triangle shape)
            polylineTool.onMouseDown(createMouseEvent('mousedown', { x: 100, y: 100 }), { x: 100, y: 100 });
            polylineTool.onMouseDown(createMouseEvent('mousedown', { x: 200, y: 100 }), { x: 200, y: 100 });
            polylineTool.onMouseDown(createMouseEvent('mousedown', { x: 150, y: 200 }), { x: 150, y: 200 });
        });

        it('shows close indicator when near first point', () => {
            polylineTool.onMouseMove(createMouseEvent('mousemove', { x: 105, y: 105 }), { x: 105, y: 105 });

            expect(polylineTool.closeIndicator).not.toBeNull();
            expect(mockCanvas.handlesLayer.contains(polylineTool.closeIndicator)).toBe(true);
            expect(polylineTool.closeIndicator.getAttribute('cx')).toBe('100');
            expect(polylineTool.closeIndicator.getAttribute('cy')).toBe('100');
            expect(polylineTool.closeIndicator.getAttribute('r')).toBe('15');
        });

        it('hides close indicator when far from first point', () => {
            polylineTool.onMouseMove(createMouseEvent('mousemove', { x: 105, y: 105 }), { x: 105, y: 105 });
            expect(polylineTool.closeIndicator).not.toBeNull();

            polylineTool.onMouseMove(createMouseEvent('mousemove', { x: 300, y: 300 }), { x: 300, y: 300 });
            expect(polylineTool.closeIndicator).toBeNull();
        });

        it('does not show close indicator if less than 2 points', () => {
            // Create new polyline with only 1 point
            const newTool = new PolylineTool(mockCanvas);
            newTool.onMouseDown(createMouseEvent('mousedown', { x: 100, y: 100 }), { x: 100, y: 100 });
            newTool.onMouseMove(createMouseEvent('mousemove', { x: 105, y: 105 }), { x: 105, y: 105 });

            expect(newTool.closeIndicator).toBeNull();
        });

        it('closes path by setting closed=true when clicking near first point', () => {
            const pointCountBefore = 3;

            polylineTool.onMouseDown(createMouseEvent('mousedown', { x: 105, y: 105 }), { x: 105, y: 105 });

            expect(polylineTool.isDrawing).toBe(false);
            expect(polylineTool.currentPolyline).toBeNull();
            expect(polylineTool.closeIndicator).toBeNull();

            // Verify the shape was created with same number of points (no duplicate)
            const shapes = appState.shapes;
            const lastShape = shapes[shapes.length - 1];
            expect(lastShape.points.length).toBe(pointCountBefore);

            // Verify the shape is marked as closed (converts to polygon)
            expect(lastShape.closed).toBe(true);
        });

        it('does not close if clicking far from first point', () => {
            polylineTool.onMouseDown(createMouseEvent('mousedown', { x: 300, y: 300 }), { x: 300, y: 300 });

            expect(polylineTool.isDrawing).toBe(true);
            expect(polylineTool.currentPolyline).not.toBeNull();
            expect(polylineTool.currentPolyline.points.length).toBe(4);
        });

        it('removes close indicator on finish', () => {
            polylineTool.onMouseMove(createMouseEvent('mousemove', { x: 105, y: 105 }), { x: 105, y: 105 });
            expect(polylineTool.closeIndicator).not.toBeNull();

            polylineTool.onDoubleClick(createMouseEvent('dblclick', { x: 150, y: 150 }), { x: 150, y: 150 });

            expect(polylineTool.closeIndicator).toBeNull();
        });

        it('removes close indicator on cancel', () => {
            polylineTool.onMouseMove(createMouseEvent('mousemove', { x: 105, y: 105 }), { x: 105, y: 105 });
            expect(polylineTool.closeIndicator).not.toBeNull();

            polylineTool.cancel();

            expect(polylineTool.closeIndicator).toBeNull();
        });

        it('uses threshold of 15 pixels for close detection', () => {
            // 14 pixels away - should show indicator
            polylineTool.onMouseMove(createMouseEvent('mousemove', { x: 114, y: 100 }), { x: 114, y: 100 });
            expect(polylineTool.closeIndicator).not.toBeNull();

            // 16 pixels away - should not show indicator
            polylineTool.onMouseMove(createMouseEvent('mousemove', { x: 116, y: 100 }), { x: 116, y: 100 });
            expect(polylineTool.closeIndicator).toBeNull();
        });
    });
});
