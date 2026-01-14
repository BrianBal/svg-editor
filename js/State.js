class State {
    constructor() {
        this.shapes = [];
        this.selectedShapeId = null;
        this.activeTool = 'select';
        this.svgWidth = 800;
        this.svgHeight = 600;
        this.viewBox = '0 0 800 600';

        // Default colors for new shapes
        this.defaultStroke = '#000000';
        this.defaultFill = 'none';
        this.defaultStrokeWidth = 2;
    }

    addShape(shape) {
        this.shapes.push(shape);
        eventBus.emit('shape:created', shape);
    }

    insertShapeAt(shape, index) {
        this.shapes.splice(index, 0, shape);
        eventBus.emit('shape:created', shape);
    }

    removeShape(id) {
        const index = this.shapes.findIndex(s => s.id === id);
        if (index > -1) {
            const shape = this.shapes.splice(index, 1)[0];
            eventBus.emit('shape:deleted', shape);
        }
    }

    getShapeById(id) {
        return this.shapes.find(s => s.id === id);
    }

    selectShape(id) {
        this.selectedShapeId = id;
        eventBus.emit('shape:selected', this.getShapeById(id));
    }

    deselectAll() {
        this.selectedShapeId = null;
        eventBus.emit('shape:deselected');
    }

    setTool(toolName) {
        this.activeTool = toolName;
        eventBus.emit('tool:changed', toolName);
    }

    getSelectedShape() {
        return this.selectedShapeId ? this.getShapeById(this.selectedShapeId) : null;
    }

    reorderShape(shapeId, newIndex) {
        const oldIndex = this.shapes.findIndex(s => s.id === shapeId);
        if (oldIndex === -1 || oldIndex === newIndex) return;

        const [shape] = this.shapes.splice(oldIndex, 1);
        this.shapes.splice(newIndex, 0, shape);
        eventBus.emit('shapes:reordered', this.shapes);
    }

    getShapeIndex(shapeId) {
        return this.shapes.findIndex(s => s.id === shapeId);
    }
}

window.appState = new State();
