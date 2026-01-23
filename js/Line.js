class Line extends Shape {
    static get properties() {
        const baseProps = Shape.properties;
        return {
            ...baseProps,
            // Hide width/height for lines (point-based)
            width: { ...baseProps.width, hidden: true },
            height: { ...baseProps.height, hidden: true },

            // Line-specific properties
            length: {
                type: 'number',
                label: 'Length',
                group: 'line',
                suffix: 'px',
                readonly: true,
                get: (shape) => {
                    const dx = shape.x2 - shape.x1;
                    const dy = shape.y2 - shape.y1;
                    return Math.round(Math.sqrt(dx * dx + dy * dy));
                }
            },
            angle: {
                type: 'number',
                label: 'Angle',
                group: 'line',
                suffix: '°',
                readonly: true,
                get: (shape) => {
                    const dx = shape.x2 - shape.x1;
                    const dy = shape.y2 - shape.y1;
                    return Math.round(Math.atan2(dy, dx) * 180 / Math.PI);
                }
            },
        };
    }

    constructor(x1 = 0, y1 = 0, x2 = 100, y2 = 100) {
        super('line');
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
    }

    createSVGElement() {
        const el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        el.setAttribute('id', this.id);
        el.setAttribute('x1', this.x1);
        el.setAttribute('y1', this.y1);
        el.setAttribute('x2', this.x2);
        el.setAttribute('y2', this.y2);
        this.applyAttributes(el);
        this.element = el;
        return el;
    }

    updateElement() {
        if (this.element) {
            this.element.setAttribute('x1', this.x1);
            this.element.setAttribute('y1', this.y1);
            this.element.setAttribute('x2', this.x2);
            this.element.setAttribute('y2', this.y2);
            this.applyRotationTransform(this.element);
        }
    }

    move(dx, dy) {
        this.x1 += dx;
        this.y1 += dy;
        this.x2 += dx;
        this.y2 += dy;
        this.updateElement();
        eventBus.emit('shape:updated', this);
    }

    moveTo(x, y) {
        const bounds = this.getBounds();
        const dx = x - bounds.x;
        const dy = y - bounds.y;
        this.move(dx, dy);
    }

    movePoint(index, x, y) {
        if (index === 0) {
            this.x1 = x;
            this.y1 = y;
        } else {
            this.x2 = x;
            this.y2 = y;
        }
        this.updateElement();
        eventBus.emit('shape:updated', this);
    }

    getBounds() {
        const minX = Math.min(this.x1, this.x2);
        const minY = Math.min(this.y1, this.y2);
        const maxX = Math.max(this.x1, this.x2);
        const maxY = Math.max(this.y1, this.y2);
        return {
            x: minX,
            y: minY,
            width: maxX - minX || 1,
            height: maxY - minY || 1
        };
    }

    clone(offset = 10) {
        const copy = new Line(this.x1 + offset, this.y1 + offset, this.x2 + offset, this.y2 + offset);
        this.copyAttributesTo(copy);
        return copy;
    }

    flipHorizontal() {
        const bounds = this.getBounds();
        const centerX = bounds.x + bounds.width / 2;
        this.x1 = centerX + (centerX - this.x1);
        this.x2 = centerX + (centerX - this.x2);
        this.updateElement();
        eventBus.emit('shape:updated', this);
    }

    flipVertical() {
        const bounds = this.getBounds();
        const centerY = bounds.y + bounds.height / 2;
        this.y1 = centerY + (centerY - this.y1);
        this.y2 = centerY + (centerY - this.y2);
        this.updateElement();
        eventBus.emit('shape:updated', this);
    }
}
