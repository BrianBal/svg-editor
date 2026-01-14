class SelectTool {
    constructor(canvas) {
        this.canvas = canvas;
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.shapeBoundsStart = null;
        this.originalPoints = null;
    }

    onMouseDown(e, pos) {
        const target = e.target;

        if (target.dataset.shapeId) {
            const shapeId = target.dataset.shapeId;
            appState.selectShape(shapeId);
            this.isDragging = true;
            this.dragStart = pos;

            const shape = appState.getShapeById(shapeId);

            // Store original position for dragging
            if (shape.type === 'polyline') {
                this.originalPoints = shape.points.map(p => ({ x: p.x, y: p.y }));
            } else if (shape.type === 'line') {
                this.originalPoints = [
                    { x: shape.x1, y: shape.y1 },
                    { x: shape.x2, y: shape.y2 }
                ];
            } else {
                // For rectangle, ellipse, star, text - store bounds
                this.shapeBoundsStart = shape.getBounds();
            }
        }
    }

    onMouseMove(e, pos) {
        if (!this.isDragging) return;

        const shape = appState.getShapeById(appState.selectedShapeId);
        if (!shape) return;

        const dx = pos.x - this.dragStart.x;
        const dy = pos.y - this.dragStart.y;

        if (shape.type === 'polyline' && this.originalPoints) {
            shape.points = this.originalPoints.map(p => ({
                x: p.x + dx,
                y: p.y + dy
            }));
            shape.updateElement();
            eventBus.emit('shape:updated', shape);
        } else if (shape.type === 'line' && this.originalPoints) {
            shape.x1 = this.originalPoints[0].x + dx;
            shape.y1 = this.originalPoints[0].y + dy;
            shape.x2 = this.originalPoints[1].x + dx;
            shape.y2 = this.originalPoints[1].y + dy;
            shape.updateElement();
            eventBus.emit('shape:updated', shape);
        } else if (shape.type === 'rectangle' && this.shapeBoundsStart) {
            shape.x = this.shapeBoundsStart.x + dx;
            shape.y = this.shapeBoundsStart.y + dy;
            shape.updateElement();
            eventBus.emit('shape:updated', shape);
        } else if (shape.type === 'ellipse' && this.shapeBoundsStart) {
            shape.cx = this.shapeBoundsStart.x + shape.rx + dx;
            shape.cy = this.shapeBoundsStart.y + shape.ry + dy;
            shape.updateElement();
            eventBus.emit('shape:updated', shape);
        } else if (shape.type === 'star' && this.shapeBoundsStart) {
            shape.cx = this.shapeBoundsStart.x + shape.outerRadius + dx;
            shape.cy = this.shapeBoundsStart.y + shape.outerRadius + dy;
            shape.updateElement();
            eventBus.emit('shape:updated', shape);
        } else if (shape.type === 'text' && this.shapeBoundsStart) {
            shape.x = this.shapeBoundsStart.x + dx;
            shape.y = this.shapeBoundsStart.y + shape.fontSize + dy;
            shape.updateElement();
            eventBus.emit('shape:updated', shape);
        }
    }

    onMouseUp(e, pos) {
        this.isDragging = false;
        this.originalPoints = null;
        this.shapeBoundsStart = null;
    }

    onDoubleClick(e, pos) {
    }
}
