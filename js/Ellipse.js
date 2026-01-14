class Ellipse extends Shape {
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
