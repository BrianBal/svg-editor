class SVGLoader {
    constructor(canvas) {
        this.canvas = canvas;
        this.importedGradients = new Map();
    }

    loadFile(file) {
        const reader = new FileReader();

        reader.onload = (e) => {
            this.parseSVG(e.target.result);
        };

        reader.readAsText(file);
    }

    parseSVG(svgString) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgString, 'image/svg+xml');
        const svg = doc.querySelector('svg');

        if (!svg) {
            console.error('Invalid SVG file');
            return;
        }

        this.canvas.clear();
        this.importedGradients.clear();

        const width = svg.getAttribute('width') || 800;
        const height = svg.getAttribute('height') || 600;
        const viewBox = svg.getAttribute('viewBox') || `0 0 ${width} ${height}`;

        this.updateCanvasSize(width, height, viewBox);
        this.parseGradients(svg);
        this.parseShapes(svg);

        eventBus.emit('canvas:loaded');
    }

    parseGradients(svgElement) {
        const defs = svgElement.querySelector('defs');
        if (!defs) return;

        // Parse linear gradients
        defs.querySelectorAll('linearGradient').forEach(el => {
            const gradient = Gradient.fromSVGElement(el);
            this.importedGradients.set(el.getAttribute('id'), gradient);
        });

        // Parse radial gradients
        defs.querySelectorAll('radialGradient').forEach(el => {
            const gradient = Gradient.fromSVGElement(el);
            this.importedGradients.set(el.getAttribute('id'), gradient);
        });
    }

    updateCanvasSize(width, height, viewBox) {
        this.canvas.updateSize(width, height, viewBox);

        document.getElementById('svg-width').value = width;
        document.getElementById('svg-height').value = height;
        document.getElementById('svg-viewbox').value = viewBox;
    }

    parseShapes(svgElement) {
        // Find the container with shapes
        // Check if shapes are in a <g id="shapes-layer"> (typical save format)
        // or as direct children of <svg> (imported/manually edited SVGs)
        const shapesLayer = svgElement.querySelector('#shapes-layer');
        const container = shapesLayer || svgElement;

        // Iterate through children in document order
        const children = Array.from(container.children);

        for (const element of children) {
            const tagName = element.tagName.toLowerCase();

            // Skip non-shape elements
            if (tagName === 'defs' || tagName === 'g') continue;

            // Parse shape based on tag name
            switch (tagName) {
                case 'rect':
                    this.parseRect(element);
                    break;
                case 'polyline':
                    this.parsePolyline(element);
                    break;
                case 'polygon':
                    this.parsePolygon(element);
                    break;
                case 'line':
                    this.parseLine(element);
                    break;
                case 'path':
                    this.parsePath(element);
                    break;
            }
        }
    }

    parseRect(rect) {
        const shape = new Rectangle(
            parseFloat(rect.getAttribute('x')) || 0,
            parseFloat(rect.getAttribute('y')) || 0,
            parseFloat(rect.getAttribute('width')) || 100,
            parseFloat(rect.getAttribute('height')) || 100
        );

        // Handle corner radius
        const rx = rect.getAttribute('rx');
        if (rx) {
            shape.rx = parseFloat(rx);
        }

        this.applyCommonAttributes(shape, rect);
        this.canvas.addShape(shape);
    }

    parsePolyline(polyline) {
        const pointsStr = polyline.getAttribute('points') || '';
        const points = this.parsePointsString(pointsStr);

        if (points.length >= 2) {
            const shape = new Polyline(points);
            this.applyCommonAttributes(shape, polyline);
            this.canvas.addShape(shape);
        }
    }

    parsePolygon(polygon) {
        // Check if this is a tilted rectangle
        if (polygon.getAttribute('data-is-rectangle') === 'true') {
            const shape = new Rectangle(
                parseFloat(polygon.getAttribute('data-rect-x')) || 0,
                parseFloat(polygon.getAttribute('data-rect-y')) || 0,
                parseFloat(polygon.getAttribute('data-rect-width')) || 100,
                parseFloat(polygon.getAttribute('data-rect-height')) || 100
            );

            // Restore tilt values
            shape.tiltTop = parseFloat(polygon.getAttribute('data-tilt-top')) || 0;
            shape.tiltBottom = parseFloat(polygon.getAttribute('data-tilt-bottom')) || 0;
            shape.tiltLeft = parseFloat(polygon.getAttribute('data-tilt-left')) || 0;
            shape.tiltRight = parseFloat(polygon.getAttribute('data-tilt-right')) || 0;

            // Restore corner radius if present
            const cornerRadius = polygon.getAttribute('data-corner-radius');
            if (cornerRadius) {
                shape.rx = parseFloat(cornerRadius);
            }

            this.applyCommonAttributes(shape, polygon);
            this.canvas.addShape(shape);
        } else {
            // Regular polygon - parse as polyline
            const pointsStr = polygon.getAttribute('points') || '';
            const points = this.parsePointsString(pointsStr);

            if (points.length >= 2) {
                // Close the polygon by duplicating the first point at the end
                points.push({ ...points[0] });
                const shape = new Polyline(points);
                this.applyCommonAttributes(shape, polygon);
                this.canvas.addShape(shape);
            }
        }
    }

    parseLine(line) {
        const points = [
            { x: parseFloat(line.getAttribute('x1')) || 0, y: parseFloat(line.getAttribute('y1')) || 0 },
            { x: parseFloat(line.getAttribute('x2')) || 0, y: parseFloat(line.getAttribute('y2')) || 0 }
        ];

        const shape = new Polyline(points);
        this.applyCommonAttributes(shape, line);
        this.canvas.addShape(shape);
    }

    parsePath(pathEl) {
        const d = pathEl.getAttribute('d');
        if (!d) return;

        const points = this.parsePathData(d);
        if (points.length >= 2) {
            const closed = d.toUpperCase().includes('Z');
            const shape = new Path(points, closed);
            this.applyCommonAttributes(shape, pathEl);
            this.canvas.addShape(shape);
        }
    }

    /**
     * Parse SVG path data (d attribute) into array of points with handles.
     * Supports M, L, C, Q, and Z commands.
     * @param {string} d - SVG path data string
     * @returns {Array} Array of point objects with x, y, handleIn, handleOut
     */
    parsePathData(d) {
        const points = [];
        // Match commands with their parameters
        const commands = d.match(/[MLCQZmlcqz][^MLCQZmlcqz]*/gi) || [];

        let currentX = 0, currentY = 0;

        commands.forEach(cmd => {
            const type = cmd[0];
            const isRelative = type === type.toLowerCase();
            const typeUpper = type.toUpperCase();
            const nums = cmd.slice(1).trim().split(/[\s,]+/).map(parseFloat).filter(n => !isNaN(n));

            switch (typeUpper) {
                case 'M':
                    // Move to
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
                    // Line to
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
                    // Cubic bezier: C x1 y1 x2 y2 x y
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

                        // Set handleOut on previous point
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
                    // Quadratic bezier: Q x1 y1 x y
                    // Convert to cubic-like representation (single control point)
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

                        // Use the control point for both handleOut and handleIn
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
                    // Close path - handled by closed flag
                    break;
            }
        });

        return points;
    }

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

    applyCommonAttributes(shape, element) {
        const stroke = element.getAttribute('stroke');
        const fill = element.getAttribute('fill');
        const strokeWidth = element.getAttribute('stroke-width');

        // Explicitly handle missing attributes - set to 'none' if not present
        shape.stroke = stroke || 'none';
        if (strokeWidth) shape.strokeWidth = parseFloat(strokeWidth);

        // Parse opacity attribute (0-1 in SVG, 0-100 in app)
        const opacity = element.getAttribute('opacity');
        if (opacity) {
            shape.opacity = parseFloat(opacity) * 100;
        }

        // Handle fill - check for gradient reference
        if (fill && fill.startsWith('url(#')) {
            const match = fill.match(/url\(#([^)]+)\)/);
            if (match && this.importedGradients.has(match[1])) {
                const gradient = this.importedGradients.get(match[1]).clone();
                shape.fillGradient = gradient;
                shape.fill = `url(#${gradient.id})`;
            } else {
                shape.fill = fill;
            }
        } else {
            shape.fill = fill || 'none';
        }
    }

    exportSVG() {
        const svg = document.getElementById('svg-canvas').cloneNode(true);

        const handlesLayer = svg.querySelector('#handles-layer');
        if (handlesLayer) {
            handlesLayer.remove();
        }

        svg.querySelectorAll('[data-shape-id]').forEach(el => {
            el.removeAttribute('data-shape-id');
        });

        // Clean up unused gradients from defs
        this.cleanupUnusedGradients(svg);

        const serializer = new XMLSerializer();
        let svgString = serializer.serializeToString(svg);

        svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgString;

        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'drawing.svg';
        a.click();
        URL.revokeObjectURL(url);
    }

    cleanupUnusedGradients(svg) {
        const defs = svg.querySelector('defs');
        if (!defs) return;

        // Find all gradient IDs that are actually used
        const usedIds = new Set();
        svg.querySelectorAll('[fill^="url(#"]').forEach(el => {
            const fill = el.getAttribute('fill');
            const match = fill.match(/url\(#([^)]+)\)/);
            if (match) usedIds.add(match[1]);
        });
        svg.querySelectorAll('[stroke^="url(#"]').forEach(el => {
            const stroke = el.getAttribute('stroke');
            const match = stroke.match(/url\(#([^)]+)\)/);
            if (match) usedIds.add(match[1]);
        });

        // Remove unused gradients
        defs.querySelectorAll('linearGradient, radialGradient').forEach(grad => {
            if (!usedIds.has(grad.id)) {
                grad.remove();
            }
        });

        // Remove empty defs element
        if (defs.children.length === 0) {
            defs.remove();
        }
    }
}
