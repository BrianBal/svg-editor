import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const jsDir = join(__dirname, '..', '..', 'js');

// Load SelectTool
const selectToolCode = readFileSync(join(jsDir, 'SelectTool.js'), 'utf-8');
const wrappedCode = `with (this) { ${selectToolCode}; return SelectTool; }`;
const SelectTool = new Function(wrappedCode).call(globalThis);

describe('SelectTool - Multi-Select', () => {
    let selectTool;
    let rect1, rect2, rect3;
    let mockCanvas;
    let emitSpy;

    beforeEach(() => {
        mockCanvas = {
            selection: {
                updateHandles: vi.fn()
            }
        };

        selectTool = new SelectTool(mockCanvas);
        emitSpy = vi.spyOn(window.eventBus, 'emit');

        // Create shapes
        rect1 = new Rectangle(10, 10, 50, 50);
        rect2 = new Rectangle(100, 10, 50, 50);
        rect3 = new Rectangle(200, 10, 50, 50);

        appState.addShape(rect1);
        appState.addShape(rect2);
        appState.addShape(rect3);

        // Clear history
        historyManager.clear();
    });

    describe('onMouseDown with modifiers', () => {
        it('replaces selection on normal click', () => {
            appState.selectShape('shape-1');
            appState.addToSelection('shape-2');

            const mockEvent = {
                target: { dataset: { shapeId: 'shape-3' } },
                shiftKey: false
            };

            selectTool.onMouseDown(mockEvent, { x: 200, y: 10 });

            expect(appState.selectedShapeIds).toEqual(['shape-3']);
        });

        it('toggles selection on Shift+click', () => {
            appState.selectShape('shape-1');

            const mockEvent = {
                target: { dataset: { shapeId: 'shape-2' } },
                shiftKey: true
            };

            selectTool.onMouseDown(mockEvent, { x: 100, y: 10 });

            expect(appState.selectedShapeIds).toContain('shape-1');
            expect(appState.selectedShapeIds).toContain('shape-2');
        });

        it('removes from selection on Shift+click if already selected', () => {
            appState.selectShape('shape-1');
            appState.addToSelection('shape-2');

            const mockEvent = {
                target: { dataset: { shapeId: 'shape-1' } },
                shiftKey: true
            };

            selectTool.onMouseDown(mockEvent, { x: 10, y: 10 });

            expect(appState.selectedShapeIds).not.toContain('shape-1');
            expect(appState.selectedShapeIds).toContain('shape-2');
        });

        it('keeps selection when clicking selected shape without Shift', () => {
            appState.selectShape('shape-1');
            appState.addToSelection('shape-2');

            const mockEvent = {
                target: { dataset: { shapeId: 'shape-1' } },
                shiftKey: false
            };

            selectTool.onMouseDown(mockEvent, { x: 10, y: 10 });

            // Should keep all selected for dragging
            expect(appState.selectedShapeIds).toContain('shape-1');
            expect(appState.selectedShapeIds).toContain('shape-2');
        });

        it('starts drag when shapes are selected', () => {
            appState.selectShape('shape-1');

            const mockEvent = {
                target: { dataset: { shapeId: 'shape-1' } },
                shiftKey: false
            };

            selectTool.onMouseDown(mockEvent, { x: 10, y: 10 });

            expect(selectTool.isDragging).toBe(true);
            expect(selectTool.originalStates).not.toBeNull();
        });
    });

    describe('multi-shape movement', () => {
        it('moves all selected shapes together', () => {
            appState.selectShape('shape-1');
            appState.addToSelection('shape-2');

            const startPos = { x: 10, y: 10 };
            const endPos = { x: 60, y: 60 };

            // Start drag
            const mockEvent = {
                target: { dataset: { shapeId: 'shape-1' } },
                shiftKey: false
            };
            selectTool.onMouseDown(mockEvent, startPos);

            // Move
            selectTool.onMouseMove({}, endPos);

            // Check both shapes moved by delta (50, 50)
            expect(rect1.x).toBe(60);  // 10 + 50
            expect(rect1.y).toBe(60);  // 10 + 50
            expect(rect2.x).toBe(150); // 100 + 50
            expect(rect2.y).toBe(60);  // 10 + 50
        });

        it('maintains relative positions', () => {
            appState.selectShape('shape-1');
            appState.addToSelection('shape-2');

            const originalDeltaX = rect2.x - rect1.x;
            const originalDeltaY = rect2.y - rect1.y;

            const startPos = { x: 10, y: 10 };
            const endPos = { x: 110, y: 110 };

            const mockEvent = {
                target: { dataset: { shapeId: 'shape-1' } },
                shiftKey: false
            };
            selectTool.onMouseDown(mockEvent, startPos);
            selectTool.onMouseMove({}, endPos);

            const newDeltaX = rect2.x - rect1.x;
            const newDeltaY = rect2.y - rect1.y;

            expect(newDeltaX).toBe(originalDeltaX);
            expect(newDeltaY).toBe(originalDeltaY);
        });

        it('emits selection:changed during movement', () => {
            appState.selectShape('shape-1');
            appState.addToSelection('shape-2');

            const mockEvent = {
                target: { dataset: { shapeId: 'shape-1' } },
                shiftKey: false
            };
            selectTool.onMouseDown(mockEvent, { x: 10, y: 10 });

            emitSpy.mockClear();
            selectTool.onMouseMove({}, { x: 60, y: 60 });

            expect(emitSpy).toHaveBeenCalledWith('selection:changed', expect.any(Array));
        });
    });

    describe('transaction handling', () => {
        it('uses single transaction for single shape', () => {
            appState.selectShape('shape-1');

            const beginSpy = vi.spyOn(historyManager, 'beginTransaction');
            const beginMultiSpy = vi.spyOn(historyManager, 'beginMultiTransaction');

            const mockEvent = {
                target: { dataset: { shapeId: 'shape-1' } },
                shiftKey: false
            };
            selectTool.onMouseDown(mockEvent, { x: 10, y: 10 });

            expect(beginSpy).toHaveBeenCalledWith('move', 'shape-1');
            expect(beginMultiSpy).not.toHaveBeenCalled();
        });

        it('uses multi-transaction for multiple shapes', () => {
            appState.selectShape('shape-1');
            appState.addToSelection('shape-2');

            const beginSpy = vi.spyOn(historyManager, 'beginTransaction');
            const beginMultiSpy = vi.spyOn(historyManager, 'beginMultiTransaction');

            const mockEvent = {
                target: { dataset: { shapeId: 'shape-1' } },
                shiftKey: false
            };
            selectTool.onMouseDown(mockEvent, { x: 10, y: 10 });

            expect(beginMultiSpy).toHaveBeenCalledWith('move', ['shape-1', 'shape-2']);
            expect(beginSpy).not.toHaveBeenCalled();
        });
    });

    describe('onMouseUp', () => {
        it('ends multi-transaction for multiple shapes', () => {
            appState.selectShape('shape-1');
            appState.addToSelection('shape-2');

            const endMultiSpy = vi.spyOn(historyManager, 'endMultiTransaction');

            const mockEvent = {
                target: { dataset: { shapeId: 'shape-1' } },
                shiftKey: false
            };
            selectTool.onMouseDown(mockEvent, { x: 10, y: 10 });
            selectTool.onMouseUp({}, { x: 60, y: 60 });

            expect(endMultiSpy).toHaveBeenCalled();
        });

        it('clears original states', () => {
            appState.selectShape('shape-1');

            const mockEvent = {
                target: { dataset: { shapeId: 'shape-1' } },
                shiftKey: false
            };
            selectTool.onMouseDown(mockEvent, { x: 10, y: 10 });
            selectTool.onMouseUp({}, { x: 60, y: 60 });

            expect(selectTool.originalStates).toBeNull();
            expect(selectTool.isDragging).toBe(false);
        });
    });
});
