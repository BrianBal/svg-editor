/**
 * PenTool - Tool for creating bezier curve paths.
 * Click to add corner points, click+drag to add smooth curve points with handles.
 * Click near the first point to close the path.
 * Double-click to finish an open path.
 */
class PenTool {
    constructor(canvas) {
        this.canvas = canvas;
        this.currentPath = null;
        this.isDrawing = false;
        this.previewPath = null;
        this.dragStart = null;
        this.isDraggingHandle = false;
        this.closeThreshold = 15;  // Distance in pixels to trigger close
    }

    onMouseDown(e, pos) {
        // Ignore clicks on handles
        if (e.target.classList.contains('handle')) return;

        if (!this.isDrawing) {
            // Start a new path
            this.startNewPath(pos);
        } else {
            // Check if clicking near first point to close
            if (this.currentPath.points.length >= 2 && this.currentPath.isNearFirstPoint(pos.x, pos.y, this.closeThreshold)) {
                this.closePath();
                return;
            }

            // Add new point
            this.addPoint(pos);
        }
    }

    onMouseMove(e, pos) {
        if (!this.isDrawing) return;

        if (this.dragStart) {
            // User is dragging - create/update handles for current point
            this.updateHandles(pos);
        }

        this.updatePreviewPath(pos);
        this.updateCloseIndicator(pos);
    }

    onMouseUp(e, pos) {
        this.dragStart = null;
        this.isDraggingHandle = false;
    }

    onDoubleClick(e, pos) {
        if (this.isDrawing && this.currentPath) {
            this.finishDrawing();
        }
    }

    /**
     * Start a new path with the first point.
     * @param {{x: number, y: number}} pos
     */
    startNewPath(pos) {
        this.currentPath = new Path([{
            x: pos.x,
            y: pos.y,
            handleIn: null,
            handleOut: null
        }]);

        // Apply default styles
        this.currentPath.stroke = appState.defaultStroke;
        this.currentPath.fill = appState.defaultFill;
        this.currentPath.strokeWidth = appState.defaultStrokeWidth;

        this.canvas.addShape(this.currentPath);
        this.isDrawing = true;
        this.dragStart = { x: pos.x, y: pos.y };
        this.createPreviewPath();
    }

    /**
     * Add a new point to the current path.
     * @param {{x: number, y: number}} pos
     */
    addPoint(pos) {
        this.currentPath.addPoint(pos.x, pos.y, null, null);
        this.dragStart = { x: pos.x, y: pos.y };
    }

    /**
     * Update the control handles of the last point while dragging.
     * @param {{x: number, y: number}} pos
     */
    updateHandles(pos) {
        const lastIndex = this.currentPath.points.length - 1;
        const lastPoint = this.currentPath.points[lastIndex];

        const dx = pos.x - lastPoint.x;
        const dy = pos.y - lastPoint.y;

        // Only create handles if there's significant drag distance
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            // Set symmetric handles - handleOut follows mouse, handleIn is mirrored
            lastPoint.handleOut = { x: pos.x, y: pos.y };
            lastPoint.handleIn = { x: lastPoint.x - dx, y: lastPoint.y - dy };

            this.currentPath.updateElement();
            this.isDraggingHandle = true;
        }
    }

    /**
     * Close the path by connecting to the first point.
     */
    closePath() {
        this.currentPath.closePath();
        this.finishDrawing();
    }

    /**
     * Finish drawing and clean up.
     */
    finishDrawing() {
        this.removePreviewPath();
        this.removeCloseIndicator();

        if (this.currentPath && this.currentPath.points.length >= 2) {
            appState.selectShape(this.currentPath.id);
        } else if (this.currentPath) {
            // Remove incomplete path (less than 2 points)
            this.canvas.removeShape(this.currentPath);
        }

        this.isDrawing = false;
        this.currentPath = null;
        this.dragStart = null;
        appState.setTool('select');
    }

    /**
     * Cancel drawing without saving.
     */
    cancel() {
        this.removePreviewPath();
        this.removeCloseIndicator();

        if (this.currentPath) {
            this.canvas.removeShape(this.currentPath);
        }

        this.isDrawing = false;
        this.currentPath = null;
        this.dragStart = null;
    }

    // === Preview Path ===

    createPreviewPath() {
        this.previewPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.previewPath.setAttribute('stroke', '#4a90d9');
        this.previewPath.setAttribute('stroke-width', '1');
        this.previewPath.setAttribute('stroke-dasharray', '4 2');
        this.previewPath.setAttribute('fill', 'none');
        this.previewPath.style.pointerEvents = 'none';
        this.canvas.handlesLayer.appendChild(this.previewPath);
    }

    updatePreviewPath(pos) {
        if (!this.previewPath || !this.currentPath || this.currentPath.points.length === 0) return;

        const lastPoint = this.currentPath.points[this.currentPath.points.length - 1];
        let d;

        if (lastPoint.handleOut) {
            // Show curved preview using quadratic bezier approximation
            d = `M ${lastPoint.x} ${lastPoint.y} Q ${lastPoint.handleOut.x} ${lastPoint.handleOut.y} ${pos.x} ${pos.y}`;
        } else {
            // Show straight preview line
            d = `M ${lastPoint.x} ${lastPoint.y} L ${pos.x} ${pos.y}`;
        }

        this.previewPath.setAttribute('d', d);
    }

    removePreviewPath() {
        if (this.previewPath) {
            this.previewPath.remove();
            this.previewPath = null;
        }
    }

    // === Close Indicator ===

    updateCloseIndicator(pos) {
        if (!this.currentPath || this.currentPath.points.length < 2) {
            this.removeCloseIndicator();
            return;
        }

        const isNear = this.currentPath.isNearFirstPoint(pos.x, pos.y, this.closeThreshold);

        if (isNear && !this.closeIndicator) {
            // Show close indicator
            this.closeIndicator = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            const first = this.currentPath.points[0];
            this.closeIndicator.setAttribute('cx', first.x);
            this.closeIndicator.setAttribute('cy', first.y);
            this.closeIndicator.setAttribute('r', this.closeThreshold);
            this.closeIndicator.setAttribute('fill', 'rgba(74, 144, 217, 0.2)');
            this.closeIndicator.setAttribute('stroke', '#4a90d9');
            this.closeIndicator.setAttribute('stroke-width', '1');
            this.closeIndicator.setAttribute('stroke-dasharray', '4 2');
            this.closeIndicator.style.pointerEvents = 'none';
            this.canvas.handlesLayer.appendChild(this.closeIndicator);
        } else if (!isNear && this.closeIndicator) {
            this.removeCloseIndicator();
        }
    }

    removeCloseIndicator() {
        if (this.closeIndicator) {
            this.closeIndicator.remove();
            this.closeIndicator = null;
        }
    }
}
