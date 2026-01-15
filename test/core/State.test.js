import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('State', () => {
    let state;
    let emitSpy;

    beforeEach(() => {
        state = window.appState;
        emitSpy = vi.spyOn(window.eventBus, 'emit');
    });

    describe('addShape()', () => {
        it('adds shape to shapes array', () => {
            const shape = { id: 'shape-1', type: 'rectangle' };

            state.addShape(shape);

            expect(state.shapes).toContain(shape);
        });

        it('emits shape:created event', () => {
            const shape = { id: 'shape-1', type: 'rectangle' };

            state.addShape(shape);

            expect(emitSpy).toHaveBeenCalledWith('shape:created', shape);
        });
    });

    describe('insertShapeAt()', () => {
        it('inserts shape at specified index', () => {
            const shape1 = { id: 's1' };
            const shape2 = { id: 's2' };
            const shape3 = { id: 's3' };

            state.addShape(shape1);
            state.addShape(shape3);
            state.insertShapeAt(shape2, 1);

            expect(state.shapes[1]).toBe(shape2);
        });

        it('emits shape:created event', () => {
            const shape = { id: 'shape-1' };

            state.insertShapeAt(shape, 0);

            expect(emitSpy).toHaveBeenCalledWith('shape:created', shape);
        });
    });

    describe('removeShape()', () => {
        it('removes shape by id', () => {
            const shape = { id: 'shape-1' };
            state.shapes = [shape];

            state.removeShape('shape-1');

            expect(state.shapes).not.toContain(shape);
        });

        it('emits shape:deleted event', () => {
            const shape = { id: 'shape-1' };
            state.shapes = [shape];

            state.removeShape('shape-1');

            expect(emitSpy).toHaveBeenCalledWith('shape:deleted', shape);
        });

        it('does nothing if shape not found', () => {
            state.shapes = [{ id: 'shape-1' }];

            state.removeShape('nonexistent');

            expect(state.shapes).toHaveLength(1);
            expect(emitSpy).not.toHaveBeenCalledWith('shape:deleted', expect.anything());
        });
    });

    describe('getShapeById()', () => {
        it('returns shape with matching id', () => {
            const shape = { id: 'shape-1' };
            state.shapes = [shape];

            expect(state.getShapeById('shape-1')).toBe(shape);
        });

        it('returns undefined if not found', () => {
            state.shapes = [];

            expect(state.getShapeById('nonexistent')).toBeUndefined();
        });
    });

    describe('selectShape()', () => {
        it('sets selectedShapeId', () => {
            const shape = { id: 'shape-1' };
            state.shapes = [shape];

            state.selectShape('shape-1');

            expect(state.selectedShapeId).toBe('shape-1');
        });

        it('emits shape:selected event with shape', () => {
            const shape = { id: 'shape-1' };
            state.shapes = [shape];

            state.selectShape('shape-1');

            expect(emitSpy).toHaveBeenCalledWith('shape:selected', shape);
        });
    });

    describe('deselectAll()', () => {
        it('clears selectedShapeId', () => {
            state.selectedShapeId = 'shape-1';

            state.deselectAll();

            expect(state.selectedShapeId).toBeNull();
        });

        it('emits shape:deselected event', () => {
            state.deselectAll();

            expect(emitSpy).toHaveBeenCalledWith('shape:deselected');
        });
    });

    describe('setTool()', () => {
        it('sets activeTool', () => {
            state.setTool('rectangle');

            expect(state.activeTool).toBe('rectangle');
        });

        it('emits tool:changed event', () => {
            state.setTool('rectangle');

            expect(emitSpy).toHaveBeenCalledWith('tool:changed', 'rectangle');
        });
    });

    describe('getSelectedShape()', () => {
        it('returns selected shape when one is selected', () => {
            const shape = { id: 'shape-1' };
            state.shapes = [shape];
            state.selectedShapeId = 'shape-1';

            expect(state.getSelectedShape()).toBe(shape);
        });

        it('returns null when nothing selected', () => {
            state.selectedShapeId = null;

            expect(state.getSelectedShape()).toBeNull();
        });
    });

    describe('reorderShape()', () => {
        it('moves shape to new index', () => {
            const shape1 = { id: 's1' };
            const shape2 = { id: 's2' };
            const shape3 = { id: 's3' };
            state.shapes = [shape1, shape2, shape3];

            state.reorderShape('s1', 2);

            expect(state.shapes).toEqual([shape2, shape3, shape1]);
        });

        it('emits shapes:reordered event', () => {
            const shape1 = { id: 's1' };
            const shape2 = { id: 's2' };
            state.shapes = [shape1, shape2];

            state.reorderShape('s1', 1);

            expect(emitSpy).toHaveBeenCalledWith('shapes:reordered', state.shapes);
        });

        it('does nothing if shape not found', () => {
            state.shapes = [{ id: 's1' }];

            state.reorderShape('nonexistent', 0);

            expect(emitSpy).not.toHaveBeenCalledWith('shapes:reordered', expect.anything());
        });

        it('does nothing if moving to same index', () => {
            state.shapes = [{ id: 's1' }, { id: 's2' }];

            state.reorderShape('s1', 0);

            expect(emitSpy).not.toHaveBeenCalledWith('shapes:reordered', expect.anything());
        });
    });

    describe('getShapeIndex()', () => {
        it('returns index of shape', () => {
            state.shapes = [{ id: 's1' }, { id: 's2' }, { id: 's3' }];

            expect(state.getShapeIndex('s2')).toBe(1);
        });

        it('returns -1 if not found', () => {
            state.shapes = [];

            expect(state.getShapeIndex('nonexistent')).toBe(-1);
        });
    });
});
