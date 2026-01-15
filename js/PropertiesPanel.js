/**
 * Property group configuration - defines section headers and ordering
 */
const PropertyGroups = {
    // Document context
    document: { label: 'Document', order: 1 },
    defaults: { label: 'Default Styles', order: 2 },

    // Shape context
    transform: { label: 'Transform', order: 1 },
    appearance: { label: 'Appearance', order: 2 },
    stroke: { label: null, order: 3, parent: 'appearance' },

    // Shape-specific (order 10+ to appear after common groups)
    rectangle: { label: 'Rectangle', order: 10 },
    ellipse: { label: 'Ellipse', order: 10 },
    star: { label: 'Star', order: 10 },
    text: { label: 'Text', order: 10 },
    polyline: { label: 'Points', order: 10 },
    line: { label: 'Line', order: 10 },

    actions: { label: null, order: 99 },
};

/**
 * Document properties schema - shown when nothing is selected
 */
const DocumentProperties = {
    width: {
        type: 'number',
        label: 'Width',
        group: 'document',
        suffix: 'px',
        min: 1,
        get: () => appState.svgWidth,
        set: (_, value) => {
            const canvas = window.app?.canvas;
            if (canvas) {
                const newViewBox = `0 0 ${value} ${appState.svgHeight}`;
                canvas.updateSize(value, appState.svgHeight, newViewBox);
            }
        }
    },
    height: {
        type: 'number',
        label: 'Height',
        group: 'document',
        suffix: 'px',
        min: 1,
        get: () => appState.svgHeight,
        set: (_, value) => {
            const canvas = window.app?.canvas;
            if (canvas) {
                const newViewBox = `0 0 ${appState.svgWidth} ${value}`;
                canvas.updateSize(appState.svgWidth, value, newViewBox);
            }
        }
    },
    background: {
        type: 'color',
        label: 'Background',
        group: 'document',
        allowNone: true,
        get: () => appState.background,
        set: (_, value) => appState.setBackground(value)
    },
};

/**
 * Default style properties schema - shown when nothing is selected
 */
const DefaultStyleProperties = {
    defaultStroke: {
        type: 'color',
        label: 'Stroke',
        group: 'defaults',
        allowNone: true,
        get: () => appState.defaultStroke,
        set: (_, value) => { appState.defaultStroke = value; }
    },
    defaultFill: {
        type: 'color',
        label: 'Fill',
        group: 'defaults',
        allowNone: true,
        get: () => appState.defaultFill,
        set: (_, value) => { appState.defaultFill = value; }
    },
    defaultStrokeWidth: {
        type: 'number',
        label: 'Stroke Width',
        group: 'defaults',
        suffix: 'px',
        min: 0,
        step: 0.5,
        get: () => appState.defaultStrokeWidth,
        set: (_, value) => { appState.defaultStrokeWidth = value; }
    },
};

/**
 * Base shape properties - inherited by all shapes
 */
const BaseShapeProperties = {
    // Transform group
    x: {
        type: 'number',
        label: 'X',
        group: 'transform',
        suffix: 'px',
        get: (shape) => Math.round(shape.getBounds().x),
        set: (shape, value) => {
            const bounds = shape.getBounds();
            if (shape.moveTo) {
                shape.moveTo(value, bounds.y);
            } else if (shape.move) {
                shape.move(value - bounds.x, 0);
            }
        }
    },
    y: {
        type: 'number',
        label: 'Y',
        group: 'transform',
        suffix: 'px',
        get: (shape) => Math.round(shape.getBounds().y),
        set: (shape, value) => {
            const bounds = shape.getBounds();
            if (shape.moveTo) {
                shape.moveTo(bounds.x, value);
            } else if (shape.move) {
                shape.move(0, value - bounds.y);
            }
        }
    },
    width: {
        type: 'number',
        label: 'W',
        group: 'transform',
        suffix: 'px',
        min: 1,
        get: (shape) => Math.round(shape.getBounds().width),
        set: (shape, value) => {
            if (shape.resize) {
                const bounds = shape.getBounds();
                shape.resize(bounds.x, bounds.y, value, bounds.height);
            }
        }
    },
    height: {
        type: 'number',
        label: 'H',
        group: 'transform',
        suffix: 'px',
        min: 1,
        get: (shape) => Math.round(shape.getBounds().height),
        set: (shape, value) => {
            if (shape.resize) {
                const bounds = shape.getBounds();
                shape.resize(bounds.x, bounds.y, bounds.width, value);
            }
        }
    },

    // Appearance group
    fill: {
        type: 'color',
        label: 'Fill',
        group: 'appearance',
        allowNone: true,
        get: (shape) => shape.fill,
        set: (shape, value) => shape.setFill(value)
    },
    stroke: {
        type: 'color',
        label: 'Stroke',
        group: 'appearance',
        allowNone: true,
        get: (shape) => shape.stroke,
        set: (shape, value) => shape.setStroke(value)
    },
    strokeWidth: {
        type: 'number',
        label: 'Width',
        group: 'stroke',
        suffix: 'px',
        min: 0,
        step: 0.5,
        get: (shape) => shape.strokeWidth,
        set: (shape, value) => shape.setStrokeWidth(value)
    },
    strokeDash: {
        type: 'select',
        label: 'Style',
        group: 'stroke',
        options: [
            { value: 'solid', label: 'Solid' },
            { value: 'dashed', label: 'Dashed' },
            { value: 'dotted', label: 'Dotted' },
        ],
        get: (shape) => shape.strokeDash,
        set: (shape, value) => shape.setStrokeDash(value)
    },
    strokeLinecap: {
        type: 'select',
        label: 'Cap',
        group: 'stroke',
        options: [
            { value: 'butt', label: 'Butt' },
            { value: 'round', label: 'Round' },
            { value: 'square', label: 'Square' },
        ],
        get: (shape) => shape.strokeLinecap,
        set: (shape, value) => shape.setStrokeLinecap(value)
    },
    strokeLinejoin: {
        type: 'select',
        label: 'Join',
        group: 'stroke',
        options: [
            { value: 'miter', label: 'Miter' },
            { value: 'round', label: 'Round' },
            { value: 'bevel', label: 'Bevel' },
        ],
        get: (shape) => shape.strokeLinejoin,
        set: (shape, value) => shape.setStrokeLinejoin(value)
    },
    opacity: {
        type: 'range',
        label: 'Opacity',
        group: 'appearance',
        min: 0,
        max: 100,
        suffix: '%',
        get: (shape) => shape.opacity,
        set: (shape, value) => shape.setOpacity(value)
    },

    // Actions group
    delete: {
        type: 'button',
        label: 'Delete Shape',
        group: 'actions',
        variant: 'danger',
        action: (shape) => {
            const canvas = window.app?.canvas;
            if (canvas) {
                canvas.removeShape(shape);
                appState.deselectAll();
            }
        }
    },
};

/**
 * Schema-driven Properties Panel
 * Automatically generates UI controls from property schemas
 */
class PropertiesPanel {
    constructor(canvas) {
        this.canvas = canvas;
        this.container = document.getElementById('properties-content');
        this.toolButtons = document.querySelectorAll('.tool-btn-icon');
        this.controls = new Map();
        this.collapsedSections = this.loadCollapsedSections();

        this.drawingTools = ['rectangle', 'ellipse', 'line', 'polyline', 'star', 'text'];

        this.setupToolButtons();
        this.setupEventListeners();
        this.render();
    }

    loadCollapsedSections() {
        try {
            const saved = localStorage.getItem('propertiesPanel.collapsed');
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    }

    saveCollapsedSections() {
        try {
            localStorage.setItem('propertiesPanel.collapsed', JSON.stringify(this.collapsedSections));
        } catch {
            // Ignore storage errors
        }
    }

    toggleSection(groupName) {
        this.collapsedSections[groupName] = !this.collapsedSections[groupName];
        this.saveCollapsedSections();
    }

    setupToolButtons() {
        this.toolButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                appState.setTool(btn.dataset.tool);
            });
        });
    }

    setupEventListeners() {
        eventBus.on('shape:selected', () => this.render());
        eventBus.on('shape:deselected', () => this.render());
        eventBus.on('shape:updated', (shape) => this.updateValues(shape));
        eventBus.on('tool:changed', (tool) => this.onToolChanged(tool));
    }

    onToolChanged(toolName) {
        // Update tool button states
        this.toolButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === toolName);
        });

        // Re-render panel if no shape selected
        if (!appState.selectedShapeId) {
            this.render();
        }
    }

    getContext() {
        return {
            shape: appState.getSelectedShape(),
            tool: appState.activeTool,
        };
    }

    render() {
        const context = this.getContext();
        this.container.innerHTML = '';
        this.controls.clear();

        let schema, target;

        if (context.shape) {
            // Shape selected - use shape's properties
            schema = this.getShapeSchema(context.shape);
            target = context.shape;
        } else if (this.drawingTools.includes(context.tool)) {
            // Drawing tool active - show defaults only
            schema = { ...DefaultStyleProperties };
            target = appState;
        } else {
            // Select tool with nothing selected - show document + defaults
            schema = { ...DocumentProperties, ...DefaultStyleProperties };
            target = appState;
        }

        this.renderSchema(schema, target);
    }

    getShapeSchema(shape) {
        // Check if shape class has its own properties defined
        if (shape.constructor.properties) {
            return shape.constructor.properties;
        }
        // Fall back to base properties
        return BaseShapeProperties;
    }

    renderSchema(schema, target) {
        // Group properties by their group
        const groups = {};

        for (const [key, prop] of Object.entries(schema)) {
            if (prop.hidden) continue;

            const groupName = prop.group || 'other';
            if (!groups[groupName]) groups[groupName] = [];
            groups[groupName].push({ key, prop });
        }

        // Sort and render groups
        const sortedGroups = Object.entries(groups)
            .sort((a, b) => {
                const orderA = PropertyGroups[a[0]]?.order || 50;
                const orderB = PropertyGroups[b[0]]?.order || 50;
                return orderA - orderB;
            });

        for (const [groupName, props] of sortedGroups) {
            this.renderGroup(groupName, props, target);
        }
    }

    renderGroup(groupName, props, target) {
        const groupConfig = PropertyGroups[groupName] || { label: groupName };
        const isCollapsed = this.collapsedSections[groupName] || false;

        const section = document.createElement('section');
        section.className = 'properties-section';
        if (isCollapsed) section.classList.add('collapsed');
        section.dataset.group = groupName;

        // Add header if group has a label
        if (groupConfig.label) {
            const header = document.createElement('h3');
            header.className = 'section-header';

            const chevron = document.createElement('span');
            chevron.className = 'section-chevron';
            chevron.textContent = '▼';
            header.appendChild(chevron);

            const labelText = document.createElement('span');
            labelText.textContent = groupConfig.label;
            header.appendChild(labelText);

            header.addEventListener('click', () => {
                this.toggleSection(groupName);
                section.classList.toggle('collapsed');
            });

            section.appendChild(header);
        }

        // Create content wrapper for collapsible animation
        const content = document.createElement('div');
        content.className = 'section-content';

        // Check for paired number inputs (transform group)
        if (groupName === 'transform') {
            this.renderTransformGroup(content, props, target);
        } else {
            // Render each property in the group
            for (const { key, prop } of props) {
                const value = this.getValue(key, prop, target);
                const control = this.renderControl(key, prop, value, target);
                if (control) {
                    content.appendChild(control);
                    this.controls.set(key, { element: control, prop, target });
                }
            }
        }

        section.appendChild(content);
        this.container.appendChild(section);
    }

    renderTransformGroup(section, props, target) {
        // Render X/Y as a pair
        const xProp = props.find(p => p.key === 'x');
        const yProp = props.find(p => p.key === 'y');
        if (xProp && yProp) {
            const row = this.renderNumberPair(xProp, yProp, target);
            section.appendChild(row);
        }

        // Render W/H as a pair
        const wProp = props.find(p => p.key === 'width');
        const hProp = props.find(p => p.key === 'height');
        if (wProp && hProp && !wProp.prop.hidden && !hProp.prop.hidden) {
            const row = this.renderNumberPair(wProp, hProp, target);
            section.appendChild(row);
        }
    }

    renderNumberPair(prop1, prop2, target) {
        const row = document.createElement('div');
        row.className = 'property-row';

        const field1 = this.createNumberField(prop1.key, prop1.prop, target);
        const field2 = this.createNumberField(prop2.key, prop2.prop, target);

        row.appendChild(field1);
        row.appendChild(field2);

        return row;
    }

    addNumberKeyboardShortcuts(input, key, prop, target) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
                const step = prop.step || 1;
                const multiplier = e.shiftKey ? 10 : 1;
                const delta = (e.key === 'ArrowUp' ? step : -step) * multiplier;
                let newValue = parseFloat(input.value) + delta;

                // Apply min/max constraints
                if (prop.min !== undefined) newValue = Math.max(prop.min, newValue);
                if (prop.max !== undefined) newValue = Math.min(prop.max, newValue);

                input.value = newValue;
                this.setValue(key, prop, target, newValue);
                this.canvas.selection?.updateHandles();
            }
        });
    }

    createNumberField(key, prop, target) {
        const value = this.getValue(key, prop, target);
        const field = document.createElement('div');
        field.className = 'property-field';

        const label = document.createElement('label');
        label.textContent = prop.label + ':';
        field.appendChild(label);

        const wrapper = document.createElement('div');
        wrapper.className = 'property-input-wrapper';

        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'property-input';
        input.value = value || 0;
        if (prop.min !== undefined) input.min = prop.min;
        if (prop.max !== undefined) input.max = prop.max;
        input.step = prop.step || 1;

        input.addEventListener('input', (e) => {
            const newValue = parseFloat(e.target.value);
            if (!isNaN(newValue)) {
                this.setValue(key, prop, target, newValue);
                this.canvas.selection?.updateHandles();
            }
        });

        this.addNumberKeyboardShortcuts(input, key, prop, target);

        wrapper.appendChild(input);

        if (prop.suffix) {
            const suffix = document.createElement('span');
            suffix.className = 'property-suffix';
            suffix.textContent = prop.suffix;
            wrapper.appendChild(suffix);
        }

        field.appendChild(wrapper);

        this.controls.set(key, { element: input, prop, target, isInput: true });

        return field;
    }

    getValue(key, prop, target) {
        if (prop.get) {
            return prop.get(target);
        }
        return target[key];
    }

    setValue(key, prop, target, value) {
        if (prop.set) {
            prop.set(target, value);
        } else if (typeof target[`set${key.charAt(0).toUpperCase() + key.slice(1)}`] === 'function') {
            target[`set${key.charAt(0).toUpperCase() + key.slice(1)}`](value);
        } else {
            target[key] = value;
        }
    }

    renderControl(key, prop, value, target) {
        switch (prop.type) {
            case 'number':
                return this.renderNumberInput(key, prop, value, target);
            case 'color':
                return this.renderColorPicker(key, prop, value, target);
            case 'button':
                return this.renderButton(key, prop, target);
            case 'textarea':
                return this.renderTextarea(key, prop, value, target);
            case 'select':
                return this.renderSelect(key, prop, value, target);
            case 'checkbox':
                return this.renderCheckbox(key, prop, value, target);
            case 'range':
                return this.renderRange(key, prop, value, target);
            default:
                console.warn(`No renderer for property type: ${prop.type}`);
                return null;
        }
    }

    renderNumberInput(key, prop, value, target) {
        const row = document.createElement('div');
        row.className = 'property-row';

        const field = document.createElement('div');
        field.className = 'property-field';

        const label = document.createElement('label');
        label.textContent = prop.label + ':';
        field.appendChild(label);

        const wrapper = document.createElement('div');
        wrapper.className = 'property-input-wrapper';

        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'property-input';
        input.value = value || 0;
        if (prop.min !== undefined) input.min = prop.min;
        if (prop.max !== undefined) input.max = prop.max;
        input.step = prop.step || 1;
        if (prop.readonly) input.readOnly = true;

        input.addEventListener('input', (e) => {
            const newValue = parseFloat(e.target.value);
            if (!isNaN(newValue)) {
                this.setValue(key, prop, target, newValue);
            }
        });

        if (!prop.readonly) {
            this.addNumberKeyboardShortcuts(input, key, prop, target);
        }

        wrapper.appendChild(input);

        if (prop.suffix) {
            const suffix = document.createElement('span');
            suffix.className = 'property-suffix';
            suffix.textContent = prop.suffix;
            wrapper.appendChild(suffix);
        }

        field.appendChild(wrapper);
        row.appendChild(field);

        this.controls.set(key, { element: input, prop, target, isInput: true });

        return row;
    }

    renderColorPicker(key, prop, value, target) {
        const isNone = value === 'none';
        const row = document.createElement('div');
        row.className = 'property-row';

        const field = document.createElement('div');
        field.className = 'color-field';

        const label = document.createElement('span');
        label.style.cssText = 'color: var(--text-secondary); font-size: 12px;';
        label.textContent = prop.label;
        field.appendChild(label);

        const wrapper = document.createElement('div');
        wrapper.className = 'color-input-wrapper';

        const input = document.createElement('input');
        input.type = 'color';
        input.value = isNone ? '#000000' : (value || '#000000');

        let noneBtn = null;

        input.addEventListener('input', (e) => {
            if (noneBtn) noneBtn.classList.remove('active');
            this.setValue(key, prop, target, e.target.value);
        });

        wrapper.appendChild(input);
        field.appendChild(wrapper);

        if (prop.allowNone) {
            noneBtn = document.createElement('button');
            noneBtn.className = 'no-color-btn' + (isNone ? ' active' : '');
            noneBtn.textContent = 'None';

            noneBtn.addEventListener('click', () => {
                const wasActive = noneBtn.classList.toggle('active');
                if (wasActive) {
                    this.setValue(key, prop, target, 'none');
                } else {
                    this.setValue(key, prop, target, input.value);
                }
            });

            field.appendChild(noneBtn);
        }

        row.appendChild(field);

        this.controls.set(key, { element: input, prop, target, isInput: true, noneBtn });

        return row;
    }

    renderButton(key, prop, target) {
        const row = document.createElement('div');
        row.className = 'property-row';

        const btn = document.createElement('button');
        btn.className = prop.variant === 'danger' ? 'btn-delete' : 'btn';
        btn.textContent = prop.label;
        btn.style.width = '100%';

        btn.addEventListener('click', () => {
            if (prop.action) {
                prop.action(target, this.canvas);
            }
        });

        row.appendChild(btn);
        return row;
    }

    renderTextarea(key, prop, value, target) {
        const row = document.createElement('div');
        row.className = 'property-row';
        row.style.display = 'block';

        const textarea = document.createElement('textarea');
        textarea.className = 'text-content-input';
        textarea.rows = prop.rows || 3;
        textarea.placeholder = prop.placeholder || '';
        textarea.value = value || '';

        textarea.addEventListener('input', (e) => {
            this.setValue(key, prop, target, e.target.value);
        });

        row.appendChild(textarea);

        this.controls.set(key, { element: textarea, prop, target, isInput: true });

        return row;
    }

    renderSelect(key, prop, value, target) {
        const row = document.createElement('div');
        row.className = 'property-row';

        const field = document.createElement('div');
        field.className = 'property-field';
        field.style.width = '100%';

        const label = document.createElement('label');
        label.textContent = prop.label + ':';
        label.style.minWidth = '60px';
        field.appendChild(label);

        const select = document.createElement('select');
        select.className = 'property-select';

        for (const option of prop.options) {
            const opt = document.createElement('option');
            opt.value = option.value;
            opt.textContent = option.label;
            if (option.value === value) opt.selected = true;
            select.appendChild(opt);
        }

        select.addEventListener('change', (e) => {
            this.setValue(key, prop, target, e.target.value);
        });

        field.appendChild(select);
        row.appendChild(field);

        this.controls.set(key, { element: select, prop, target, isInput: true });

        return row;
    }

    renderCheckbox(key, prop, value, target) {
        const row = document.createElement('div');
        row.className = 'property-row';

        const label = document.createElement('label');
        label.className = 'checkbox-label';
        label.style.display = 'flex';
        label.style.alignItems = 'center';
        label.style.gap = '8px';
        label.style.cursor = 'pointer';

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = !!value;

        input.addEventListener('change', (e) => {
            this.setValue(key, prop, target, e.target.checked);
        });

        label.appendChild(input);
        label.appendChild(document.createTextNode(prop.label));
        row.appendChild(label);

        this.controls.set(key, { element: input, prop, target, isInput: true });

        return row;
    }

    renderRange(key, prop, value, target) {
        const row = document.createElement('div');
        row.className = 'property-row';

        const field = document.createElement('div');
        field.className = 'property-field';
        field.style.width = '100%';

        const labelWrapper = document.createElement('div');
        labelWrapper.style.display = 'flex';
        labelWrapper.style.justifyContent = 'space-between';
        labelWrapper.style.marginBottom = '4px';

        const label = document.createElement('label');
        label.textContent = prop.label + ':';
        labelWrapper.appendChild(label);

        const valueDisplay = document.createElement('span');
        valueDisplay.textContent = value + (prop.suffix || '');
        valueDisplay.style.color = 'var(--text-secondary)';
        labelWrapper.appendChild(valueDisplay);

        field.appendChild(labelWrapper);

        const input = document.createElement('input');
        input.type = 'range';
        input.style.width = '100%';
        input.value = value;
        input.min = prop.min || 0;
        input.max = prop.max || 100;
        input.step = prop.step || 1;

        input.addEventListener('input', (e) => {
            const newValue = parseFloat(e.target.value);
            valueDisplay.textContent = newValue + (prop.suffix || '');
            this.setValue(key, prop, target, newValue);
        });

        field.appendChild(input);
        row.appendChild(field);

        this.controls.set(key, { element: input, prop, target, isInput: true, valueDisplay });

        return row;
    }

    updateValues(shape) {
        // Only update if this shape is selected
        if (shape !== appState.getSelectedShape()) return;

        for (const [key, controlData] of this.controls) {
            const { element, prop, target, isInput, noneBtn, valueDisplay } = controlData;
            if (!isInput) continue;

            const value = this.getValue(key, prop, target);

            // Don't update if user is actively editing this field
            if (document.activeElement === element) continue;

            if (element.type === 'checkbox') {
                element.checked = !!value;
            } else if (element.type === 'color') {
                element.value = value === 'none' ? '#000000' : (value || '#000000');
                if (noneBtn) {
                    noneBtn.classList.toggle('active', value === 'none');
                }
            } else if (element.type === 'range' && valueDisplay) {
                element.value = value;
                valueDisplay.textContent = value + (prop.suffix || '');
            } else {
                element.value = value;
            }
        }
    }
}
