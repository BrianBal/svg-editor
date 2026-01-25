import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('PenTool', () => {
    let penTool;
    let mockCanvas;
    let emitSpy;

    beforeEach(() => {
        emitSpy = vi.spyOn(window.eventBus, 'emit');

        // Create mock canvas
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

        penTool = new PenTool(mockCanvas);
    });

    const createMouseEvent = (type, pos, target = document.getElementById('svg-canvas')) => ({
        type,
        target,
        clientX: pos.x,
        clientY: pos.y,
        preventDefault: vi.fn()
    });

    describe('drawing', () => {
        it('click starts new path', () => {
            const pos = { x: 100, y: 100 };
            penTool.onMouseDown(createMouseEvent('mousedown', pos), pos);

            expect(penTool.isDrawing).toBe(true);
            expect(penTool.currentPath).toBeInstanceOf(Path);
            expect(penTool.currentPath.points.length).toBe(1);
            expect(penTool.currentPath.points[0]).toEqual({
                x: 100,
                y: 100,
                handleIn: null,
                handleOut: null
            });
            expect(mockCanvas.addShape).toHaveBeenCalled();
        });

        it('subsequent clicks add corner points', () => {
            // Start path
            penTool.onMouseDown(createMouseEvent('mousedown', { x: 100, y: 100 }), { x: 100, y: 100 });
            penTool.onMouseUp(createMouseEvent('mouseup', { x: 100, y: 100 }), { x: 100, y: 100 });

            // Add second point
            penTool.onMouseDown(createMouseEvent('mousedown', { x: 200, y: 200 }), { x: 200, y: 200 });
            penTool.onMouseUp(createMouseEvent('mouseup', { x: 200, y: 200 }), { x: 200, y: 200 });

            expect(penTool.currentPath.points.length).toBe(2);
            expect(penTool.currentPath.points[1]).toEqual({
                x: 200,
                y: 200,
                handleIn: null,
                handleOut: null
            });
        });

        it('click+drag adds point with handles', () => {
            // Start path
            penTool.onMouseDown(createMouseEvent('mousedown', { x: 100, y: 100 }), { x: 100, y: 100 });

            // Drag to create handles
            penTool.onMouseMove(createMouseEvent('mousemove', { x: 120, y: 100 }), { x: 120, y: 100 });

            const point = penTool.currentPath.points[0];
            expect(point.handleOut).toEqual({ x: 120, y: 100 });
            // handleIn should be mirrored
            expect(point.handleIn).toEqual({ x: 80, y: 100 });
        });

        it('small drag does not create handles', () => {
            penTool.onMouseDown(createMouseEvent('mousedown', { x: 100, y: 100 }), { x: 100, y: 100 });

            // Small drag (< 3px)
            penTool.onMouseMove(createMouseEvent('mousemove', { x: 101, y: 101 }), { x: 101, y: 101 });

            const point = penTool.currentPath.points[0];
            expect(point.handleOut).toBeNull();
            expect(point.handleIn).toBeNull();
        });

        it('double-click finishes path', () => {
            // Start path
            penTool.onMouseDown(createMouseEvent('mousedown', { x: 100, y: 100 }), { x: 100, y: 100 });
            penTool.onMouseUp(createMouseEvent('mouseup', { x: 100, y: 100 }), { x: 100, y: 100 });

            // Add second point
            penTool.onMouseDown(createMouseEvent('mousedown', { x: 200, y: 200 }), { x: 200, y: 200 });
            penTool.onMouseUp(createMouseEvent('mouseup', { x: 200, y: 200 }), { x: 200, y: 200 });

            // Double-click to finish
            penTool.onDoubleClick(createMouseEvent('dblclick', { x: 200, y: 200 }), { x: 200, y: 200 });

            expect(penTool.isDrawing).toBe(false);
            expect(penTool.currentPath).toBeNull();
            expect(emitSpy).toHaveBeenCalledWith('shape:selected', expect.any(Path));
        });

        it('escape cancels drawing', () => {
            penTool.onMouseDown(createMouseEvent('mousedown', { x: 100, y: 100 }), { x: 100, y: 100 });
            penTool.onMouseUp(createMouseEvent('mouseup', { x: 100, y: 100 }), { x: 100, y: 100 });

            const pathId = penTool.currentPath.id;
            penTool.cancel();

            expect(penTool.isDrawing).toBe(false);
            expect(penTool.currentPath).toBeNull();
            expect(mockCanvas.removeShape).toHaveBeenCalled();
        });

        it('ignores clicks on handles', () => {
            const handle = document.createElement('div');
            handle.classList.add('handle');

            penTool.onMouseDown(createMouseEvent('mousedown', { x: 100, y: 100 }, handle), { x: 100, y: 100 });

            expect(penTool.isDrawing).toBe(false);
            expect(penTool.currentPath).toBeNull();
        });

        it('can draw on top of existing shapes', () => {
            const shape = document.createElement('div');
            shape.dataset.shapeId = 'shape-1';

            penTool.onMouseDown(createMouseEvent('mousedown', { x: 100, y: 100 }, shape), { x: 100, y: 100 });

            // Should start drawing even when clicking on existing shape
            expect(penTool.isDrawing).toBe(true);
            expect(penTool.currentPath).toBeInstanceOf(Path);
        });
    });

    describe('close detection', () => {
        beforeEach(() => {
            // Create path with 3 points
            penTool.onMouseDown(createMouseEvent('mousedown', { x: 100, y: 100 }), { x: 100, y: 100 });
            penTool.onMouseUp(createMouseEvent('mouseup', { x: 100, y: 100 }), { x: 100, y: 100 });

            penTool.onMouseDown(createMouseEvent('mousedown', { x: 200, y: 100 }), { x: 200, y: 100 });
            penTool.onMouseUp(createMouseEvent('mouseup', { x: 200, y: 100 }), { x: 200, y: 100 });

            penTool.onMouseDown(createMouseEvent('mousedown', { x: 150, y: 200 }), { x: 150, y: 200 });
            penTool.onMouseUp(createMouseEvent('mouseup', { x: 150, y: 200 }), { x: 150, y: 200 });
        });

        it('clicking near first point closes path', () => {
            // Click within threshold of first point (100, 100)
            penTool.onMouseDown(createMouseEvent('mousedown', { x: 105, y: 105 }), { x: 105, y: 105 });

            expect(penTool.currentPath).toBeNull();
            expect(penTool.isDrawing).toBe(false);
            // Path should be closed
            expect(emitSpy).toHaveBeenCalledWith('shape:updated', expect.objectContaining({ closed: true }));
        });

        it('clicking far from first point adds point', () => {
            const pointsBefore = penTool.currentPath.points.length;

            // Click far from first point
            penTool.onMouseDown(createMouseEvent('mousedown', { x: 300, y: 300 }), { x: 300, y: 300 });

            expect(penTool.currentPath.points.length).toBe(pointsBefore + 1);
            expect(penTool.isDrawing).toBe(true);
        });

        it('closed path has closed flag set', () => {
            // Store reference before closing
            const pathRef = penTool.currentPath;

            // Click near first point to close
            penTool.onMouseDown(createMouseEvent('mousedown', { x: 105, y: 105 }), { x: 105, y: 105 });

            expect(pathRef.closed).toBe(true);
        });
    });

    describe('preview', () => {
        it('shows preview line while drawing', () => {
            penTool.onMouseDown(createMouseEvent('mousedown', { x: 100, y: 100 }), { x: 100, y: 100 });

            expect(penTool.previewPath).not.toBeNull();
            expect(mockCanvas.handlesLayer.contains(penTool.previewPath)).toBe(true);
        });

        it('shows curved preview when last point has handles', () => {
            penTool.onMouseDown(createMouseEvent('mousedown', { x: 100, y: 100 }), { x: 100, y: 100 });

            // Drag to create handles
            penTool.onMouseMove(createMouseEvent('mousemove', { x: 130, y: 100 }), { x: 130, y: 100 });

            // Move to a new position
            penTool.onMouseUp(createMouseEvent('mouseup', { x: 130, y: 100 }), { x: 130, y: 100 });
            penTool.onMouseMove(createMouseEvent('mousemove', { x: 200, y: 200 }), { x: 200, y: 200 });

            const d = penTool.previewPath.getAttribute('d');
            expect(d).toContain('Q');  // Quadratic bezier preview
        });

        it('shows straight preview when last point has no handles', () => {
            penTool.onMouseDown(createMouseEvent('mousedown', { x: 100, y: 100 }), { x: 100, y: 100 });
            penTool.onMouseUp(createMouseEvent('mouseup', { x: 100, y: 100 }), { x: 100, y: 100 });

            penTool.onMouseMove(createMouseEvent('mousemove', { x: 200, y: 200 }), { x: 200, y: 200 });

            const d = penTool.previewPath.getAttribute('d');
            expect(d).toContain('L');  // Line to
        });

        it('removes preview on finish', () => {
            penTool.onMouseDown(createMouseEvent('mousedown', { x: 100, y: 100 }), { x: 100, y: 100 });
            penTool.onMouseUp(createMouseEvent('mouseup', { x: 100, y: 100 }), { x: 100, y: 100 });

            penTool.onMouseDown(createMouseEvent('mousedown', { x: 200, y: 200 }), { x: 200, y: 200 });
            penTool.onMouseUp(createMouseEvent('mouseup', { x: 200, y: 200 }), { x: 200, y: 200 });

            penTool.onDoubleClick(createMouseEvent('dblclick', { x: 200, y: 200 }), { x: 200, y: 200 });

            expect(penTool.previewPath).toBeNull();
        });
    });

    describe('close indicator', () => {
        beforeEach(() => {
            // Create path with 2 points
            penTool.onMouseDown(createMouseEvent('mousedown', { x: 100, y: 100 }), { x: 100, y: 100 });
            penTool.onMouseUp(createMouseEvent('mouseup', { x: 100, y: 100 }), { x: 100, y: 100 });

            penTool.onMouseDown(createMouseEvent('mousedown', { x: 200, y: 200 }), { x: 200, y: 200 });
            penTool.onMouseUp(createMouseEvent('mouseup', { x: 200, y: 200 }), { x: 200, y: 200 });
        });

        it('shows close indicator when near first point', () => {
            penTool.onMouseMove(createMouseEvent('mousemove', { x: 105, y: 105 }), { x: 105, y: 105 });

            expect(penTool.closeIndicator).not.toBeNull();
            expect(mockCanvas.handlesLayer.contains(penTool.closeIndicator)).toBe(true);
        });

        it('hides close indicator when far from first point', () => {
            // Show indicator first
            penTool.onMouseMove(createMouseEvent('mousemove', { x: 105, y: 105 }), { x: 105, y: 105 });
            expect(penTool.closeIndicator).not.toBeNull();

            // Move away
            penTool.onMouseMove(createMouseEvent('mousemove', { x: 300, y: 300 }), { x: 300, y: 300 });
            expect(penTool.closeIndicator).toBeNull();
        });

        it('removes close indicator on finish', () => {
            penTool.onMouseMove(createMouseEvent('mousemove', { x: 105, y: 105 }), { x: 105, y: 105 });
            penTool.onMouseDown(createMouseEvent('mousedown', { x: 105, y: 105 }), { x: 105, y: 105 });

            expect(penTool.closeIndicator).toBeNull();
        });
    });

    describe('defaults', () => {
        beforeEach(() => {
            appState.defaultStroke = '#ff0000';
            appState.defaultFill = '#00ff00';
            appState.defaultStrokeWidth = 5;
        });

        it('applies default stroke', () => {
            penTool.onMouseDown(createMouseEvent('mousedown', { x: 100, y: 100 }), { x: 100, y: 100 });

            expect(penTool.currentPath.stroke).toBe('#ff0000');
        });

        it('applies default fill', () => {
            penTool.onMouseDown(createMouseEvent('mousedown', { x: 100, y: 100 }), { x: 100, y: 100 });

            expect(penTool.currentPath.fill).toBe('#00ff00');
        });

        it('applies default strokeWidth', () => {
            penTool.onMouseDown(createMouseEvent('mousedown', { x: 100, y: 100 }), { x: 100, y: 100 });

            expect(penTool.currentPath.strokeWidth).toBe(5);
        });
    });

    describe('incomplete path handling', () => {
        it('removes path with only one point on finish', () => {
            penTool.onMouseDown(createMouseEvent('mousedown', { x: 100, y: 100 }), { x: 100, y: 100 });
            penTool.onMouseUp(createMouseEvent('mouseup', { x: 100, y: 100 }), { x: 100, y: 100 });

            penTool.onDoubleClick(createMouseEvent('dblclick', { x: 100, y: 100 }), { x: 100, y: 100 });

            expect(mockCanvas.removeShape).toHaveBeenCalled();
        });
    });

    describe('tool switching cleanup', () => {
        it('cancels drawing when switching to another tool', () => {
            // Start drawing a path
            penTool.onMouseDown(createMouseEvent('mousedown', { x: 100, y: 100 }), { x: 100, y: 100 });
            penTool.onMouseUp(createMouseEvent('mouseup', { x: 100, y: 100 }), { x: 100, y: 100 });

            expect(penTool.isDrawing).toBe(true);
            expect(penTool.currentPath).not.toBeNull();
            expect(penTool.previewPath).not.toBeNull();

            // Simulate what SVGCanvas does when switching tools
            penTool.cancel();

            // Verify state was cleaned up
            expect(penTool.isDrawing).toBe(false);
            expect(penTool.currentPath).toBeNull();
            expect(penTool.previewPath).toBeNull();
            expect(mockCanvas.removeShape).toHaveBeenCalled();
        });

        it('cleans up preview path DOM element when switching tools', () => {
            penTool.onMouseDown(createMouseEvent('mousedown', { x: 100, y: 100 }), { x: 100, y: 100 });

            const previewElement = penTool.previewPath;
            expect(mockCanvas.handlesLayer.contains(previewElement)).toBe(true);

            // Simulate tool switch cleanup
            penTool.cancel();

            // Preview should be removed from DOM
            expect(mockCanvas.handlesLayer.contains(previewElement)).toBe(false);
        });

        it('removes close indicator when switching tools', () => {
            // Create path with 2 points to enable close indicator
            penTool.onMouseDown(createMouseEvent('mousedown', { x: 100, y: 100 }), { x: 100, y: 100 });
            penTool.onMouseUp(createMouseEvent('mouseup', { x: 100, y: 100 }), { x: 100, y: 100 });

            penTool.onMouseDown(createMouseEvent('mousedown', { x: 200, y: 200 }), { x: 200, y: 200 });
            penTool.onMouseUp(createMouseEvent('mouseup', { x: 200, y: 200 }), { x: 200, y: 200 });

            // Move near first point to trigger close indicator
            penTool.onMouseMove(createMouseEvent('mousemove', { x: 105, y: 105 }), { x: 105, y: 105 });

            expect(penTool.closeIndicator).not.toBeNull();

            // Simulate tool switch cleanup
            penTool.cancel();

            // Close indicator should be removed
            expect(penTool.closeIndicator).toBeNull();
        });
    });
});
