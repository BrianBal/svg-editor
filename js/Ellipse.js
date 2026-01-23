class Ellipse extends Shape {
    static get properties() {
        return {
            ...Shape.properties,
            // Ellipse-specific properties
            radiusX: {
                type: 'number',
                label: 'Radius X',
                group: 'ellipse',
                suffix: 'px',
                min: 1,
                get: (shape) => Math.round(shape.rx),
                set: (shape, value) => {
                    shape.rx = Math.max(1, value);
                    shape.updateElement();
                    eventBus.emit('shape:updated', shape);
                }
            },
            radiusY: {
                type: 'number',
                label: 'Radius Y',
                group: 'ellipse',
                suffix: 'px',
                min: 1,
                get: (shape) => Math.round(shape.ry),
                set: (shape, value) => {
                    shape.ry = Math.max(1, value);
                    shape.updateElement();
                    eventBus.emit('shape:updated', shape);
                }
            },
        };
    }

    constructor(cx = 0, cy = 0, rx = 50, ry = 50) {
        super('ellipse');
        this.cx = cx;
        this.cy = cy;
        this.rx = rx;
        this.ry = ry;
    }

    createSVGElement() {
        const el = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        el.setAttribute('id', this.id);
        el.setAttribute('cx', this.cx);
        el.setAttribute('cy', this.cy);
        el.setAttribute('rx', this.rx);
        el.setAttribute('ry', this.ry);
        this.applyAttributes(el);
        this.element = el;
        return el;
    }

    updateElement() {
        if (this.element) {
            this.element.setAttribute('cx', this.cx);
            this.element.setAttribute('cy', this.cy);
            this.element.setAttribute('rx', this.rx);
            this.element.setAttribute('ry', this.ry);
            this.applyTransform(this.element);
        }
    }

    move(dx, dy) {
        this.cx += dx;
        this.cy += dy;
        this.updateElement();
        eventBus.emit('shape:updated', this);
    }

    moveTo(x, y) {
        this.cx = x + this.rx;
        this.cy = y + this.ry;
        this.updateElement();
        eventBus.emit('shape:updated', this);
    }

    resize(newX, newY, newWidth, newHeight) {
        this.rx = Math.max(1, newWidth / 2);
        this.ry = Math.max(1, newHeight / 2);
        this.cx = newX + this.rx;
        this.cy = newY + this.ry;
        this.updateElement();
        eventBus.emit('shape:updated', this);
    }

    getBounds() {
        return {
            x: this.cx - this.rx,
            y: this.cy - this.ry,
            width: this.rx * 2,
            height: this.ry * 2
        };
    }

    clone(offset = 10) {
        const copy = new Ellipse(this.cx + offset, this.cy + offset, this.rx, this.ry);
        this.copyAttributesTo(copy);
        return copy;
    }
}
