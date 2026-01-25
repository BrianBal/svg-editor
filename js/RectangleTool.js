class RectangleTool {
    constructor(canvas) {
        this.canvas = canvas;
        this.currentRect = null;
        this.startPos = null;
        this.isDrawing = false;
    }

    onMouseDown(e, pos) {
        if (e.target.classList.contains('handle')) return;

        this.startPos = pos;
        this.currentRect = new Rectangle(pos.x, pos.y, 0, 0);
        this.currentRect.stroke = appState.defaultStroke;
        this.currentRect.fill = appState.defaultFill;
        this.currentRect.strokeWidth = appState.defaultStrokeWidth;
        this.canvas.addShape(this.currentRect);
        this.isDrawing = true;
    }

    onMouseMove(e, pos) {
        if (!this.isDrawing || !this.currentRect) return;

        const width = pos.x - this.startPos.x;
        const height = pos.y - this.startPos.y;

        const newX = width < 0 ? pos.x : this.startPos.x;
        const newY = height < 0 ? pos.y : this.startPos.y;
        const newWidth = Math.abs(width);
        const newHeight = Math.abs(height);

        this.currentRect.resize(newX, newY, newWidth, newHeight);
    }

    onMouseUp(e, pos) {
        if (this.isDrawing && this.currentRect) {
            this.isDrawing = false;

            if (this.currentRect.width > 1 && this.currentRect.height > 1) {
                appState.selectShape(this.currentRect.id);
            } else {
                this.canvas.removeShape(this.currentRect);
            }

            this.currentRect = null;
            appState.setTool('select');
        }
    }

    onDoubleClick(e, pos) {
    }

    cancel() {
        if (this.currentRect) {
            this.canvas.removeShape(this.currentRect);
        }
        this.isDrawing = false;
        this.currentRect = null;
    }
}
