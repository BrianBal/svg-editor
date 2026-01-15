class Shape {
    static idCounter = 0;

    // Base properties - used by PropertiesPanel for schema-driven UI
    // Subclasses can override with their own static properties
    static get properties() {
        return typeof BaseShapeProperties !== 'undefined' ? BaseShapeProperties : {};
    }

    static resetIdCounter() {
        Shape.idCounter = 0;
    }

    constructor(type) {
        this.id = `shape-${++Shape.idCounter}`;
        this.type = type;
        this.stroke = '#000000';
        this.fill = 'none';
        this.strokeWidth = 2;
        this.opacity = 100;
        this.strokeDash = 'solid';
        this.strokeLinecap = 'butt';
        this.strokeLinejoin = 'miter';
        this.element = null;
        this.visible = true;
    }

    createSVGElement() {
        throw new Error('Must implement createSVGElement');
    }

    updateElement() {
        throw new Error('Must implement updateElement');
    }

    getBounds() {
        throw new Error('Must implement getBounds');
    }

    setStroke(color) {
        this.stroke = color;
        if (this.element) {
            this.element.setAttribute('stroke', color);
        }
        eventBus.emit('shape:updated', this);
    }

    setFill(color) {
        this.fill = color;
        if (this.element) {
            this.element.setAttribute('fill', color);
        }
        eventBus.emit('shape:updated', this);
    }

    setStrokeWidth(width) {
        this.strokeWidth = width;
        if (this.element) {
            this.element.setAttribute('stroke-width', width);
        }
        eventBus.emit('shape:updated', this);
    }

    setOpacity(value) {
        this.opacity = value;
        if (this.element) {
            this.element.setAttribute('opacity', value / 100);
        }
        eventBus.emit('shape:updated', this);
    }

    setStrokeDash(style) {
        this.strokeDash = style;
        if (this.element) {
            this.applyStrokeDash(this.element);
        }
        eventBus.emit('shape:updated', this);
    }

    setStrokeLinecap(value) {
        this.strokeLinecap = value;
        if (this.element) {
            this.element.setAttribute('stroke-linecap', value);
        }
        eventBus.emit('shape:updated', this);
    }

    setStrokeLinejoin(value) {
        this.strokeLinejoin = value;
        if (this.element) {
            this.element.setAttribute('stroke-linejoin', value);
        }
        eventBus.emit('shape:updated', this);
    }

    applyStrokeDash(element) {
        switch (this.strokeDash) {
            case 'dashed':
                element.setAttribute('stroke-dasharray', `${this.strokeWidth * 4} ${this.strokeWidth * 2}`);
                break;
            case 'dotted':
                element.setAttribute('stroke-dasharray', `${this.strokeWidth} ${this.strokeWidth * 2}`);
                break;
            default:
                element.removeAttribute('stroke-dasharray');
        }
    }

    applyAttributes(element) {
        element.setAttribute('stroke', this.stroke);
        element.setAttribute('fill', this.fill);
        element.setAttribute('stroke-width', this.strokeWidth);
        element.setAttribute('stroke-linecap', this.strokeLinecap);
        element.setAttribute('stroke-linejoin', this.strokeLinejoin);
        if (this.opacity < 100) {
            element.setAttribute('opacity', this.opacity / 100);
        }
        this.applyStrokeDash(element);
        element.dataset.shapeId = this.id;
    }

    clone() {
        throw new Error('Must implement clone');
    }

    copyAttributesTo(shape) {
        shape.stroke = this.stroke;
        shape.fill = this.fill;
        shape.strokeWidth = this.strokeWidth;
        shape.opacity = this.opacity;
        shape.strokeDash = this.strokeDash;
        shape.strokeLinecap = this.strokeLinecap;
        shape.strokeLinejoin = this.strokeLinejoin;
        shape.visible = this.visible;
    }
}
