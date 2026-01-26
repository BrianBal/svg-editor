/**
 * PointToolWindow - Specialized property window for editing selected points
 * Shows when a point is selected on polyline or path shapes
 */
class PointToolWindow extends PropertyWindow {
    constructor() {
        super();
        this.pointIndex = null;
        this.shape = null;
        this.isEditing = false;
    }

    /**
     * Open window for a selected point
     * @param {Shape} shape - The shape containing the point
     * @param {number} pointIndex - Index of the selected point
     */
    openForPoint(shape, pointIndex) {
        // Close any existing window FIRST
        this.close();

        // Now set the new shape and point index
        this.shape = shape;
        this.pointIndex = pointIndex;

        // Create custom tab definition for point properties
        const pointTab = {
            id: 'point-info',
            label: 'Point Info',
            properties: this.getPointProperties(shape)
        };

        // Set up the tab and shapes
        this.tab = pointTab;
        this.shapes = [shape];

        // Create window DOM structure
        this.window = document.createElement('div');
        this.window.className = 'property-window overlay-panel point-tool-window';
        this.window.id = 'point-tool-window';

        // Header
        const header = document.createElement('div');
        header.className = 'property-window-header';

        const title = document.createElement('h3');
        title.textContent = `Point ${pointIndex + 1}`;

        const closeBtn = document.createElement('button');
        closeBtn.className = 'property-window-close';
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', () => {
            this.closeAndDeselectPoint();
        });

        header.appendChild(title);
        header.appendChild(closeBtn);
        this.window.appendChild(header);

        // Content
        const content = document.createElement('div');
        content.className = 'property-window-content';
        content.id = 'point-tool-window-content';
        this.window.appendChild(content);

        // Add to UI overlays
        const overlays = document.querySelector('.ui-overlays');
        overlays.appendChild(this.window);

        // Render point properties
        this.renderPointProperties();

        // Listen for shape updates
        this.updateListener = () => {
            if (!this.isEditing) {
                this.renderPointProperties();
            }
        };
        window.eventBus.on('shape:updated', this.updateListener);
    }

    /**
     * Get list of property keys to show based on shape type
     */
    getPointProperties(shape) {
        const props = ['pointX', 'pointY'];

        // Add handle properties for Path shapes (Pen Tool)
        if (shape.type === 'path') {
            const point = shape.points[this.pointIndex];
            if (point.handleIn) {
                props.push('handleInX', 'handleInY');
            }
            if (point.handleOut) {
                props.push('handleOutX', 'handleOutY');
            }
        }

        return props;
    }

    /**
     * Render point properties using custom schema
     */
    renderPointProperties() {
        const content = document.getElementById('point-tool-window-content');
        if (!content) return;

        // Preserve focus state
        const focusedElement = document.activeElement;
        let focusKey = null;
        let selectionStart = null;
        let selectionEnd = null;

        if (focusedElement && content.contains(focusedElement)) {
            const row = focusedElement.closest('.property-row');
            if (row) {
                focusKey = row.dataset.propertyKey;
                if (focusedElement.tagName === 'INPUT') {
                    selectionStart = focusedElement.selectionStart;
                    selectionEnd = focusedElement.selectionEnd;
                }
            }
        }

        content.innerHTML = '';

        // Get point property schema
        const schema = this.getPointSchema();

        // Render each property
        Object.entries(schema).forEach(([key, def]) => {
            const value = def.get(this.shape);
            const control = this.renderControl(key, def, value, this.shape);
            if (control) {
                control.dataset.propertyKey = key;
                content.appendChild(control);
            }
        });

        // Restore focus
        if (focusKey) {
            const rowToFocus = content.querySelector(`[data-property-key="${focusKey}"]`);
            if (rowToFocus) {
                const input = rowToFocus.querySelector('input');
                if (input) {
                    setTimeout(() => {
                        input.focus();
                        if (selectionStart !== null && input.setSelectionRange) {
                            input.setSelectionRange(selectionStart, selectionEnd);
                        }
                    }, 0);
                }
            }
        }
    }

    /**
     * Define property schema for point coordinates and handles
     */
    getPointSchema() {
        // Capture pointIndex in closure for use in get/set functions
        const pointIndex = this.pointIndex;

        const schema = {
            pointX: {
                type: 'number',
                label: 'X',
                suffix: 'px',
                get: (shape) => Math.round(shape.points[pointIndex].x),
                set: (shape, value) => {
                    const point = shape.points[pointIndex];
                    shape.movePoint(pointIndex, value, point.y);
                    window.app.canvas.selection.updateHandles();
                }
            },
            pointY: {
                type: 'number',
                label: 'Y',
                suffix: 'px',
                get: (shape) => Math.round(shape.points[pointIndex].y),
                set: (shape, value) => {
                    const point = shape.points[pointIndex];
                    shape.movePoint(pointIndex, point.x, value);
                    window.app.canvas.selection.updateHandles();
                }
            }
        };

        // Add handle properties for Path shapes
        if (this.shape.type === 'path') {
            const point = this.shape.points[pointIndex];

            if (point.handleIn) {
                schema.handleInX = {
                    type: 'number',
                    label: 'Handle In X',
                    suffix: 'px',
                    get: (shape) => Math.round(shape.points[pointIndex].handleIn.x),
                    set: (shape, value) => {
                        const point = shape.points[pointIndex];
                        shape.moveHandle(pointIndex, 'in', value, point.handleIn.y, false);
                        window.app.canvas.selection.updateHandles();
                    }
                };
                schema.handleInY = {
                    type: 'number',
                    label: 'Handle In Y',
                    suffix: 'px',
                    get: (shape) => Math.round(shape.points[pointIndex].handleIn.y),
                    set: (shape, value) => {
                        const point = shape.points[pointIndex];
                        shape.moveHandle(pointIndex, 'in', point.handleIn.x, value, false);
                        window.app.canvas.selection.updateHandles();
                    }
                };
            }

            if (point.handleOut) {
                schema.handleOutX = {
                    type: 'number',
                    label: 'Handle Out X',
                    suffix: 'px',
                    get: (shape) => Math.round(shape.points[pointIndex].handleOut.x),
                    set: (shape, value) => {
                        const point = shape.points[pointIndex];
                        shape.moveHandle(pointIndex, 'out', value, point.handleOut.y, false);
                        window.app.canvas.selection.updateHandles();
                    }
                };
                schema.handleOutY = {
                    type: 'number',
                    label: 'Handle Out Y',
                    suffix: 'px',
                    get: (shape) => Math.round(shape.points[pointIndex].handleOut.y),
                    set: (shape, value) => {
                        const point = shape.points[pointIndex];
                        shape.moveHandle(pointIndex, 'out', point.handleOut.x, value, false);
                        window.app.canvas.selection.updateHandles();
                    }
                };
            }
        }

        return schema;
    }

    /**
     * Render control for a single property
     * Custom implementation that doesn't rely on PropertiesPanel's internal state
     */
    renderControl(key, def, value, target) {
        const row = document.createElement('div');
        row.className = 'property-row';

        const field = document.createElement('div');
        field.className = 'property-field';

        const label = document.createElement('label');
        label.textContent = def.label + ':';
        field.appendChild(label);

        const wrapper = document.createElement('div');
        wrapper.className = 'property-input-wrapper';

        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'property-input';
        input.value = value || 0;
        if (def.min !== undefined) input.min = def.min;
        if (def.max !== undefined) input.max = def.max;
        input.step = def.step || 1;

        input.addEventListener('input', (e) => {
            const newValue = parseFloat(e.target.value);
            if (!isNaN(newValue) && def.set) {
                def.set(target, newValue);
            }
        });

        wrapper.appendChild(input);

        if (def.suffix) {
            const suffix = document.createElement('span');
            suffix.className = 'property-suffix';
            suffix.textContent = def.suffix;
            wrapper.appendChild(suffix);
        }

        field.appendChild(wrapper);
        row.appendChild(field);

        return row;
    }

    /**
     * Close window and deselect the point
     */
    closeAndDeselectPoint() {
        // Deselect the point
        if (window.app?.canvas?.selection) {
            window.app.canvas.selection.selectPoint(null);
        }

        // Close the window
        this.close();
    }

    /**
     * Override close to not emit tab:clicked event
     */
    close() {
        if (this.window) {
            this.window.remove();
            this.window = null;
        }

        if (this.updateListener) {
            window.eventBus.off('shape:updated', this.updateListener);
            this.updateListener = null;
        }

        this.pointIndex = null;
        this.shape = null;
    }
}
