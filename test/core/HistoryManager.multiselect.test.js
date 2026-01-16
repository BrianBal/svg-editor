import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('HistoryManager - Multi-Select', () => {
    let rect1, rect2, rect3;

    beforeEach(() => {
        // Create some shapes
        rect1 = new Rectangle(10, 10, 50, 50);
        rect2 = new Rectangle(70, 10, 50, 50);
        rect3 = new Rectangle(130, 10, 50, 50);

        appState.addShape(rect1);
        appState.addShape(rect2);
        appState.addShape(rect3);

        // Clear history after adding shapes
        historyManager.clear();
    });

    describe('beginMultiTransaction()', () => {
        it('captures state of all target shapes', () => {
            historyManager.beginMultiTransaction('move', ['shape-1', 'shape-2']);

            expect(historyManager.pendingTransaction).not.toBeNull();
            expect(historyManager.pendingTransaction.isMulti).toBe(true);
            expect(historyManager.pendingTransaction.beforeStates['shape-1']).toBeDefined();
            expect(historyManager.pendingTransaction.beforeStates['shape-2']).toBeDefined();
        });

        it('ends previous transaction before starting new one', () => {
            historyManager.beginTransaction('move', 'shape-1');
            historyManager.beginMultiTransaction('move', ['shape-2', 'shape-3']);

            expect(historyManager.pendingTransaction.isMulti).toBe(true);
            expect(historyManager.pendingTransaction.targetIds).toEqual(['shape-2', 'shape-3']);
        });
    });

    describe('endMultiTransaction()', () => {
        it('records action if any state changed', () => {
            historyManager.beginMultiTransaction('move', ['shape-1', 'shape-2']);

            // Move shape-1
            rect1.x = 100;
            rect1.y = 100;

            historyManager.endMultiTransaction();

            expect(historyManager.undoStack).toHaveLength(1);
            expect(historyManager.undoStack[0].isMulti).toBe(true);
            expect(historyManager.undoStack[0].targetIds).toEqual(['shape-1', 'shape-2']);
        });

        it('does not record action if no state changed', () => {
            historyManager.beginMultiTransaction('move', ['shape-1', 'shape-2']);
            // Don't change anything
            historyManager.endMultiTransaction();

            expect(historyManager.undoStack).toHaveLength(0);
        });

        it('captures all after states', () => {
            historyManager.beginMultiTransaction('move', ['shape-1', 'shape-2']);

            rect1.x = 100;
            rect2.x = 200;

            historyManager.endMultiTransaction();

            const action = historyManager.undoStack[0];
            expect(action.afterStates['shape-1'].x).toBe(100);
            expect(action.afterStates['shape-2'].x).toBe(200);
        });
    });

    describe('undo multi-action', () => {
        it('restores all shapes to before state', () => {
            const originalX1 = rect1.x;
            const originalX2 = rect2.x;

            historyManager.beginMultiTransaction('move', ['shape-1', 'shape-2']);
            rect1.x = 100;
            rect2.x = 200;
            historyManager.endMultiTransaction();

            historyManager.undo();

            expect(rect1.x).toBe(originalX1);
            expect(rect2.x).toBe(originalX2);
        });

        it('handles move operations', () => {
            historyManager.beginMultiTransaction('move', ['shape-1', 'shape-2']);
            rect1.x = 100;
            rect1.y = 100;
            rect2.x = 200;
            rect2.y = 200;
            historyManager.endMultiTransaction();

            historyManager.undo();

            expect(rect1.x).toBe(10);
            expect(rect1.y).toBe(10);
            expect(rect2.x).toBe(70);
            expect(rect2.y).toBe(10);
        });

        it('handles property changes', () => {
            const originalStroke1 = rect1.stroke;
            const originalStroke2 = rect2.stroke;

            historyManager.beginMultiTransaction('property', ['shape-1', 'shape-2']);
            rect1.stroke = '#ff0000';
            rect2.stroke = '#00ff00';
            historyManager.endMultiTransaction();

            historyManager.undo();

            expect(rect1.stroke).toBe(originalStroke1);
            expect(rect2.stroke).toBe(originalStroke2);
        });
    });

    describe('redo multi-action', () => {
        it('restores all shapes to after state', () => {
            historyManager.beginMultiTransaction('move', ['shape-1', 'shape-2']);
            rect1.x = 100;
            rect2.x = 200;
            historyManager.endMultiTransaction();

            historyManager.undo();
            historyManager.redo();

            expect(rect1.x).toBe(100);
            expect(rect2.x).toBe(200);
        });
    });

    describe('isInTransaction()', () => {
        it('returns true during multi-transaction', () => {
            historyManager.beginMultiTransaction('move', ['shape-1', 'shape-2']);
            expect(historyManager.isInTransaction()).toBe(true);
        });

        it('returns false after multi-transaction ends', () => {
            historyManager.beginMultiTransaction('move', ['shape-1', 'shape-2']);
            historyManager.endMultiTransaction();
            expect(historyManager.isInTransaction()).toBe(false);
        });
    });

    describe('endTransaction() with multi', () => {
        it('delegates to endMultiTransaction for multi-transactions', () => {
            historyManager.beginMultiTransaction('move', ['shape-1', 'shape-2']);
            rect1.x = 100;

            // Call regular endTransaction - should delegate to endMultiTransaction
            historyManager.endTransaction();

            expect(historyManager.undoStack).toHaveLength(1);
            expect(historyManager.undoStack[0].isMulti).toBe(true);
        });
    });
});
