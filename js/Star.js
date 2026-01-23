class Star extends Shape {
    static get properties() {
        return {
            ...Shape.properties,
            // Star-specific properties
            points: {
                type: 'number',
                label: 'Points',
                group: 'star',
                min: 3,
                max: 20,
                step: 1,
                get: (shape) => shape.points,
                set: (shape, value) => {
                    shape.points = value;
                    shape.updateElement();
                    eventBus.emit('shape:updated', shape);
                }
            },
            innerRadius: {
                type: 'range',
                label: 'Inner Radius',
                group: 'star',
                min: 10,
                max: 90,
                suffix: '%',
                get: (shape) => Math.round((shape.innerRadius / shape.outerRadius) * 100),
                set: (shape, value) => {
                    shape.innerRadius = shape.outerRadius * (value / 100);
                    shape.updateElement();
                    eventBus.emit('shape:updated', shape);
                }
            },
        };
    }

    constructor(cx = 0, cy = 0, outerRadius = 50, innerRadius = 25, points = 5) {
        super('star');
        this.cx = cx;
        this.cy = cy;
        this.outerRadius = outerRadius;
        this.innerRadius = innerRadius;
        this.points = points;
    }

    createSVGElement() {
        const el = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        el.setAttribute('id', this.id);
        el.setAttribute('points', this.getPointsString());
        this.applyAttributes(el);
        this.element = el;
        return el;
    }

    getPointsString() {
        const points = [];
        const angleStep = Math.PI / this.points;

        for (let i = 0; i < this.points * 2; i++) {
            const radius = i % 2 === 0 ? this.outerRadius : this.innerRadius;
            const angle = i * angleStep - Math.PI / 2;
            const x = this.cx + radius * Math.cos(angle);
            const y = this.cy + radius * Math.sin(angle);
            points.push(`${x},${y}`);
        }

        return points.join(' ');
    }

    updateElement() {
        if (this.element) {
            this.element.setAttribute('points', this.getPointsString());
            this.applyRotationTransform(this.element);
        }
    }

    move(dx, dy) {
        this.cx += dx;
        this.cy += dy;
        this.updateElement();
        eventBus.emit('shape:updated', this);
    }

    moveTo(x, y) {
        this.cx = x + this.outerRadius;
        this.cy = y + this.outerRadius;
        this.updateElement();
        eventBus.emit('shape:updated', this);
    }

    resize(newX, newY, newWidth, newHeight) {
        const size = Math.min(newWidth, newHeight);
        this.outerRadius = Math.max(1, size / 2);
        this.innerRadius = this.outerRadius * 0.5;
        this.cx = newX + this.outerRadius;
        this.cy = newY + this.outerRadius;
        this.updateElement();
        eventBus.emit('shape:updated', this);
    }

    getBounds() {
        return {
            x: this.cx - this.outerRadius,
            y: this.cy - this.outerRadius,
            width: this.outerRadius * 2,
            height: this.outerRadius * 2
        };
    }

    clone(offset = 10) {
        const copy = new Star(this.cx + offset, this.cy + offset, this.outerRadius, this.innerRadius, this.points);
        this.copyAttributesTo(copy);
        return copy;
    }
}
