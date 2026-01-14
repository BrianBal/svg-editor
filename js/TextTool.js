class TextTool {
    constructor(canvas) {
        this.canvas = canvas;
    }

    onMouseDown(e, pos) {
        if (e.target.classList.contains('handle')) return;
        if (e.target.dataset.shapeId) return;

        const text = new TextShape(pos.x, pos.y, 'Text', 24, 'Arial');
        text.stroke = appState.defaultStroke;
        text.fill = appState.defaultFill;
        text.strokeWidth = appState.defaultStrokeWidth;
        this.canvas.addShape(text);
        appState.selectShape(text.id);
        appState.setTool('select');
    }

    onMouseMove(e, pos) {
    }

    onMouseUp(e, pos) {
    }

    onDoubleClick(e, pos) {
    }

    cancel() {
    }
}
