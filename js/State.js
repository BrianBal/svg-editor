class State {
    constructor() {
        this.shapes = [];
        this.selectedShapeIds = [];
        this.activeTool = 'select';
        this.svgWidth = 800;
        this.svgHeight = 600;
        this.viewBox = '0 0 800 600';
        this.background = 'none';

        // Default colors for new shapes
        this.defaultStroke = '#000000';
        this.defaultFill = 'none';
        this.defaultStrokeWidth = 2;
    }

    // Backwards compatibility getter
    get selectedShapeId() {
        return this.selectedShapeIds[0] || null;
    }

    setBackground(color) {
        this.background = color;
        eventBus.emit('document:background', color);
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
            if (window.historyManager) {
                historyManager.captureDeleteIndex(id);
            }
            const shape = this.shapes.splice(index, 1)[0];
            eventBus.emit('shape:deleted', shape);
        }
    }

    getShapeById(id) {
        return this.shapes.find(s => s.id === id);
    }

    // Replace selection with a single shape
    selectShape(id) {
        this.selectedShapeIds = [id];
        const shapes = this.getSelectedShapes();
        eventBus.emit('selection:changed', shapes);
        // Backwards compatibility
        eventBus.emit('shape:selected', shapes[0]);
    }

    // Add shape to existing selection
    addToSelection(id) {
        if (!this.selectedShapeIds.includes(id)) {
            this.selectedShapeIds.push(id);
            eventBus.emit('selection:changed', this.getSelectedShapes());
        }
    }

    // Remove shape from selection
    removeFromSelection(id) {
        const index = this.selectedShapeIds.indexOf(id);
        if (index > -1) {
            this.selectedShapeIds.splice(index, 1);
            eventBus.emit('selection:changed', this.getSelectedShapes());
        }
    }

    // Toggle shape in selection (add if not selected, remove if selected)
    toggleSelection(id) {
        if (this.selectedShapeIds.includes(id)) {
            this.removeFromSelection(id);
        } else {
            this.addToSelection(id);
        }
    }

    // Select range of shapes between two IDs (inclusive)
    selectRange(fromId, toId) {
        const fromIndex = this.getShapeIndex(fromId);
        const toIndex = this.getShapeIndex(toId);
        if (fromIndex === -1 || toIndex === -1) return;

        const start = Math.min(fromIndex, toIndex);
        const end = Math.max(fromIndex, toIndex);

        this.selectedShapeIds = this.shapes.slice(start, end + 1).map(s => s.id);
        eventBus.emit('selection:changed', this.getSelectedShapes());
    }

    // Check if a shape is selected
    isSelected(id) {
        return this.selectedShapeIds.includes(id);
    }

    deselectAll() {
        this.selectedShapeIds = [];
        eventBus.emit('selection:changed', []);
        // Backwards compatibility
        eventBus.emit('shape:deselected');
    }

    setTool(toolName) {
        this.activeTool = toolName;
        eventBus.emit('tool:changed', toolName);
    }

    // Get all selected shapes as array
    getSelectedShapes() {
        return this.selectedShapeIds
            .map(id => this.getShapeById(id))
            .filter(Boolean);
    }

    // Get first selected shape (backwards compatibility)
    getSelectedShape() {
        return this.selectedShapeIds.length > 0
            ? this.getShapeById(this.selectedShapeIds[0])
            : null;
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
