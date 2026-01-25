class FileManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.currentFileId = null;
        this.isDirty = false;
        this.saveTimeout = null;
        this.autoSaveDelay = 1000;

        this.setupEventListeners();
    }

    setupEventListeners() {
        eventBus.on('shape:created', () => this.markDirty());
        eventBus.on('shape:deleted', () => this.markDirty());
        eventBus.on('shape:updated', () => this.markDirty());
        eventBus.on('shapes:reordered', () => this.markDirty());
    }

    markDirty() {
        this.isDirty = true;
        this.updateSaveStatus('saving');
        this.scheduleAutoSave();
    }

    scheduleAutoSave() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        this.saveTimeout = setTimeout(() => {
            this.saveCurrentFile();
        }, this.autoSaveDelay);
    }

    updateSaveStatus(status) {
        eventBus.emit('file:status', status);
    }

    async newFile() {
        if (this.isDirty && this.currentFileId) {
            await this.saveCurrentFile();
        }

        this.canvas.clear();

        const file = {
            name: 'Untitled',
            content: this.getSVGContent(),
            width: appState.svgWidth,
            height: appState.svgHeight,
            viewBox: appState.viewBox
        };

        const id = await fileDatabase.saveFile(file);
        this.currentFileId = id;
        this.isDirty = false;

        eventBus.emit('file:opened', { id, name: file.name });
        this.updateSaveStatus('saved');

        return id;
    }

    async openFile(id) {
        if (this.isDirty && this.currentFileId) {
            await this.saveCurrentFile();
        }

        const file = await fileDatabase.getFile(id);
        if (!file) {
            throw new Error('File not found');
        }

        this.canvas.clear();

        // Update size BEFORE loading content so canvas:loaded has correct dimensions
        if (file.width && file.height) {
            this.canvas.updateSize(file.width, file.height, file.viewBox || `0 0 ${file.width} ${file.height}`);
        }

        if (file.content) {
            this.loadSVGContent(file.content);
        }

        this.currentFileId = id;
        this.isDirty = false;

        eventBus.emit('file:opened', { id, name: file.name });
        this.updateSaveStatus('saved');
    }

    loadSVGContent(svgString) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgString, 'image/svg+xml');
        const svg = doc.querySelector('svg');

        if (!svg) return;

        this.parseShapes(svg);
        eventBus.emit('canvas:loaded');
    }

    parseShapes(svgElement) {
        // First, parse gradient definitions from <defs>
        this.gradientMap = {};
        const defs = svgElement.querySelector('defs');
        if (defs) {
            defs.querySelectorAll('linearGradient, radialGradient').forEach(gradientEl => {
                const gradient = Gradient.fromSVGElement(gradientEl);
                this.gradientMap[gradient.id] = gradient;
            });
        }

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
                case 'ellipse':
                    this.parseEllipse(element);
                    break;
                case 'line':
                    this.parseLine(element);
                    break;
                case 'polyline':
                    this.parsePolyline(element);
                    break;
                case 'polygon':
                    this.parsePolygon(element);
                    break;
                case 'text':
                    this.parseText(element);
                    break;
                case 'path':
                    this.parsePath(element);
                    break;
            }
        }
    }

    parseRect(rect) {
        // Skip canvas background rect
        if (rect.getAttribute('id') === 'canvas-background') {
            return;
        }
        const shape = new Rectangle(
            parseFloat(rect.getAttribute('x')) || 0,
            parseFloat(rect.getAttribute('y')) || 0,
            parseFloat(rect.getAttribute('width')) || 100,
            parseFloat(rect.getAttribute('height')) || 100
        );
        // Parse corner radius
        const rx = parseFloat(rect.getAttribute('rx'));
        if (rx) shape.rx = rx;
        this.applyCommonAttributes(shape, rect);
        this.canvas.addShape(shape);
    }

    parseEllipse(ellipse) {
        const shape = new Ellipse(
            parseFloat(ellipse.getAttribute('cx')) || 0,
            parseFloat(ellipse.getAttribute('cy')) || 0,
            parseFloat(ellipse.getAttribute('rx')) || 50,
            parseFloat(ellipse.getAttribute('ry')) || 50
        );
        this.applyCommonAttributes(shape, ellipse);
        this.canvas.addShape(shape);
    }

    parseLine(line) {
        const shape = new Line(
            parseFloat(line.getAttribute('x1')) || 0,
            parseFloat(line.getAttribute('y1')) || 0,
            parseFloat(line.getAttribute('x2')) || 100,
            parseFloat(line.getAttribute('y2')) || 100
        );
        this.applyCommonAttributes(shape, line);
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

    parseText(text) {
        const fontSize = parseFloat(text.getAttribute('font-size')) || 24;
        const fontFamily = text.getAttribute('font-family') || 'Arial';
        const shape = new TextShape(
            parseFloat(text.getAttribute('x')) || 0,
            parseFloat(text.getAttribute('y')) || 0,
            text.textContent || 'Text',
            fontSize,
            fontFamily
        );
        this.applyCommonAttributes(shape, text);
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

        shape.stroke = stroke || 'none';
        if (strokeWidth) shape.strokeWidth = parseFloat(strokeWidth);

        // Parse opacity attribute (0-1 in SVG, 0-100 in app)
        const opacity = element.getAttribute('opacity');
        if (opacity) {
            shape.opacity = parseFloat(opacity) * 100;
        }

        // Handle fill - check if it's a gradient reference
        if (fill && fill.startsWith('url(#')) {
            const gradientId = fill.match(/url\(#([^)]+)\)/)?.[1];
            if (gradientId && this.gradientMap && this.gradientMap[gradientId]) {
                const gradient = this.gradientMap[gradientId].clone();
                shape.fillGradient = gradient;
                shape.fill = `url(#${gradient.id})`;
                // Register gradient with manager
                if (typeof gradientManager !== 'undefined') {
                    gradientManager.addOrUpdateGradient(gradient);
                }
            } else {
                shape.fill = 'none';
                shape.fillGradient = null;
            }
        } else {
            shape.fill = fill || 'none';
            shape.fillGradient = null;
        }

        // Parse transform attribute for rotation and skew
        const transform = element.getAttribute('transform');
        if (transform) {
            const rotateMatch = transform.match(/rotate\(\s*([\d.-]+)/);
            if (rotateMatch) {
                shape.rotation = parseFloat(rotateMatch[1]) || 0;
            }

            // Parse skewX from transform attribute
            const skewXMatch = transform.match(/skewX\(\s*([\d.-]+)/);
            if (skewXMatch) {
                shape.skewX = parseFloat(skewXMatch[1]) || 0;
            }

            // Parse skewY from transform attribute
            const skewYMatch = transform.match(/skewY\(\s*([\d.-]+)/);
            if (skewYMatch) {
                shape.skewY = parseFloat(skewYMatch[1]) || 0;
            }

            // Parse scale from transform (for flip operations)
            const scaleMatch = transform.match(/scale\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)/);
            if (scaleMatch) {
                shape.scaleX = parseFloat(scaleMatch[1]) || 1;
                shape.scaleY = parseFloat(scaleMatch[2]) || 1;
            }
        }

        // Parse 3D rotation from data attributes
        shape.rotateX = parseFloat(element.getAttribute('data-rotate-x')) || 0;
        shape.rotateY = parseFloat(element.getAttribute('data-rotate-y')) || 0;
        shape.perspective = parseFloat(element.getAttribute('data-perspective')) || 1000;
    }

    async saveCurrentFile() {
        if (!this.currentFileId) {
            // Create a new file with current content (don't clear canvas)
            const file = {
                name: 'Untitled',
                content: this.getSVGContent(),
                width: appState.svgWidth,
                height: appState.svgHeight,
                viewBox: appState.viewBox,
                thumbnail: this.generateThumbnail()
            };

            const id = await fileDatabase.saveFile(file);
            this.currentFileId = id;
            this.isDirty = false;

            eventBus.emit('file:opened', { id, name: file.name });
            this.updateSaveStatus('saved');
            return;
        }

        const file = await fileDatabase.getFile(this.currentFileId);
        if (!file) {
            // File was deleted externally, create new file for current content
            this.currentFileId = null;
            return this.saveCurrentFile();
        }

        file.content = this.getSVGContent();
        file.width = appState.svgWidth;
        file.height = appState.svgHeight;
        file.viewBox = appState.viewBox;
        file.thumbnail = this.generateThumbnail();

        await fileDatabase.saveFile(file);
        this.isDirty = false;
        this.updateSaveStatus('saved');
    }

    async renameFile(id, name) {
        const file = await fileDatabase.getFile(id);
        if (!file) return;

        file.name = name;
        await fileDatabase.saveFile(file);

        if (id === this.currentFileId) {
            eventBus.emit('file:renamed', { id, name });
        }
    }

    getSVGContent() {
        const svg = document.getElementById('svg-canvas').cloneNode(true);

        const handlesLayer = svg.querySelector('#handles-layer');
        if (handlesLayer) {
            handlesLayer.remove();
        }

        // Remove background rect (not a user shape)
        const backgroundRect = svg.querySelector('#canvas-background');
        if (backgroundRect) {
            backgroundRect.remove();
        }

        svg.querySelectorAll('[data-shape-id]').forEach(el => {
            el.removeAttribute('data-shape-id');
        });

        const serializer = new XMLSerializer();
        return serializer.serializeToString(svg);
    }

    generateThumbnail() {
        const svg = document.getElementById('svg-canvas').cloneNode(true);

        const handlesLayer = svg.querySelector('#handles-layer');
        if (handlesLayer) {
            handlesLayer.remove();
        }

        svg.querySelectorAll('[data-shape-id]').forEach(el => {
            el.removeAttribute('data-shape-id');
        });

        svg.setAttribute('width', '120');
        svg.setAttribute('height', '90');

        const serializer = new XMLSerializer();
        return serializer.serializeToString(svg);
    }

    exportToFile() {
        const svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + this.getSVGContent();
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = (this.getCurrentFileName() || 'drawing') + '.svg';
        a.click();

        URL.revokeObjectURL(url);
    }

    async importFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                const content = e.target.result;
                const name = file.name.replace(/\.svg$/i, '');

                const parser = new DOMParser();
                const doc = parser.parseFromString(content, 'image/svg+xml');
                const svg = doc.querySelector('svg');

                if (!svg) {
                    reject(new Error('Invalid SVG file'));
                    return;
                }

                const width = parseInt(svg.getAttribute('width')) || 800;
                const height = parseInt(svg.getAttribute('height')) || 600;
                const viewBox = svg.getAttribute('viewBox') || `0 0 ${width} ${height}`;

                const fileRecord = {
                    name: name,
                    content: content,
                    width: width,
                    height: height,
                    viewBox: viewBox
                };

                const id = await fileDatabase.saveFile(fileRecord);
                await this.openFile(id);

                resolve(id);
            };

            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };

            reader.readAsText(file);
        });
    }

    getCurrentFileName() {
        return this._currentFileName || 'Untitled';
    }

    setCurrentFileName(name) {
        this._currentFileName = name;
    }
}
