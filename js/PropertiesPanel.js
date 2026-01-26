/**
 * Property group configuration - defines section headers and ordering
 */
const PropertyGroups = {
    // Document context
    document: { label: 'Document', order: 1 },
    defaults: { label: 'Default Styles', order: 2 },

    // Selected point context (shown above shape properties)
    selectedPoint: { label: 'Selected Point', order: 0 },

    // Shape context
    appearance: { label: 'Appearance', order: 1 },
    stroke: { label: null, order: 2, parent: 'appearance' },
    transform: { label: 'Transform', order: 3 },
    perspective: { label: 'Perspective', order: 4 },

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
                // Recalculate zoom to properly scale the canvas container
                if (window.app?.updateZoom) {
                    window.app.updateZoom(window.app.zoom);
                }
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
                // Recalculate zoom to properly scale the canvas container
                if (window.app?.updateZoom) {
                    window.app.updateZoom(window.app.zoom);
                }
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
    rotation: {
        type: 'number',
        label: 'Rotation',
        group: 'transform',
        suffix: '°',
        min: 0,
        max: 360,
        step: 1,
        get: (shape) => Math.round(shape.rotation || 0),
        set: (shape, value) => shape.setRotation(value)
    },
    scaleX: {
        type: 'number',
        label: 'Scale X',
        group: 'transform',
        suffix: '',
        min: -10,
        max: 10,
        step: 0.001,
        get: (shape) => {
            const val = shape.scaleX !== undefined ? shape.scaleX : 1;
            return Math.round(val * 1000) / 1000; // Round to 3 decimal places
        },
        set: (shape, value) => {
            shape.scaleX = parseFloat(value);
            if (shape.element) {
                shape.applyTransform(shape.element);
            }
            eventBus.emit('shape:updated', shape);
        }
    },
    scaleY: {
        type: 'number',
        label: 'Scale Y',
        group: 'transform',
        suffix: '',
        min: -10,
        max: 10,
        step: 0.001,
        get: (shape) => {
            const val = shape.scaleY !== undefined ? shape.scaleY : 1;
            return Math.round(val * 1000) / 1000; // Round to 3 decimal places
        },
        set: (shape, value) => {
            shape.scaleY = parseFloat(value);
            if (shape.element) {
                shape.applyTransform(shape.element);
            }
            eventBus.emit('shape:updated', shape);
        }
    },

    // Perspective group
    skewX: {
        type: 'number',
        label: 'Skew X',
        group: 'perspective',
        suffix: '°',
        min: -89,
        max: 89,
        step: 1,
        get: (shape) => Math.round(shape.skewX || 0),
        set: (shape, value) => shape.setSkewX(value)
    },
    skewY: {
        type: 'number',
        label: 'Skew Y',
        group: 'perspective',
        suffix: '°',
        min: -89,
        max: 89,
        step: 1,
        get: (shape) => Math.round(shape.skewY || 0),
        set: (shape, value) => shape.setSkewY(value)
    },
    rotateX: {
        type: 'number',
        label: 'Rotate X',
        group: 'perspective',
        suffix: '°',
        min: -180,
        max: 180,
        step: 1,
        get: (shape) => Math.round(shape.rotateX || 0),
        set: (shape, value) => shape.setRotateX(value)
    },
    rotateY: {
        type: 'number',
        label: 'Rotate Y',
        group: 'perspective',
        suffix: '°',
        min: -180,
        max: 180,
        step: 1,
        get: (shape) => Math.round(shape.rotateY || 0),
        set: (shape, value) => shape.setRotateY(value)
    },
    perspective: {
        type: 'number',
        label: 'Perspective',
        group: 'perspective',
        suffix: 'px',
        min: 100,
        max: 5000,
        step: 50,
        get: (shape) => shape.perspective || 1000,
        set: (shape, value) => shape.setPerspective(value)
    },

    // Appearance group
    fill: {
        type: 'fill',
        label: 'Fill',
        group: 'appearance',
        get: (shape) => ({
            type: shape.getFillType(),
            color: shape.fillGradient ? shape.fillGradient.stops[0].color : shape.fill,
            gradient: shape.fillGradient
        }),
        set: (shape, value) => {
            if (value instanceof Gradient) {
                shape.setFill(value);
            } else {
                shape.setFill(value);
            }
        }
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
    }
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

        // Only setup if container exists (for backwards compatibility)
        if (this.container) {
            this.setupToolButtons();
            this.setupEventListeners();
            this.render();
        }
    }

    loadCollapsedSections() {
        try {
            const saved = localStorage.getItem('propertiesPanel.collapsed');
            const collapsed = saved ? JSON.parse(saved) : {};
            // Default perspective to collapsed on first use
            if (saved === null) {
                collapsed.perspective = true;
            }
            return collapsed;
        } catch {
            return { perspective: true };
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
        // Listen for multi-select changes
        eventBus.on('selection:changed', () => this.render());
        // Backwards compatibility
        eventBus.on('shape:selected', () => {
            if (appState.selectedShapeIds.length === 1) {
                this.render();
            }
        });
        eventBus.on('shape:deselected', () => this.render());
        eventBus.on('shape:updated', (shape) => this.updateValues(shape));
        eventBus.on('tool:changed', (tool) => this.onToolChanged(tool));
        // Listen for point selection changes
        eventBus.on('point:selected', () => this.render());
    }

    onToolChanged(toolName) {
        // Update tool button states
        this.toolButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === toolName);
        });

        // Re-render panel if no shape selected
        if (appState.selectedShapeIds.length === 0) {
            this.render();
        }
    }

    getContext() {
        return {
            shapes: appState.getSelectedShapes(),
            tool: appState.activeTool,
        };
    }

    render() {
        // Skip render if no container (new UI uses PropertyWindow instead)
        if (!this.container) return;

        const context = this.getContext();
        this.container.innerHTML = '';
        this.controls.clear();

        let schema, target;

        // Check for selected point and render at top
        if (context.shapes.length === 1) {
            const shape = context.shapes[0];
            const pointIndex = this.canvas.selection?.getSelectedPointIndex();
            if (pointIndex !== null && (shape.type === 'polyline' || shape.type === 'path')) {
                const pointSchema = this.getSelectedPointSchema(shape, pointIndex);
                this.renderSelectedPointSection(pointSchema, shape, pointIndex);
            }
        }

        if (context.shapes.length > 1) {
            // Multiple shapes selected - show common properties only
            schema = this.getCommonSchema(context.shapes);
            target = context.shapes;  // Pass array of shapes
            this.renderMultiSelectSchema(schema, target);
            return;
        } else if (context.shapes.length === 1) {
            // Single shape selected - use shape's properties
            schema = this.getShapeSchema(context.shapes[0]);
            target = context.shapes[0];
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

    /**
     * Render the Selected Point section at the top of the panel.
     * @param {Object} schema - Point property schema
     * @param {Shape} shape - The shape containing the point
     * @param {number} pointIndex - Index of the selected point
     */
    renderSelectedPointSection(schema, shape, pointIndex) {
        const groupConfig = PropertyGroups.selectedPoint;
        const isCollapsed = this.collapsedSections.selectedPoint || false;

        const section = document.createElement('section');
        section.className = 'properties-section selected-point-section';
        if (isCollapsed) section.classList.add('collapsed');
        section.dataset.group = 'selectedPoint';

        // Header
        const header = document.createElement('h3');
        header.className = 'section-header';

        const chevron = document.createElement('span');
        chevron.className = 'section-chevron';
        chevron.textContent = '▼';
        header.appendChild(chevron);

        const labelText = document.createElement('span');
        labelText.textContent = `${groupConfig.label} ${pointIndex + 1}`;
        header.appendChild(labelText);

        header.addEventListener('click', () => {
            this.toggleSection('selectedPoint');
            section.classList.toggle('collapsed');
        });

        section.appendChild(header);

        // Content
        const content = document.createElement('div');
        content.className = 'section-content';

        // Group handle properties together if they exist
        const hasHandleIn = schema.handleInX && schema.handleInY;
        const hasHandleOut = schema.handleOutX && schema.handleOutY;

        // Anchor point coordinates
        const anchorLabel = document.createElement('div');
        anchorLabel.className = 'selected-point-sublabel';
        anchorLabel.textContent = 'Anchor';
        content.appendChild(anchorLabel);

        for (const key of ['pointX', 'pointY']) {
            if (schema[key]) {
                const value = this.getValue(key, schema[key], shape);
                const control = this.renderControl(key, schema[key], value, shape);
                if (control) {
                    content.appendChild(control);
                    this.controls.set(key, { element: control, prop: schema[key], target: shape, shape, pointIndex });
                }
            }
        }

        // Handle In (if exists)
        if (hasHandleIn) {
            const handleInLabel = document.createElement('div');
            handleInLabel.className = 'selected-point-sublabel';
            handleInLabel.textContent = 'Handle In';
            content.appendChild(handleInLabel);

            for (const key of ['handleInX', 'handleInY']) {
                const value = this.getValue(key, schema[key], shape);
                const control = this.renderControl(key, schema[key], value, shape);
                if (control) {
                    content.appendChild(control);
                    this.controls.set(key, { element: control, prop: schema[key], target: shape, shape, pointIndex });
                }
            }
        }

        // Handle Out (if exists)
        if (hasHandleOut) {
            const handleOutLabel = document.createElement('div');
            handleOutLabel.className = 'selected-point-sublabel';
            handleOutLabel.textContent = 'Handle Out';
            content.appendChild(handleOutLabel);

            for (const key of ['handleOutX', 'handleOutY']) {
                const value = this.getValue(key, schema[key], shape);
                const control = this.renderControl(key, schema[key], value, shape);
                if (control) {
                    content.appendChild(control);
                    this.controls.set(key, { element: control, prop: schema[key], target: shape, shape, pointIndex });
                }
            }
        }

        section.appendChild(content);
        this.container.appendChild(section);
    }

    getShapeSchema(shape) {
        // Check if shape class has its own properties defined
        if (shape.constructor.properties) {
            return shape.constructor.properties;
        }
        // Fall back to base properties
        return BaseShapeProperties;
    }

    /**
     * Get schema for selected point properties.
     * Returns properties for editing point coordinates and bezier handles.
     * @param {Shape} shape - The shape containing the point
     * @param {number} pointIndex - Index of the selected point
     * @returns {Object} Property schema for the selected point
     */
    getSelectedPointSchema(shape, pointIndex) {
        const point = shape.points[pointIndex];
        if (!point) return {};

        const schema = {
            pointX: {
                type: 'number',
                label: 'X',
                group: 'selectedPoint',
                suffix: 'px',
                get: () => Math.round(point.x),
                set: (_, value) => {
                    if (shape.type === 'polyline') {
                        shape.movePoint(pointIndex, value, point.y);
                    } else if (shape.type === 'path') {
                        // For path, move point and handles together
                        shape.movePoint(pointIndex, value, point.y);
                    }
                    this.canvas.selection?.updateHandles();
                }
            },
            pointY: {
                type: 'number',
                label: 'Y',
                group: 'selectedPoint',
                suffix: 'px',
                get: () => Math.round(point.y),
                set: (_, value) => {
                    if (shape.type === 'polyline') {
                        shape.movePoint(pointIndex, point.x, value);
                    } else if (shape.type === 'path') {
                        shape.movePoint(pointIndex, point.x, value);
                    }
                    this.canvas.selection?.updateHandles();
                }
            }
        };

        // Add bezier handle properties for Path shapes
        if (shape.type === 'path') {
            if (point.handleIn) {
                schema.handleInX = {
                    type: 'number',
                    label: 'In X',
                    group: 'selectedPoint',
                    suffix: 'px',
                    get: () => Math.round(point.handleIn.x),
                    set: (_, value) => {
                        shape.moveHandle(pointIndex, 'in', value, point.handleIn.y, false);
                        this.canvas.selection?.updateHandles();
                    }
                };
                schema.handleInY = {
                    type: 'number',
                    label: 'In Y',
                    group: 'selectedPoint',
                    suffix: 'px',
                    get: () => Math.round(point.handleIn.y),
                    set: (_, value) => {
                        shape.moveHandle(pointIndex, 'in', point.handleIn.x, value, false);
                        this.canvas.selection?.updateHandles();
                    }
                };
            }
            if (point.handleOut) {
                schema.handleOutX = {
                    type: 'number',
                    label: 'Out X',
                    group: 'selectedPoint',
                    suffix: 'px',
                    get: () => Math.round(point.handleOut.x),
                    set: (_, value) => {
                        shape.moveHandle(pointIndex, 'out', value, point.handleOut.y, false);
                        this.canvas.selection?.updateHandles();
                    }
                };
                schema.handleOutY = {
                    type: 'number',
                    label: 'Out Y',
                    group: 'selectedPoint',
                    suffix: 'px',
                    get: () => Math.round(point.handleOut.y),
                    set: (_, value) => {
                        shape.moveHandle(pointIndex, 'out', point.handleOut.x, value, false);
                        this.canvas.selection?.updateHandles();
                    }
                };
            }
        }

        return schema;
    }

    // Get properties common to all selected shapes with matching values
    getCommonSchema(shapes) {
        if (shapes.length === 0) return {};

        // Use base shape properties as starting point
        const baseSchema = BaseShapeProperties;
        const commonSchema = {};

        // Shape-specific property groups to exclude for mixed types
        const shapeSpecificGroups = ['rectangle', 'ellipse', 'star', 'text', 'polyline', 'line', 'path', 'perspective'];

        // Check if all shapes are the same type
        const types = new Set(shapes.map(s => s.type));
        const allSameType = types.size === 1;

        for (const [key, prop] of Object.entries(baseSchema)) {
            // Skip shape-specific properties if types differ
            if (!allSameType && shapeSpecificGroups.includes(prop.group)) {
                continue;
            }

            // Check if all shapes have the same value for this property
            const firstValue = this.getValue(key, prop, shapes[0]);
            const allSame = shapes.every(shape => {
                const value = this.getValue(key, prop, shape);
                return this.valuesEqual(firstValue, value);
            });

            if (allSame) {
                commonSchema[key] = prop;
            }
        }

        return commonSchema;
    }

    // Compare two values for equality (handles objects like gradients)
    valuesEqual(a, b) {
        if (a === b) return true;
        if (typeof a !== typeof b) return false;
        if (a === null || b === null) return a === b;
        if (typeof a === 'object') {
            return JSON.stringify(a) === JSON.stringify(b);
        }
        return false;
    }

    // Render schema for multiple selected shapes
    renderMultiSelectSchema(schema, targets) {
        // Add header showing multi-selection
        const header = document.createElement('div');
        header.className = 'multi-select-header';
        header.textContent = `${targets.length} shapes selected`;
        this.container.appendChild(header);

        // Group and render common properties
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
            this.renderMultiSelectGroup(groupName, props, targets);
        }
    }

    // Render a group for multi-selection
    renderMultiSelectGroup(groupName, props, targets) {
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

        const content = document.createElement('div');
        content.className = 'section-content';

        for (const { key, prop } of props) {
            // Use first shape's value since all are the same
            const value = this.getValue(key, prop, targets[0]);
            const control = this.renderMultiSelectControl(key, prop, value, targets);
            if (control) {
                content.appendChild(control);
            }
        }

        section.appendChild(content);
        this.container.appendChild(section);
    }

    // Render control that applies to multiple shapes
    renderMultiSelectControl(key, prop, value, targets) {
        // Use standard control rendering but with multi-target setValue
        const control = this.renderControl(key, prop, value, targets[0]);
        if (!control) return null;

        // Re-wire the control to update all targets
        const controlData = this.controls.get(key);
        if (controlData) {
            controlData.targets = targets;
            controlData.isMultiSelect = true;
        }

        return control;
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
        // Render each transform property on its own row for better spacing
        const order = ['x', 'y', 'width', 'height', 'rotation', 'scaleX', 'scaleY', 'flipHorizontal', 'flipVertical'];

        for (const key of order) {
            const propData = props.find(p => p.key === key);
            if (propData && !propData.prop.hidden) {
                const value = this.getValue(propData.key, propData.prop, target);
                const row = this.renderControl(propData.key, propData.prop, value, target);
                if (row) {
                    section.appendChild(row);
                }
            }
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
        // Check if this is a multi-select control
        const controlData = this.controls.get(key);
        if (controlData && controlData.isMultiSelect && controlData.targets) {
            this.setValueMulti(key, prop, controlData.targets, value);
            return;
        }

        // Single target: Start micro-transaction for shape property changes
        if (window.historyManager && !historyManager.isInTransaction() && target.id && target.type) {
            historyManager.beginTransaction('property', target.id);
            // Auto-commit after input settles
            clearTimeout(this._propertyTransactionTimeout);
            this._propertyTransactionTimeout = setTimeout(() => {
                historyManager.endTransaction();
            }, 300);
        }

        if (prop.set) {
            prop.set(target, value);
        } else if (typeof target[`set${key.charAt(0).toUpperCase() + key.slice(1)}`] === 'function') {
            target[`set${key.charAt(0).toUpperCase() + key.slice(1)}`](value);
        } else {
            target[key] = value;
        }
    }

    // Apply value to multiple shapes
    setValueMulti(key, prop, targets, value) {
        const ids = targets.map(t => t.id).filter(Boolean);

        // Start multi-transaction for property changes
        if (window.historyManager && !historyManager.isInTransaction() && ids.length > 0) {
            if (ids.length === 1) {
                historyManager.beginTransaction('property', ids[0]);
            } else {
                historyManager.beginMultiTransaction('property', ids);
            }
            // Auto-commit after input settles
            clearTimeout(this._propertyTransactionTimeout);
            this._propertyTransactionTimeout = setTimeout(() => {
                if (ids.length === 1) {
                    historyManager.endTransaction();
                } else {
                    historyManager.endMultiTransaction();
                }
            }, 300);
        }

        // Apply to all targets
        for (const target of targets) {
            if (prop.set) {
                prop.set(target, value);
            } else if (typeof target[`set${key.charAt(0).toUpperCase() + key.slice(1)}`] === 'function') {
                target[`set${key.charAt(0).toUpperCase() + key.slice(1)}`](value);
            } else {
                target[key] = value;
            }
        }
    }

    renderControl(key, prop, value, target) {
        switch (prop.type) {
            case 'number':
                return this.renderNumberInput(key, prop, value, target);
            case 'color':
                return this.renderColorPicker(key, prop, value, target);
            case 'fill':
                return this.renderFillPicker(key, prop, value, target);
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

    renderFillPicker(key, prop, value, target) {
        const container = document.createElement('div');
        container.className = 'fill-picker';

        // Fill label
        const label = document.createElement('span');
        label.className = 'fill-label';
        label.textContent = 'Fill';
        container.appendChild(label);

        // Mode toggle: Solid | Linear | Radial | None
        const modeToggle = document.createElement('div');
        modeToggle.className = 'fill-mode-toggle';

        const modes = [
            { id: 'none', label: 'None' },
            { id: 'solid', label: 'Solid' },
            { id: 'linear', label: 'Linear' },
            { id: 'radial', label: 'Radial' }
        ];

        const currentMode = value.color === 'none' ? 'none' : value.type;

        modes.forEach(mode => {
            const btn = document.createElement('button');
            btn.className = 'fill-mode-btn' + (mode.id === currentMode ? ' active' : '');
            btn.textContent = mode.label;
            btn.dataset.mode = mode.id;
            btn.addEventListener('click', () => this.onFillModeChange(key, prop, target, mode.id, value));
            modeToggle.appendChild(btn);
        });

        container.appendChild(modeToggle);

        // Content area based on current mode
        const contentArea = document.createElement('div');
        contentArea.className = 'fill-picker-content';

        if (currentMode === 'none') {
            // No additional content needed
        } else if (currentMode === 'solid') {
            contentArea.appendChild(this.createSolidFillUI(key, prop, value.color, target));
        } else {
            // Gradient mode
            contentArea.appendChild(this.createGradientUI(key, prop, value.gradient, target, currentMode));
        }

        container.appendChild(contentArea);

        // Store reference for updates
        this.controls.set(key, {
            element: container,
            prop,
            target,
            isInput: false,
            fillData: value
        });

        return container;
    }

    onFillModeChange(key, prop, target, newMode, currentValue) {
        if (newMode === 'none') {
            prop.set(target, 'none');
        } else if (newMode === 'solid') {
            // Switch to solid - use first gradient stop color or default
            const color = currentValue.gradient
                ? currentValue.gradient.stops[0].color
                : (currentValue.color === 'none' ? '#cccccc' : currentValue.color);
            prop.set(target, color);
        } else {
            // Switch to gradient
            let gradient;
            if (currentValue.gradient && currentValue.gradient.type === newMode) {
                // Already has a gradient of the same type
                gradient = currentValue.gradient;
            } else if (currentValue.gradient) {
                // Convert existing gradient to new type
                gradient = currentValue.gradient.clone();
                gradient.type = newMode;
            } else {
                // Create new gradient
                gradient = new Gradient(newMode);
                const startColor = currentValue.color === 'none' ? '#cccccc' : currentValue.color;
                gradient.stops[0].color = startColor;
            }
            prop.set(target, gradient);
        }
        this.render();
    }

    createSolidFillUI(key, prop, color, target) {
        const wrapper = document.createElement('div');
        wrapper.className = 'solid-fill-ui';

        const input = document.createElement('input');
        input.type = 'color';
        input.value = color === 'none' ? '#cccccc' : color;
        input.className = 'fill-color-input';

        input.addEventListener('input', (e) => {
            prop.set(target, e.target.value);
        });

        wrapper.appendChild(input);
        return wrapper;
    }

    createGradientUI(key, prop, gradient, target, type) {
        const wrapper = document.createElement('div');
        wrapper.className = 'gradient-ui';

        // Ensure we have a gradient
        if (!gradient) {
            gradient = new Gradient(type);
            prop.set(target, gradient);
        }

        // Square gradient preview with stop markers
        const stopsContainer = document.createElement('div');
        stopsContainer.className = 'gradient-stops-container';

        const track = document.createElement('div');
        track.className = 'gradient-stops-track';
        track.style.background = gradient.toCSS();

        // Helper to position markers based on angle (linear) or radius (radial)
        const positionMarker = (marker, offset) => {
            if (type === 'linear') {
                // Convert angle to direction and position along that line
                const radians = ((gradient.angle - 90) * Math.PI) / 180;
                const t = offset / 100 - 0.5; // -0.5 to 0.5
                const x = 50 + t * Math.cos(radians) * 90;
                const y = 50 + t * Math.sin(radians) * 90;
                marker.style.left = `${x}%`;
                marker.style.top = `${y}%`;
            } else {
                // Radial: position from center outward
                const distance = (offset / 100) * 45; // 45% max radius
                marker.style.left = `${50 + distance}%`;
                marker.style.top = '50%';
            }
        };

        // Create markers for each stop
        const markers = [];
        gradient.stops.forEach((stop, index) => {
            const marker = this.createStopMarker(stop, index, gradient, prop, target, track, positionMarker);
            positionMarker(marker, stop.offset);
            markers.push(marker);
            track.appendChild(marker);
        });

        // Draw direction line for linear gradients
        if (type === 'linear') {
            const directionLine = document.createElement('div');
            directionLine.className = 'gradient-direction-line';
            const radians = ((gradient.angle - 90) * Math.PI) / 180;
            directionLine.style.transform = `rotate(${gradient.angle}deg)`;
            track.appendChild(directionLine);
        }

        // Click on track to add new stop
        track.addEventListener('click', (e) => {
            if (e.target === track || e.target.classList.contains('gradient-direction-line')) {
                const rect = track.getBoundingClientRect();
                const clickX = (e.clientX - rect.left) / rect.width;
                const clickY = (e.clientY - rect.top) / rect.height;

                let offset;
                if (type === 'linear') {
                    // Calculate offset based on projection onto angle line
                    const radians = ((gradient.angle - 90) * Math.PI) / 180;
                    const dx = clickX - 0.5;
                    const dy = clickY - 0.5;
                    const projection = dx * Math.cos(radians) + dy * Math.sin(radians);
                    offset = Math.round((projection / 0.9 + 0.5) * 100);
                } else {
                    // Radial: distance from center
                    const dx = clickX - 0.5;
                    const dy = clickY - 0.5;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    offset = Math.round((distance / 0.45) * 100);
                }

                offset = Math.max(0, Math.min(100, offset));
                const color = this.interpolateGradientColor(gradient, offset);
                gradient.addStop(offset, color);
                if (typeof gradientManager !== 'undefined') {
                    gradientManager.addOrUpdateGradient(gradient);
                }
                prop.set(target, gradient);
                this.render();
            }
        });

        stopsContainer.appendChild(track);
        wrapper.appendChild(stopsContainer);

        // Controls row
        const stopControls = document.createElement('div');
        stopControls.className = 'gradient-stop-controls';

        // Type-specific controls
        if (type === 'linear') {
            const angleRow = document.createElement('div');
            angleRow.className = 'gradient-angle-row';

            const angleLabel = document.createElement('span');
            angleLabel.textContent = 'Angle';
            angleLabel.className = 'gradient-angle-label';

            const angleInput = document.createElement('input');
            angleInput.type = 'number';
            angleInput.min = 0;
            angleInput.max = 360;
            angleInput.value = gradient.angle;
            angleInput.className = 'gradient-angle-input';

            angleInput.addEventListener('input', (e) => {
                gradient.angle = parseInt(e.target.value) || 0;
                if (typeof gradientManager !== 'undefined') {
                    gradientManager.addOrUpdateGradient(gradient);
                }
                prop.set(target, gradient);
                track.style.background = gradient.toCSS();

                // Update direction line rotation
                const dirLine = track.querySelector('.gradient-direction-line');
                if (dirLine) {
                    dirLine.style.transform = `rotate(${gradient.angle}deg)`;
                }

                // Reposition all markers
                markers.forEach((marker, i) => {
                    positionMarker(marker, gradient.stops[i].offset);
                });
            });

            const angleSuffix = document.createElement('span');
            angleSuffix.textContent = '°';
            angleSuffix.className = 'gradient-angle-suffix';

            angleRow.appendChild(angleLabel);
            angleRow.appendChild(angleInput);
            angleRow.appendChild(angleSuffix);
            stopControls.appendChild(angleRow);
        } else {
            // Radial gradient controls
            const radiusRow = document.createElement('div');
            radiusRow.className = 'gradient-radius-row';

            const radiusLabel = document.createElement('span');
            radiusLabel.textContent = 'Size';
            radiusLabel.className = 'gradient-radius-label';

            const radiusInput = document.createElement('input');
            radiusInput.type = 'range';
            radiusInput.min = 10;
            radiusInput.max = 100;
            radiusInput.value = gradient.r;
            radiusInput.className = 'gradient-radius-input';

            radiusInput.addEventListener('input', (e) => {
                gradient.r = parseInt(e.target.value);
                if (typeof gradientManager !== 'undefined') {
                    gradientManager.addOrUpdateGradient(gradient);
                }
                prop.set(target, gradient);
                track.style.background = gradient.toCSS();
            });

            radiusRow.appendChild(radiusLabel);
            radiusRow.appendChild(radiusInput);
            stopControls.appendChild(radiusRow);
        }

        wrapper.appendChild(stopControls);

        return wrapper;
    }

    createStopMarker(stop, index, gradient, prop, target, track, positionMarker) {
        const marker = document.createElement('div');
        marker.className = 'gradient-stop-marker';
        marker.style.backgroundColor = stop.color;
        marker.dataset.index = index;

        // Hidden color input for double-click editing
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = stop.color;
        colorInput.className = 'gradient-marker-color-input';
        marker.appendChild(colorInput);

        colorInput.addEventListener('input', (e) => {
            stop.color = e.target.value;
            marker.style.backgroundColor = stop.color;
            if (typeof gradientManager !== 'undefined') {
                gradientManager.addOrUpdateGradient(gradient);
            }
            track.style.background = gradient.toCSS();
            eventBus.emit('shape:updated', target);
        });

        colorInput.addEventListener('change', (e) => {
            prop.set(target, gradient);
        });

        // Dragging support
        let isDragging = false;

        marker.addEventListener('mousedown', (e) => {
            if (e.target === colorInput) return;
            e.stopPropagation();
            isDragging = true;
            marker.classList.add('dragging');

            const gradientType = gradient.type;

            const onMouseMove = (moveEvent) => {
                if (!isDragging) return;
                const rect = track.getBoundingClientRect();
                const moveX = (moveEvent.clientX - rect.left) / rect.width;
                const moveY = (moveEvent.clientY - rect.top) / rect.height;

                let offset;
                if (gradientType === 'linear') {
                    // Project mouse position onto angle line
                    const radians = ((gradient.angle - 90) * Math.PI) / 180;
                    const dx = moveX - 0.5;
                    const dy = moveY - 0.5;
                    const projection = dx * Math.cos(radians) + dy * Math.sin(radians);
                    offset = Math.round((projection / 0.9 + 0.5) * 100);
                } else {
                    // Radial: distance from center
                    const dx = moveX - 0.5;
                    const dy = moveY - 0.5;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    offset = Math.round((distance / 0.45) * 100);
                }

                offset = Math.max(0, Math.min(100, offset));
                gradient.stops[index].offset = offset;
                positionMarker(marker, offset);

                if (typeof gradientManager !== 'undefined') {
                    gradientManager.addOrUpdateGradient(gradient);
                }
                track.style.background = gradient.toCSS();
                eventBus.emit('shape:updated', target);
            };

            const onMouseUp = () => {
                isDragging = false;
                marker.classList.remove('dragging');
                // Re-sort stops
                gradient.stops.sort((a, b) => a.offset - b.offset);
                prop.set(target, gradient);
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        // Double-click to edit color
        marker.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            colorInput.click();
        });

        // Right-click to remove (if more than 2 stops)
        marker.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (gradient.stops.length > 2) {
                gradient.removeStop(index);
                if (typeof gradientManager !== 'undefined') {
                    gradientManager.addOrUpdateGradient(gradient);
                }
                prop.set(target, gradient);
                this.render();
            }
        });

        return marker;
    }

    interpolateGradientColor(gradient, offset) {
        const stops = gradient.stops;
        if (stops.length === 0) return '#000000';
        if (stops.length === 1) return stops[0].color;

        // Find surrounding stops
        let before = stops[0];
        let after = stops[stops.length - 1];

        for (let i = 0; i < stops.length - 1; i++) {
            if (stops[i].offset <= offset && stops[i + 1].offset >= offset) {
                before = stops[i];
                after = stops[i + 1];
                break;
            }
        }

        if (before.offset === after.offset) return before.color;

        // Linear interpolation
        const t = (offset - before.offset) / (after.offset - before.offset);
        return this.lerpColor(before.color, after.color, t);
    }

    lerpColor(color1, color2, t) {
        const hex = (c) => parseInt(c.slice(1), 16);
        const r = (h) => (h >> 16) & 255;
        const g = (h) => (h >> 8) & 255;
        const b = (h) => h & 255;

        const h1 = hex(color1);
        const h2 = hex(color2);

        const rr = Math.round(r(h1) + t * (r(h2) - r(h1)));
        const gg = Math.round(g(h1) + t * (g(h2) - g(h1)));
        const bb = Math.round(b(h1) + t * (b(h2) - b(h1)));

        return `#${((1 << 24) + (rr << 16) + (gg << 8) + bb).toString(16).slice(1)}`;
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
