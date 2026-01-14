class LineTool {
    constructor(canvas) {
        this.canvas = canvas;
        this.currentLine = null;
        this.isDrawing = false;
    }

    onMouseDown(e, pos) {
        if (e.target.classList.contains('handle')) return;
        if (e.target.dataset.shapeId) return;

        this.currentLine = new Line(pos.x, pos.y, pos.x, pos.y);
        this.currentLine.stroke = appState.defaultStroke;
        this.currentLine.fill = appState.defaultFill;
        this.currentLine.strokeWidth = appState.defaultStrokeWidth;
        this.canvas.addShape(this.currentLine);
        this.isDrawing = true;
    }

    onMouseMove(e, pos) {
        if (!this.isDrawing || !this.currentLine) return;

        this.currentLine.x2 = pos.x;
        this.currentLine.y2 = pos.y;
        this.currentLine.updateElement();
    }

    onMouseUp(e, pos) {
        if (this.isDrawing && this.currentLine) {
            this.isDrawing = false;

            const dx = this.currentLine.x2 - this.currentLine.x1;
            const dy = this.currentLine.y2 - this.currentLine.y1;
            const length = Math.sqrt(dx * dx + dy * dy);

            if (length > 5) {
                appState.selectShape(this.currentLine.id);
            } else {
                this.canvas.removeShape(this.currentLine);
            }

            this.currentLine = null;
            appState.setTool('select');
        }
    }

    onDoubleClick(e, pos) {
    }

    cancel() {
        if (this.currentLine) {
            this.canvas.removeShape(this.currentLine);
        }
        this.isDrawing = false;
        this.currentLine = null;
    }
}
