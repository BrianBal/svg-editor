class Polyline extends Shape {
    constructor(points = []) {
        super('polyline');
        this.points = points;
    }

    createSVGElement() {
        const el = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
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
            this.element.setAttribute('points', this.getPointsString());
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

    removePoint(index) {
        if (index >= 0 && index < this.points.length && this.points.length > 2) {
            this.points.splice(index, 1);
            this.updateElement();
            eventBus.emit('shape:updated', this);
            return true;
        }
        return false;
    }

    removeLastPoint() {
        if (this.points.length > 2) {
            this.points.pop();
            this.updateElement();
            eventBus.emit('shape:updated', this);
            return true;
        }
        return false;
    }

    addPointBetween(index) {
        if (index >= 0 && index < this.points.length - 1) {
            const p1 = this.points[index];
            const p2 = this.points[index + 1];
            const midpoint = {
                x: (p1.x + p2.x) / 2,
                y: (p1.y + p2.y) / 2
            };
            this.points.splice(index + 1, 0, midpoint);
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
        if (this.points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        this.points.forEach(p => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        });

        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }

    clone(offset = 10) {
        const offsetPoints = this.points.map(p => ({ x: p.x + offset, y: p.y + offset }));
        const copy = new Polyline(offsetPoints);
        this.copyAttributesTo(copy);
        return copy;
    }
}
