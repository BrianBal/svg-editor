class PolylineTool {
    constructor(canvas) {
        this.canvas = canvas;
        this.currentPolyline = null;
        this.isDrawing = false;
        this.previewLine = null;
        this.closeThreshold = 15;  // Distance in pixels to trigger close
        this.closeIndicator = null; // SVG circle element
    }

    onMouseDown(e, pos) {
        if (e.target.classList.contains('handle')) return;

        if (!this.isDrawing) {
            this.currentPolyline = new Polyline([{ x: pos.x, y: pos.y }]);
            this.currentPolyline.stroke = appState.defaultStroke;
            this.currentPolyline.fill = appState.defaultFill;
            this.currentPolyline.strokeWidth = appState.defaultStrokeWidth;
            this.canvas.addShape(this.currentPolyline);
            this.isDrawing = true;
            this.createPreviewLine(pos);
        } else {
            // Check if clicking near first point to close
            if (this.currentPolyline.points.length >= 2 &&
                this.currentPolyline.isNearFirstPoint(pos.x, pos.y, this.closeThreshold)) {
                // Close the path (converts to polygon for nice corners)
                this.currentPolyline.setClosed(true);
                this.finishDrawing();
                return;
            }

            this.currentPolyline.addPoint(pos.x, pos.y);
            this.updatePreviewLine(pos);
        }
    }

    onMouseMove(e, pos) {
        if (this.isDrawing && this.previewLine) {
            const lastPoint = this.currentPolyline.points[this.currentPolyline.points.length - 1];
            this.previewLine.setAttribute('x1', lastPoint.x);
            this.previewLine.setAttribute('y1', lastPoint.y);
            this.previewLine.setAttribute('x2', pos.x);
            this.previewLine.setAttribute('y2', pos.y);

            // Show close indicator when near first point
            this.updateCloseIndicator(pos);
        }
    }

    onMouseUp(e, pos) {
    }

    onDoubleClick(e, pos) {
        if (this.isDrawing && this.currentPolyline) {
            this.finishDrawing();
        }
    }

    finishDrawing() {
        this.removePreviewLine();
        this.removeCloseIndicator();

        if (this.currentPolyline && this.currentPolyline.points.length >= 2) {
            appState.selectShape(this.currentPolyline.id);
        } else if (this.currentPolyline) {
            this.canvas.removeShape(this.currentPolyline);
        }

        this.isDrawing = false;
        this.currentPolyline = null;
        appState.setTool('select');
    }

    createPreviewLine(pos) {
        this.previewLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        this.previewLine.setAttribute('x1', pos.x);
        this.previewLine.setAttribute('y1', pos.y);
        this.previewLine.setAttribute('x2', pos.x);
        this.previewLine.setAttribute('y2', pos.y);
        this.previewLine.setAttribute('stroke', '#4a90d9');
        this.previewLine.setAttribute('stroke-width', '1');
        this.previewLine.setAttribute('stroke-dasharray', '4 2');
        this.previewLine.setAttribute('fill', 'none');
        this.previewLine.style.pointerEvents = 'none';
        this.canvas.handlesLayer.appendChild(this.previewLine);
    }

    updatePreviewLine(pos) {
        if (this.previewLine) {
            // After adding a point, reset preview line to start from that point
            this.previewLine.setAttribute('x1', pos.x);
            this.previewLine.setAttribute('y1', pos.y);
            this.previewLine.setAttribute('x2', pos.x);
            this.previewLine.setAttribute('y2', pos.y);
        }
    }

    removePreviewLine() {
        if (this.previewLine) {
            this.previewLine.remove();
            this.previewLine = null;
        }
    }

    updateCloseIndicator(pos) {
        if (!this.currentPolyline || this.currentPolyline.points.length < 2) {
            this.removeCloseIndicator();
            return;
        }

        const isNear = this.currentPolyline.isNearFirstPoint(pos.x, pos.y, this.closeThreshold);

        if (isNear && !this.closeIndicator) {
            // Show close indicator
            this.closeIndicator = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            const first = this.currentPolyline.points[0];
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

    cancel() {
        this.removePreviewLine();
        this.removeCloseIndicator();
        if (this.currentPolyline) {
            this.canvas.removeShape(this.currentPolyline);
        }
        this.isDrawing = false;
        this.currentPolyline = null;
    }
}
