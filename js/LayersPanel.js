class LayersPanel {
    constructor(canvas) {
        this.canvas = canvas;
        this.listElement = document.getElementById('layers-list');
        this.draggedItem = null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        eventBus.on('shape:created', () => this.render());
        eventBus.on('shape:deleted', () => this.render());
        eventBus.on('shape:updated', () => this.render());
        eventBus.on('shape:selected', (shape) => this.highlightLayer(shape?.id));
        eventBus.on('shape:deselected', () => this.highlightLayer(null));
        eventBus.on('canvas:loaded', () => this.render());
        eventBus.on('shapes:reordered', () => this.render());

        this.listElement.addEventListener('click', (e) => {
            // Handle visibility toggle
            const visibilityCheckbox = e.target.closest('.layer-visibility');
            if (visibilityCheckbox) {
                e.stopPropagation();
                const shapeId = visibilityCheckbox.closest('.layer-item').dataset.shapeId;
                this.toggleVisibility(shapeId, visibilityCheckbox.checked);
                return;
            }

            // Handle duplicate button
            const duplicateBtn = e.target.closest('.layer-duplicate-btn');
            if (duplicateBtn) {
                e.stopPropagation();
                const shapeId = duplicateBtn.closest('.layer-item').dataset.shapeId;
                this.canvas.duplicateShape(shapeId);
                return;
            }

            // Handle layer selection
            const layerItem = e.target.closest('.layer-item');
            if (layerItem) {
                const shapeId = layerItem.dataset.shapeId;
                appState.selectShape(shapeId);
            }
        });

        this.listElement.addEventListener('dragstart', (e) => this.handleDragStart(e));
        this.listElement.addEventListener('dragend', (e) => this.handleDragEnd(e));
        this.listElement.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.listElement.addEventListener('drop', (e) => this.handleDrop(e));
    }

    toggleVisibility(shapeId, visible) {
        const shape = appState.getShapeById(shapeId);
        if (shape && shape.element) {
            shape.visible = visible;
            shape.element.style.display = visible ? '' : 'none';
        }
    }

    handleDragStart(e) {
        const layerItem = e.target.closest('.layer-item');
        if (!layerItem) return;

        this.draggedItem = layerItem;
        layerItem.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', layerItem.dataset.shapeId);
    }

    handleDragEnd(e) {
        if (this.draggedItem) {
            this.draggedItem.classList.remove('dragging');
            this.draggedItem = null;
        }
        this.listElement.querySelectorAll('.layer-item').forEach(item => {
            item.classList.remove('drag-over');
        });
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        const layerItem = e.target.closest('.layer-item');
        if (!layerItem || layerItem === this.draggedItem) return;

        this.listElement.querySelectorAll('.layer-item').forEach(item => {
            item.classList.remove('drag-over');
        });
        layerItem.classList.add('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        const targetItem = e.target.closest('.layer-item');
        if (!targetItem || !this.draggedItem || targetItem === this.draggedItem) return;

        const draggedShapeId = this.draggedItem.dataset.shapeId;
        const targetShapeId = targetItem.dataset.shapeId;

        const targetArrayIndex = appState.getShapeIndex(targetShapeId);
        this.canvas.reorderShapeDOM(draggedShapeId, targetArrayIndex);
    }

    render() {
        this.listElement.innerHTML = '';

        [...appState.shapes].reverse().forEach((shape) => {
            const li = document.createElement('li');
            li.className = 'layer-item';
            li.draggable = true;
            li.dataset.shapeId = shape.id;

            const bounds = shape.getBounds();
            const dimensions = `${Math.round(bounds.width)} × ${Math.round(bounds.height)} px`;
            const isVisible = shape.visible !== false;

            li.innerHTML = `
                <div class="layer-thumbnail">
                    ${this.getShapeThumbnail(shape)}
                </div>
                <div class="layer-info">
                    <div class="layer-name">
                        <span class="layer-name-icon">${this.getShapeIcon(shape.type)}</span>
                        ${this.getShapeName(shape)}
                    </div>
                    <div class="layer-dimensions">${dimensions}</div>
                </div>
                <div class="layer-actions">
                    <button class="layer-duplicate-btn" title="Duplicate">
                        <svg viewBox="0 0 16 16" width="14" height="14">
                            <rect x="1" y="4" width="7" height="7" fill="none" stroke="currentColor" stroke-width="1.5"/>
                            <rect x="4" y="1" width="7" height="7" fill="none" stroke="currentColor" stroke-width="1.5"/>
                        </svg>
                    </button>
                    <input type="checkbox" class="layer-visibility" ${isVisible ? 'checked' : ''} title="Visibility">
                </div>
            `;

            if (shape.id === appState.selectedShapeId) {
                li.classList.add('selected');
            }

            this.listElement.appendChild(li);
        });
    }

    getShapeThumbnail(shape) {
        const bounds = shape.getBounds();
        const padding = 4;
        const size = 32;

        // Calculate scale to fit shape in thumbnail
        const scaleX = (size - padding * 2) / Math.max(bounds.width, 1);
        const scaleY = (size - padding * 2) / Math.max(bounds.height, 1);
        const scale = Math.min(scaleX, scaleY, 1);

        // Calculate offset to center shape
        const scaledWidth = bounds.width * scale;
        const scaledHeight = bounds.height * scale;
        const offsetX = (size - scaledWidth) / 2 - bounds.x * scale;
        const offsetY = (size - scaledHeight) / 2 - bounds.y * scale;

        const fillColor = shape.fill === 'none' ? 'transparent' : '#888';

        if (shape.type === 'rectangle') {
            return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
                <rect
                    x="${bounds.x * scale + offsetX}"
                    y="${bounds.y * scale + offsetY}"
                    width="${bounds.width * scale}"
                    height="${bounds.height * scale}"
                    fill="${fillColor}"
                    stroke="#888"
                    stroke-width="1"
                />
            </svg>`;
        } else if (shape.type === 'ellipse') {
            const cx = shape.cx * scale + offsetX;
            const cy = shape.cy * scale + offsetY;
            const rx = shape.rx * scale;
            const ry = shape.ry * scale;
            return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
                <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"
                    fill="${fillColor}" stroke="#888" stroke-width="1"/>
            </svg>`;
        } else if (shape.type === 'line') {
            const x1 = shape.x1 * scale + offsetX;
            const y1 = shape.y1 * scale + offsetY;
            const x2 = shape.x2 * scale + offsetX;
            const y2 = shape.y2 * scale + offsetY;
            return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
                <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
                    stroke="#888" stroke-width="1.5"/>
            </svg>`;
        } else if (shape.type === 'polyline') {
            const points = shape.points.map(p =>
                `${p.x * scale + offsetX},${p.y * scale + offsetY}`
            ).join(' ');
            return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
                <polyline points="${points}" fill="none" stroke="#888" stroke-width="1.5"/>
            </svg>`;
        } else if (shape.type === 'star') {
            const starPoints = [];
            const angleStep = Math.PI / shape.points;
            for (let i = 0; i < shape.points * 2; i++) {
                const radius = i % 2 === 0 ? shape.outerRadius : shape.innerRadius;
                const angle = i * angleStep - Math.PI / 2;
                const x = (shape.cx + radius * Math.cos(angle)) * scale + offsetX;
                const y = (shape.cy + radius * Math.sin(angle)) * scale + offsetY;
                starPoints.push(`${x},${y}`);
            }
            return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
                <polygon points="${starPoints.join(' ')}" fill="${fillColor}" stroke="#888" stroke-width="1"/>
            </svg>`;
        } else if (shape.type === 'text') {
            return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
                <text x="${size/2}" y="${size/2 + 4}" text-anchor="middle" font-size="14" fill="#888">T</text>
            </svg>`;
        }
        return '';
    }

    getShapeIcon(type) {
        const icons = {
            rectangle: `<svg viewBox="0 0 12 12" width="12" height="12">
                <rect x="1" y="3" width="10" height="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
            </svg>`,
            ellipse: `<svg viewBox="0 0 12 12" width="12" height="12">
                <ellipse cx="6" cy="6" rx="5" ry="3" fill="none" stroke="currentColor" stroke-width="1.5"/>
            </svg>`,
            line: `<svg viewBox="0 0 12 12" width="12" height="12">
                <line x1="2" y1="10" x2="10" y2="2" stroke="currentColor" stroke-width="1.5"/>
            </svg>`,
            polyline: `<svg viewBox="0 0 12 12" width="12" height="12">
                <polyline points="1,9 4,3 8,7 11,2" fill="none" stroke="currentColor" stroke-width="1.5"/>
            </svg>`,
            star: `<svg viewBox="0 0 12 12" width="12" height="12">
                <polygon points="6,1 7.5,4.5 11,4.5 8.25,7 9.5,11 6,8.5 2.5,11 3.75,7 1,4.5 4.5,4.5" fill="none" stroke="currentColor" stroke-width="1"/>
            </svg>`,
            text: `<svg viewBox="0 0 12 12" width="12" height="12">
                <text x="6" y="9" text-anchor="middle" font-size="10" fill="currentColor">T</text>
            </svg>`
        };
        return icons[type] || '';
    }

    getShapeName(shape) {
        const num = shape.id.split('-')[1];
        return `${shape.type.charAt(0).toUpperCase() + shape.type.slice(1)} ${num}`;
    }

    highlightLayer(shapeId) {
        this.listElement.querySelectorAll('.layer-item').forEach(item => {
            item.classList.toggle('selected', item.dataset.shapeId === shapeId);
        });
    }
}
