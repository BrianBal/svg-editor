class App {
    constructor() {
        this.init();
    }

    async init() {
        this.canvas = new SVGCanvas();

        const tools = {
            select: new SelectTool(this.canvas),
            polyline: new PolylineTool(this.canvas),
            pen: new PenTool(this.canvas),
            rectangle: new RectangleTool(this.canvas),
            ellipse: new EllipseTool(this.canvas),
            line: new LineTool(this.canvas),
            star: new StarTool(this.canvas),
            text: new TextTool(this.canvas)
        };
        this.canvas.setTools(tools);

        this.layersPanel = new LayersPanel(this.canvas);
        this.propertiesPanel = new PropertiesPanel(this.canvas);

        this.loader = new SVGLoader(this.canvas);

        // Initialize file management
        await fileDatabase.init();
        this.fileManager = new FileManager(this.canvas);
        this.fileBrowser = new FileBrowserDialog(this.fileManager);

        this.zoom = 100;
        this.setupZoomControls();
        this.setupKeyboardShortcuts();
        this.setupFileManagement();

        console.log('SVG Editor initialized');
    }

    setupFileManagement() {
        const openBtn = document.getElementById('btn-open');
        const exportBtn = document.getElementById('btn-export');
        const fileNameInput = document.getElementById('file-name');
        const saveStatus = document.getElementById('save-status');

        openBtn.addEventListener('click', () => {
            this.fileBrowser.open();
        });

        exportBtn.addEventListener('click', () => {
            this.fileManager.exportToFile();
        });

        let renameTimeout = null;
        fileNameInput.addEventListener('input', () => {
            if (renameTimeout) clearTimeout(renameTimeout);
            renameTimeout = setTimeout(() => {
                if (this.fileManager.currentFileId) {
                    this.fileManager.renameFile(this.fileManager.currentFileId, fileNameInput.value);
                }
            }, 500);
        });

        fileNameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                fileNameInput.blur();
            }
        });

        eventBus.on('file:opened', ({ id, name }) => {
            fileNameInput.value = name;
            this.fileManager.setCurrentFileName(name);
        });

        eventBus.on('file:renamed', ({ id, name }) => {
            if (id === this.fileManager.currentFileId) {
                fileNameInput.value = name;
                this.fileManager.setCurrentFileName(name);
            }
        });

        eventBus.on('file:status', (status) => {
            saveStatus.className = 'save-status ' + status;
            if (status === 'saving') {
                saveStatus.textContent = 'Saving...';
            } else if (status === 'saved') {
                saveStatus.textContent = 'Saved';
            } else {
                saveStatus.textContent = '';
            }
        });
    }

    setupZoomControls() {
        const slider = document.getElementById('zoom-slider');
        const zoomValue = document.getElementById('zoom-value');
        const zoomIn = document.getElementById('zoom-in');
        const zoomOut = document.getElementById('zoom-out');
        const zoomFit = document.getElementById('zoom-fit');
        const canvasContainer = document.getElementById('canvas-container');
        const canvasPanel = document.getElementById('canvas-panel');

        const canvasWrapper = document.getElementById('canvas-wrapper');

        const updateZoom = (value) => {
            this.zoom = Math.max(10, Math.min(400, value));
            slider.value = this.zoom;
            zoomValue.textContent = `${this.zoom}%`;

            const scale = this.zoom / 100;

            // Set explicit dimensions on container to match SVG (ensures background scales correctly)
            canvasContainer.style.width = appState.svgWidth + 'px';
            canvasContainer.style.height = appState.svgHeight + 'px';
            canvasContainer.style.transform = `scale(${scale})`;
            canvasContainer.style.transformOrigin = 'top left';

            const scaledWidth = appState.svgWidth * scale;
            const scaledHeight = appState.svgHeight * scale;
            const panelRect = canvasPanel.getBoundingClientRect();

            // CSS transform doesn't affect layout size, so we use margins
            // to reserve space for the scaled content (enables scrolling)
            const extraWidth = appState.svgWidth * (scale - 1);
            const extraHeight = appState.svgHeight * (scale - 1);
            canvasContainer.style.marginRight = Math.max(0, extraWidth) + 'px';
            canvasContainer.style.marginBottom = Math.max(0, extraHeight) + 'px';

            // Calculate padding to center when zoomed out, minimum 40px
            const paddingX = Math.max(40, (panelRect.width - scaledWidth) / 2);
            const paddingY = Math.max(40, (panelRect.height - scaledHeight) / 2);
            canvasWrapper.style.padding = `${paddingY}px ${paddingX}px`;
        };

        slider.addEventListener('input', (e) => {
            updateZoom(parseInt(e.target.value));
        });

        zoomIn.addEventListener('click', () => {
            updateZoom(this.zoom + 10);
        });

        zoomOut.addEventListener('click', () => {
            updateZoom(this.zoom - 10);
        });

        zoomFit.addEventListener('click', () => {
            const panelRect = canvasPanel.getBoundingClientRect();
            const canvasWidth = appState.svgWidth;
            const canvasHeight = appState.svgHeight;
            const padding = 80;

            const scaleX = (panelRect.width - padding) / canvasWidth;
            const scaleY = (panelRect.height - padding) / canvasHeight;
            const scale = Math.min(scaleX, scaleY, 1) * 100;

            updateZoom(Math.round(scale));
        });

        // Mouse wheel zoom
        canvasPanel.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -10 : 10;
                updateZoom(this.zoom + delta);
            }
        }, { passive: false });

        // Store updateZoom for keyboard shortcuts
        this.updateZoom = updateZoom;

        // Initialize canvas position on load
        updateZoom(100);

        // Update container dimensions when a new file is loaded
        eventBus.on('canvas:loaded', () => {
            updateZoom(this.zoom);
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            const moveAmount = e.shiftKey ? 10 : 1;

            switch (e.key) {
                case 'Delete':
                case 'Backspace':
                    const selectedShapes = appState.getSelectedShapes();
                    if (selectedShapes.length > 0) {
                        // Delete all selected shapes
                        selectedShapes.forEach(shape => {
                            this.canvas.removeShape(shape);
                        });
                        appState.deselectAll();
                    }
                    break;

                case 'Escape':
                    appState.deselectAll();
                    appState.setTool('select');
                    break;

                case 'z':
                case 'Z':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        if (e.shiftKey) {
                            historyManager.redo();
                        } else {
                            historyManager.undo();
                        }
                    }
                    break;

                case 'v':
                case 'V':
                    if (!e.ctrlKey && !e.metaKey) {
                        appState.setTool('select');
                    }
                    break;

                case 'p':
                case 'P':
                    if (!e.ctrlKey && !e.metaKey) {
                        appState.setTool('polyline');
                    }
                    break;

                case 'r':
                case 'R':
                    if (!e.ctrlKey && !e.metaKey) {
                        appState.setTool('rectangle');
                    }
                    break;

                case 'e':
                case 'E':
                    if (!e.ctrlKey && !e.metaKey) {
                        appState.setTool('ellipse');
                    }
                    break;

                case 'l':
                case 'L':
                    if (!e.ctrlKey && !e.metaKey) {
                        appState.setTool('line');
                    }
                    break;

                case 's':
                case 'S':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.fileManager.saveCurrentFile();
                    } else {
                        appState.setTool('star');
                    }
                    break;

                case 't':
                case 'T':
                    if (!e.ctrlKey && !e.metaKey) {
                        appState.setTool('text');
                    }
                    break;

                case 'b':
                case 'B':
                    if (!e.ctrlKey && !e.metaKey) {
                        appState.setTool('pen');
                    }
                    break;

                case 'ArrowUp':
                    this.moveSelectedShape(0, -moveAmount);
                    e.preventDefault();
                    break;

                case 'ArrowDown':
                    this.moveSelectedShape(0, moveAmount);
                    e.preventDefault();
                    break;

                case 'ArrowLeft':
                    this.moveSelectedShape(-moveAmount, 0);
                    e.preventDefault();
                    break;

                case 'ArrowRight':
                    this.moveSelectedShape(moveAmount, 0);
                    e.preventDefault();
                    break;

                case '=':
                case '+':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.updateZoom(this.zoom + 10);
                    }
                    break;

                case '-':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.updateZoom(this.zoom - 10);
                    }
                    break;

                case '0':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.updateZoom(100);
                    }
                    break;
            }
        });
    }

    moveSelectedShapes(dx, dy) {
        const shapes = appState.getSelectedShapes();
        if (shapes.length === 0) return;

        const ids = shapes.map(s => s.id);

        if (window.historyManager) {
            if (ids.length === 1) {
                historyManager.beginTransaction('move', ids[0]);
            } else {
                historyManager.beginMultiTransaction('move', ids);
            }
        }

        shapes.forEach(shape => shape.move(dx, dy));

        if (window.historyManager) {
            if (ids.length === 1) {
                historyManager.endTransaction();
            } else {
                historyManager.endMultiTransaction();
            }
        }

        this.canvas.selection.updateHandles();
    }

    // Backwards compatibility alias
    moveSelectedShape(dx, dy) {
        this.moveSelectedShapes(dx, dy);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
