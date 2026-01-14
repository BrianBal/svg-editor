class StarTool {
    constructor(canvas) {
        this.canvas = canvas;
        this.currentStar = null;
        this.startPos = null;
        this.isDrawing = false;
    }

    onMouseDown(e, pos) {
        if (e.target.classList.contains('handle')) return;
        if (e.target.dataset.shapeId) return;

        this.startPos = pos;
        this.currentStar = new Star(pos.x, pos.y, 0, 0, 5);
        this.currentStar.stroke = appState.defaultStroke;
        this.currentStar.fill = appState.defaultFill;
        this.currentStar.strokeWidth = appState.defaultStrokeWidth;
        this.canvas.addShape(this.currentStar);
        this.isDrawing = true;
    }

    onMouseMove(e, pos) {
        if (!this.isDrawing || !this.currentStar) return;

        const dx = pos.x - this.startPos.x;
        const dy = pos.y - this.startPos.y;
        const radius = Math.sqrt(dx * dx + dy * dy);

        this.currentStar.outerRadius = radius;
        this.currentStar.innerRadius = radius * 0.5;
        this.currentStar.cx = this.startPos.x;
        this.currentStar.cy = this.startPos.y;
        this.currentStar.updateElement();
    }

    onMouseUp(e, pos) {
        if (this.isDrawing && this.currentStar) {
            this.isDrawing = false;

            if (this.currentStar.outerRadius > 5) {
                appState.selectShape(this.currentStar.id);
            } else {
                this.canvas.removeShape(this.currentStar);
            }

            this.currentStar = null;
            appState.setTool('select');
        }
    }

    onDoubleClick(e, pos) {
    }

    cancel() {
        if (this.currentStar) {
            this.canvas.removeShape(this.currentStar);
        }
        this.isDrawing = false;
        this.currentStar = null;
    }
}
