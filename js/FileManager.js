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

        svgElement.querySelectorAll('ellipse').forEach(ellipse => {
            const shape = new Ellipse(
                parseFloat(ellipse.getAttribute('cx')) || 0,
                parseFloat(ellipse.getAttribute('cy')) || 0,
                parseFloat(ellipse.getAttribute('rx')) || 50,
                parseFloat(ellipse.getAttribute('ry')) || 50
            );
            this.applyCommonAttributes(shape, ellipse);
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
                // Close the polygon by duplicating the first point at the end
                points.push({ ...points[0] });
                const shape = new Polyline(points);
                this.applyCommonAttributes(shape, polygon);
                this.canvas.addShape(shape);
            }
        });

        svgElement.querySelectorAll('line').forEach(line => {
            const shape = new Line(
                parseFloat(line.getAttribute('x1')) || 0,
                parseFloat(line.getAttribute('y1')) || 0,
                parseFloat(line.getAttribute('x2')) || 100,
                parseFloat(line.getAttribute('y2')) || 100
            );
            this.applyCommonAttributes(shape, line);
            this.canvas.addShape(shape);
        });

        svgElement.querySelectorAll('text').forEach(text => {
            const shape = new TextShape(
                parseFloat(text.getAttribute('x')) || 0,
                parseFloat(text.getAttribute('y')) || 0,
                text.textContent || 'Text'
            );
            this.applyCommonAttributes(shape, text);
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

        shape.stroke = stroke || 'none';
        shape.fill = fill || 'none';
        if (strokeWidth) shape.strokeWidth = parseFloat(strokeWidth);
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
