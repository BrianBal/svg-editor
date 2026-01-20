class Selection {
    constructor(canvas) {
        this.canvas = canvas;
        this.handlesLayer = document.getElementById('handles-layer');
        this.svgRoot = document.getElementById('svg-canvas');
        this.handleSize = 8;
        this.activeHandle = null;
        this.selectedPointIndex = null;

        // Listen to multi-select event
        eventBus.on('selection:changed', (shapes) => this.onSelectionChanged(shapes));

        // Backwards compatibility
        eventBus.on('shape:selected', (shape) => {
            // Only handle if not already handled by selection:changed
            if (appState.selectedShapeIds.length === 1) {
                this.showHandles(shape);
            }
        });
        eventBus.on('shape:deselected', () => this.hideHandles());
        eventBus.on('shape:updated', (shape) => {
            if (appState.isSelected(shape.id)) {
                this.updateHandles();
            }
        });
    }

    // Handle selection changes (0, 1, or multiple shapes)
    onSelectionChanged(shapes) {
        this.clear();
        if (!shapes || shapes.length === 0) {
            const hadPointSelected = this.selectedPointIndex !== null;
            this.selectedPointIndex = null;
            if (hadPointSelected) {
                eventBus.emit('point:selected', { shape: null, pointIndex: null });
            }
            return;
        }

        if (shapes.length === 1) {
            // Single selection - existing behavior
            this.showHandles(shapes[0]);
        } else {
            // Multi-selection - combined bounds
            this.showMultiSelectionHandles(shapes);
        }
    }

    // Calculate union bounding box of all shapes
    getCombinedBounds(shapes) {
        if (!shapes || shapes.length === 0) return null;
        if (shapes.length === 1) return shapes[0].getBounds();

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        for (const shape of shapes) {
            const bounds = shape.getBounds();
            minX = Math.min(minX, bounds.x);
            minY = Math.min(minY, bounds.y);
            maxX = Math.max(maxX, bounds.x + bounds.width);
            maxY = Math.max(maxY, bounds.y + bounds.height);
        }

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    // Show handles for multiple selected shapes
    showMultiSelectionHandles(shapes) {
        // Draw selection outline for each shape
        shapes.forEach(shape => {
            this.showSelectionOutline(shape);
        });

        // Draw resize handles around combined bounds
        const bounds = this.getCombinedBounds(shapes);
        if (!bounds) return;

        this.showBoundsHandlesForRect(bounds);
    }

    // Draw 8 resize handles and rotation handle for a given bounds rect
    showBoundsHandlesForRect(bounds) {
        const positions = [
            { name: 'nw', x: bounds.x, y: bounds.y },
            { name: 'n', x: bounds.x + bounds.width / 2, y: bounds.y },
            { name: 'ne', x: bounds.x + bounds.width, y: bounds.y },
            { name: 'e', x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 },
            { name: 'se', x: bounds.x + bounds.width, y: bounds.y + bounds.height },
            { name: 's', x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height },
            { name: 'sw', x: bounds.x, y: bounds.y + bounds.height },
            { name: 'w', x: bounds.x, y: bounds.y + bounds.height / 2 }
        ];

        positions.forEach(pos => {
            const handle = this.createHandle(pos.x, pos.y, pos.name, 'resize');
            this.handlesLayer.appendChild(handle);
        });

        // Add rotation handle 25px above top-center
        const rotateHandleX = bounds.x + bounds.width / 2;
        const rotateHandleY = bounds.y - 25;

        // Connecting line from top-center to rotation handle
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', rotateHandleX);
        line.setAttribute('y1', bounds.y);
        line.setAttribute('x2', rotateHandleX);
        line.setAttribute('y2', rotateHandleY);
        line.setAttribute('stroke', '#4a90d9');
        line.setAttribute('stroke-width', '1');
        line.classList.add('rotation-line');
        line.style.pointerEvents = 'none';
        this.handlesLayer.appendChild(line);

        // Circular rotation handle
        const rotateHandle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        rotateHandle.setAttribute('cx', rotateHandleX);
        rotateHandle.setAttribute('cy', rotateHandleY);
        rotateHandle.setAttribute('r', 5);
        rotateHandle.setAttribute('fill', '#4a90d9');
        rotateHandle.setAttribute('stroke', '#ffffff');
        rotateHandle.setAttribute('stroke-width', '1');
        rotateHandle.classList.add('handle', 'handle-rotate');
        rotateHandle.dataset.handleType = 'rotate';
        rotateHandle.dataset.handleData = 'rotation';
        rotateHandle.style.cursor = 'grab';
        this.handlesLayer.appendChild(rotateHandle);
    }

    showHandles(shape) {
        this.clear();
        if (!shape) return;

        if (shape.type === 'rectangle' || shape.type === 'ellipse' || shape.type === 'star' || shape.type === 'text') {
            this.showBoundsHandles(shape);
        } else if (shape.type === 'path') {
            this.showPathHandles(shape);
        } else if (shape.type === 'polyline') {
            this.showPolylineHandles(shape);
        } else if (shape.type === 'line') {
            this.showLineHandles(shape);
        }

        this.showSelectionOutline(shape);
    }

    showBoundsHandles(shape) {
        const bounds = shape.getBounds();
        const positions = [
            { name: 'nw', x: bounds.x, y: bounds.y },
            { name: 'n', x: bounds.x + bounds.width / 2, y: bounds.y },
            { name: 'ne', x: bounds.x + bounds.width, y: bounds.y },
            { name: 'e', x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 },
            { name: 'se', x: bounds.x + bounds.width, y: bounds.y + bounds.height },
            { name: 's', x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height },
            { name: 'sw', x: bounds.x, y: bounds.y + bounds.height },
            { name: 'w', x: bounds.x, y: bounds.y + bounds.height / 2 }
        ];

        positions.forEach(pos => {
            const handle = this.createHandle(pos.x, pos.y, pos.name, 'resize');
            this.handlesLayer.appendChild(handle);
        });

        // Add rotation handle 25px above top-center
        const rotateHandleX = bounds.x + bounds.width / 2;
        const rotateHandleY = bounds.y - 25;

        // Connecting line from top-center to rotation handle
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', rotateHandleX);
        line.setAttribute('y1', bounds.y);
        line.setAttribute('x2', rotateHandleX);
        line.setAttribute('y2', rotateHandleY);
        line.setAttribute('stroke', '#4a90d9');
        line.setAttribute('stroke-width', '1');
        line.classList.add('rotation-line');
        line.style.pointerEvents = 'none';
        this.handlesLayer.appendChild(line);

        // Circular rotation handle
        const rotateHandle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        rotateHandle.setAttribute('cx', rotateHandleX);
        rotateHandle.setAttribute('cy', rotateHandleY);
        rotateHandle.setAttribute('r', 5);
        rotateHandle.setAttribute('fill', '#4a90d9');
        rotateHandle.setAttribute('stroke', '#ffffff');
        rotateHandle.setAttribute('stroke-width', '1');
        rotateHandle.classList.add('handle', 'handle-rotate');
        rotateHandle.dataset.handleType = 'rotate';
        rotateHandle.dataset.handleData = 'rotation';
        rotateHandle.style.cursor = 'grab';
        this.handlesLayer.appendChild(rotateHandle);
    }

    showLineHandles(shape) {
        const handle1 = this.createHandle(shape.x1, shape.y1, 0, 'point');
        const handle2 = this.createHandle(shape.x2, shape.y2, 1, 'point');
        this.handlesLayer.appendChild(handle1);
        this.handlesLayer.appendChild(handle2);
    }

    showPolylineHandles(shape) {
        shape.points.forEach((point, index) => {
            const mappedPoint = SVGTransform.localToCanvas(shape.element, point.x, point.y, this.svgRoot);
            const handle = this.createHandle(mappedPoint.x, mappedPoint.y, index, 'point');
            if (index === this.selectedPointIndex) {
                handle.setAttribute('fill', '#ff6b6b');
            }
            this.handlesLayer.appendChild(handle);
        });
    }

    showPathHandles(shape) {
        shape.points.forEach((point, index) => {
            const mappedAnchor = SVGTransform.localToCanvas(shape.element, point.x, point.y, this.svgRoot);

            // Draw control handle lines first (so they're behind handles)
            if (point.handleIn) {
                const mappedHandleIn = SVGTransform.localToCanvas(shape.element, point.handleIn.x, point.handleIn.y, this.svgRoot);
                this.createHandleLine(mappedAnchor.x, mappedAnchor.y, mappedHandleIn.x, mappedHandleIn.y);
                const handleIn = this.createControlHandle(
                    mappedHandleIn.x,
                    mappedHandleIn.y,
                    `${index}-in`,
                    'path-handle-in'
                );
                this.handlesLayer.appendChild(handleIn);
            }
            if (point.handleOut) {
                const mappedHandleOut = SVGTransform.localToCanvas(shape.element, point.handleOut.x, point.handleOut.y, this.svgRoot);
                this.createHandleLine(mappedAnchor.x, mappedAnchor.y, mappedHandleOut.x, mappedHandleOut.y);
                const handleOut = this.createControlHandle(
                    mappedHandleOut.x,
                    mappedHandleOut.y,
                    `${index}-out`,
                    'path-handle-out'
                );
                this.handlesLayer.appendChild(handleOut);
            }

            // Anchor point handle (on top)
            const anchorHandle = this.createHandle(mappedAnchor.x, mappedAnchor.y, index, 'path-point');
            if (index === this.selectedPointIndex) {
                anchorHandle.setAttribute('fill', '#ff6b6b');
            }
            this.handlesLayer.appendChild(anchorHandle);
        });
    }

    createControlHandle(x, y, data, type) {
        const handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        handle.setAttribute('cx', x);
        handle.setAttribute('cy', y);
        handle.setAttribute('r', 4);
        handle.setAttribute('fill', '#ffffff');
        handle.setAttribute('stroke', '#4a90d9');
        handle.setAttribute('stroke-width', '1');
        handle.classList.add('handle', `handle-${type}`);
        handle.dataset.handleData = data;
        handle.dataset.handleType = type;
        handle.style.cursor = 'move';
        return handle;
    }

    createHandleLine(x1, y1, x2, y2) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('stroke', '#4a90d9');
        line.setAttribute('stroke-width', '1');
        line.style.pointerEvents = 'none';
        this.handlesLayer.appendChild(line);
    }

    createHandle(x, y, data, type) {
        const handle = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        const halfSize = this.handleSize / 2;

        handle.setAttribute('x', x - halfSize);
        handle.setAttribute('y', y - halfSize);
        handle.setAttribute('width', this.handleSize);
        handle.setAttribute('height', this.handleSize);
        handle.setAttribute('fill', '#4a90d9');
        handle.setAttribute('stroke', '#ffffff');
        handle.setAttribute('stroke-width', '1');
        handle.classList.add('handle', `handle-${type}`);
        handle.dataset.handleData = data;
        handle.dataset.handleType = type;
        handle.style.cursor = this.getCursor(data, type);

        return handle;
    }

    getCursor(data, type) {
        if (type === 'point') return 'move';
        const cursors = {
            'nw': 'nwse-resize', 'se': 'nwse-resize',
            'ne': 'nesw-resize', 'sw': 'nesw-resize',
            'n': 'ns-resize', 's': 'ns-resize',
            'e': 'ew-resize', 'w': 'ew-resize'
        };
        return cursors[data] || 'pointer';
    }

    showSelectionOutline(shape) {
        const bounds = shape.getBounds();
        const padding = 2;

        const outline = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        outline.setAttribute('x', bounds.x - padding);
        outline.setAttribute('y', bounds.y - padding);
        outline.setAttribute('width', bounds.width + padding * 2);
        outline.setAttribute('height', bounds.height + padding * 2);
        outline.setAttribute('fill', 'none');
        outline.setAttribute('stroke', '#4a90d9');
        outline.setAttribute('stroke-width', '1');
        outline.setAttribute('stroke-dasharray', '4 2');
        outline.classList.add('selection-outline');
        outline.style.pointerEvents = 'none';

        this.handlesLayer.appendChild(outline);
    }

    hideHandles() {
        this.clear();
        const hadPointSelected = this.selectedPointIndex !== null;
        this.selectedPointIndex = null;
        if (hadPointSelected) {
            eventBus.emit('point:selected', { shape: null, pointIndex: null });
        }
    }

    clear() {
        this.handlesLayer.innerHTML = '';
    }

    selectPoint(index) {
        const previousIndex = this.selectedPointIndex;
        this.selectedPointIndex = index;
        const shape = appState.getSelectedShape();
        if (shape) {
            this.showHandles(shape);
        }
        // Emit point selection event if changed
        if (previousIndex !== index) {
            eventBus.emit('point:selected', { shape, pointIndex: index });
        }
    }

    getSelectedPointIndex() {
        return this.selectedPointIndex;
    }

    updateHandles() {
        const shapes = appState.getSelectedShapes();
        this.onSelectionChanged(shapes);
    }
}
