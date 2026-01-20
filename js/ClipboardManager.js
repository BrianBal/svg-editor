class ClipboardManager {
    constructor() {
        this.pasteOffset = 20;
        this.pasteCount = 0;
    }

    /**
     * Copy selected shapes to clipboard as SVG.
     * @returns {Promise<boolean>} True if copy succeeded
     */
    async copy() {
        const shapes = appState.getSelectedShapes();
        if (shapes.length === 0) return false;

        const svgString = this.generateSVGFragment(shapes);

        try {
            await navigator.clipboard.writeText(svgString);
            this.resetPasteOffset();
            return true;
        } catch (err) {
            console.error('Copy failed:', err);
            return false;
        }
    }

    /**
     * Cut selected shapes (copy then delete).
     * @returns {Promise<boolean>} True if cut succeeded
     */
    async cut() {
        const shapes = appState.getSelectedShapes();
        if (shapes.length === 0) return false;

        const success = await this.copy();
        if (!success) return false;

        const canvas = window.app?.canvas;
        shapes.forEach(shape => canvas.removeShape(shape));
        appState.deselectAll();

        return true;
    }

    /**
     * Paste SVG content from clipboard.
     * @returns {Promise<Shape[]|null>} Array of pasted shapes, or null if failed
     */
    async paste() {
        let svgString;
        try {
            svgString = await navigator.clipboard.readText();
        } catch (err) {
            console.error('Paste failed - clipboard access denied:', err);
            return null;
        }

        // Validate it's SVG content
        if (!svgString.includes('<svg') && !svgString.includes('<SVG')) {
            console.warn('Clipboard does not contain SVG content');
            return null;
        }

        const newShapes = this.parseShapesFromSVG(svgString);
        if (newShapes.length === 0) return null;

        // Calculate offset for this paste
        this.pasteCount++;
        const offset = this.pasteOffset * this.pasteCount;

        // Add shapes to canvas with offset
        const canvas = window.app?.canvas;
        const newShapeIds = [];

        newShapes.forEach(shape => {
            // Apply offset
            shape.move(offset, offset);

            // Add to canvas
            const element = shape.createSVGElement();
            canvas.shapesLayer.appendChild(element);
            appState.addShape(shape);
            newShapeIds.push(shape.id);
        });

        // Select all pasted shapes
        appState.deselectAll();
        newShapeIds.forEach((id, i) => {
            if (i === 0) {
                appState.selectShape(id);
            } else {
                appState.addToSelection(id);
            }
        });

        return newShapes;
    }

    /**
     * Generate SVG string containing only the specified shapes and their gradients.
     * @param {Shape[]} shapes
     * @returns {string}
     */
    generateSVGFragment(shapes) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

        // Calculate combined bounding box
        const bounds = this.getCombinedBounds(shapes);
        svg.setAttribute('viewBox', `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`);
        svg.setAttribute('width', bounds.width);
        svg.setAttribute('height', bounds.height);

        // Collect and add gradients to defs
        const gradients = this.collectGradients(shapes);
        if (gradients.length > 0) {
            const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            gradients.forEach(g => defs.appendChild(g.toSVGElement()));
            svg.appendChild(defs);
        }

        // Clone each shape's element
        shapes.forEach(shape => {
            // Ensure shape has an element
            let el;
            if (shape.element) {
                el = shape.element.cloneNode(true);
            } else {
                el = shape.createSVGElement();
            }
            // Remove internal data-shape-id attribute
            el.removeAttribute('data-shape-id');
            svg.appendChild(el);
        });

        const serializer = new XMLSerializer();
        return serializer.serializeToString(svg);
    }

    /**
     * Collect gradients used by shapes.
     * @param {Shape[]} shapes
     * @returns {Gradient[]}
     */
    collectGradients(shapes) {
        const gradients = [];
        shapes.forEach(shape => {
            if (shape.fillGradient) {
                gradients.push(shape.fillGradient);
            }
        });
        return gradients;
    }

    /**
     * Get combined bounding box of all shapes.
     * @param {Shape[]} shapes
     * @returns {{x: number, y: number, width: number, height: number}}
     */
    getCombinedBounds(shapes) {
        if (shapes.length === 0) return { x: 0, y: 0, width: 100, height: 100 };

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        shapes.forEach(shape => {
            const b = shape.getBounds();
            minX = Math.min(minX, b.x);
            minY = Math.min(minY, b.y);
            maxX = Math.max(maxX, b.x + b.width);
            maxY = Math.max(maxY, b.y + b.height);
        });

        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }

    /**
     * Parse SVG string and create new shapes.
     * @param {string} svgString
     * @returns {Shape[]}
     */
    parseShapesFromSVG(svgString) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgString, 'image/svg+xml');
        const svg = doc.querySelector('svg');

        if (!svg) return [];

        const shapes = [];

        // First, parse gradient definitions from <defs>
        const gradientMap = {};
        const defs = svg.querySelector('defs');
        if (defs) {
            defs.querySelectorAll('linearGradient, radialGradient').forEach(gradientEl => {
                const gradient = Gradient.fromSVGElement(gradientEl);
                gradientMap[gradientEl.getAttribute('id')] = gradient;
            });
        }

        // Parse rectangles
        svg.querySelectorAll('rect').forEach(rect => {
            if (rect.getAttribute('id') === 'canvas-background') return;
            const shape = new Rectangle(
                parseFloat(rect.getAttribute('x')) || 0,
                parseFloat(rect.getAttribute('y')) || 0,
                parseFloat(rect.getAttribute('width')) || 100,
                parseFloat(rect.getAttribute('height')) || 100
            );
            const rx = parseFloat(rect.getAttribute('rx'));
            if (rx) shape.rx = rx;
            this.applyCommonAttributes(shape, rect, gradientMap);
            shapes.push(shape);
        });

        // Parse ellipses
        svg.querySelectorAll('ellipse').forEach(ellipse => {
            const shape = new Ellipse(
                parseFloat(ellipse.getAttribute('cx')) || 0,
                parseFloat(ellipse.getAttribute('cy')) || 0,
                parseFloat(ellipse.getAttribute('rx')) || 50,
                parseFloat(ellipse.getAttribute('ry')) || 50
            );
            this.applyCommonAttributes(shape, ellipse, gradientMap);
            shapes.push(shape);
        });

        // Parse circles (convert to ellipse)
        svg.querySelectorAll('circle').forEach(circle => {
            const r = parseFloat(circle.getAttribute('r')) || 50;
            const shape = new Ellipse(
                parseFloat(circle.getAttribute('cx')) || 0,
                parseFloat(circle.getAttribute('cy')) || 0,
                r,
                r
            );
            this.applyCommonAttributes(shape, circle, gradientMap);
            shapes.push(shape);
        });

        // Parse polylines
        svg.querySelectorAll('polyline').forEach(polyline => {
            const pointsStr = polyline.getAttribute('points') || '';
            const points = this.parsePointsString(pointsStr);
            if (points.length >= 2) {
                const shape = new Polyline(points);
                this.applyCommonAttributes(shape, polyline, gradientMap);
                shapes.push(shape);
            }
        });

        // Parse polygons (closed polylines)
        svg.querySelectorAll('polygon').forEach(polygon => {
            const pointsStr = polygon.getAttribute('points') || '';
            const points = this.parsePointsString(pointsStr);
            if (points.length >= 2) {
                points.push({ ...points[0] });
                const shape = new Polyline(points);
                this.applyCommonAttributes(shape, polygon, gradientMap);
                shapes.push(shape);
            }
        });

        // Parse lines
        svg.querySelectorAll('line').forEach(line => {
            const shape = new Line(
                parseFloat(line.getAttribute('x1')) || 0,
                parseFloat(line.getAttribute('y1')) || 0,
                parseFloat(line.getAttribute('x2')) || 100,
                parseFloat(line.getAttribute('y2')) || 100
            );
            this.applyCommonAttributes(shape, line, gradientMap);
            shapes.push(shape);
        });

        // Parse text
        svg.querySelectorAll('text').forEach(text => {
            const fontSize = parseFloat(text.getAttribute('font-size')) || 24;
            const fontFamily = text.getAttribute('font-family') || 'Arial';
            const shape = new TextShape(
                parseFloat(text.getAttribute('x')) || 0,
                parseFloat(text.getAttribute('y')) || 0,
                text.textContent || 'Text',
                fontSize,
                fontFamily
            );
            this.applyCommonAttributes(shape, text, gradientMap);
            shapes.push(shape);
        });

        // Parse paths
        svg.querySelectorAll('path').forEach(pathEl => {
            const d = pathEl.getAttribute('d');
            if (!d) return;

            const points = this.parsePathData(d);
            if (points.length >= 2) {
                const closed = d.toUpperCase().includes('Z');
                const shape = new Path(points, closed);
                this.applyCommonAttributes(shape, pathEl, gradientMap);
                shapes.push(shape);
            }
        });

        return shapes;
    }

    /**
     * Apply common attributes from SVG element to shape.
     * @param {Shape} shape
     * @param {Element} element
     * @param {Object} gradientMap
     */
    applyCommonAttributes(shape, element, gradientMap) {
        const stroke = element.getAttribute('stroke');
        const fill = element.getAttribute('fill');
        const strokeWidth = element.getAttribute('stroke-width');
        const opacity = element.getAttribute('opacity');
        const strokeDasharray = element.getAttribute('stroke-dasharray');
        const strokeLinecap = element.getAttribute('stroke-linecap');
        const strokeLinejoin = element.getAttribute('stroke-linejoin');

        if (stroke) shape.stroke = stroke;
        if (strokeWidth) shape.strokeWidth = parseFloat(strokeWidth);
        if (opacity) shape.opacity = parseFloat(opacity) * 100;
        if (strokeLinecap) shape.strokeLinecap = strokeLinecap;
        if (strokeLinejoin) shape.strokeLinejoin = strokeLinejoin;

        // Parse stroke dash
        if (strokeDasharray) {
            const dashValues = strokeDasharray.split(/[\s,]+/).map(parseFloat);
            if (dashValues.length >= 2) {
                const ratio = dashValues[0] / (shape.strokeWidth || 2);
                if (ratio >= 3) {
                    shape.strokeDash = 'dashed';
                } else {
                    shape.strokeDash = 'dotted';
                }
            }
        }

        // Handle fill - check if it's a gradient reference
        if (fill && fill.startsWith('url(#')) {
            const gradientId = fill.match(/url\(#([^)]+)\)/)?.[1];
            if (gradientId && gradientMap && gradientMap[gradientId]) {
                const gradient = gradientMap[gradientId].clone();
                shape.fillGradient = gradient;
                shape.fill = `url(#${gradient.id})`;
                if (typeof gradientManager !== 'undefined') {
                    gradientManager.addOrUpdateGradient(gradient);
                }
            } else {
                shape.fill = 'none';
                shape.fillGradient = null;
            }
        } else if (fill) {
            shape.fill = fill;
            shape.fillGradient = null;
        }

        // Parse transform attribute for rotation
        const transform = element.getAttribute('transform');
        if (transform) {
            const rotateMatch = transform.match(/rotate\(\s*([\d.-]+)/);
            if (rotateMatch) {
                shape.rotation = parseFloat(rotateMatch[1]) || 0;
            }
        }
    }

    /**
     * Parse SVG points string to array of {x, y} objects.
     * @param {string} pointsStr
     * @returns {{x: number, y: number}[]}
     */
    parsePointsString(pointsStr) {
        const points = [];
        const cleaned = pointsStr.trim().replace(/,/g, ' ').replace(/\s+/g, ' ');
        const values = cleaned.split(' ').filter(v => v !== '');

        for (let i = 0; i < values.length - 1; i += 2) {
            const x = parseFloat(values[i]);
            const y = parseFloat(values[i + 1]);
            if (!isNaN(x) && !isNaN(y)) {
                points.push({ x, y });
            }
        }

        return points;
    }

    /**
     * Parse SVG path data string to array of points with handles.
     * @param {string} d
     * @returns {Array}
     */
    parsePathData(d) {
        const points = [];
        const commands = d.match(/[MLCQZmlcqz][^MLCQZmlcqz]*/gi) || [];

        let currentX = 0, currentY = 0;

        commands.forEach(cmd => {
            const type = cmd[0];
            const isRelative = type === type.toLowerCase();
            const typeUpper = type.toUpperCase();
            const nums = cmd.slice(1).trim().split(/[\s,]+/).map(parseFloat).filter(n => !isNaN(n));

            switch (typeUpper) {
                case 'M':
                    if (isRelative) {
                        currentX += nums[0];
                        currentY += nums[1];
                    } else {
                        currentX = nums[0];
                        currentY = nums[1];
                    }
                    points.push({ x: currentX, y: currentY, handleIn: null, handleOut: null });
                    break;

                case 'L':
                    if (isRelative) {
                        currentX += nums[0];
                        currentY += nums[1];
                    } else {
                        currentX = nums[0];
                        currentY = nums[1];
                    }
                    points.push({ x: currentX, y: currentY, handleIn: null, handleOut: null });
                    break;

                case 'C':
                    if (nums.length >= 6) {
                        let cp1x, cp1y, cp2x, cp2y, endX, endY;
                        if (isRelative) {
                            cp1x = currentX + nums[0];
                            cp1y = currentY + nums[1];
                            cp2x = currentX + nums[2];
                            cp2y = currentY + nums[3];
                            endX = currentX + nums[4];
                            endY = currentY + nums[5];
                        } else {
                            cp1x = nums[0];
                            cp1y = nums[1];
                            cp2x = nums[2];
                            cp2y = nums[3];
                            endX = nums[4];
                            endY = nums[5];
                        }

                        if (points.length > 0) {
                            points[points.length - 1].handleOut = { x: cp1x, y: cp1y };
                        }

                        currentX = endX;
                        currentY = endY;

                        points.push({
                            x: currentX,
                            y: currentY,
                            handleIn: { x: cp2x, y: cp2y },
                            handleOut: null
                        });
                    }
                    break;

                case 'Q':
                    if (nums.length >= 4) {
                        let cpx, cpy, endX, endY;
                        if (isRelative) {
                            cpx = currentX + nums[0];
                            cpy = currentY + nums[1];
                            endX = currentX + nums[2];
                            endY = currentY + nums[3];
                        } else {
                            cpx = nums[0];
                            cpy = nums[1];
                            endX = nums[2];
                            endY = nums[3];
                        }

                        if (points.length > 0) {
                            points[points.length - 1].handleOut = { x: cpx, y: cpy };
                        }

                        currentX = endX;
                        currentY = endY;

                        points.push({
                            x: currentX,
                            y: currentY,
                            handleIn: { x: cpx, y: cpy },
                            handleOut: null
                        });
                    }
                    break;

                case 'Z':
                    break;
            }
        });

        return points;
    }

    /**
     * Reset paste offset counter (called on new copy).
     */
    resetPasteOffset() {
        this.pasteCount = 0;
    }
}

window.clipboardManager = new ClipboardManager();
