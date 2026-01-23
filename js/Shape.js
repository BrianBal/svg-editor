class Shape {
    static idCounter = 0;

    // Base properties - used by PropertiesPanel for schema-driven UI
    // Subclasses can override with their own static properties
    static get properties() {
        return typeof BaseShapeProperties !== 'undefined' ? BaseShapeProperties : {};
    }

    static resetIdCounter() {
        Shape.idCounter = 0;
    }

    constructor(type) {
        this.id = `shape-${++Shape.idCounter}`;
        this.type = type;
        this.stroke = '#000000';
        this.fill = 'none';
        this.fillGradient = null; // Gradient instance when fill is a gradient
        this.strokeWidth = 2;
        this.opacity = 100;
        this.strokeDash = 'solid';
        this.strokeLinecap = 'butt';
        this.strokeLinejoin = 'miter';
        this.element = null;
        this.visible = true;
        this.rotation = 0;
        this.scaleX = 1;
        this.scaleY = 1;
        this.skewX = 0;
        this.skewY = 0;
        this.rotateX = 0;       // -180 to 180 degrees (pitch)
        this.rotateY = 0;       // -180 to 180 degrees (yaw)
        this.perspective = 1000; // 100 to 5000 pixels
    }

    createSVGElement() {
        throw new Error('Must implement createSVGElement');
    }

    updateElement() {
        throw new Error('Must implement updateElement');
    }

    getBounds() {
        throw new Error('Must implement getBounds');
    }

    setStroke(color) {
        this.stroke = color;
        if (this.element) {
            this.element.setAttribute('stroke', color);
        }
        eventBus.emit('shape:updated', this);
    }

    setFill(value) {
        if (value instanceof Gradient) {
            this.fillGradient = value;
            this.fill = `url(#${value.id})`;
            // Add gradient to defs
            if (typeof gradientManager !== 'undefined') {
                gradientManager.addOrUpdateGradient(value);
            }
        } else {
            // Remove old gradient if switching to solid color
            if (this.fillGradient && typeof gradientManager !== 'undefined') {
                gradientManager.removeGradient(this.fillGradient.id);
            }
            this.fillGradient = null;
            this.fill = value;
        }
        if (this.element) {
            this.element.setAttribute('fill', this.fill);
        }
        eventBus.emit('shape:updated', this);
    }

    getFillType() {
        if (this.fillGradient) {
            return this.fillGradient.type; // 'linear' or 'radial'
        }
        return 'solid';
    }

    getFillColor() {
        if (this.fillGradient) {
            return this.fillGradient.stops[0].color;
        }
        return this.fill;
    }

    setStrokeWidth(width) {
        this.strokeWidth = width;
        if (this.element) {
            this.element.setAttribute('stroke-width', width);
        }
        eventBus.emit('shape:updated', this);
    }

    setOpacity(value) {
        this.opacity = value;
        if (this.element) {
            this.element.setAttribute('opacity', value / 100);
        }
        eventBus.emit('shape:updated', this);
    }

    setStrokeDash(style) {
        this.strokeDash = style;
        if (this.element) {
            this.applyStrokeDash(this.element);
        }
        eventBus.emit('shape:updated', this);
    }

    setStrokeLinecap(value) {
        this.strokeLinecap = value;
        if (this.element) {
            this.element.setAttribute('stroke-linecap', value);
        }
        eventBus.emit('shape:updated', this);
    }

    setStrokeLinejoin(value) {
        this.strokeLinejoin = value;
        if (this.element) {
            this.element.setAttribute('stroke-linejoin', value);
        }
        eventBus.emit('shape:updated', this);
    }

    setRotation(degrees) {
        this.rotation = ((degrees % 360) + 360) % 360; // Normalize to 0-360
        if (this.element) {
            this.applyTransform(this.element);
        }
        eventBus.emit('shape:updated', this);
    }

    setSkewX(degrees) {
        this.skewX = Math.max(-89, Math.min(89, degrees)); // Clamp to -89 to 89
        if (this.element) {
            this.applyTransform(this.element);
        }
        eventBus.emit('shape:updated', this);
    }

    setSkewY(degrees) {
        this.skewY = Math.max(-89, Math.min(89, degrees)); // Clamp to -89 to 89
        if (this.element) {
            this.applyTransform(this.element);
        }
        eventBus.emit('shape:updated', this);
    }

    setRotateX(degrees) {
        this.rotateX = Math.max(-180, Math.min(180, degrees));
        if (this.element) {
            this.applyTransform(this.element);
        }
        eventBus.emit('shape:updated', this);
    }

    setRotateY(degrees) {
        this.rotateY = Math.max(-180, Math.min(180, degrees));
        if (this.element) {
            this.applyTransform(this.element);
        }
        eventBus.emit('shape:updated', this);
    }

    setPerspective(value) {
        this.perspective = Math.max(100, Math.min(5000, value));
        if (this.element) {
            this.applyTransform(this.element);
        }
        eventBus.emit('shape:updated', this);
    }

    /**
     * Calculate 3D transformation matrix with perspective projection
     * Returns SVG matrix(a, b, c, d, e, f) string or null
     */
    calculate3DMatrix(cx, cy) {
        if (this.rotateX === 0 && this.rotateY === 0) return null;

        const radX = this.rotateX * Math.PI / 180;
        const radY = this.rotateY * Math.PI / 180;
        const perspective = this.perspective;

        // Define shape corners relative to center
        const bounds = this.getBounds();
        const hw = bounds.width / 2;
        const hh = bounds.height / 2;
        const corners = [[-hw, -hh, 0], [hw, -hh, 0], [hw, hh, 0], [-hw, hh, 0]];

        // Apply 3D rotations and perspective projection
        const projected = corners.map(([x, y, z]) => {
            // Rotate around Y-axis (yaw)
            let x1 = x * Math.cos(radY) - z * Math.sin(radY);
            let z1 = x * Math.sin(radY) + z * Math.cos(radY);

            // Rotate around X-axis (pitch)
            let y2 = y * Math.cos(radX) + z1 * Math.sin(radX);
            let z2 = -y * Math.sin(radX) + z1 * Math.cos(radX);

            // Perspective projection
            const scale = perspective / (perspective - z2);
            return [x1 * scale, y2 * scale];
        });

        // Fit affine transformation matrix
        const [a, b, c, d, e, f] = this.fitAffineMatrix(
            corners.map(p => [p[0], p[1]]),
            projected
        );

        return `matrix(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`;
    }

    /**
     * Fit affine matrix from source to target points using first 3 corners
     */
    fitAffineMatrix(sourcePoints, targetPoints) {
        const [s0, s1, s2] = sourcePoints.slice(0, 3);
        const [t0, t1, t2] = targetPoints.slice(0, 3);

        const dx1 = s1[0] - s0[0], dy1 = s1[1] - s0[1];
        const dx2 = s2[0] - s0[0], dy2 = s2[1] - s0[1];

        const det = dx1 * dy2 - dx2 * dy1;
        if (Math.abs(det) < 1e-10) return [1, 0, 0, 1, 0, 0]; // Identity fallback

        const dtx1 = t1[0] - t0[0], dty1 = t1[1] - t0[1];
        const dtx2 = t2[0] - t0[0], dty2 = t2[1] - t0[1];

        const a = (dtx1 * dy2 - dtx2 * dy1) / det;
        const c = (dtx2 * dx1 - dtx1 * dx2) / det;
        const b = (dty1 * dy2 - dty2 * dy1) / det;
        const d = (dty2 * dx1 - dty1 * dx2) / det;
        const e = t0[0] - a * s0[0] - c * s0[1];
        const f = t0[1] - b * s0[0] - d * s0[1];

        return [a, b, c, d, e, f];
    }

    applyTransform(element) {
        const bounds = this.getBounds();
        const cx = bounds.x + bounds.width / 2;
        const cy = bounds.y + bounds.height / 2;

        const transforms = [];

        // Apply scale (flip) first
        if (this.scaleX !== 1 || this.scaleY !== 1) {
            transforms.push(`translate(${cx}, ${cy})`);
            transforms.push(`scale(${this.scaleX}, ${this.scaleY})`);
            transforms.push(`translate(${-cx}, ${-cy})`);
        }

        // Apply skew second
        if (this.skewX !== 0 || this.skewY !== 0) {
            transforms.push(`translate(${cx}, ${cy})`);
            if (this.skewX !== 0) transforms.push(`skewX(${this.skewX})`);
            if (this.skewY !== 0) transforms.push(`skewY(${this.skewY})`);
            transforms.push(`translate(${-cx}, ${-cy})`);
        }

        // Apply 3D rotation third
        const matrix3D = this.calculate3DMatrix(cx, cy);
        if (matrix3D) {
            transforms.push(`translate(${cx}, ${cy})`);
            transforms.push(matrix3D);
            transforms.push(`translate(${-cx}, ${-cy})`);
        }

        // Then apply rotation
        if (this.rotation !== 0) {
            transforms.push(`rotate(${this.rotation}, ${cx}, ${cy})`);
        }

        if (transforms.length > 0) {
            element.setAttribute('transform', transforms.join(' '));
        } else {
            element.removeAttribute('transform');
        }

        // Update data attributes for 3D properties (for file persistence)
        if (this.rotateX !== 0) {
            element.setAttribute('data-rotate-x', this.rotateX);
        } else {
            element.removeAttribute('data-rotate-x');
        }

        if (this.rotateY !== 0) {
            element.setAttribute('data-rotate-y', this.rotateY);
        } else {
            element.removeAttribute('data-rotate-y');
        }

        if (this.perspective !== 1000) {
            element.setAttribute('data-perspective', this.perspective);
        } else {
            element.removeAttribute('data-perspective');
        }
    }

    // Keep backward compatibility alias
    applyRotationTransform(element) {
        this.applyTransform(element);
    }

    flipHorizontal() {
        // Toggle horizontal scale (flip around Y-axis)
        this.scaleX = -this.scaleX;
        if (this.element) {
            this.applyTransform(this.element);
        }
        eventBus.emit('shape:updated', this);
    }

    flipVertical() {
        // Toggle vertical scale (flip around X-axis)
        this.scaleY = -this.scaleY;
        if (this.element) {
            this.applyTransform(this.element);
        }
        eventBus.emit('shape:updated', this);
    }

    applyStrokeDash(element) {
        switch (this.strokeDash) {
            case 'dashed':
                element.setAttribute('stroke-dasharray', `${this.strokeWidth * 4} ${this.strokeWidth * 2}`);
                break;
            case 'dotted':
                element.setAttribute('stroke-dasharray', `${this.strokeWidth} ${this.strokeWidth * 2}`);
                break;
            default:
                element.removeAttribute('stroke-dasharray');
        }
    }

    applyAttributes(element) {
        element.setAttribute('stroke', this.stroke);
        element.setAttribute('stroke-width', this.strokeWidth);
        element.setAttribute('stroke-linecap', this.strokeLinecap);
        element.setAttribute('stroke-linejoin', this.strokeLinejoin);
        if (this.opacity < 100) {
            element.setAttribute('opacity', this.opacity / 100);
        }
        this.applyStrokeDash(element);
        element.dataset.shapeId = this.id;

        // Handle fill with gradient support
        if (this.fillGradient && typeof gradientManager !== 'undefined') {
            gradientManager.addOrUpdateGradient(this.fillGradient);
        }
        element.setAttribute('fill', this.fill);

        // Apply rotation transform (also updates data attributes)
        this.applyTransform(element);
    }

    clone() {
        throw new Error('Must implement clone');
    }

    copyAttributesTo(shape) {
        shape.stroke = this.stroke;
        shape.strokeWidth = this.strokeWidth;
        shape.opacity = this.opacity;
        shape.strokeDash = this.strokeDash;
        shape.strokeLinecap = this.strokeLinecap;
        shape.strokeLinejoin = this.strokeLinejoin;
        shape.visible = this.visible;
        shape.rotation = this.rotation;
        shape.scaleX = this.scaleX;
        shape.scaleY = this.scaleY;
        shape.skewX = this.skewX;
        shape.skewY = this.skewY;
        shape.rotateX = this.rotateX;
        shape.rotateY = this.rotateY;
        shape.perspective = this.perspective;

        // Handle fill with gradient support
        if (this.fillGradient) {
            const gradientCopy = this.fillGradient.clone();
            shape.fillGradient = gradientCopy;
            shape.fill = `url(#${gradientCopy.id})`;
            // Add cloned gradient to defs
            if (typeof gradientManager !== 'undefined') {
                gradientManager.addOrUpdateGradient(gradientCopy);
            }
        } else {
            shape.fill = this.fill;
            shape.fillGradient = null;
        }
    }
}
