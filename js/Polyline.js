class Polyline extends PointBasedShape {
    static get properties() {
        const baseProps = Shape.properties;
        return {
            ...baseProps,
            // Hide width/height for polylines (point-based only)
            width: { ...baseProps.width, hidden: true },
            height: { ...baseProps.height, hidden: true },

            // Polyline-specific properties
            pointCount: {
                type: 'number',
                label: 'Points',
                group: 'polyline',
                readonly: true,
                get: (shape) => shape.points.length
            },
            closed: {
                type: 'checkbox',
                label: 'Closed Path',
                group: 'polyline',
                get: (shape) => shape.closed,
                set: (shape, value) => shape.setClosed(value)
            },
        };
    }

    constructor(points = []) {
        super('polyline', points);
        this.closed = false;
    }

    createSVGElement() {
        // Use polygon for closed shapes, polyline for open shapes
        const elementType = this.closed ? 'polygon' : 'polyline';
        const el = document.createElementNS('http://www.w3.org/2000/svg', elementType);
        el.setAttribute('id', this.id);
        el.setAttribute('points', this.getPointsString());
        this.applyAttributes(el);
        this.element = el;
        return el;
    }

    getPointsString() {
        return this.points.map(p => `${p.x},${p.y}`).join(' ');
    }

    updateElement() {
        if (this.element) {
            // If closed state changed, need to recreate element (polyline vs polygon)
            const currentType = this.element.tagName.toLowerCase();
            const expectedType = this.closed ? 'polygon' : 'polyline';

            if (currentType !== expectedType) {
                // Recreate element with correct type
                const parent = this.element.parentNode;
                if (parent) {
                    const oldElement = this.element;
                    const newElement = this.createSVGElement();
                    // Insert new element before old one, then remove old
                    parent.insertBefore(newElement, oldElement);
                    oldElement.remove();
                } else {
                    // Element not in DOM yet, just recreate it
                    this.element = this.createSVGElement();
                }
            } else {
                this.element.setAttribute('points', this.getPointsString());
                this.applyTransform(this.element);
            }
        }
    }

    addPoint(x, y, index = null) {
        const point = { x, y };
        if (index !== null && index >= 0 && index <= this.points.length) {
            this.points.splice(index, 0, point);
        } else {
            this.points.push(point);
        }
        this.updateElement();
        eventBus.emit('shape:updated', this);
    }

    movePoint(index, x, y) {
        if (index >= 0 && index < this.points.length) {
            this.points[index] = { x, y };
            this.updateElement();
            eventBus.emit('shape:updated', this);
        }
    }

    move(dx, dy) {
        this.points.forEach(point => {
            point.x += dx;
            point.y += dy;
        });
        this.updateElement();
        eventBus.emit('shape:updated', this);
    }

    getBounds() {
        return this.getBoundsFromPoints(p => [p]);
    }

    clone(offset = 10) {
        const offsetPoints = this.points.map(p => ({ x: p.x + offset, y: p.y + offset }));
        const copy = new Polyline(offsetPoints);
        copy.closed = this.closed;
        this.copyAttributesTo(copy);
        return copy;
    }

    setClosed(closed) {
        if (this.closed !== closed) {
            this.closed = closed;
            this.updateElement();
            eventBus.emit('shape:updated', this);
        }
    }

    isNearFirstPoint(x, y, threshold = 15) {
        if (this.points.length === 0) return false;
        const first = this.points[0];
        const dx = x - first.x;
        const dy = y - first.y;
        return Math.sqrt(dx * dx + dy * dy) < threshold;
    }
}
