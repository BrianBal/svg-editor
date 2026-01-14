class SVGLoader {
    constructor(canvas) {
        this.canvas = canvas;
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

        const width = svg.getAttribute('width') || 800;
        const height = svg.getAttribute('height') || 600;
        const viewBox = svg.getAttribute('viewBox') || `0 0 ${width} ${height}`;

        this.updateCanvasSize(width, height, viewBox);
        this.parseShapes(svg);

        eventBus.emit('canvas:loaded');
    }

    updateCanvasSize(width, height, viewBox) {
        this.canvas.updateSize(width, height, viewBox);

        document.getElementById('svg-width').value = width;
        document.getElementById('svg-height').value = height;
        document.getElementById('svg-viewbox').value = viewBox;
    }

    parseShapes(svgElement) {
        svgElement.querySelectorAll('rect').forEach(rect => {
            const shape = new Rectangle(
                parseFloat(rect.getAttribute('x')) || 0,
                parseFloat(rect.getAttribute('y')) || 0,
                parseFloat(rect.getAttribute('width')) || 100,
                parseFloat(rect.getAttribute('height')) || 100
            );

            this.applyCommonAttributes(shape, rect);
            this.canvas.addShape(shape);
        });

        svgElement.querySelectorAll('polyline').forEach(polyline => {
            const pointsStr = polyline.getAttribute('points') || '';
            const points = this.parsePointsString(pointsStr);

            if (points.length >= 2) {
                const shape = new Polyline(points);
                this.applyCommonAttributes(shape, polyline);
                this.canvas.addShape(shape);
            }
        });

        svgElement.querySelectorAll('polygon').forEach(polygon => {
            const pointsStr = polygon.getAttribute('points') || '';
            const points = this.parsePointsString(pointsStr);

            if (points.length >= 2) {
                const shape = new Polyline(points);
                this.applyCommonAttributes(shape, polygon);
                this.canvas.addShape(shape);
            }
        });

        svgElement.querySelectorAll('line').forEach(line => {
            const points = [
                { x: parseFloat(line.getAttribute('x1')) || 0, y: parseFloat(line.getAttribute('y1')) || 0 },
                { x: parseFloat(line.getAttribute('x2')) || 0, y: parseFloat(line.getAttribute('y2')) || 0 }
            ];

            const shape = new Polyline(points);
            this.applyCommonAttributes(shape, line);
            this.canvas.addShape(shape);
        });
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
        shape.fill = fill || 'none';
        if (strokeWidth) shape.strokeWidth = parseFloat(strokeWidth);
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
}
