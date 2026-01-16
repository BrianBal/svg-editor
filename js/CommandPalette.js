class CommandPalette {
    constructor() {
        this.isOpen = false;
        this.commands = [];
        this.filtered = [];
        this.selectedIndex = 0;
        this.query = '';

        this.registerCommands();
        this.createDialog();
        this.setupEventListeners();
    }

    registerCommands() {
        // Tool commands
        this.commands.push(
            {
                id: 'tool:select',
                label: 'Select Tool',
                shortcut: 'V',
                action: () => appState.setTool('select'),
                isAvailable: () => true
            },
            {
                id: 'tool:rectangle',
                label: 'Rectangle Tool',
                shortcut: 'R',
                action: () => appState.setTool('rectangle'),
                isAvailable: () => true
            },
            {
                id: 'tool:ellipse',
                label: 'Ellipse Tool',
                shortcut: 'E',
                action: () => appState.setTool('ellipse'),
                isAvailable: () => true
            },
            {
                id: 'tool:line',
                label: 'Line Tool',
                shortcut: 'L',
                action: () => appState.setTool('line'),
                isAvailable: () => true
            },
            {
                id: 'tool:polyline',
                label: 'Polyline Tool',
                shortcut: 'P',
                action: () => appState.setTool('polyline'),
                isAvailable: () => true
            },
            {
                id: 'tool:pen',
                label: 'Pen Tool',
                shortcut: 'B',
                action: () => appState.setTool('pen'),
                isAvailable: () => true
            },
            {
                id: 'tool:star',
                label: 'Star Tool',
                shortcut: 'S',
                action: () => appState.setTool('star'),
                isAvailable: () => true
            },
            {
                id: 'tool:text',
                label: 'Text Tool',
                shortcut: 'T',
                action: () => appState.setTool('text'),
                isAvailable: () => true
            }
        );

        // Alignment commands (require 2+ shapes selected)
        this.commands.push(
            {
                id: 'align:left',
                label: 'Align Left',
                shortcut: null,
                action: () => this.alignShapes('left'),
                isAvailable: () => appState.selectedShapeIds.length >= 2
            },
            {
                id: 'align:center-h',
                label: 'Align Center Horizontal',
                shortcut: null,
                action: () => this.alignShapes('center-h'),
                isAvailable: () => appState.selectedShapeIds.length >= 2
            },
            {
                id: 'align:right',
                label: 'Align Right',
                shortcut: null,
                action: () => this.alignShapes('right'),
                isAvailable: () => appState.selectedShapeIds.length >= 2
            },
            {
                id: 'align:top',
                label: 'Align Top',
                shortcut: null,
                action: () => this.alignShapes('top'),
                isAvailable: () => appState.selectedShapeIds.length >= 2
            },
            {
                id: 'align:middle-v',
                label: 'Align Middle Vertical',
                shortcut: null,
                action: () => this.alignShapes('middle-v'),
                isAvailable: () => appState.selectedShapeIds.length >= 2
            },
            {
                id: 'align:bottom',
                label: 'Align Bottom',
                shortcut: null,
                action: () => this.alignShapes('bottom'),
                isAvailable: () => appState.selectedShapeIds.length >= 2
            }
        );

        // Distribute commands (require 3+ shapes selected)
        this.commands.push(
            {
                id: 'distribute:horizontal',
                label: 'Distribute Horizontal',
                shortcut: null,
                action: () => this.distributeShapes('horizontal'),
                isAvailable: () => appState.selectedShapeIds.length >= 3
            },
            {
                id: 'distribute:vertical',
                label: 'Distribute Vertical',
                shortcut: null,
                action: () => this.distributeShapes('vertical'),
                isAvailable: () => appState.selectedShapeIds.length >= 3
            }
        );

        // Shape operations (require 1+ shape selected)
        this.commands.push(
            {
                id: 'shape:delete',
                label: 'Delete',
                shortcut: 'Del',
                action: () => this.deleteSelectedShapes(),
                isAvailable: () => appState.selectedShapeIds.length > 0
            },
            {
                id: 'shape:duplicate',
                label: 'Duplicate',
                shortcut: null,
                action: () => this.duplicateSelectedShapes(),
                isAvailable: () => appState.selectedShapeIds.length > 0
            },
            {
                id: 'shape:bring-forward',
                label: 'Bring Forward',
                shortcut: null,
                action: () => this.reorderShapes('bring-forward'),
                isAvailable: () => appState.selectedShapeIds.length > 0
            },
            {
                id: 'shape:send-backward',
                label: 'Send Backward',
                shortcut: null,
                action: () => this.reorderShapes('send-backward'),
                isAvailable: () => appState.selectedShapeIds.length > 0
            },
            {
                id: 'shape:bring-to-front',
                label: 'Bring to Front',
                shortcut: null,
                action: () => this.reorderShapes('bring-to-front'),
                isAvailable: () => appState.selectedShapeIds.length > 0
            },
            {
                id: 'shape:send-to-back',
                label: 'Send to Back',
                shortcut: null,
                action: () => this.reorderShapes('send-to-back'),
                isAvailable: () => appState.selectedShapeIds.length > 0
            }
        );

        // Flip operations (require 1+ shape selected)
        this.commands.push(
            {
                id: 'flip:horizontal',
                label: 'Flip Horizontal',
                shortcut: null,
                action: () => this.flipShapes('horizontal'),
                isAvailable: () => appState.selectedShapeIds.length > 0
            },
            {
                id: 'flip:vertical',
                label: 'Flip Vertical',
                shortcut: null,
                action: () => this.flipShapes('vertical'),
                isAvailable: () => appState.selectedShapeIds.length > 0
            }
        );

        // File operations
        this.commands.push(
            {
                id: 'file:save',
                label: 'Save',
                shortcut: 'Ctrl+S',
                action: () => window.app.fileManager.saveCurrentFile(),
                isAvailable: () => true
            },
            {
                id: 'file:export',
                label: 'Export SVG',
                shortcut: null,
                action: () => window.app.fileManager.exportToFile(),
                isAvailable: () => true
            }
        );

        // View operations
        this.commands.push(
            {
                id: 'view:zoom-in',
                label: 'Zoom In',
                shortcut: 'Ctrl++',
                action: () => window.app.updateZoom(window.app.zoom + 10),
                isAvailable: () => true
            },
            {
                id: 'view:zoom-out',
                label: 'Zoom Out',
                shortcut: 'Ctrl+-',
                action: () => window.app.updateZoom(window.app.zoom - 10),
                isAvailable: () => true
            },
            {
                id: 'view:zoom-reset',
                label: 'Reset Zoom',
                shortcut: 'Ctrl+0',
                action: () => window.app.updateZoom(100),
                isAvailable: () => true
            }
        );

        // Edit operations
        this.commands.push(
            {
                id: 'edit:undo',
                label: 'Undo',
                shortcut: 'Ctrl+Z',
                action: () => historyManager.undo(),
                isAvailable: () => true
            },
            {
                id: 'edit:redo',
                label: 'Redo',
                shortcut: 'Ctrl+Shift+Z',
                action: () => historyManager.redo(),
                isAvailable: () => true
            },
            {
                id: 'edit:deselect',
                label: 'Deselect All',
                shortcut: 'Esc',
                action: () => appState.deselectAll(),
                isAvailable: () => appState.selectedShapeIds.length > 0
            }
        );
    }

    createDialog() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'command-palette-overlay';
        this.overlay.innerHTML = `
            <div class="command-palette">
                <div class="command-palette-input-wrapper">
                    <input type="text"
                           class="command-palette-input"
                           placeholder="Type a command..."
                           autocomplete="off"
                           spellcheck="false">
                </div>
                <div class="command-palette-list"></div>
            </div>
        `;
        document.body.appendChild(this.overlay);

        this.input = this.overlay.querySelector('.command-palette-input');
        this.list = this.overlay.querySelector('.command-palette-list');
    }

    setupEventListeners() {
        // Click outside to close
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        });

        // Input filtering
        this.input.addEventListener('input', () => {
            this.query = this.input.value;
            this.filterCommands();
            this.selectedIndex = 0;
            this.render();
        });

        // Keyboard navigation within input
        this.input.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    this.selectNext();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.selectPrevious();
                    break;
                case 'Enter':
                    e.preventDefault();
                    this.executeSelected();
                    break;
                case 'Escape':
                    this.close();
                    break;
            }
        });

        // Mouse click on item
        this.list.addEventListener('click', (e) => {
            const item = e.target.closest('.command-palette-item');
            if (item) {
                const index = parseInt(item.dataset.index);
                this.executeCommand(this.filtered[index]);
            }
        });

        // Mouse hover on item
        this.list.addEventListener('mousemove', (e) => {
            const item = e.target.closest('.command-palette-item');
            if (item) {
                const index = parseInt(item.dataset.index);
                if (index !== this.selectedIndex) {
                    this.selectedIndex = index;
                    this.render();
                }
            }
        });
    }

    open() {
        this.isOpen = true;
        this.query = '';
        this.input.value = '';
        this.selectedIndex = 0;
        this.filterCommands();
        this.render();
        this.overlay.classList.add('open');
        this.input.focus();
    }

    close() {
        this.isOpen = false;
        this.overlay.classList.remove('open');
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    filterCommands() {
        const query = this.query.toLowerCase().trim();

        if (!query) {
            // Show all available commands
            this.filtered = this.commands.filter(cmd => cmd.isAvailable());
            return;
        }

        // Filter by label containing query (case-insensitive)
        this.filtered = this.commands
            .filter(cmd => cmd.isAvailable())
            .filter(cmd => cmd.label.toLowerCase().includes(query))
            .sort((a, b) => {
                // Prioritize matches at start of label
                const aStarts = a.label.toLowerCase().startsWith(query);
                const bStarts = b.label.toLowerCase().startsWith(query);
                if (aStarts && !bStarts) return -1;
                if (bStarts && !aStarts) return 1;
                return 0;
            });
    }

    highlightMatch(text) {
        if (!this.query) return text;

        const lowerText = text.toLowerCase();
        const lowerQuery = this.query.toLowerCase();
        const index = lowerText.indexOf(lowerQuery);

        if (index === -1) return text;

        const before = text.slice(0, index);
        const match = text.slice(index, index + this.query.length);
        const after = text.slice(index + this.query.length);

        return `${before}<mark>${match}</mark>${after}`;
    }

    selectNext() {
        if (this.filtered.length === 0) return;
        this.selectedIndex = (this.selectedIndex + 1) % this.filtered.length;
        this.render();
        this.scrollToSelected();
    }

    selectPrevious() {
        if (this.filtered.length === 0) return;
        this.selectedIndex = (this.selectedIndex - 1 + this.filtered.length) % this.filtered.length;
        this.render();
        this.scrollToSelected();
    }

    scrollToSelected() {
        const selected = this.list.querySelector('.command-palette-item.selected');
        if (selected) {
            selected.scrollIntoView({ block: 'nearest' });
        }
    }

    executeSelected() {
        if (this.filtered.length > 0 && this.selectedIndex < this.filtered.length) {
            this.executeCommand(this.filtered[this.selectedIndex]);
        }
    }

    executeCommand(command) {
        if (!command) return;
        this.close();
        command.action();
    }

    render() {
        this.list.innerHTML = '';

        if (this.filtered.length === 0) {
            this.list.innerHTML = '<div class="command-palette-empty">No commands found</div>';
            return;
        }

        this.filtered.forEach((cmd, index) => {
            const item = document.createElement('div');
            item.className = 'command-palette-item' + (index === this.selectedIndex ? ' selected' : '');
            item.dataset.index = index;

            const shortcutHtml = cmd.shortcut
                ? `<span class="command-palette-shortcut">${cmd.shortcut}</span>`
                : '';

            item.innerHTML = `
                <span class="command-palette-label">${this.highlightMatch(cmd.label)}</span>
                ${shortcutHtml}
            `;

            this.list.appendChild(item);
        });
    }

    // --- Helper Functions for Commands ---

    alignShapes(direction) {
        const shapes = appState.getSelectedShapes();
        if (shapes.length < 2) return;

        const bounds = shapes.map(s => s.getBounds());
        const minX = Math.min(...bounds.map(b => b.x));
        const maxX = Math.max(...bounds.map(b => b.x + b.width));
        const minY = Math.min(...bounds.map(b => b.y));
        const maxY = Math.max(...bounds.map(b => b.y + b.height));

        const ids = shapes.map(s => s.id);
        historyManager.beginMultiTransaction('move', ids);

        shapes.forEach((shape, i) => {
            const b = bounds[i];
            switch (direction) {
                case 'left':
                    shape.move(minX - b.x, 0);
                    break;
                case 'center-h':
                    const centerX = (minX + maxX) / 2;
                    shape.move(centerX - (b.x + b.width / 2), 0);
                    break;
                case 'right':
                    shape.move(maxX - (b.x + b.width), 0);
                    break;
                case 'top':
                    shape.move(0, minY - b.y);
                    break;
                case 'middle-v':
                    const centerY = (minY + maxY) / 2;
                    shape.move(0, centerY - (b.y + b.height / 2));
                    break;
                case 'bottom':
                    shape.move(0, maxY - (b.y + b.height));
                    break;
            }
        });

        historyManager.endMultiTransaction();
        window.app.canvas.selection.updateHandles();
    }

    distributeShapes(direction) {
        const shapes = appState.getSelectedShapes();
        if (shapes.length < 3) return;

        // Sort shapes by position
        const sorted = [...shapes].sort((a, b) => {
            const boundsA = a.getBounds();
            const boundsB = b.getBounds();
            if (direction === 'horizontal') {
                return boundsA.x - boundsB.x;
            }
            return boundsA.y - boundsB.y;
        });

        const bounds = sorted.map(s => s.getBounds());
        const ids = sorted.map(s => s.id);

        historyManager.beginMultiTransaction('move', ids);

        if (direction === 'horizontal') {
            const totalWidth = bounds.reduce((sum, b) => sum + b.width, 0);
            const leftmost = bounds[0].x;
            const rightmost = bounds[bounds.length - 1].x + bounds[bounds.length - 1].width;
            const space = (rightmost - leftmost - totalWidth) / (shapes.length - 1);

            let currentX = leftmost;
            sorted.forEach((shape, i) => {
                const b = bounds[i];
                shape.move(currentX - b.x, 0);
                currentX += b.width + space;
            });
        } else {
            const totalHeight = bounds.reduce((sum, b) => sum + b.height, 0);
            const topmost = bounds[0].y;
            const bottommost = bounds[bounds.length - 1].y + bounds[bounds.length - 1].height;
            const space = (bottommost - topmost - totalHeight) / (shapes.length - 1);

            let currentY = topmost;
            sorted.forEach((shape, i) => {
                const b = bounds[i];
                shape.move(0, currentY - b.y);
                currentY += b.height + space;
            });
        }

        historyManager.endMultiTransaction();
        window.app.canvas.selection.updateHandles();
    }

    deleteSelectedShapes() {
        const shapes = appState.getSelectedShapes();
        shapes.forEach(shape => {
            window.app.canvas.removeShape(shape);
        });
        appState.deselectAll();
    }

    duplicateSelectedShapes() {
        const shapes = appState.getSelectedShapes();
        const newIds = [];

        shapes.forEach(shape => {
            const newShape = shape.clone();
            newShape.move(20, 20);
            window.app.canvas.addShape(newShape);
            newIds.push(newShape.id);
        });

        // Select the new shapes
        appState.deselectAll();
        newIds.forEach(id => appState.addToSelection(id));
    }

    reorderShapes(action) {
        const shapes = appState.getSelectedShapes();

        // Sort by current index for consistent ordering
        const sortedByIndex = [...shapes].sort((a, b) => {
            return appState.getShapeIndex(a.id) - appState.getShapeIndex(b.id);
        });

        switch (action) {
            case 'bring-forward':
                // Process from back to front to avoid index conflicts
                [...sortedByIndex].reverse().forEach(shape => {
                    const index = appState.getShapeIndex(shape.id);
                    if (index < appState.shapes.length - 1) {
                        appState.reorderShape(shape.id, index + 1);
                    }
                });
                break;

            case 'send-backward':
                // Process from front to back
                sortedByIndex.forEach(shape => {
                    const index = appState.getShapeIndex(shape.id);
                    if (index > 0) {
                        appState.reorderShape(shape.id, index - 1);
                    }
                });
                break;

            case 'bring-to-front':
                sortedByIndex.forEach(shape => {
                    appState.reorderShape(shape.id, appState.shapes.length - 1);
                });
                break;

            case 'send-to-back':
                [...sortedByIndex].reverse().forEach((shape, i) => {
                    appState.reorderShape(shape.id, i);
                });
                break;
        }

        window.app.canvas.syncDOMOrder();
    }

    flipShapes(direction) {
        const shapes = appState.getSelectedShapes();

        if (shapes.length === 1) {
            historyManager.beginTransaction('property', shapes[0].id);
        } else {
            historyManager.beginMultiTransaction('property', shapes.map(s => s.id));
        }

        shapes.forEach(shape => {
            if (direction === 'horizontal') {
                shape.flipHorizontal();
            } else {
                shape.flipVertical();
            }
        });

        if (shapes.length === 1) {
            historyManager.endTransaction();
        } else {
            historyManager.endMultiTransaction();
        }

        window.app.canvas.selection.updateHandles();
    }
}

window.CommandPalette = CommandPalette;
