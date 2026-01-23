class TextShape extends Shape {
    static get properties() {
        return {
            ...Shape.properties,
            // Text-specific properties
            text: {
                type: 'textarea',
                label: 'Content',
                group: 'text',
                rows: 3,
                get: (shape) => shape.text,
                set: (shape, value) => shape.setText(value)
            },
            fontFamily: {
                type: 'select',
                label: 'Font',
                group: 'text',
                options: [
                    { value: 'Arial', label: 'Arial' },
                    { value: 'Helvetica', label: 'Helvetica' },
                    { value: 'Georgia', label: 'Georgia' },
                    { value: 'Times New Roman', label: 'Times' },
                    { value: 'Courier New', label: 'Courier' },
                    { value: 'Verdana', label: 'Verdana' },
                ],
                get: (shape) => shape.fontFamily,
                set: (shape, value) => shape.setFontFamily(value)
            },
            fontSize: {
                type: 'number',
                label: 'Size',
                group: 'text',
                suffix: 'px',
                min: 8,
                max: 200,
                get: (shape) => shape.fontSize,
                set: (shape, value) => shape.setFontSize(value)
            },
        };
    }

    constructor(x = 0, y = 0, text = 'Text', fontSize = 24, fontFamily = 'Arial') {
        super('text');
        this.x = x;
        this.y = y;
        this.text = text;
        this.fontSize = fontSize;
        this.fontFamily = fontFamily;
    }

    createSVGElement() {
        const el = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        el.setAttribute('id', this.id);
        el.setAttribute('x', this.x);
        el.setAttribute('y', this.y);
        el.setAttribute('font-size', this.fontSize);
        el.setAttribute('font-family', this.fontFamily);
        el.textContent = this.text;
        this.applyAttributes(el);
        this.element = el;
        return el;
    }

    updateElement() {
        if (this.element) {
            this.element.setAttribute('x', this.x);
            this.element.setAttribute('y', this.y);
            this.element.setAttribute('font-size', this.fontSize);
            this.element.setAttribute('font-family', this.fontFamily);
            this.element.textContent = this.text;
            this.applyRotationTransform(this.element);
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
        this.y = y + this.fontSize;
        this.updateElement();
        eventBus.emit('shape:updated', this);
    }

    setText(text) {
        this.text = text;
        this.updateElement();
        eventBus.emit('shape:updated', this);
    }

    setFontSize(size) {
        this.fontSize = size;
        this.updateElement();
        eventBus.emit('shape:updated', this);
    }

    setFontFamily(family) {
        this.fontFamily = family;
        this.updateElement();
        eventBus.emit('shape:updated', this);
    }

    getBounds() {
        if (this.element) {
            const bbox = this.element.getBBox();
            return {
                x: bbox.x,
                y: bbox.y,
                width: bbox.width || 50,
                height: bbox.height || this.fontSize
            };
        }
        // Estimate bounds when element doesn't exist yet
        return {
            x: this.x,
            y: this.y - this.fontSize,
            width: this.text.length * this.fontSize * 0.6,
            height: this.fontSize
        };
    }

    clone(offset = 10) {
        const copy = new TextShape(this.x + offset, this.y + offset, this.text, this.fontSize, this.fontFamily);
        this.copyAttributesTo(copy);
        return copy;
    }
}
