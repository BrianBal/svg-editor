/**
 * PointBasedShape - Base class for shapes that are defined by an array of points.
 * Extended by Polyline and Path shapes.
 */
class PointBasedShape extends Shape {
    constructor(type, points = []) {
        super(type);
        this.points = points;
    }

    /**
     * Calculate bounding box from points.
     * @param {Function} getAllCoords - Optional function to extract all coordinates from a point
     *                                  (e.g., for Path, includes handleIn and handleOut)
     * @returns {{x: number, y: number, width: number, height: number}}
     */
    getBoundsFromPoints(getAllCoords) {
        if (this.points.length === 0) {
            return { x: 0, y: 0, width: 0, height: 0 };
        }

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        this.points.forEach(p => {
            const coords = getAllCoords ? getAllCoords(p) : [p];
            coords.forEach(c => {
                if (c) {
                    minX = Math.min(minX, c.x);
                    minY = Math.min(minY, c.y);
                    maxX = Math.max(maxX, c.x);
                    maxY = Math.max(maxY, c.y);
                }
            });
        });

        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }

    /**
     * Remove a point at the specified index.
     * Enforces minimum of 2 points.
     * @param {number} index
     * @returns {boolean} True if point was removed
     */
    removePoint(index) {
        if (index >= 0 && index < this.points.length && this.points.length > 2) {
            this.points.splice(index, 1);
            this.updateElement();
            eventBus.emit('shape:updated', this);
            return true;
        }
        return false;
    }

    /**
     * Remove the last point from the shape.
     * Enforces minimum of 2 points.
     * @returns {boolean} True if point was removed
     */
    removeLastPoint() {
        if (this.points.length > 2) {
            this.points.pop();
            this.updateElement();
            eventBus.emit('shape:updated', this);
            return true;
        }
        return false;
    }

    /**
     * Insert a midpoint between the point at index and the next point.
     * @param {number} index
     */
    addPointBetween(index) {
        if (index >= 0 && index < this.points.length - 1) {
            const p1 = this.points[index];
            const p2 = this.points[index + 1];
            const midpoint = this.createMidpoint(p1, p2);
            this.points.splice(index + 1, 0, midpoint);
            this.updateElement();
            eventBus.emit('shape:updated', this);
        }
    }

    /**
     * Create a midpoint between two points.
     * Override in subclasses for type-specific behavior.
     * @param {Object} p1
     * @param {Object} p2
     * @returns {Object}
     */
    createMidpoint(p1, p2) {
        return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    }

    /**
     * Get the number of points.
     * @returns {number}
     */
    getPointCount() {
        return this.points.length;
    }

    /**
     * Check if a point can be removed (minimum 2 points required).
     * @returns {boolean}
     */
    canRemovePoint() {
        return this.points.length > 2;
    }

    /**
     * Flip horizontally by mirroring point X coordinates around the center.
     */
    flipHorizontal() {
        const bounds = this.getBounds();
        const centerX = bounds.x + bounds.width / 2;

        this.points.forEach(p => {
            p.x = centerX + (centerX - p.x);
            // Also flip control handles for Path points
            if (p.handleIn) {
                p.handleIn.x = centerX + (centerX - p.handleIn.x);
            }
            if (p.handleOut) {
                p.handleOut.x = centerX + (centerX - p.handleOut.x);
            }
        });

        this.updateElement();
        eventBus.emit('shape:updated', this);
    }

    /**
     * Flip vertically by mirroring point Y coordinates around the center.
     */
    flipVertical() {
        const bounds = this.getBounds();
        const centerY = bounds.y + bounds.height / 2;

        this.points.forEach(p => {
            p.y = centerY + (centerY - p.y);
            // Also flip control handles for Path points
            if (p.handleIn) {
                p.handleIn.y = centerY + (centerY - p.handleIn.y);
            }
            if (p.handleOut) {
                p.handleOut.y = centerY + (centerY - p.handleOut.y);
            }
        });

        this.updateElement();
        eventBus.emit('shape:updated', this);
    }
}
