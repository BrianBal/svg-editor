/**
 * PropertyWindow - Floating window that renders property controls for a tab
 * Reuses PropertiesPanel rendering methods
 */
class PropertyWindow {
    constructor() {
        this.window = null;
        this.tab = null;
        this.shapes = [];
    }

    open(tab, shapes) {
        this.tab = tab;
        this.shapes = shapes;

        // Close existing window
        this.close();

        // Create window element
        this.window = document.createElement('div');
        this.window.className = 'property-window overlay-panel';
        this.window.id = 'property-window';

        // Header
        const header = document.createElement('div');
        header.className = 'property-window-header';

        const title = document.createElement('h3');
        title.textContent = tab.label;
        if (shapes.length > 1) {
            title.textContent += ` (${shapes.length} shapes)`;
        }

        const closeBtn = document.createElement('button');
        closeBtn.className = 'property-window-close';
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', () => {
            window.eventBus.emit('tab:clicked', tab.id); // Toggle close
        });

        header.appendChild(title);
        header.appendChild(closeBtn);
        this.window.appendChild(header);

        // Content
        const content = document.createElement('div');
        content.className = 'property-window-content';
        content.id = 'property-window-content';
        this.window.appendChild(content);

        // Add to UI overlays
        const overlays = document.querySelector('.ui-overlays');
        overlays.appendChild(this.window);

        // Render properties
        this.renderProperties();

        // Listen for shape updates
        this.updateListener = () => this.renderProperties();
        window.eventBus.on('shape:updated', this.updateListener);
    }

    close() {
        if (this.window) {
            this.window.remove();
            this.window = null;
        }

        if (this.updateListener) {
            window.eventBus.off('shape:updated', this.updateListener);
            this.updateListener = null;
        }
    }

    renderProperties() {
        const content = document.getElementById('property-window-content');
        if (!content) return;

        // Store focused element info before re-render
        const focusedElement = document.activeElement;
        let focusKey = null;
        let selectionStart = null;
        let selectionEnd = null;

        if (focusedElement && content.contains(focusedElement)) {
            // Try to identify which property this input belongs to
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

        // Get the appropriate property schema based on context
        let schema;
        let target;

        if (this.shapes.length > 1) {
            // Multi-select - get common schema
            schema = this.getCommonSchema(this.shapes);
            target = this.shapes;
        } else if (this.shapes.length === 1) {
            // Single shape
            schema = this.getShapeSchema(this.shapes[0]);
            target = this.shapes[0];
        } else {
            // No selection - use defaults
            schema = this.getDefaultSchema();
            target = appState;
        }

        // Filter schema to only include properties for this tab
        const filteredSchema = this.filterSchemaByTab(schema);

        // Render each property
        Object.entries(filteredSchema).forEach(([key, def]) => {
            const value = this.getValue(key, def, target);
            const control = this.renderControl(key, def, value, target);
            if (control) {
                // Mark control with property key for focus restoration
                control.dataset.propertyKey = key;
                content.appendChild(control);
            }
        });

        // Restore focus if we had a focused element
        if (focusKey) {
            const rowToFocus = content.querySelector(`[data-property-key="${focusKey}"]`);
            if (rowToFocus) {
                const input = rowToFocus.querySelector('input');
                if (input) {
                    // Use setTimeout to ensure DOM is ready
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

    filterSchemaByTab(schema) {
        const filtered = {};
        this.tab.properties.forEach(propKey => {
            if (schema[propKey]) {
                filtered[propKey] = schema[propKey];
            }
        });
        return filtered;
    }

    getShapeSchema(shape) {
        // Get schema from shape's properties
        return shape.constructor.properties || {};
    }

    getCommonSchema(shapes) {
        // Get common properties across all shapes
        if (shapes.length === 0) return {};
        if (shapes.length === 1) return this.getShapeSchema(shapes[0]);

        const schemas = shapes.map(s => this.getShapeSchema(s));
        const commonKeys = Object.keys(schemas[0]).filter(key =>
            schemas.every(s => s[key])
        );

        const commonSchema = {};
        commonKeys.forEach(key => {
            commonSchema[key] = schemas[0][key];
        });

        return commonSchema;
    }

    getDefaultSchema() {
        // Return default style properties
        return typeof DefaultStyleProperties !== 'undefined' ? DefaultStyleProperties : {};
    }

    getValue(key, def, target) {
        if (Array.isArray(target)) {
            // Multi-select - return value from first shape
            return def.get(target[0]);
        }
        return def.get(target);
    }

    renderControl(key, def, value, target) {
        // Delegate to PropertiesPanel's renderControl method if available
        const propertiesPanel = window.app?.propertiesPanel;
        if (propertiesPanel && propertiesPanel.renderControl) {
            return propertiesPanel.renderControl(key, def, value, target);
        }

        // Fallback: simple control rendering
        return this.renderSimpleControl(key, def, value, target);
    }

    renderSimpleControl(key, def, value, target) {
        const row = document.createElement('div');
        row.className = 'property-row';

        const label = document.createElement('label');
        label.textContent = def.label;
        label.className = 'property-label';

        const inputWrapper = document.createElement('div');
        inputWrapper.className = 'property-input-wrapper';

        let input;
        switch (def.type) {
            case 'number':
                input = document.createElement('input');
                input.type = 'number';
                input.className = 'property-input';
                input.value = value;
                input.min = def.min ?? '';
                input.max = def.max ?? '';
                input.step = def.step ?? 1;

                input.addEventListener('input', (e) => {
                    const newValue = parseFloat(e.target.value);
                    this.setValue(key, def, newValue, target);
                });

                inputWrapper.appendChild(input);
                if (def.suffix) {
                    const suffix = document.createElement('span');
                    suffix.className = 'property-suffix';
                    suffix.textContent = def.suffix;
                    inputWrapper.appendChild(suffix);
                }
                break;

            case 'color':
                input = document.createElement('input');
                input.type = 'color';
                input.className = 'fill-color-input';
                input.value = value || '#000000';

                input.addEventListener('input', (e) => {
                    this.setValue(key, def, e.target.value, target);
                });

                inputWrapper.appendChild(input);
                break;

            default:
                const text = document.createElement('span');
                text.textContent = value;
                inputWrapper.appendChild(text);
                break;
        }

        row.appendChild(label);
        row.appendChild(inputWrapper);

        return row;
    }

    setValue(key, def, value, target) {
        if (Array.isArray(target)) {
            // Multi-select - set value on all shapes
            target.forEach(shape => def.set(shape, value));
        } else {
            def.set(target, value);
        }
    }
}
