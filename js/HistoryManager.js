/**
 * HistoryManager - Undo/Redo system for SVG Editor
 *
 * Uses a hybrid Command/Snapshot pattern:
 * - Actions store "before" and "after" state snapshots
 * - Transactions group continuous operations (drag, resize)
 * - Automatic batching via transaction timeouts
 */
class HistoryManager {
    constructor() {
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistory = 50;

        // Transaction state
        this.pendingTransaction = null;
        this.transactionTimeout = null;
        this.transactionTimeoutMs = 5000;

        // Ignore flag for undo/redo operations
        this.isPerformingUndoRedo = false;

        // Tracking state for before-values
        this._lastDeletedShapeIndex = 0;
        this._lastShapeOrder = [];
        this._lastBackground = 'none';

        this.setupEventListeners();
    }

    setupEventListeners() {
        eventBus.on('shape:created', (shape) => this.onShapeCreated(shape));
        eventBus.on('shape:deleted', (shape) => this.onShapeDeleted(shape));
        eventBus.on('shapes:reordered', (shapes) => this.onShapesReordered(shapes));
        eventBus.on('document:background', (color) => this.onBackgroundChanged(color));
        eventBus.on('canvas:loaded', () => this.clear());
    }

    // === Transaction API ===

    beginTransaction(type, targetId) {
        // End any existing transaction first
        if (this.pendingTransaction) {
            this.endTransaction();
        }

        const target = appState.getShapeById(targetId);
        if (!target) return;

        this.pendingTransaction = {
            type,
            targetId,
            beforeState: this.serializeShape(target),
            beforeIndex: appState.getShapeIndex(targetId)
        };

        // Safety timeout to auto-commit abandoned transactions
        this.transactionTimeout = setTimeout(() => {
            this.endTransaction();
        }, this.transactionTimeoutMs);
    }

    endTransaction() {
        if (!this.pendingTransaction) return;

        clearTimeout(this.transactionTimeout);

        const { type, targetId, beforeState } = this.pendingTransaction;
        const target = appState.getShapeById(targetId);

        if (target) {
            const afterState = this.serializeShape(target);

            // Only record if state actually changed
            if (!this.statesEqual(beforeState, afterState)) {
                this.pushAction({
                    type,
                    targetId,
                    beforeState,
                    afterState
                });
            }
        }

        this.pendingTransaction = null;
    }

    isInTransaction() {
        return this.pendingTransaction !== null;
    }

    // === Event Handlers ===

    onShapeCreated(shape) {
        if (this.isPerformingUndoRedo) return;
        if (this.pendingTransaction) return;

        this.pushAction({
            type: 'create',
            targetId: shape.id,
            afterState: this.serializeShape(shape),
            afterIndex: appState.getShapeIndex(shape.id)
        });
    }

    onShapeDeleted(shape) {
        if (this.isPerformingUndoRedo) return;
        if (this.pendingTransaction) return;

        this.pushAction({
            type: 'delete',
            targetId: shape.id,
            beforeState: this.serializeShape(shape),
            beforeIndex: this._lastDeletedShapeIndex
        });
    }

    onShapesReordered(shapes) {
        if (this.isPerformingUndoRedo) return;
        if (this.pendingTransaction) return;

        const newOrder = shapes.map(s => s.id);

        // Only record if order actually changed
        if (JSON.stringify(this._lastShapeOrder) !== JSON.stringify(newOrder)) {
            this.pushAction({
                type: 'reorder',
                beforeOrder: [...this._lastShapeOrder],
                afterOrder: newOrder
            });
        }

        this._lastShapeOrder = newOrder;
    }

    onBackgroundChanged(color) {
        if (this.isPerformingUndoRedo) return;

        if (this._lastBackground !== color) {
            this.pushAction({
                type: 'background',
                beforeValue: this._lastBackground,
                afterValue: color
            });
        }

        this._lastBackground = color;
    }

    // === Undo/Redo Operations ===

    undo() {
        if (this.undoStack.length === 0) return false;

        // End any pending transaction
        this.endTransaction();

        const action = this.undoStack.pop();
        this.isPerformingUndoRedo = true;

        try {
            this.applyAction(action, true);
            this.redoStack.push(action);
        } finally {
            this.isPerformingUndoRedo = false;
        }

        eventBus.emit('history:changed', { canUndo: this.canUndo(), canRedo: this.canRedo() });
        return true;
    }

    redo() {
        if (this.redoStack.length === 0) return false;

        const action = this.redoStack.pop();
        this.isPerformingUndoRedo = true;

        try {
            this.applyAction(action, false);
            this.undoStack.push(action);
        } finally {
            this.isPerformingUndoRedo = false;
        }

        eventBus.emit('history:changed', { canUndo: this.canUndo(), canRedo: this.canRedo() });
        return true;
    }

    applyAction(action, isUndo) {
        const canvas = window.app?.canvas;
        if (!canvas) return;

        switch (action.type) {
            case 'create':
                if (isUndo) {
                    // Undo create = delete shape
                    const shape = appState.getShapeById(action.targetId);
                    if (shape) {
                        if (shape.element) shape.element.remove();
                        appState.removeShape(action.targetId);
                    }
                } else {
                    // Redo create = recreate shape
                    const shape = this.deserializeShape(action.afterState);
                    shape.id = action.targetId;
                    const element = shape.createSVGElement();
                    canvas.shapesLayer.appendChild(element);
                    appState.addShape(shape);
                }
                break;

            case 'delete':
                if (isUndo) {
                    // Undo delete = recreate shape at original position
                    const shape = this.deserializeShape(action.beforeState);
                    shape.id = action.targetId;
                    const element = shape.createSVGElement();
                    canvas.shapesLayer.appendChild(element);
                    appState.insertShapeAt(shape, action.beforeIndex);
                    canvas.syncDOMOrder();
                } else {
                    // Redo delete = delete again
                    const shape = appState.getShapeById(action.targetId);
                    if (shape) {
                        if (shape.element) shape.element.remove();
                        appState.removeShape(action.targetId);
                    }
                }
                break;

            case 'move':
            case 'resize':
            case 'property':
                const state = isUndo ? action.beforeState : action.afterState;
                this.applyShapeState(action.targetId, state);
                break;

            case 'reorder':
                const order = isUndo ? action.beforeOrder : action.afterOrder;
                this.applyShapeOrder(order);
                break;

            case 'background':
                const color = isUndo ? action.beforeValue : action.afterValue;
                appState.setBackground(color);
                break;
        }

        // Update selection handles if shape was modified
        if (['move', 'resize', 'property'].includes(action.type)) {
            const shape = appState.getShapeById(action.targetId);
            if (shape && appState.selectedShapeId === action.targetId) {
                canvas.selection.updateHandles();
            }
        }

        // Update tracking state
        this._lastShapeOrder = appState.shapes.map(s => s.id);
        this._lastBackground = appState.background;
    }

    // === Serialization ===

    serializeShape(shape) {
        const state = {
            type: shape.type,
            id: shape.id,
            stroke: shape.stroke,
            fill: shape.fill,
            strokeWidth: shape.strokeWidth,
            opacity: shape.opacity,
            strokeDash: shape.strokeDash,
            strokeLinecap: shape.strokeLinecap,
            strokeLinejoin: shape.strokeLinejoin,
            visible: shape.visible
        };

        switch (shape.type) {
            case 'rectangle':
                state.x = shape.x;
                state.y = shape.y;
                state.width = shape.width;
                state.height = shape.height;
                state.rx = shape.rx;
                break;
            case 'ellipse':
                state.cx = shape.cx;
                state.cy = shape.cy;
                state.rx = shape.rx;
                state.ry = shape.ry;
                break;
            case 'line':
                state.x1 = shape.x1;
                state.y1 = shape.y1;
                state.x2 = shape.x2;
                state.y2 = shape.y2;
                break;
            case 'polyline':
                state.points = shape.points.map(p => ({ x: p.x, y: p.y }));
                break;
            case 'star':
                state.cx = shape.cx;
                state.cy = shape.cy;
                state.innerRadius = shape.innerRadius;
                state.outerRadius = shape.outerRadius;
                state.points = shape.points;
                break;
            case 'text':
                state.x = shape.x;
                state.y = shape.y;
                state.text = shape.text;
                state.fontSize = shape.fontSize;
                state.fontFamily = shape.fontFamily;
                break;
        }

        return state;
    }

    deserializeShape(state) {
        let shape;

        switch (state.type) {
            case 'rectangle':
                shape = new Rectangle(state.x, state.y, state.width, state.height);
                shape.rx = state.rx || 0;
                break;
            case 'ellipse':
                shape = new Ellipse(state.cx, state.cy, state.rx, state.ry);
                break;
            case 'line':
                shape = new Line(state.x1, state.y1, state.x2, state.y2);
                break;
            case 'polyline':
                shape = new Polyline(state.points.map(p => ({ x: p.x, y: p.y })));
                break;
            case 'star':
                shape = new Star(state.cx, state.cy, state.outerRadius, state.points, state.innerRadius);
                break;
            case 'text':
                shape = new TextShape(state.x, state.y, state.text);
                shape.fontSize = state.fontSize;
                shape.fontFamily = state.fontFamily;
                break;
        }

        if (shape) {
            shape.stroke = state.stroke;
            shape.fill = state.fill;
            shape.strokeWidth = state.strokeWidth;
            shape.opacity = state.opacity;
            shape.strokeDash = state.strokeDash;
            shape.strokeLinecap = state.strokeLinecap;
            shape.strokeLinejoin = state.strokeLinejoin;
            shape.visible = state.visible;
        }

        return shape;
    }

    applyShapeState(shapeId, state) {
        const shape = appState.getShapeById(shapeId);
        if (!shape) return;

        // Apply type-specific properties
        switch (shape.type) {
            case 'rectangle':
                shape.x = state.x;
                shape.y = state.y;
                shape.width = state.width;
                shape.height = state.height;
                shape.rx = state.rx;
                break;
            case 'ellipse':
                shape.cx = state.cx;
                shape.cy = state.cy;
                shape.rx = state.rx;
                shape.ry = state.ry;
                break;
            case 'line':
                shape.x1 = state.x1;
                shape.y1 = state.y1;
                shape.x2 = state.x2;
                shape.y2 = state.y2;
                break;
            case 'polyline':
                shape.points = state.points.map(p => ({ x: p.x, y: p.y }));
                break;
            case 'star':
                shape.cx = state.cx;
                shape.cy = state.cy;
                shape.innerRadius = state.innerRadius;
                shape.outerRadius = state.outerRadius;
                shape.points = state.points;
                break;
            case 'text':
                shape.x = state.x;
                shape.y = state.y;
                shape.text = state.text;
                shape.fontSize = state.fontSize;
                shape.fontFamily = state.fontFamily;
                break;
        }

        // Apply common properties
        shape.stroke = state.stroke;
        shape.fill = state.fill;
        shape.strokeWidth = state.strokeWidth;
        shape.opacity = state.opacity;
        shape.strokeDash = state.strokeDash;
        shape.strokeLinecap = state.strokeLinecap;
        shape.strokeLinejoin = state.strokeLinejoin;
        shape.visible = state.visible;

        shape.updateElement();
        eventBus.emit('shape:updated', shape);
    }

    applyShapeOrder(order) {
        const newShapes = [];
        order.forEach(id => {
            const shape = appState.shapes.find(s => s.id === id);
            if (shape) newShapes.push(shape);
        });
        appState.shapes = newShapes;
        window.app?.canvas?.syncDOMOrder();
        eventBus.emit('shapes:reordered', appState.shapes);
    }

    // === Utility Methods ===

    pushAction(action) {
        this.undoStack.push(action);
        this.redoStack = [];

        while (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift();
        }

        eventBus.emit('history:changed', { canUndo: this.canUndo(), canRedo: this.canRedo() });
    }

    statesEqual(a, b) {
        return JSON.stringify(a) === JSON.stringify(b);
    }

    clear() {
        this.undoStack = [];
        this.redoStack = [];
        this.pendingTransaction = null;
        clearTimeout(this.transactionTimeout);

        this._lastShapeOrder = appState.shapes.map(s => s.id);
        this._lastBackground = appState.background;

        eventBus.emit('history:changed', { canUndo: false, canRedo: false });
    }

    canUndo() {
        return this.undoStack.length > 0;
    }

    canRedo() {
        return this.redoStack.length > 0;
    }

    captureDeleteIndex(shapeId) {
        this._lastDeletedShapeIndex = appState.getShapeIndex(shapeId);
    }
}

window.historyManager = new HistoryManager();
