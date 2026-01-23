/**
 * Path - A bezier curve path shape with control handles.
 * Each point has an anchor position and optional handleIn/handleOut for curves.
 */
class Path extends PointBasedShape {
    static get properties() {
        const baseProps = Shape.properties;
        return {
            ...baseProps,
            // Hide width/height for paths (point-based only)
            width: { ...baseProps.width, hidden: true },
            height: { ...baseProps.height, hidden: true },

            // Path-specific properties
            pointCount: {
                type: 'number',
                label: 'Points',
                group: 'path',
                readonly: true,
                get: (shape) => shape.points.length
            },
            closed: {
                type: 'checkbox',
                label: 'Closed',
                group: 'path',
                get: (shape) => shape.closed,
                set: (shape, value) => {
                    shape.closed = value;
                    shape.updateElement();
                    eventBus.emit('shape:updated', shape);
                }
            },
            addPoint: {
                type: 'button',
                label: 'Add Point',
                group: 'path',
                action: (shape) => {
                    const canvas = window.app?.canvas;
                    if (canvas) {
                        const selectedIndex = canvas.selection.getSelectedPointIndex();
                        if (selectedIndex !== null && selectedIndex < shape.points.length - 1) {
                            shape.addPointBetween(selectedIndex);
                        } else if (shape.points.length >= 2) {
                            shape.addPointBetween(shape.points.length - 2);
                        }
                    }
                }
            },
            removePoint: {
                type: 'button',
                label: 'Remove Point',
                group: 'path',
                action: (shape) => {
                    const canvas = window.app?.canvas;
                    if (canvas) {
                        const selectedIndex = canvas.selection.getSelectedPointIndex();
                        if (selectedIndex !== null) {
                            if (shape.removePoint(selectedIndex)) {
                                canvas.selection.selectPoint(null);
                            }
                        } else {
                            shape.removeLastPoint();
                        }
                    }
                }
            },
        };
    }

    constructor(points = [], closed = false) {
        super('path', points);
        this.closed = closed;
    }

    createSVGElement() {
        const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        el.setAttribute('id', this.id);
        el.setAttribute('d', this.getPathData());
        this.applyAttributes(el);
        this.element = el;
        return el;
    }

    updateElement() {
        if (this.element) {
            this.element.setAttribute('d', this.getPathData());
            this.applyTransform(this.element);
        }
    }

    /**
     * Build the SVG path data string from points.
     * Uses M (moveto), L (lineto), C (curveto), and Z (close) commands.
     * @returns {string}
     */
    getPathData() {
        if (this.points.length === 0) return '';

        const first = this.points[0];
        let d = `M ${first.x} ${first.y}`;

        for (let i = 1; i < this.points.length; i++) {
            const prev = this.points[i - 1];
            const curr = this.points[i];

            if (prev.handleOut || curr.handleIn) {
                // Cubic bezier curve
                const cp1 = prev.handleOut || { x: prev.x, y: prev.y };
                const cp2 = curr.handleIn || { x: curr.x, y: curr.y };
                d += ` C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${curr.x} ${curr.y}`;
            } else {
                // Straight line
                d += ` L ${curr.x} ${curr.y}`;
            }
        }

        // Handle closing curve back to first point
        if (this.closed && this.points.length > 1) {
            const last = this.points[this.points.length - 1];
            if (last.handleOut || first.handleIn) {
                const cp1 = last.handleOut || { x: last.x, y: last.y };
                const cp2 = first.handleIn || { x: first.x, y: first.y };
                d += ` C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${first.x} ${first.y}`;
            }
            d += ' Z';
        }

        return d;
    }

    getBounds() {
        return this.getBoundsFromPoints(p => [
            p,
            p.handleIn,
            p.handleOut
        ]);
    }

    /**
     * Move a point and its handles.
     * @param {number} index
     * @param {number} x
     * @param {number} y
     */
    movePoint(index, x, y) {
        if (index >= 0 && index < this.points.length) {
            const p = this.points[index];
            const dx = x - p.x;
            const dy = y - p.y;

            // Move anchor
            p.x = x;
            p.y = y;

            // Move handles with anchor (maintain relative position)
            if (p.handleIn) {
                p.handleIn.x += dx;
                p.handleIn.y += dy;
            }
            if (p.handleOut) {
                p.handleOut.x += dx;
                p.handleOut.y += dy;
            }

            this.updateElement();
            eventBus.emit('shape:updated', this);
        }
    }

    /**
     * Move a control handle, optionally mirroring the opposite handle.
     * @param {number} index - Point index
     * @param {string} handleType - 'in' or 'out'
     * @param {number} x
     * @param {number} y
     * @param {boolean} mirror - If true, mirror opposite handle (default true)
     */
    moveHandle(index, handleType, x, y, mirror = true) {
        const p = this.points[index];
        if (!p) return;

        const handle = handleType === 'in' ? 'handleIn' : 'handleOut';
        const oppositeHandle = handleType === 'in' ? 'handleOut' : 'handleIn';

        p[handle] = { x, y };

        // Mirror opposite handle for smooth curves
        if (mirror && p[oppositeHandle]) {
            const dx = x - p.x;
            const dy = y - p.y;
            p[oppositeHandle] = { x: p.x - dx, y: p.y - dy };
        }

        this.updateElement();
        eventBus.emit('shape:updated', this);
    }

    /**
     * Add a new point to the path.
     * @param {number} x
     * @param {number} y
     * @param {Object|null} handleIn
     * @param {Object|null} handleOut
     */
    addPoint(x, y, handleIn = null, handleOut = null) {
        this.points.push({ x, y, handleIn, handleOut });
        this.updateElement();
        eventBus.emit('shape:updated', this);
    }

    /**
     * Close the path.
     */
    closePath() {
        this.closed = true;
        this.updateElement();
        eventBus.emit('shape:updated', this);
    }

    /**
     * Check if a position is near the first point.
     * @param {number} x
     * @param {number} y
     * @param {number} threshold - Distance threshold in pixels
     * @returns {boolean}
     */
    isNearFirstPoint(x, y, threshold = 15) {
        if (this.points.length === 0) return false;
        const first = this.points[0];
        const dx = x - first.x;
        const dy = y - first.y;
        return Math.sqrt(dx * dx + dy * dy) < threshold;
    }

    /**
     * Move all points and handles by an offset.
     * @param {number} dx
     * @param {number} dy
     */
    move(dx, dy) {
        this.points.forEach(p => {
            p.x += dx;
            p.y += dy;
            if (p.handleIn) {
                p.handleIn.x += dx;
                p.handleIn.y += dy;
            }
            if (p.handleOut) {
                p.handleOut.x += dx;
                p.handleOut.y += dy;
            }
        });
        this.updateElement();
        eventBus.emit('shape:updated', this);
    }

    /**
     * Clone the path with an offset.
     * @param {number} offset
     * @returns {Path}
     */
    clone(offset = 10) {
        const clonedPoints = this.points.map(p => ({
            x: p.x + offset,
            y: p.y + offset,
            handleIn: p.handleIn ? { x: p.handleIn.x + offset, y: p.handleIn.y + offset } : null,
            handleOut: p.handleOut ? { x: p.handleOut.x + offset, y: p.handleOut.y + offset } : null
        }));
        const copy = new Path(clonedPoints, this.closed);
        this.copyAttributesTo(copy);
        return copy;
    }

    /**
     * Create a midpoint between two points for addPointBetween.
     * For paths, midpoint has no handles (corner point).
     * @param {Object} p1
     * @param {Object} p2
     * @returns {Object}
     */
    createMidpoint(p1, p2) {
        return {
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2,
            handleIn: null,
            handleOut: null
        };
    }
}
