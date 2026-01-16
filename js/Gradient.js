class Gradient {
    static idCounter = 0;

    static resetIdCounter() {
        Gradient.idCounter = 0;
    }

    constructor(type = 'linear') {
        this.id = `gradient-${++Gradient.idCounter}`;
        this.type = type; // 'linear' or 'radial'
        this.stops = [
            { offset: 0, color: '#000000' },
            { offset: 100, color: '#ffffff' }
        ];
        // Linear gradient properties
        this.angle = 0; // 0-360 degrees (0 = left to right)
        // Radial gradient properties
        this.cx = 50;   // center x (percentage)
        this.cy = 50;   // center y (percentage)
        this.r = 50;    // radius (percentage)
    }

    clone() {
        const copy = new Gradient(this.type);
        copy.stops = this.stops.map(s => ({ offset: s.offset, color: s.color }));
        copy.angle = this.angle;
        copy.cx = this.cx;
        copy.cy = this.cy;
        copy.r = this.r;
        return copy;
    }

    addStop(offset, color) {
        this.stops.push({ offset, color });
        this.stops.sort((a, b) => a.offset - b.offset);
    }

    removeStop(index) {
        if (this.stops.length > 2) {
            this.stops.splice(index, 1);
        }
    }

    updateStop(index, offset, color) {
        if (index >= 0 && index < this.stops.length) {
            if (offset !== undefined) this.stops[index].offset = offset;
            if (color !== undefined) this.stops[index].color = color;
            this.stops.sort((a, b) => a.offset - b.offset);
        }
    }

    toCSS() {
        const colorStops = this.stops
            .map(s => `${s.color} ${s.offset}%`)
            .join(', ');

        if (this.type === 'linear') {
            return `linear-gradient(${this.angle}deg, ${colorStops})`;
        } else {
            return `radial-gradient(circle at ${this.cx}% ${this.cy}%, ${colorStops})`;
        }
    }

    toSVGElement() {
        if (this.type === 'linear') {
            return this.createLinearGradientElement();
        } else {
            return this.createRadialGradientElement();
        }
    }

    createLinearGradientElement() {
        const el = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        el.setAttribute('id', this.id);

        // Convert angle to x1,y1,x2,y2 coordinates
        // SVG linear gradients use coordinates, not angles
        // angle 0 = left to right, 90 = top to bottom, etc.
        const radians = ((this.angle - 90) * Math.PI) / 180;
        const x1 = 50 - 50 * Math.cos(radians);
        const y1 = 50 - 50 * Math.sin(radians);
        const x2 = 50 + 50 * Math.cos(radians);
        const y2 = 50 + 50 * Math.sin(radians);

        el.setAttribute('x1', `${x1}%`);
        el.setAttribute('y1', `${y1}%`);
        el.setAttribute('x2', `${x2}%`);
        el.setAttribute('y2', `${y2}%`);

        this.appendStops(el);
        return el;
    }

    createRadialGradientElement() {
        const el = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
        el.setAttribute('id', this.id);
        el.setAttribute('cx', `${this.cx}%`);
        el.setAttribute('cy', `${this.cy}%`);
        el.setAttribute('r', `${this.r}%`);

        this.appendStops(el);
        return el;
    }

    appendStops(element) {
        this.stops.forEach(stop => {
            const stopEl = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            stopEl.setAttribute('offset', `${stop.offset}%`);
            stopEl.setAttribute('stop-color', stop.color);
            element.appendChild(stopEl);
        });
    }

    static fromSVGElement(element) {
        const isLinear = element.tagName === 'linearGradient';
        const gradient = new Gradient(isLinear ? 'linear' : 'radial');

        // Preserve the original ID
        gradient.id = element.getAttribute('id');

        if (isLinear) {
            // Parse linear gradient coordinates and convert to angle
            const x1 = parseFloat(element.getAttribute('x1')) || 0;
            const y1 = parseFloat(element.getAttribute('y1')) || 0;
            const x2 = parseFloat(element.getAttribute('x2')) || 100;
            const y2 = parseFloat(element.getAttribute('y2')) || 0;

            // Calculate angle from coordinates
            const dx = x2 - x1;
            const dy = y2 - y1;
            let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
            if (angle < 0) angle += 360;
            gradient.angle = Math.round(angle) % 360;
        } else {
            // Parse radial gradient properties
            gradient.cx = parseFloat(element.getAttribute('cx')) || 50;
            gradient.cy = parseFloat(element.getAttribute('cy')) || 50;
            gradient.r = parseFloat(element.getAttribute('r')) || 50;
        }

        // Parse color stops
        const stops = element.querySelectorAll('stop');
        gradient.stops = Array.from(stops).map(stop => ({
            offset: parseFloat(stop.getAttribute('offset')) || 0,
            color: stop.getAttribute('stop-color') || '#000000'
        }));

        // Ensure at least 2 stops
        if (gradient.stops.length < 2) {
            gradient.stops = [
                { offset: 0, color: '#000000' },
                { offset: 100, color: '#ffffff' }
            ];
        }

        return gradient;
    }

    serialize() {
        return {
            id: this.id,
            type: this.type,
            stops: this.stops.map(s => ({ offset: s.offset, color: s.color })),
            angle: this.angle,
            cx: this.cx,
            cy: this.cy,
            r: this.r
        };
    }

    static deserialize(data) {
        const gradient = new Gradient(data.type);
        gradient.id = data.id;
        gradient.stops = data.stops.map(s => ({ offset: s.offset, color: s.color }));
        gradient.angle = data.angle;
        gradient.cx = data.cx;
        gradient.cy = data.cy;
        gradient.r = data.r;
        return gradient;
    }
}
