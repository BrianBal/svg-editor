class SVGCanvas {
    constructor() {
        this.svg = document.getElementById('svg-canvas');
        this.shapesLayer = document.getElementById('shapes-layer');
        this.handlesLayer = document.getElementById('handles-layer');
        this.selection = new Selection(this);
        this.backgroundRect = null;

        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.activeHandle = null;
        this.activeTool = null;
        this.tools = {};

        // Multi-shape handle dragging state
        this.originalCombinedBounds = null;
        this.originalShapeStates = null;

        this.createBackgroundRect();
        this.initGradientManager();
        this.setupEventListeners();
    }

    initGradientManager() {
        if (typeof gradientManager !== 'undefined') {
            gradientManager.init(this.svg);
        }
    }

    createBackgroundRect() {
        this.backgroundRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        this.backgroundRect.setAttribute('id', 'canvas-background');
        this.backgroundRect.setAttribute('x', '0');
        this.backgroundRect.setAttribute('y', '0');
        this.backgroundRect.setAttribute('width', appState.svgWidth);
        this.backgroundRect.setAttribute('height', appState.svgHeight);
        this.backgroundRect.setAttribute('fill', appState.background === 'none' ? 'transparent' : appState.background);
        // Insert as first child of svg (before shapes-layer)
        this.svg.insertBefore(this.backgroundRect, this.shapesLayer);
    }

    setBackground(color) {
        if (this.backgroundRect) {
            this.backgroundRect.setAttribute('fill', color === 'none' ? 'transparent' : color);
        }
    }

    setTools(tools) {
        this.tools = tools;
        this.activeTool = this.tools.select;
        // Set initial cursor for select tool
        this.svg.classList.add('tool-select');
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

        eventBus.on('document:background', (color) => {
            this.setBackground(color);
        });
    }

    getMousePosition(e) {
        const CTM = this.svg.getScreenCTM();
        return {
            x: (e.clientX - CTM.e) / CTM.a,
            y: (e.clientY - CTM.f) / CTM.d
        };
    }

    // Convert a point in SVG coordinates to the local coordinates of a shape element
    toLocalPoint(shape, pos) {
        try {
            if (shape.element && typeof shape.element.getCTM === 'function') {
                const svg = document.getElementById('svg-canvas');
                const pt = svg.createSVGPoint();
                pt.x = pos.x;
                pt.y = pos.y;
                const ctm = shape.element.getCTM();
                if (ctm) {
                    // Inverse transform: use matrixTransform with inverse matrix
                    const inverse = ctm.inverse ? ctm.inverse() : null;
                    if (inverse) {
                        const local = pt.matrixTransform(inverse);
                        return { x: local.x, y: local.y };
                    }
                }
            }
        } catch (e) {
            // ignore and fall through
        }
        return pos;
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

            const selectedIds = appState.selectedShapeIds;
            const selectedShapes = appState.getSelectedShapes();

            // Start transaction for all selected shapes
            if (window.historyManager && selectedIds.length > 0) {
                const transactionType = this.activeHandle.type === 'resize' ? 'resize' : 'move';
                if (selectedIds.length === 1) {
                    historyManager.beginTransaction(transactionType, selectedIds[0]);
                } else {
                    historyManager.beginMultiTransaction(transactionType, selectedIds);
                }
            }

            // Store original states for all selected shapes (for multi-shape resize/rotate)
            if (this.activeHandle.type === 'resize' || this.activeHandle.type === 'rotate') {
                this.originalCombinedBounds = this.selection.getCombinedBounds(selectedShapes);
                this.originalShapeStates = new Map();
                for (const shape of selectedShapes) {
                    this.originalShapeStates.set(shape.id, {
                        bounds: shape.getBounds(),
                        rotation: shape.rotation || 0
                    });
                }
            }

            this.selection.setDragging(true);

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
        this.shiftKey = e.shiftKey;

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

        if (window.historyManager && this.activeHandle) {
            const selectedIds = appState.selectedShapeIds;
            if (selectedIds.length === 1) {
                historyManager.endTransaction();
            } else if (selectedIds.length > 1) {
                historyManager.endMultiTransaction();
            }
        }

        this.selection.setDragging(false);
        this.isDragging = false;
        this.activeHandle = null;
        this.originalCombinedBounds = null;
        this.originalShapeStates = null;

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
        const selectedShapes = appState.getSelectedShapes();
        if (selectedShapes.length === 0) return;

        const isMultiSelect = selectedShapes.length > 1;

        if (this.activeHandle.type === 'rotate') {
            if (isMultiSelect) {
                this.handleMultiShapeRotation(pos);
            } else {
                this.handleRotation(selectedShapes[0], pos);
            }
        } else if (this.activeHandle.type === 'resize') {
            if (isMultiSelect) {
                this.handleMultiShapeResize(pos);
            } else {
                this.handleBoundsResize(selectedShapes[0], pos);
            }
        } else if (this.activeHandle.type === 'point') {
            // Point handles only work with single selection
            const shape = selectedShapes[0];
            if (shape.type === 'polyline') {
                this.handlePolylinePointMove(shape, pos);
            } else if (shape.type === 'line') {
                this.handleLinePointMove(shape, pos);
            }
        } else if (this.activeHandle.type === 'path-point') {
            this.handlePathPointMove(selectedShapes[0], pos);
        } else if (this.activeHandle.type === 'path-handle-in' || this.activeHandle.type === 'path-handle-out') {
            this.handlePathHandleMove(selectedShapes[0], pos);
        }
    }

    handleRotation(shape, pos) {
        const bounds = shape.getBounds();
        const cx = bounds.x + bounds.width / 2;
        const cy = bounds.y + bounds.height / 2;

        // Calculate angle from center to mouse position
        let angle = Math.atan2(pos.y - cy, pos.x - cx) * (180 / Math.PI);

        // Offset by 90° since handle is at top (0° = up)
        angle = (angle + 90 + 360) % 360;

        // Snap to 15° increments if Shift held
        if (this.shiftKey) {
            angle = Math.round(angle / 15) * 15;
        }

        shape.setRotation(angle);
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

    handleMultiShapeResize(pos) {
        const shapes = appState.getSelectedShapes();
        if (shapes.length === 0 || !this.originalCombinedBounds || !this.originalShapeStates) return;

        const originalBounds = this.originalCombinedBounds;
        const handlePos = this.activeHandle.data;

        // Calculate new combined bounds based on handle position
        let newX = originalBounds.x;
        let newY = originalBounds.y;
        let newWidth = originalBounds.width;
        let newHeight = originalBounds.height;

        switch (handlePos) {
            case 'se':
                newWidth = pos.x - originalBounds.x;
                newHeight = pos.y - originalBounds.y;
                break;
            case 'nw':
                newWidth = (originalBounds.x + originalBounds.width) - pos.x;
                newHeight = (originalBounds.y + originalBounds.height) - pos.y;
                newX = pos.x;
                newY = pos.y;
                break;
            case 'ne':
                newWidth = pos.x - originalBounds.x;
                newHeight = (originalBounds.y + originalBounds.height) - pos.y;
                newY = pos.y;
                break;
            case 'sw':
                newWidth = (originalBounds.x + originalBounds.width) - pos.x;
                newHeight = pos.y - originalBounds.y;
                newX = pos.x;
                break;
            case 'n':
                newHeight = (originalBounds.y + originalBounds.height) - pos.y;
                newY = pos.y;
                break;
            case 's':
                newHeight = pos.y - originalBounds.y;
                break;
            case 'e':
                newWidth = pos.x - originalBounds.x;
                break;
            case 'w':
                newWidth = (originalBounds.x + originalBounds.width) - pos.x;
                newX = pos.x;
                break;
        }

        if (newWidth <= 0 || newHeight <= 0) return;

        // Calculate scale factors
        const scaleX = newWidth / originalBounds.width;
        const scaleY = newHeight / originalBounds.height;

        // Apply proportional resize to each shape
        for (const shape of shapes) {
            const original = this.originalShapeStates.get(shape.id);
            if (!original || !original.bounds) continue;

            // Calculate new position and size relative to combined bounds
            const relX = (original.bounds.x - originalBounds.x) / originalBounds.width;
            const relY = (original.bounds.y - originalBounds.y) / originalBounds.height;
            const relW = original.bounds.width / originalBounds.width;
            const relH = original.bounds.height / originalBounds.height;

            const shapeNewX = newX + relX * newWidth;
            const shapeNewY = newY + relY * newHeight;
            const shapeNewWidth = relW * newWidth;
            const shapeNewHeight = relH * newHeight;

            if (shape.resize && shapeNewWidth > 0 && shapeNewHeight > 0) {
                shape.resize(shapeNewX, shapeNewY, shapeNewWidth, shapeNewHeight);
            }
        }

        this.selection.updateHandles();
    }

    handleMultiShapeRotation(pos) {
        const shapes = appState.getSelectedShapes();
        if (shapes.length === 0 || !this.originalCombinedBounds || !this.originalShapeStates) return;

        const bounds = this.originalCombinedBounds;
        const cx = bounds.x + bounds.width / 2;
        const cy = bounds.y + bounds.height / 2;

        // Calculate angle from center to mouse position
        let angle = Math.atan2(pos.y - cy, pos.x - cx) * (180 / Math.PI);

        // Offset by 90° since handle is at top (0° = up)
        angle = (angle + 90 + 360) % 360;

        // Snap to 15° increments if Shift held
        if (this.shiftKey) {
            angle = Math.round(angle / 15) * 15;
        }

        // Apply rotation delta to each shape
        for (const shape of shapes) {
            const original = this.originalShapeStates.get(shape.id);
            if (!original) continue;

            // For simplicity, apply the same rotation to each shape
            // (In a more sophisticated implementation, we could rotate shapes around combined center)
            shape.setRotation(angle);
        }

        this.selection.updateHandles();
    }


    handlePolylinePointMove(shape, pos) {
        const pointIndex = parseInt(this.activeHandle.data);
        const local = this.toLocalPoint(shape, pos);
        shape.movePoint(pointIndex, local.x, local.y);
    }

    handleLinePointMove(shape, pos) {
        const pointIndex = parseInt(this.activeHandle.data);
        const local = this.toLocalPoint(shape, pos);
        shape.movePoint(pointIndex, local.x, local.y);
    }

    handlePathPointMove(shape, pos) {
        const pointIndex = parseInt(this.activeHandle.data);
        const local = this.toLocalPoint(shape, pos);
        shape.movePoint(pointIndex, local.x, local.y);
    }

    handlePathHandleMove(shape, pos) {
        // Handle data format: "index-in" or "index-out"
        const [indexStr, handleType] = this.activeHandle.data.split('-');
        const pointIndex = parseInt(indexStr);
        const local = this.toLocalPoint(shape, pos);
        shape.moveHandle(pointIndex, handleType, local.x, local.y);
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
        // Clean up gradient if shape has one
        if (shape.fillGradient && typeof gradientManager !== 'undefined') {
            gradientManager.removeGradient(shape.fillGradient.id);
        }
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
        // Clear all gradients from defs
        if (typeof gradientManager !== 'undefined') {
            gradientManager.clear();
        }
    }

    updateSize(width, height, viewBox) {
        this.svg.setAttribute('width', width);
        this.svg.setAttribute('height', height);
        this.svg.setAttribute('viewBox', viewBox);
        appState.svgWidth = parseInt(width);
        appState.svgHeight = parseInt(height);
        appState.viewBox = viewBox;

        // Update background rect to match new size
        if (this.backgroundRect) {
            this.backgroundRect.setAttribute('width', width);
            this.backgroundRect.setAttribute('height', height);
        }
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