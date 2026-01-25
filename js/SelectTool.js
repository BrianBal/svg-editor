class SelectTool {
    constructor(canvas) {
        this.canvas = canvas;
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        // Map of shape id -> original state for multi-shape dragging
        this.originalStates = null;
    }

    onMouseDown(e, pos) {
        const target = e.target;

        if (target.dataset.shapeId) {
            const shapeId = target.dataset.shapeId;

            if (e.shiftKey) {
                // Shift+click: toggle shape in selection
                appState.toggleSelection(shapeId);
            } else if (!appState.isSelected(shapeId)) {
                // Normal click on unselected shape: replace selection
                appState.selectShape(shapeId);
            }
            // If clicking on already selected shape without shift, keep selection for dragging

            // Start drag if we have any selected shapes
            if (appState.selectedShapeIds.length > 0) {
                this.startDrag(pos);
            }
        }
    }

    startDrag(pos) {
        this.isDragging = true;
        this.dragStart = pos;

        const selectedShapes = appState.getSelectedShapes();
        const selectedIds = appState.selectedShapeIds;

        // Begin multi-transaction for undo/redo
        if (window.historyManager && selectedIds.length > 0) {
            if (selectedIds.length === 1) {
                historyManager.beginTransaction('move', selectedIds[0]);
            } else {
                historyManager.beginMultiTransaction('move', selectedIds);
            }
        }

        // Store original state for all selected shapes
        this.originalStates = new Map();
        for (const shape of selectedShapes) {
            this.originalStates.set(shape.id, this.captureShapeState(shape));
        }

        this.canvas.selection.setDragging(true);
    }

    captureShapeState(shape) {
        const state = { type: shape.type };

        switch (shape.type) {
            case 'polyline':
                state.points = shape.points.map(p => ({ x: p.x, y: p.y }));
                break;
            case 'path':
                state.points = shape.points.map(p => ({
                    x: p.x,
                    y: p.y,
                    handleIn: p.handleIn ? { x: p.handleIn.x, y: p.handleIn.y } : null,
                    handleOut: p.handleOut ? { x: p.handleOut.x, y: p.handleOut.y } : null
                }));
                break;
            case 'line':
                state.x1 = shape.x1;
                state.y1 = shape.y1;
                state.x2 = shape.x2;
                state.y2 = shape.y2;
                break;
            case 'rectangle':
            case 'text':
                state.x = shape.x;
                state.y = shape.y;
                if (shape.type === 'text') {
                    state.fontSize = shape.fontSize;
                }
                break;
            case 'ellipse':
                state.cx = shape.cx;
                state.cy = shape.cy;
                state.rx = shape.rx;
                state.ry = shape.ry;
                break;
            case 'star':
                state.cx = shape.cx;
                state.cy = shape.cy;
                state.outerRadius = shape.outerRadius;
                break;
        }

        return state;
    }

    onMouseMove(e, pos) {
        if (!this.isDragging || !this.originalStates) return;

        const dx = pos.x - this.dragStart.x;
        const dy = pos.y - this.dragStart.y;

        // Move all selected shapes
        for (const shape of appState.getSelectedShapes()) {
            const original = this.originalStates.get(shape.id);
            if (!original) continue;

            this.moveShapeByDelta(shape, original, dx, dy);
        }

        // Update handles for all selected shapes
        eventBus.emit('selection:changed', appState.getSelectedShapes());
    }

    moveShapeByDelta(shape, original, dx, dy) {
        switch (original.type) {
            case 'polyline':
                shape.points = original.points.map(p => ({
                    x: p.x + dx,
                    y: p.y + dy
                }));
                break;
            case 'path':
                shape.points = original.points.map(p => ({
                    x: p.x + dx,
                    y: p.y + dy,
                    handleIn: p.handleIn ? { x: p.handleIn.x + dx, y: p.handleIn.y + dy } : null,
                    handleOut: p.handleOut ? { x: p.handleOut.x + dx, y: p.handleOut.y + dy } : null
                }));
                break;
            case 'line':
                shape.x1 = original.x1 + dx;
                shape.y1 = original.y1 + dy;
                shape.x2 = original.x2 + dx;
                shape.y2 = original.y2 + dy;
                break;
            case 'rectangle':
                shape.x = original.x + dx;
                shape.y = original.y + dy;
                break;
            case 'text':
                shape.x = original.x + dx;
                shape.y = original.y + dy;
                break;
            case 'ellipse':
                shape.cx = original.cx + dx;
                shape.cy = original.cy + dy;
                break;
            case 'star':
                shape.cx = original.cx + dx;
                shape.cy = original.cy + dy;
                break;
        }

        shape.updateElement();
    }

    onMouseUp(e, pos) {
        if (this.isDragging && this.originalStates) {
            // Emit shape:updated for all moved shapes to trigger auto-save
            for (const shape of appState.getSelectedShapes()) {
                eventBus.emit('shape:updated', shape);
            }
        }

        if (window.historyManager) {
            const selectedIds = appState.selectedShapeIds;
            if (selectedIds.length === 1) {
                historyManager.endTransaction();
            } else if (selectedIds.length > 1) {
                historyManager.endMultiTransaction();
            }
        }

        this.canvas.selection.setDragging(false);
        this.isDragging = false;
        this.originalStates = null;
    }

    onDoubleClick(e, pos) {
    }
}
