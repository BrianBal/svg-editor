class Shape {
    static idCounter = 0;

    constructor(type) {
        this.id = `shape-${++Shape.idCounter}`;
        this.type = type;
        this.stroke = '#000000';
        this.fill = 'none';
        this.strokeWidth = 2;
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

    applyAttributes(element) {
        element.setAttribute('stroke', this.stroke);
        element.setAttribute('fill', this.fill);
        element.setAttribute('stroke-width', this.strokeWidth);
        element.dataset.shapeId = this.id;
    }

    clone() {
        throw new Error('Must implement clone');
    }

    copyAttributesTo(shape) {
        shape.stroke = this.stroke;
        shape.fill = this.fill;
        shape.strokeWidth = this.strokeWidth;
        shape.visible = this.visible;
    }
}
