class SVGCanvas {
    constructor() {
        this.svg = document.getElementById('svg-canvas');
        this.shapesLayer = document.getElementById('shapes-layer');
        this.handlesLayer = document.getElementById('handles-layer');
        this.selection = new Selection(this);

        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.activeHandle = null;
        this.activeTool = null;
        this.tools = {};

        this.setupEventListeners();
    }

    setTools(tools) {
        this.tools = tools;
        this.activeTool = this.tools.select;
    }

    setupEventListeners() {
        this.svg.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.svg.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.svg.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.svg.addEventListener('dblclick', (e) => this.handleDoubleClick(e));

        this.svg.addEventListener('click', (e) => {
            if ((e.target === this.svg || e.target === this.shapesLayer) &&
                appState.activeTool === 'select') {
                appState.deselectAll();
            }
        });

        eventBus.on('tool:changed', (toolName) => {
            this.activeTool = this.tools[toolName];
            this.svg.classList.toggle('tool-select', toolName === 'select');
        });
    }

    getMousePosition(e) {
        const CTM = this.svg.getScreenCTM();
        return {
            x: (e.clientX - CTM.e) / CTM.a,
            y: (e.clientY - CTM.f) / CTM.d
        };
    }

    handleMouseDown(e) {
        const pos = this.getMousePosition(e);

        if (e.target.classList.contains('handle')) {
            this.activeHandle = {
                element: e.target,
                type: e.target.dataset.handleType,
                data: e.target.dataset.handleData
            };
            this.isDragging = true;
            this.dragStart = pos;

            if (this.activeHandle.type === 'point') {
                this.selection.selectPoint(parseInt(this.activeHandle.data));
            }
            return;
        }

        if (this.activeTool && this.activeTool.onMouseDown) {
            this.activeTool.onMouseDown(e, pos);
        }
    }

    handleMouseMove(e) {
        const pos = this.getMousePosition(e);

        if (this.isDragging && this.activeHandle) {
            this.handleHandleDrag(pos);
            return;
        }

        if (this.activeTool && this.activeTool.onMouseMove) {
            this.activeTool.onMouseMove(e, pos);
        }
    }

    handleMouseUp(e) {
        const pos = this.getMousePosition(e);

        this.isDragging = false;
        this.activeHandle = null;

        if (this.activeTool && this.activeTool.onMouseUp) {
            this.activeTool.onMouseUp(e, pos);
        }
    }

    handleDoubleClick(e) {
        const pos = this.getMousePosition(e);

        if (this.activeTool && this.activeTool.onDoubleClick) {
            this.activeTool.onDoubleClick(e, pos);
        }
    }

    handleHandleDrag(pos) {
        const shape = appState.getShapeById(appState.selectedShapeId);
        if (!shape) return;

        if (this.activeHandle.type === 'resize') {
            this.handleBoundsResize(shape, pos);
        } else if (this.activeHandle.type === 'point') {
            if (shape.type === 'polyline') {
                this.handlePolylinePointMove(shape, pos);
            } else if (shape.type === 'line') {
                this.handleLinePointMove(shape, pos);
            }
        }
    }

    handleBoundsResize(shape, pos) {
        const bounds = shape.getBounds();
        const handlePos = this.activeHandle.data;
        let newX = bounds.x;
        let newY = bounds.y;
        let newWidth = bounds.width;
        let newHeight = bounds.height;

        switch (handlePos) {
            case 'se':
                newWidth = pos.x - bounds.x;
                newHeight = pos.y - bounds.y;
                break;
            case 'nw':
                newWidth = (bounds.x + bounds.width) - pos.x;
                newHeight = (bounds.y + bounds.height) - pos.y;
                newX = pos.x;
                newY = pos.y;
                break;
            case 'ne':
                newWidth = pos.x - bounds.x;
                newHeight = (bounds.y + bounds.height) - pos.y;
                newY = pos.y;
                break;
            case 'sw':
                newWidth = (bounds.x + bounds.width) - pos.x;
                newHeight = pos.y - bounds.y;
                newX = pos.x;
                break;
            case 'n':
                newHeight = (bounds.y + bounds.height) - pos.y;
                newY = pos.y;
                break;
            case 's':
                newHeight = pos.y - bounds.y;
                break;
            case 'e':
                newWidth = pos.x - bounds.x;
                break;
            case 'w':
                newWidth = (bounds.x + bounds.width) - pos.x;
                newX = pos.x;
                break;
        }

        if (newWidth > 0 && newHeight > 0) {
            shape.resize(newX, newY, newWidth, newHeight);
        }
    }

    handlePolylinePointMove(shape, pos) {
        const pointIndex = parseInt(this.activeHandle.data);
        shape.movePoint(pointIndex, pos.x, pos.y);
    }

    handleLinePointMove(shape, pos) {
        const pointIndex = parseInt(this.activeHandle.data);
        shape.movePoint(pointIndex, pos.x, pos.y);
    }

    addShape(shape) {
        const element = shape.createSVGElement();
        this.shapesLayer.appendChild(element);
        appState.addShape(shape);
    }

    duplicateShape(shapeId) {
        const shape = appState.getShapeById(shapeId);
        if (!shape) return null;

        const copy = shape.clone();
        const element = copy.createSVGElement();

        // Insert right after the source shape in the array
        const sourceIndex = appState.getShapeIndex(shapeId);
        appState.insertShapeAt(copy, sourceIndex + 1);

        // Insert DOM element right after source element
        if (shape.element && shape.element.nextSibling) {
            this.shapesLayer.insertBefore(element, shape.element.nextSibling);
        } else {
            this.shapesLayer.appendChild(element);
        }

        appState.selectShape(copy.id);
        return copy;
    }

    removeShape(shape) {
        if (shape.element) {
            shape.element.remove();
        }
        appState.removeShape(shape.id);
    }

    clear() {
        [...appState.shapes].forEach(shape => {
            if (shape.element) {
                shape.element.remove();
            }
        });
        appState.shapes = [];
        appState.deselectAll();
    }

    updateSize(width, height, viewBox) {
        this.svg.setAttribute('width', width);
        this.svg.setAttribute('height', height);
        this.svg.setAttribute('viewBox', viewBox);
        appState.svgWidth = parseInt(width);
        appState.svgHeight = parseInt(height);
        appState.viewBox = viewBox;
    }

    reorderShapeDOM(shapeId, newIndex) {
        appState.reorderShape(shapeId, newIndex);
        this.syncDOMOrder();
    }

    syncDOMOrder() {
        appState.shapes.forEach(shape => {
            if (shape.element) {
                this.shapesLayer.appendChild(shape.element);
            }
        });
    }
}
