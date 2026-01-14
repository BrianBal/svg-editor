class ToolsPanel {
    constructor(canvas) {
        this.canvas = canvas;
        this.toolButtons = document.querySelectorAll('.tool-btn-icon');
        this.sizeSection = document.getElementById('size-section');
        this.positionSection = document.getElementById('position-section');
        this.contentSection = document.getElementById('content-section');
        this.appearanceSection = document.getElementById('appearance-section');
        this.polylineControlsSection = document.getElementById('polyline-controls');

        this.strokeNoneBtn = document.getElementById('stroke-none-btn');
        this.fillNoneBtn = document.getElementById('fill-none-btn');
        this.deleteBtn = document.getElementById('btn-delete-shape');

        this.drawingTools = ['rectangle', 'ellipse', 'line', 'polyline', 'star', 'text'];

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.toolButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.setActiveTool(btn.dataset.tool);
            });
        });

        document.getElementById('stroke-color').addEventListener('input', (e) => {
            this.strokeNoneBtn.classList.remove('active');
            this.updateSelectedShapeProperty('stroke', e.target.value);
        });

        this.strokeNoneBtn.addEventListener('click', () => {
            const isActive = this.strokeNoneBtn.classList.toggle('active');
            if (isActive) {
                this.updateSelectedShapeProperty('stroke', 'none');
            } else {
                const strokeColor = document.getElementById('stroke-color').value;
                this.updateSelectedShapeProperty('stroke', strokeColor);
            }
        });

        document.getElementById('fill-color').addEventListener('input', (e) => {
            this.fillNoneBtn.classList.remove('active');
            this.updateSelectedShapeProperty('fill', e.target.value);
        });

        this.fillNoneBtn.addEventListener('click', () => {
            const isActive = this.fillNoneBtn.classList.toggle('active');
            if (isActive) {
                this.updateSelectedShapeProperty('fill', 'none');
            } else {
                const fillColor = document.getElementById('fill-color').value;
                this.updateSelectedShapeProperty('fill', fillColor);
            }
        });

        document.getElementById('stroke-width').addEventListener('input', (e) => {
            this.updateSelectedShapeProperty('strokeWidth', parseFloat(e.target.value));
        });

        document.getElementById('btn-delete-shape').addEventListener('click', () => {
            this.deleteSelectedShape();
        });

        document.getElementById('btn-add-point').addEventListener('click', () => {
            this.addPointToPolyline();
        });

        document.getElementById('btn-remove-point').addEventListener('click', () => {
            this.removePointFromPolyline();
        });

        document.getElementById('shape-x').addEventListener('input', (e) => {
            this.updateShapeGeometry('x', parseFloat(e.target.value));
        });

        document.getElementById('shape-y').addEventListener('input', (e) => {
            this.updateShapeGeometry('y', parseFloat(e.target.value));
        });

        document.getElementById('shape-width').addEventListener('input', (e) => {
            this.updateShapeGeometry('width', parseFloat(e.target.value));
        });

        document.getElementById('shape-height').addEventListener('input', (e) => {
            this.updateShapeGeometry('height', parseFloat(e.target.value));
        });

        document.getElementById('text-content').addEventListener('input', (e) => {
            const shape = appState.getSelectedShape();
            if (shape && shape.type === 'text') {
                shape.setText(e.target.value);
            }
        });

        eventBus.on('shape:selected', (shape) => this.showShapeProperties(shape));
        eventBus.on('shape:deselected', () => this.hideShapeProperties());
        eventBus.on('shape:updated', (shape) => this.updateGeometryInputs(shape));
        eventBus.on('tool:changed', (tool) => this.updateToolUI(tool));
    }

    setActiveTool(toolName) {
        appState.setTool(toolName);
    }

    updateToolUI(toolName) {
        this.toolButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === toolName);
        });

        // Show appearance section for drawing tools (when no shape is selected)
        if (!appState.selectedShapeId && this.drawingTools.includes(toolName)) {
            this.showDefaultColors();
        } else if (!appState.selectedShapeId) {
            this.hideShapeProperties();
        }
    }

    showShapeProperties(shape) {
        if (!shape) return;

        // Show all property sections
        this.positionSection.hidden = false;
        this.appearanceSection.hidden = false;
        this.deleteBtn.hidden = false;

        // Show size section only for rectangles
        const isRectangle = shape.type === 'rectangle';
        this.sizeSection.hidden = !isRectangle;

        // Show content section only for text shapes
        const isText = shape.type === 'text';
        this.contentSection.hidden = !isText;
        if (isText) {
            document.getElementById('text-content').value = shape.text || '';
        }

        // Handle stroke
        if (shape.stroke === 'none') {
            this.strokeNoneBtn.classList.add('active');
            document.getElementById('stroke-color').value = '#000000';
        } else {
            this.strokeNoneBtn.classList.remove('active');
            document.getElementById('stroke-color').value = shape.stroke || '#000000';
        }

        // Handle fill
        if (shape.fill === 'none') {
            this.fillNoneBtn.classList.add('active');
            document.getElementById('fill-color').value = '#ffffff';
        } else {
            this.fillNoneBtn.classList.remove('active');
            document.getElementById('fill-color').value = shape.fill || '#ffffff';
        }

        document.getElementById('stroke-width').value = shape.strokeWidth || 2;

        // Handle geometry
        this.updateGeometryInputs(shape);

        this.polylineControlsSection.hidden = shape.type !== 'polyline';
    }

    updateGeometryInputs(shape) {
        if (!shape || shape.id !== appState.selectedShapeId) return;

        const bounds = shape.getBounds();
        document.getElementById('shape-x').value = Math.round(bounds.x);
        document.getElementById('shape-y').value = Math.round(bounds.y);
        document.getElementById('shape-width').value = Math.round(bounds.width);
        document.getElementById('shape-height').value = Math.round(bounds.height);
    }

    hideShapeProperties() {
        this.sizeSection.hidden = true;
        this.positionSection.hidden = true;
        this.contentSection.hidden = true;
        this.polylineControlsSection.hidden = true;

        // If a drawing tool is active, show default colors instead of hiding appearance
        if (this.drawingTools.includes(appState.activeTool)) {
            this.showDefaultColors();
        } else {
            this.appearanceSection.hidden = true;
        }
    }

    showDefaultColors() {
        this.appearanceSection.hidden = false;
        this.deleteBtn.hidden = true;

        // Show default stroke
        if (appState.defaultStroke === 'none') {
            this.strokeNoneBtn.classList.add('active');
            document.getElementById('stroke-color').value = '#000000';
        } else {
            this.strokeNoneBtn.classList.remove('active');
            document.getElementById('stroke-color').value = appState.defaultStroke;
        }

        // Show default fill
        if (appState.defaultFill === 'none') {
            this.fillNoneBtn.classList.add('active');
            document.getElementById('fill-color').value = '#ffffff';
        } else {
            this.fillNoneBtn.classList.remove('active');
            document.getElementById('fill-color').value = appState.defaultFill;
        }

        document.getElementById('stroke-width').value = appState.defaultStrokeWidth;
    }

    updateSelectedShapeProperty(property, value) {
        const shape = appState.getShapeById(appState.selectedShapeId);

        if (shape) {
            // Update selected shape
            switch (property) {
                case 'stroke':
                    shape.setStroke(value);
                    break;
                case 'fill':
                    shape.setFill(value);
                    break;
                case 'strokeWidth':
                    shape.setStrokeWidth(value);
                    break;
            }
        } else {
            // Update default colors for new shapes
            switch (property) {
                case 'stroke':
                    appState.defaultStroke = value;
                    break;
                case 'fill':
                    appState.defaultFill = value;
                    break;
                case 'strokeWidth':
                    appState.defaultStrokeWidth = value;
                    break;
            }
        }
    }

    updateShapeGeometry(property, value) {
        const shape = appState.getSelectedShape();
        if (!shape || isNaN(value)) return;

        if (shape.type === 'rectangle') {
            switch (property) {
                case 'x':
                    shape.moveTo(value, shape.y);
                    break;
                case 'y':
                    shape.moveTo(shape.x, value);
                    break;
                case 'width':
                    shape.resize(shape.x, shape.y, value, shape.height);
                    break;
                case 'height':
                    shape.resize(shape.x, shape.y, shape.width, value);
                    break;
            }
        } else if (shape.type === 'polyline') {
            const bounds = shape.getBounds();
            const dx = property === 'x' ? value - bounds.x : 0;
            const dy = property === 'y' ? value - bounds.y : 0;
            if (dx !== 0 || dy !== 0) {
                shape.move(dx, dy);
            }
        }

        this.canvas.selection.updateHandles();
    }

    deleteSelectedShape() {
        const shape = appState.getSelectedShape();
        if (shape) {
            this.canvas.removeShape(shape);
            appState.deselectAll();
        }
    }

    addPointToPolyline() {
        const shape = appState.getSelectedShape();
        if (shape && shape.type === 'polyline') {
            const selectedIndex = this.canvas.selection.getSelectedPointIndex();
            if (selectedIndex !== null && selectedIndex < shape.points.length - 1) {
                shape.addPointBetween(selectedIndex);
            } else if (shape.points.length >= 2) {
                shape.addPointBetween(shape.points.length - 2);
            }
        }
    }

    removePointFromPolyline() {
        const shape = appState.getSelectedShape();
        if (shape && shape.type === 'polyline') {
            const selectedIndex = this.canvas.selection.getSelectedPointIndex();
            if (selectedIndex !== null) {
                if (shape.removePoint(selectedIndex)) {
                    this.canvas.selection.selectPoint(null);
                }
            } else {
                shape.removeLastPoint();
            }
        }
    }
}
