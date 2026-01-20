import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('State - Multi-Select', () => {
    let emitSpy;

    beforeEach(() => {
        emitSpy = vi.spyOn(window.eventBus, 'emit');
        // Create some shapes for testing
        appState.addShape(new Rectangle(10, 10, 50, 50));  // shape-1
        appState.addShape(new Rectangle(70, 10, 50, 50));  // shape-2
        appState.addShape(new Rectangle(130, 10, 50, 50)); // shape-3
        appState.addShape(new Rectangle(190, 10, 50, 50)); // shape-4
    });

    describe('selectShape()', () => {
        it('replaces selection with single shape', () => {
            appState.selectShape('shape-1');
            expect(appState.selectedShapeIds).toEqual(['shape-1']);

            appState.selectShape('shape-2');
            expect(appState.selectedShapeIds).toEqual(['shape-2']);
        });

        it('emits selection:changed event', () => {
            appState.selectShape('shape-1');
            expect(emitSpy).toHaveBeenCalledWith('selection:changed', expect.any(Array));
        });

        it('emits shape:selected for backwards compatibility', () => {
            appState.selectShape('shape-1');
            expect(emitSpy).toHaveBeenCalledWith('shape:selected', expect.any(Object));
        });
    });

    describe('addToSelection()', () => {
        it('adds shape to existing selection', () => {
            appState.selectShape('shape-1');
            appState.addToSelection('shape-2');
            expect(appState.selectedShapeIds).toEqual(['shape-1', 'shape-2']);
        });

        it('does not duplicate if already selected', () => {
            appState.selectShape('shape-1');
            appState.addToSelection('shape-1');
            expect(appState.selectedShapeIds).toEqual(['shape-1']);
        });

        it('emits selection:changed event', () => {
            appState.selectShape('shape-1');
            emitSpy.mockClear();

            appState.addToSelection('shape-2');
            expect(emitSpy).toHaveBeenCalledWith('selection:changed', expect.any(Array));
        });
    });

    describe('removeFromSelection()', () => {
        it('removes shape from selection', () => {
            appState.selectShape('shape-1');
            appState.addToSelection('shape-2');
            appState.removeFromSelection('shape-1');
            expect(appState.selectedShapeIds).toEqual(['shape-2']);
        });

        it('does nothing if shape not in selection', () => {
            appState.selectShape('shape-1');
            appState.removeFromSelection('shape-3');
            expect(appState.selectedShapeIds).toEqual(['shape-1']);
        });

        it('emits selection:changed event when shape removed', () => {
            appState.selectShape('shape-1');
            appState.addToSelection('shape-2');
            emitSpy.mockClear();

            appState.removeFromSelection('shape-1');
            expect(emitSpy).toHaveBeenCalledWith('selection:changed', expect.any(Array));
        });
    });

    describe('toggleSelection()', () => {
        it('adds unselected shape', () => {
            appState.selectShape('shape-1');
            appState.toggleSelection('shape-2');
            expect(appState.selectedShapeIds).toContain('shape-2');
        });

        it('removes selected shape', () => {
            appState.selectShape('shape-1');
            appState.addToSelection('shape-2');
            appState.toggleSelection('shape-1');
            expect(appState.selectedShapeIds).not.toContain('shape-1');
            expect(appState.selectedShapeIds).toContain('shape-2');
        });
    });

    describe('selectRange()', () => {
        it('selects shapes between two indices', () => {
            appState.selectRange('shape-1', 'shape-3');
            expect(appState.selectedShapeIds).toEqual(['shape-1', 'shape-2', 'shape-3']);
        });

        it('works in reverse direction', () => {
            appState.selectRange('shape-3', 'shape-1');
            expect(appState.selectedShapeIds).toEqual(['shape-1', 'shape-2', 'shape-3']);
        });

        it('handles invalid IDs gracefully', () => {
            appState.selectRange('invalid-1', 'shape-3');
            expect(appState.selectedShapeIds).toEqual([]);
        });

        it('emits selection:changed event', () => {
            appState.selectRange('shape-1', 'shape-3');
            expect(emitSpy).toHaveBeenCalledWith('selection:changed', expect.any(Array));
        });
    });

    describe('getSelectedShapes()', () => {
        it('returns array of selected shapes', () => {
            appState.selectShape('shape-1');
            appState.addToSelection('shape-2');

            const shapes = appState.getSelectedShapes();
            expect(shapes).toHaveLength(2);
            expect(shapes[0].id).toBe('shape-1');
            expect(shapes[1].id).toBe('shape-2');
        });

        it('returns empty array when nothing selected', () => {
            expect(appState.getSelectedShapes()).toEqual([]);
        });

        it('filters out deleted shapes', () => {
            appState.selectShape('shape-1');
            appState.addToSelection('shape-2');

            // Delete shape-1
            appState.removeShape('shape-1');

            const shapes = appState.getSelectedShapes();
            expect(shapes).toHaveLength(1);
            expect(shapes[0].id).toBe('shape-2');
        });
    });

    describe('isSelected()', () => {
        it('returns true for selected shape', () => {
            appState.selectShape('shape-1');
            expect(appState.isSelected('shape-1')).toBe(true);
        });

        it('returns false for unselected shape', () => {
            appState.selectShape('shape-1');
            expect(appState.isSelected('shape-2')).toBe(false);
        });
    });

    describe('deselectAll()', () => {
        it('clears all selections', () => {
            appState.selectShape('shape-1');
            appState.addToSelection('shape-2');
            appState.deselectAll();
            expect(appState.selectedShapeIds).toEqual([]);
        });

        it('emits selection:changed with empty array', () => {
            appState.selectShape('shape-1');
            emitSpy.mockClear();

            appState.deselectAll();
            expect(emitSpy).toHaveBeenCalledWith('selection:changed', []);
        });

        it('emits shape:deselected for backwards compatibility', () => {
            appState.selectShape('shape-1');
            emitSpy.mockClear();

            appState.deselectAll();
            expect(emitSpy).toHaveBeenCalledWith('shape:deselected');
        });
    });

    describe('selectedShapeId getter (backwards compatibility)', () => {
        it('returns first selected ID', () => {
            appState.selectShape('shape-1');
            appState.addToSelection('shape-2');
            expect(appState.selectedShapeId).toBe('shape-1');
        });

        it('returns null when nothing selected', () => {
            expect(appState.selectedShapeId).toBeNull();
        });
    });

    describe('getSelectedShape() (backwards compatibility)', () => {
        it('returns first selected shape', () => {
            appState.selectShape('shape-1');
            appState.addToSelection('shape-2');

            const shape = appState.getSelectedShape();
            expect(shape.id).toBe('shape-1');
        });

        it('returns null when nothing selected', () => {
            expect(appState.getSelectedShape()).toBeNull();
        });
    });
});
