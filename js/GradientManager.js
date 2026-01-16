class GradientManager {
    constructor() {
        this.svg = null;
        this.defs = null;
        this.gradients = new Map(); // gradientId -> SVG element
    }

    init(svg) {
        this.svg = svg;
        this.defs = svg.querySelector('defs');
        if (!this.defs) {
            this.defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            // Insert as first child of SVG
            svg.insertBefore(this.defs, svg.firstChild);
        }
    }

    addOrUpdateGradient(gradient) {
        if (!this.defs) return;

        // Remove existing gradient with same ID
        const existing = this.gradients.get(gradient.id);
        if (existing) {
            existing.remove();
        }

        // Create new gradient element
        const element = gradient.toSVGElement();
        this.defs.appendChild(element);
        this.gradients.set(gradient.id, element);
    }

    removeGradient(gradientId) {
        const element = this.gradients.get(gradientId);
        if (element) {
            element.remove();
            this.gradients.delete(gradientId);
        }
    }

    hasGradient(gradientId) {
        return this.gradients.has(gradientId);
    }

    getGradientElement(gradientId) {
        return this.gradients.get(gradientId);
    }

    clear() {
        // Remove all gradients from defs
        this.gradients.forEach(element => element.remove());
        this.gradients.clear();
    }

    // Returns list of gradient IDs currently in use
    getUsedGradientIds() {
        if (!this.svg) return new Set();

        const usedIds = new Set();
        this.svg.querySelectorAll('[fill^="url(#"]').forEach(el => {
            const fill = el.getAttribute('fill');
            const match = fill.match(/url\(#([^)]+)\)/);
            if (match) usedIds.add(match[1]);
        });
        this.svg.querySelectorAll('[stroke^="url(#"]').forEach(el => {
            const stroke = el.getAttribute('stroke');
            const match = stroke.match(/url\(#([^)]+)\)/);
            if (match) usedIds.add(match[1]);
        });
        return usedIds;
    }

    // Remove gradients not referenced by any shape
    cleanupUnused() {
        const usedIds = this.getUsedGradientIds();
        const toRemove = [];

        this.gradients.forEach((element, id) => {
            if (!usedIds.has(id)) {
                toRemove.push(id);
            }
        });

        toRemove.forEach(id => this.removeGradient(id));
        return toRemove.length;
    }
}

// Global instance
window.gradientManager = new GradientManager();
