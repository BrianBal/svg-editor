class EllipseTool {
    constructor(canvas) {
        this.canvas = canvas;
        this.currentEllipse = null;
        this.startPos = null;
        this.isDrawing = false;
    }

    onMouseDown(e, pos) {
        if (e.target.classList.contains('handle')) return;

        this.startPos = pos;
        this.currentEllipse = new Ellipse(pos.x, pos.y, 0, 0);
        this.currentEllipse.stroke = appState.defaultStroke;
        this.currentEllipse.fill = appState.defaultFill;
        this.currentEllipse.strokeWidth = appState.defaultStrokeWidth;
        this.canvas.addShape(this.currentEllipse);
        this.isDrawing = true;
    }

    onMouseMove(e, pos) {
        if (!this.isDrawing || !this.currentEllipse) return;

        const width = pos.x - this.startPos.x;
        const height = pos.y - this.startPos.y;

        const newX = width < 0 ? pos.x : this.startPos.x;
        const newY = height < 0 ? pos.y : this.startPos.y;
        const newWidth = Math.abs(width);
        const newHeight = Math.abs(height);

        this.currentEllipse.resize(newX, newY, newWidth, newHeight);
    }

    onMouseUp(e, pos) {
        if (this.isDrawing && this.currentEllipse) {
            this.isDrawing = false;

            const bounds = this.currentEllipse.getBounds();
            if (bounds.width > 1 && bounds.height > 1) {
                appState.selectShape(this.currentEllipse.id);
            } else {
                this.canvas.removeShape(this.currentEllipse);
            }

            this.currentEllipse = null;
            appState.setTool('select');
        }
    }

    onDoubleClick(e, pos) {
    }

    cancel() {
        if (this.currentEllipse) {
            this.canvas.removeShape(this.currentEllipse);
        }
        this.isDrawing = false;
        this.currentEllipse = null;
    }
}
