class Rectangle extends Shape {
    static get properties() {
        return {
            ...Shape.properties,
            // Rectangle-specific properties
            cornerRadius: {
                type: 'number',
                label: 'Corner Radius',
                group: 'rectangle',
                suffix: 'px',
                min: 0,
                get: (shape) => shape.rx || 0,
                set: (shape, value) => shape.setCornerRadius(value)
            },
        };
    }

    constructor(x = 0, y = 0, width = 100, height = 100) {
        super('rectangle');
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.rx = 0; // Corner radius
    }

    setCornerRadius(value) {
        this.rx = Math.max(0, value);
        this.updateElement();
        eventBus.emit('shape:updated', this);
    }

    createSVGElement() {
        const el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        el.setAttribute('id', this.id);
        el.setAttribute('x', this.x);
        el.setAttribute('y', this.y);
        el.setAttribute('width', this.width);
        el.setAttribute('height', this.height);
        if (this.rx > 0) {
            el.setAttribute('rx', this.rx);
            el.setAttribute('ry', this.rx);
        }
        this.applyAttributes(el);
        this.element = el;
        return el;
    }

    updateElement() {
        if (this.element) {
            this.element.setAttribute('x', this.x);
            this.element.setAttribute('y', this.y);
            this.element.setAttribute('width', this.width);
            this.element.setAttribute('height', this.height);
            if (this.rx > 0) {
                this.element.setAttribute('rx', this.rx);
                this.element.setAttribute('ry', this.rx);
            } else {
                this.element.removeAttribute('rx');
                this.element.removeAttribute('ry');
            }
            this.applyTransform(this.element);
        }
    }

    move(dx, dy) {
        this.x += dx;
        this.y += dy;
        this.updateElement();
        eventBus.emit('shape:updated', this);
    }

    moveTo(x, y) {
        this.x = x;
        this.y = y;
        this.updateElement();
        eventBus.emit('shape:updated', this);
    }

    resize(newX, newY, newWidth, newHeight) {
        this.x = newX;
        this.y = newY;
        this.width = Math.max(1, newWidth);
        this.height = Math.max(1, newHeight);
        this.updateElement();
        eventBus.emit('shape:updated', this);
    }

    getBounds() {
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }

    clone(offset = 10) {
        const copy = new Rectangle(this.x + offset, this.y + offset, this.width, this.height);
        copy.rx = this.rx;
        this.copyAttributesTo(copy);
        return copy;
    }
}
