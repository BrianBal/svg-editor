class PolylineTool {
    constructor(canvas) {
        this.canvas = canvas;
        this.currentPolyline = null;
        this.isDrawing = false;
        this.previewLine = null;
    }

    onMouseDown(e, pos) {
        if (e.target.classList.contains('handle')) return;
        if (e.target.dataset.shapeId) return;

        if (!this.isDrawing) {
            this.currentPolyline = new Polyline([{ x: pos.x, y: pos.y }]);
            this.currentPolyline.stroke = appState.defaultStroke;
            this.currentPolyline.fill = appState.defaultFill;
            this.currentPolyline.strokeWidth = appState.defaultStrokeWidth;
            this.canvas.addShape(this.currentPolyline);
            this.isDrawing = true;
            this.createPreviewLine(pos);
        } else {
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
        this.previewLine.style.pointerEvents = 'none';
        this.canvas.handlesLayer.appendChild(this.previewLine);
    }

    updatePreviewLine(pos) {
        if (this.previewLine) {
            this.previewLine.setAttribute('x1', pos.x);
            this.previewLine.setAttribute('y1', pos.y);
        }
    }

    removePreviewLine() {
        if (this.previewLine) {
            this.previewLine.remove();
            this.previewLine = null;
        }
    }

    cancel() {
        this.removePreviewLine();
        if (this.currentPolyline) {
            this.canvas.removeShape(this.currentPolyline);
        }
        this.isDrawing = false;
        this.currentPolyline = null;
    }
}
