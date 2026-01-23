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
        this.fillGradient = null; // Gradient instance when fill is a gradient
        this.strokeWidth = 2;
        this.opacity = 100;
        this.strokeDash = 'solid';
        this.strokeLinecap = 'butt';
        this.strokeLinejoin = 'miter';
        this.element = null;
        this.visible = true;
        this.rotation = 0;
        this.scaleX = 1;
        this.scaleY = 1;
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

    setFill(value) {
        if (value instanceof Gradient) {
            this.fillGradient = value;
            this.fill = `url(#${value.id})`;
            // Add gradient to defs
            if (typeof gradientManager !== 'undefined') {
                gradientManager.addOrUpdateGradient(value);
            }
        } else {
            // Remove old gradient if switching to solid color
            if (this.fillGradient && typeof gradientManager !== 'undefined') {
                gradientManager.removeGradient(this.fillGradient.id);
            }
            this.fillGradient = null;
            this.fill = value;
        }
        if (this.element) {
            this.element.setAttribute('fill', this.fill);
        }
        eventBus.emit('shape:updated', this);
    }

    getFillType() {
        if (this.fillGradient) {
            return this.fillGradient.type; // 'linear' or 'radial'
        }
        return 'solid';
    }

    getFillColor() {
        if (this.fillGradient) {
            return this.fillGradient.stops[0].color;
        }
        return this.fill;
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

    setRotation(degrees) {
        this.rotation = ((degrees % 360) + 360) % 360; // Normalize to 0-360
        if (this.element) {
            this.applyRotationTransform(this.element);
        }
        eventBus.emit('shape:updated', this);
    }

    applyRotationTransform(element) {
        const bounds = this.getBounds();
        const cx = bounds.x + bounds.width / 2;
        const cy = bounds.y + bounds.height / 2;

        const transforms = [];

        // Apply scale (flip) first
        if (this.scaleX !== 1 || this.scaleY !== 1) {
            transforms.push(`translate(${cx}, ${cy})`);
            transforms.push(`scale(${this.scaleX}, ${this.scaleY})`);
            transforms.push(`translate(${-cx}, ${-cy})`);
        }

        // Then apply rotation
        if (this.rotation !== 0) {
            transforms.push(`rotate(${this.rotation}, ${cx}, ${cy})`);
        }

        if (transforms.length > 0) {
            element.setAttribute('transform', transforms.join(' '));
        } else {
            element.removeAttribute('transform');
        }
    }

    flipHorizontal() {
        // Toggle horizontal scale (flip around Y-axis)
        this.scaleX = -this.scaleX;
        if (this.element) {
            this.applyRotationTransform(this.element);
        }
        eventBus.emit('shape:updated', this);
    }

    flipVertical() {
        // Toggle vertical scale (flip around X-axis)
        this.scaleY = -this.scaleY;
        if (this.element) {
            this.applyRotationTransform(this.element);
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
        element.setAttribute('stroke-width', this.strokeWidth);
        element.setAttribute('stroke-linecap', this.strokeLinecap);
        element.setAttribute('stroke-linejoin', this.strokeLinejoin);
        if (this.opacity < 100) {
            element.setAttribute('opacity', this.opacity / 100);
        }
        this.applyStrokeDash(element);
        element.dataset.shapeId = this.id;

        // Handle fill with gradient support
        if (this.fillGradient && typeof gradientManager !== 'undefined') {
            gradientManager.addOrUpdateGradient(this.fillGradient);
        }
        element.setAttribute('fill', this.fill);

        // Apply rotation transform
        this.applyRotationTransform(element);
    }

    clone() {
        throw new Error('Must implement clone');
    }

    copyAttributesTo(shape) {
        shape.stroke = this.stroke;
        shape.strokeWidth = this.strokeWidth;
        shape.opacity = this.opacity;
        shape.strokeDash = this.strokeDash;
        shape.strokeLinecap = this.strokeLinecap;
        shape.strokeLinejoin = this.strokeLinejoin;
        shape.visible = this.visible;
        shape.rotation = this.rotation;
        shape.scaleX = this.scaleX;
        shape.scaleY = this.scaleY;

        // Handle fill with gradient support
        if (this.fillGradient) {
            const gradientCopy = this.fillGradient.clone();
            shape.fillGradient = gradientCopy;
            shape.fill = `url(#${gradientCopy.id})`;
            // Add cloned gradient to defs
            if (typeof gradientManager !== 'undefined') {
                gradientManager.addOrUpdateGradient(gradientCopy);
            }
        } else {
            shape.fill = this.fill;
            shape.fillGradient = null;
        }
    }
}
