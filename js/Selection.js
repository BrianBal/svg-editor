class Selection {
    constructor(canvas) {
        this.canvas = canvas;
        this.handlesLayer = document.getElementById('handles-layer');
        this.handleSize = 6;
        this.activeHandle = null;
        this.selectedPointIndex = null;
        this.isDraggingAny = false;

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

    setDragging(isDragging) {
        this.isDraggingAny = isDragging;
        if (!isDragging) {
            this.updateHandles();
        } else {
            this.clear();
        }
    }

    // Handle selection changes (0, 1, or multiple shapes)
    onSelectionChanged(shapes) {
        if (this.isDraggingAny) return;
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
    // Note: Multi-selection bounds are always axis-aligned (no rotation)
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
        rotateHandle.setAttribute('fill-opacity', '0.5');
        rotateHandle.setAttribute('stroke', '#ffffff');
        rotateHandle.setAttribute('stroke-width', '1');
        if (typeof window.getZoomScale === 'function') {
            const inverseScale = 1 / window.getZoomScale();
            // Scale around the circle's center: translate to origin, scale, translate back
            const transform = `translate(${rotateHandleX}, ${rotateHandleY}) scale(${inverseScale}) translate(${-rotateHandleX}, ${-rotateHandleY})`;
            rotateHandle.setAttribute('transform', transform);
        }
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

        // Transform handle positions if shape is rotated
        positions.forEach(pos => {
            const transformed = this.getTransformedPoint(shape, pos.x, pos.y);
            const handle = this.createHandle(transformed.x, transformed.y, pos.name, 'resize');
            this.handlesLayer.appendChild(handle);
        });

        // Add rotation handle 25px above top-center
        const topCenterLocal = { x: bounds.x + bounds.width / 2, y: bounds.y };
        const topCenter = this.getTransformedPoint(shape, topCenterLocal.x, topCenterLocal.y);

        // Calculate rotation handle position (25px above top-center in rotated space)
        const angle = (shape.rotation || 0) * Math.PI / 180;
        const rotateHandleX = topCenter.x - 25 * Math.sin(angle);
        const rotateHandleY = topCenter.y - 25 * Math.cos(angle);

        // Connecting line from top-center to rotation handle
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', topCenter.x);
        line.setAttribute('y1', topCenter.y);
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
        rotateHandle.setAttribute('fill-opacity', '0.5');
        rotateHandle.setAttribute('stroke', '#ffffff');
        rotateHandle.setAttribute('stroke-width', '1');
        if (typeof window.getZoomScale === 'function') {
            const inverseScale = 1 / window.getZoomScale();
            // Scale around the circle's center: translate to origin, scale, translate back
            const transform = `translate(${rotateHandleX}, ${rotateHandleY}) scale(${inverseScale}) translate(${-rotateHandleX}, ${-rotateHandleY})`;
            rotateHandle.setAttribute('transform', transform);
        }
        rotateHandle.classList.add('handle', 'handle-rotate');
        rotateHandle.dataset.handleType = 'rotate';
        rotateHandle.dataset.handleData = 'rotation';
        rotateHandle.style.cursor = 'grab';
        this.handlesLayer.appendChild(rotateHandle);
    }

    // Map shape-local coordinates -> SVG page coordinates (account for transforms)
    getTransformedPoint(shape, x, y) {
        try {
            if (shape.element && typeof shape.element.getCTM === 'function') {
                const svg = document.getElementById('svg-canvas');
                const pt = svg.createSVGPoint();
                pt.x = x;
                pt.y = y;
                const ctm = shape.element.getCTM();
                if (ctm) {
                    const transformed = pt.matrixTransform(ctm);
                    return { x: transformed.x, y: transformed.y };
                }
            }
        } catch (e) {
            // ignore and fall through
        }
        return { x, y };
    }

    showLineHandles(shape) {
        const p1 = this.getTransformedPoint(shape, shape.x1, shape.y1);
        const p2 = this.getTransformedPoint(shape, shape.x2, shape.y2);
        const handle1 = this.createHandle(p1.x, p1.y, 0, 'point');
        const handle2 = this.createHandle(p2.x, p2.y, 1, 'point');
        this.handlesLayer.appendChild(handle1);
        this.handlesLayer.appendChild(handle2);
    }

    showPolylineHandles(shape) {
        shape.points.forEach((point, index) => {
            const p = this.getTransformedPoint(shape, point.x, point.y);
            const handle = this.createHandle(p.x, p.y, index, 'point');
            if (index === this.selectedPointIndex) {
                handle.setAttribute('fill', '#ff6b6b');
            }
            this.handlesLayer.appendChild(handle);
        });
    }

    showPathHandles(shape) {
        shape.points.forEach((point, index) => {
            // Draw control handle lines first (so they're behind handles)
            if (point.handleIn) {
                const pAnchor = this.getTransformedPoint(shape, point.x, point.y);
                const pIn = this.getTransformedPoint(shape, point.handleIn.x, point.handleIn.y);
                this.createHandleLine(pAnchor.x, pAnchor.y, pIn.x, pIn.y);
                const handleIn = this.createControlHandle(
                    pIn.x,
                    pIn.y,
                    `${index}-in`,
                    'path-handle-in'
                );
                this.handlesLayer.appendChild(handleIn);
            }
            if (point.handleOut) {
                const pAnchor = this.getTransformedPoint(shape, point.x, point.y);
                const pOut = this.getTransformedPoint(shape, point.handleOut.x, point.handleOut.y);
                this.createHandleLine(pAnchor.x, pAnchor.y, pOut.x, pOut.y);
                const handleOut = this.createControlHandle(
                    pOut.x,
                    pOut.y,
                    `${index}-out`,
                    'path-handle-out'
                );
                this.handlesLayer.appendChild(handleOut);
            }

            // Anchor point handle (on top)
            const pAnchor = this.getTransformedPoint(shape, point.x, point.y);
            const anchorHandle = this.createHandle(pAnchor.x, pAnchor.y, index, 'path-point');
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
        handle.setAttribute('fill', '#4a90d9');
        handle.setAttribute('fill-opacity', '0.5');
        handle.setAttribute('stroke', '#4a90d9');
        handle.setAttribute('stroke-width', '1');
        if (typeof window.getZoomScale === 'function') {
            const inverseScale = 1 / window.getZoomScale();
            // Scale around the circle's center: translate to origin, scale, translate back
            const transform = `translate(${x}, ${y}) scale(${inverseScale}) translate(${-x}, ${-y})`;
            handle.setAttribute('transform', transform);
        }
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
        line.classList.add('handle-line');
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
        handle.setAttribute('fill-opacity', '0.5');
        handle.setAttribute('stroke', '#ffffff');
        handle.setAttribute('stroke-width', '1');
        if (typeof window.getZoomScale === 'function') {
            const inverseScale = 1 / window.getZoomScale();
            // Scale around the handle's center: translate to center, scale, translate back
            const transform = `translate(${x}, ${y}) scale(${inverseScale}) translate(${-x}, ${-y})`;
            handle.setAttribute('transform', transform);
        }
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

        // Copy shape's transform to selection outline
        if (shape.element) {
            const transform = shape.element.getAttribute('transform');
            if (transform) {
                outline.setAttribute('transform', transform);
            }
        }

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
        // Only remove selection-related elements, not tool preview elements
        const selectorsToRemove = '.handle, .handle-line, .rotation-line, .selection-outline';
        const elementsToRemove = this.handlesLayer.querySelectorAll(selectorsToRemove);
        elementsToRemove.forEach(el => el.remove());
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