import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('HistoryManager', () => {
    let history;
    let emitSpy;

    beforeEach(() => {
        history = window.historyManager;
        emitSpy = vi.spyOn(window.eventBus, 'emit');
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('initial state', () => {
        it('starts with empty undo/redo stacks', () => {
            expect(history.canUndo()).toBe(false);
            expect(history.canRedo()).toBe(false);
        });

        it('has maxHistory limit', () => {
            expect(history.maxHistory).toBe(50);
        });
    });

    describe('shape:created event handling', () => {
        it('records create action on shape:created', () => {
            const rect = new Rectangle(10, 20, 100, 50);
            appState.addShape(rect);

            expect(history.canUndo()).toBe(true);
            expect(history.undoStack).toHaveLength(1);
            expect(history.undoStack[0].type).toBe('create');
        });

        it('clears redo stack on new action', () => {
            const rect1 = new Rectangle(10, 20, 100, 50);
            appState.addShape(rect1);
            history.undo();
            expect(history.canRedo()).toBe(true);

            const rect2 = new Rectangle(10, 20, 100, 50);
            appState.addShape(rect2);

            expect(history.canRedo()).toBe(false);
        });

        it('ignores event during undo/redo', () => {
            const rect = new Rectangle(10, 20, 100, 50);
            appState.addShape(rect);

            const stackSize = history.undoStack.length;
            history.undo();

            // Should not add another action during undo
            expect(history.undoStack.length).toBe(stackSize - 1);
        });
    });

    describe('shape:deleted event handling', () => {
        it('records delete action on shape:deleted', () => {
            const rect = new Rectangle(10, 20, 100, 50);
            appState.addShape(rect);

            history.undoStack = []; // Clear create action
            appState.removeShape(rect.id);

            expect(history.undoStack).toHaveLength(1);
            expect(history.undoStack[0].type).toBe('delete');
        });

        it('captures shape index before deletion', () => {
            const rect1 = new Rectangle(10, 20, 100, 50);
            const rect2 = new Rectangle(50, 60, 100, 50);
            appState.addShape(rect1);
            appState.addShape(rect2);

            history.undoStack = [];
            appState.removeShape(rect1.id);

            expect(history.undoStack[0].beforeIndex).toBe(0);
        });
    });

    describe('transaction API', () => {
        it('beginTransaction captures before state', () => {
            const rect = new Rectangle(10, 20, 100, 50);
            appState.addShape(rect);

            history.beginTransaction('move', rect.id);

            expect(history.isInTransaction()).toBe(true);
            expect(history.pendingTransaction.beforeState.x).toBe(10);
        });

        it('endTransaction records action if state changed', () => {
            const rect = new Rectangle(10, 20, 100, 50);
            appState.addShape(rect);
            history.undoStack = [];

            history.beginTransaction('move', rect.id);
            rect.x = 50;
            history.endTransaction();

            expect(history.undoStack).toHaveLength(1);
            expect(history.undoStack[0].type).toBe('move');
            expect(history.undoStack[0].beforeState.x).toBe(10);
            expect(history.undoStack[0].afterState.x).toBe(50);
        });

        it('endTransaction does not record if state unchanged', () => {
            const rect = new Rectangle(10, 20, 100, 50);
            appState.addShape(rect);
            history.undoStack = [];

            history.beginTransaction('move', rect.id);
            // No changes
            history.endTransaction();

            expect(history.undoStack).toHaveLength(0);
        });

        it('nested beginTransaction commits previous transaction', () => {
            const rect = new Rectangle(10, 20, 100, 50);
            appState.addShape(rect);
            history.undoStack = [];

            history.beginTransaction('move', rect.id);
            rect.x = 50;
            history.beginTransaction('move', rect.id);

            expect(history.undoStack).toHaveLength(1);
        });

        it('transaction timeout auto-commits', () => {
            vi.useFakeTimers();
            const rect = new Rectangle(10, 20, 100, 50);
            appState.addShape(rect);
            history.undoStack = [];

            history.beginTransaction('move', rect.id);
            rect.x = 50;

            vi.advanceTimersByTime(5000);

            expect(history.isInTransaction()).toBe(false);
            expect(history.undoStack).toHaveLength(1);
        });
    });

    describe('undo()', () => {
        it('undoes create action by removing shape', () => {
            const shapesLayer = document.getElementById('shapes-layer');
            window.app = { canvas: { shapesLayer, syncDOMOrder: vi.fn() } };

            const rect = new Rectangle(10, 20, 100, 50);
            rect.createSVGElement();
            appState.addShape(rect);

            history.undo();

            expect(appState.shapes).toHaveLength(0);
        });

        it('undoes delete action by recreating shape', () => {
            const shapesLayer = document.getElementById('shapes-layer');
            const rect = new Rectangle(10, 20, 100, 50);
            const element = rect.createSVGElement();
            shapesLayer.appendChild(element);
            appState.addShape(rect);

            const rectId = rect.id;
            appState.removeShape(rectId);
            expect(appState.shapes).toHaveLength(0);

            // Mock app.canvas for syncDOMOrder
            window.app = { canvas: { shapesLayer, syncDOMOrder: vi.fn() } };

            history.undo();

            expect(appState.shapes).toHaveLength(1);
            expect(appState.shapes[0].id).toBe(rectId);
        });

        it('undoes move action by restoring position', () => {
            const rect = new Rectangle(10, 20, 100, 50);
            rect.createSVGElement();
            appState.addShape(rect);
            history.undoStack = [];

            history.beginTransaction('move', rect.id);
            rect.x = 100;
            rect.y = 200;
            history.endTransaction();

            history.undo();

            expect(rect.x).toBe(10);
            expect(rect.y).toBe(20);
        });

        it('returns false when nothing to undo', () => {
            expect(history.undo()).toBe(false);
        });

        it('returns true when undo succeeds', () => {
            const rect = new Rectangle(10, 20, 100, 50);
            appState.addShape(rect);

            expect(history.undo()).toBe(true);
        });

        it('emits history:changed event', () => {
            const rect = new Rectangle(10, 20, 100, 50);
            appState.addShape(rect);
            emitSpy.mockClear();

            history.undo();

            expect(emitSpy).toHaveBeenCalledWith('history:changed', expect.objectContaining({
                canUndo: expect.any(Boolean),
                canRedo: expect.any(Boolean)
            }));
        });
    });

    describe('redo()', () => {
        it('redoes create action by recreating shape', () => {
            const shapesLayer = document.getElementById('shapes-layer');
            window.app = { canvas: { shapesLayer, syncDOMOrder: vi.fn() } };

            const rect = new Rectangle(10, 20, 100, 50);
            rect.createSVGElement();
            appState.addShape(rect);
            const rectId = rect.id;

            history.undo();
            expect(appState.shapes).toHaveLength(0);

            history.redo();

            expect(appState.shapes).toHaveLength(1);
        });

        it('redoes move action by restoring new position', () => {
            const rect = new Rectangle(10, 20, 100, 50);
            rect.createSVGElement();
            appState.addShape(rect);
            history.undoStack = [];

            history.beginTransaction('move', rect.id);
            rect.x = 100;
            rect.y = 200;
            history.endTransaction();

            history.undo();
            expect(rect.x).toBe(10);

            history.redo();

            expect(rect.x).toBe(100);
            expect(rect.y).toBe(200);
        });

        it('returns false when nothing to redo', () => {
            expect(history.redo()).toBe(false);
        });

        it('returns true when redo succeeds', () => {
            const rect = new Rectangle(10, 20, 100, 50);
            appState.addShape(rect);
            history.undo();

            expect(history.redo()).toBe(true);
        });
    });

    describe('clear()', () => {
        it('clears undo and redo stacks', () => {
            const rect = new Rectangle(10, 20, 100, 50);
            appState.addShape(rect);
            history.undo();

            history.clear();

            expect(history.canUndo()).toBe(false);
            expect(history.canRedo()).toBe(false);
        });

        it('ends pending transaction', () => {
            const rect = new Rectangle(10, 20, 100, 50);
            appState.addShape(rect);
            history.beginTransaction('move', rect.id);

            history.clear();

            expect(history.isInTransaction()).toBe(false);
        });

        it('emits history:changed event', () => {
            emitSpy.mockClear();
            history.clear();

            expect(emitSpy).toHaveBeenCalledWith('history:changed', { canUndo: false, canRedo: false });
        });
    });

    describe('canvas:loaded event', () => {
        it('clears history on canvas load', () => {
            const rect = new Rectangle(10, 20, 100, 50);
            appState.addShape(rect);
            expect(history.canUndo()).toBe(true);

            eventBus.emit('canvas:loaded');

            expect(history.canUndo()).toBe(false);
        });
    });

    describe('history limit', () => {
        it('enforces maxHistory limit', () => {
            history.maxHistory = 5;

            for (let i = 0; i < 10; i++) {
                const rect = new Rectangle(i * 10, 0, 100, 50);
                appState.addShape(rect);
            }

            expect(history.undoStack.length).toBe(5);
        });
    });

    describe('serialization', () => {
        it('serializes rectangle correctly', () => {
            const rect = new Rectangle(10, 20, 100, 50);
            rect.rx = 5;
            rect.stroke = '#ff0000';
            rect.fill = '#00ff00';

            const state = history.serializeShape(rect);

            expect(state.type).toBe('rectangle');
            expect(state.x).toBe(10);
            expect(state.y).toBe(20);
            expect(state.width).toBe(100);
            expect(state.height).toBe(50);
            expect(state.rx).toBe(5);
            expect(state.stroke).toBe('#ff0000');
            expect(state.fill).toBe('#00ff00');
        });

        it('serializes ellipse correctly', () => {
            const ellipse = new Ellipse(100, 100, 50, 30);

            const state = history.serializeShape(ellipse);

            expect(state.type).toBe('ellipse');
            expect(state.cx).toBe(100);
            expect(state.cy).toBe(100);
            expect(state.rx).toBe(50);
            expect(state.ry).toBe(30);
        });

        it('serializes line correctly', () => {
            const line = new Line(0, 0, 100, 100);

            const state = history.serializeShape(line);

            expect(state.type).toBe('line');
            expect(state.x1).toBe(0);
            expect(state.y1).toBe(0);
            expect(state.x2).toBe(100);
            expect(state.y2).toBe(100);
        });

        it('serializes polyline correctly', () => {
            const polyline = new Polyline([{ x: 0, y: 0 }, { x: 50, y: 50 }, { x: 100, y: 0 }]);

            const state = history.serializeShape(polyline);

            expect(state.type).toBe('polyline');
            expect(state.points).toHaveLength(3);
            expect(state.points[1]).toEqual({ x: 50, y: 50 });
        });

        it('serializes star correctly', () => {
            // Star(cx, cy, outerRadius, innerRadius, points)
            const star = new Star(100, 100, 50, 25, 5);

            const state = history.serializeShape(star);

            expect(state.type).toBe('star');
            expect(state.cx).toBe(100);
            expect(state.cy).toBe(100);
            expect(state.outerRadius).toBe(50);
            expect(state.innerRadius).toBe(25);
            expect(state.points).toBe(5);
        });

        it('serializes text correctly', () => {
            const text = new TextShape(50, 50, 'Hello');
            text.fontSize = 24;
            text.fontFamily = 'Arial';

            const state = history.serializeShape(text);

            expect(state.type).toBe('text');
            expect(state.x).toBe(50);
            expect(state.y).toBe(50);
            expect(state.text).toBe('Hello');
            expect(state.fontSize).toBe(24);
            expect(state.fontFamily).toBe('Arial');
        });
    });

    describe('deserialization', () => {
        it('deserializes rectangle correctly', () => {
            const state = {
                type: 'rectangle',
                x: 10, y: 20, width: 100, height: 50, rx: 5,
                stroke: '#ff0000', fill: '#00ff00', strokeWidth: 2,
                opacity: 100, strokeDash: 'solid', strokeLinecap: 'butt',
                strokeLinejoin: 'miter', visible: true
            };

            const shape = history.deserializeShape(state);

            expect(shape).toBeInstanceOf(Rectangle);
            expect(shape.x).toBe(10);
            expect(shape.rx).toBe(5);
            expect(shape.stroke).toBe('#ff0000');
        });

        it('deserializes ellipse correctly', () => {
            const state = {
                type: 'ellipse',
                cx: 100, cy: 100, rx: 50, ry: 30,
                stroke: '#000', fill: 'none', strokeWidth: 2,
                opacity: 100, strokeDash: 'solid', strokeLinecap: 'butt',
                strokeLinejoin: 'miter', visible: true
            };

            const shape = history.deserializeShape(state);

            expect(shape).toBeInstanceOf(Ellipse);
            expect(shape.cx).toBe(100);
            expect(shape.rx).toBe(50);
        });

        it('deserializes polyline correctly', () => {
            const state = {
                type: 'polyline',
                points: [{ x: 0, y: 0 }, { x: 50, y: 50 }],
                stroke: '#000', fill: 'none', strokeWidth: 2,
                opacity: 100, strokeDash: 'solid', strokeLinecap: 'butt',
                strokeLinejoin: 'miter', visible: true
            };

            const shape = history.deserializeShape(state);

            expect(shape).toBeInstanceOf(Polyline);
            expect(shape.points).toHaveLength(2);
        });
    });

    describe('shapes:reordered handling', () => {
        it('records reorder action', () => {
            const rect1 = new Rectangle(10, 20, 100, 50);
            const rect2 = new Rectangle(50, 60, 100, 50);
            appState.addShape(rect1);
            appState.addShape(rect2);

            history.undoStack = [];
            history._lastShapeOrder = [rect1.id, rect2.id];

            appState.reorderShape(rect1.id, 1);

            expect(history.undoStack).toHaveLength(1);
            expect(history.undoStack[0].type).toBe('reorder');
        });
    });

    describe('document:background handling', () => {
        it('records background change', () => {
            history.undoStack = [];
            history._lastBackground = 'none';

            appState.setBackground('#ffffff');

            expect(history.undoStack).toHaveLength(1);
            expect(history.undoStack[0].type).toBe('background');
            expect(history.undoStack[0].beforeValue).toBe('none');
            expect(history.undoStack[0].afterValue).toBe('#ffffff');
        });
    });
});
