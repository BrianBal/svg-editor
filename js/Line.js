class Line extends Shape {
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
}
