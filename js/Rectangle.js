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
            // Tilt/Trapezoid properties
            tiltTop: {
                type: 'range',
                label: 'Tilt Top',
                group: 'perspective',
                suffix: '%',
                min: 0,
                max: 100,
                get: (shape) => shape.tiltTop || 0,
                set: (shape, value) => shape.setTiltTop(value)
            },
            tiltBottom: {
                type: 'range',
                label: 'Tilt Bottom',
                group: 'perspective',
                suffix: '%',
                min: 0,
                max: 100,
                get: (shape) => shape.tiltBottom || 0,
                set: (shape, value) => shape.setTiltBottom(value)
            },
            tiltLeft: {
                type: 'range',
                label: 'Tilt Left',
                group: 'perspective',
                suffix: '%',
                min: 0,
                max: 100,
                get: (shape) => shape.tiltLeft || 0,
                set: (shape, value) => shape.setTiltLeft(value)
            },
            tiltRight: {
                type: 'range',
                label: 'Tilt Right',
                group: 'perspective',
                suffix: '%',
                min: 0,
                max: 100,
                get: (shape) => shape.tiltRight || 0,
                set: (shape, value) => shape.setTiltRight(value)
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
        this.tiltTop = 0; // 0-100% - percentage of width to tilt top edge inward
        this.tiltBottom = 0; // 0-100%
        this.tiltLeft = 0; // 0-100% - percentage of height to tilt left edge inward
        this.tiltRight = 0; // 0-100%
    }

    setCornerRadius(value) {
        this.rx = Math.max(0, value);
        this.updateElement();
        eventBus.emit('shape:updated', this);
    }

    setTiltTop(value) {
        this.tiltTop = Math.max(0, Math.min(100, value));
        this.updateElement();
        eventBus.emit('shape:updated', this);
    }

    setTiltBottom(value) {
        this.tiltBottom = Math.max(0, Math.min(100, value));
        this.updateElement();
        eventBus.emit('shape:updated', this);
    }

    setTiltLeft(value) {
        this.tiltLeft = Math.max(0, Math.min(100, value));
        this.updateElement();
        eventBus.emit('shape:updated', this);
    }

    setTiltRight(value) {
        this.tiltRight = Math.max(0, Math.min(100, value));
        this.updateElement();
        eventBus.emit('shape:updated', this);
    }

    // Check if any tilt is applied
    hasTilt() {
        return this.tiltTop > 0 || this.tiltBottom > 0 || this.tiltLeft > 0 || this.tiltRight > 0;
    }

    // Calculate corner points for tilted rectangle
    getTiltedPoints() {
        // Calculate tilt offsets
        const topInset = (this.tiltTop / 100) * this.width / 2;
        const bottomInset = (this.tiltBottom / 100) * this.width / 2;
        const leftInset = (this.tiltLeft / 100) * this.height / 2;
        const rightInset = (this.tiltRight / 100) * this.height / 2;

        // Four corners with tilt applied
        const points = [
            { x: this.x + topInset, y: this.y + leftInset }, // Top-left
            { x: this.x + this.width - topInset, y: this.y + rightInset }, // Top-right
            { x: this.x + this.width - bottomInset, y: this.y + this.height - rightInset }, // Bottom-right
            { x: this.x + bottomInset, y: this.y + this.height - leftInset } // Bottom-left
        ];

        return points;
    }

    createSVGElement() {
        let el;

        if (this.hasTilt()) {
            // Use polygon for tilted rectangles
            el = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            el.setAttribute('id', this.id);
            const points = this.getTiltedPoints();
            const pointsStr = points.map(p => `${p.x},${p.y}`).join(' ');
            el.setAttribute('points', pointsStr);

            // Add data attributes to preserve rectangle identity and tilt values
            el.setAttribute('data-is-rectangle', 'true');
            el.setAttribute('data-rect-x', this.x);
            el.setAttribute('data-rect-y', this.y);
            el.setAttribute('data-rect-width', this.width);
            el.setAttribute('data-rect-height', this.height);
            el.setAttribute('data-tilt-top', this.tiltTop);
            el.setAttribute('data-tilt-bottom', this.tiltBottom);
            el.setAttribute('data-tilt-left', this.tiltLeft);
            el.setAttribute('data-tilt-right', this.tiltRight);
            if (this.rx > 0) {
                el.setAttribute('data-corner-radius', this.rx);
            }
        } else {
            // Use rect for normal rectangles
            el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            el.setAttribute('id', this.id);
            el.setAttribute('x', this.x);
            el.setAttribute('y', this.y);
            el.setAttribute('width', this.width);
            el.setAttribute('height', this.height);
            if (this.rx > 0) {
                el.setAttribute('rx', this.rx);
                el.setAttribute('ry', this.rx);
            }
        }

        this.applyAttributes(el);
        this.element = el;
        return el;
    }

    updateElement() {
        if (!this.element) return;

        const needsPolygon = this.hasTilt();
        const isPolygon = this.element.tagName === 'polygon';

        // If tilt state changed, recreate element
        if (needsPolygon !== isPolygon) {
            const parent = this.element.parentNode;
            const oldElement = this.element; // Store reference before createSVGElement() reassigns this.element
            const newEl = this.createSVGElement();
            if (parent) {
                parent.replaceChild(newEl, oldElement);
            }
            return;
        }

        // Update existing element
        if (isPolygon) {
            const points = this.getTiltedPoints();
            const pointsStr = points.map(p => `${p.x},${p.y}`).join(' ');
            this.element.setAttribute('points', pointsStr);

            // Update data attributes
            this.element.setAttribute('data-rect-x', this.x);
            this.element.setAttribute('data-rect-y', this.y);
            this.element.setAttribute('data-rect-width', this.width);
            this.element.setAttribute('data-rect-height', this.height);
            this.element.setAttribute('data-tilt-top', this.tiltTop);
            this.element.setAttribute('data-tilt-bottom', this.tiltBottom);
            this.element.setAttribute('data-tilt-left', this.tiltLeft);
            this.element.setAttribute('data-tilt-right', this.tiltRight);
            if (this.rx > 0) {
                this.element.setAttribute('data-corner-radius', this.rx);
            } else {
                this.element.removeAttribute('data-corner-radius');
            }
        } else {
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
        }

        this.applyTransform(this.element);
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
        copy.tiltTop = this.tiltTop;
        copy.tiltBottom = this.tiltBottom;
        copy.tiltLeft = this.tiltLeft;
        copy.tiltRight = this.tiltRight;
        this.copyAttributesTo(copy);
        return copy;
    }
}
