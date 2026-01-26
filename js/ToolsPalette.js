/**
 * ToolsPalette - Horizontal floating toolbar with tool buttons
 * Shows when Select tool is active, hides when drawing tools are active
 */
class ToolsPalette {
    constructor(canvas) {
        this.canvas = canvas;
        this.container = document.getElementById('toolbar-container');
        this.activeTool = 'select';
        this.isDragging = false;

        // Tool icons SVG data
        this.toolIcons = {
            select: '<path d="M4 4l7 17 2.5-6.5L20 12 4 4z"/>',
            rectangle: '<rect x="4" y="6" width="16" height="12" rx="1"/>',
            ellipse: '<ellipse cx="12" cy="12" rx="9" ry="6"/>',
            line: '<line x1="5" y1="19" x2="19" y2="5"/>',
            polyline: '<polyline points="4,18 9,8 15,14 20,6"/>',
            pen: '<path d="M4 18 Q 8 6, 12 12 T 20 6"/><circle cx="4" cy="18" r="2" fill="currentColor"/><circle cx="20" cy="6" r="2" fill="currentColor"/>',
            star: '<polygon points="12,2 15,9 22,9 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9 9,9"/>',
            smartpencil: '<path d="M19 3L21 5L8 18L3 19L4 14L17 1z" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 5L19 9" stroke-linecap="round"/><circle cx="7" cy="17" r="1" fill="currentColor"/>',
            text: '<path d="M6 4h12M12 4v16M8 20h8"/>'
        };

        // Tool titles and shortcuts
        this.toolLabels = {
            select: 'Select (V)',
            rectangle: 'Rectangle (R)',
            ellipse: 'Ellipse (E)',
            line: 'Line (L)',
            polyline: 'Polyline (P)',
            pen: 'Pen Tool (B)',
            star: 'Star (W)',
            smartpencil: 'Smart Pencil (S)',
            text: 'Text (T)'
        };

        this.render();
        this.attachEventListeners();
    }

    render() {
        // Don't re-render if palette already exists
        if (this.palette) return;

        const palette = document.createElement('div');
        palette.className = 'tools-palette overlay-panel';
        palette.id = 'tools-palette';

        Object.entries(this.toolIcons).forEach(([tool, iconPath]) => {
            const button = document.createElement('button');
            button.className = 'tool-btn';
            button.dataset.tool = tool;
            button.title = this.toolLabels[tool];
            if (tool === 'select') button.classList.add('active');

            button.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    ${iconPath}
                </svg>
            `;

            palette.appendChild(button);
        });

        this.container.appendChild(palette);
        this.palette = palette;
    }

    attachEventListeners() {
        // Handle tool button clicks
        this.palette.addEventListener('click', (e) => {
            const toolBtn = e.target.closest('.tool-btn');
            if (!toolBtn) return;

            const toolName = toolBtn.dataset.tool;
            appState.setTool(toolName);
        });

        // Listen to tool changes from canvas
        window.eventBus.on('tool:changed', (toolName) => {
            this.setActiveTool(toolName);
        });

        // Listen to selection changes (but not during drag)
        window.eventBus.on('selection:changed', () => {
            if (!this.isDragging) {
                this.updateVisibility();
            }
        });

        // Track drag state to prevent palette from hiding during drag
        const svg = document.getElementById('svg-canvas');
        if (svg) {
            svg.addEventListener('mousedown', (e) => {
                const isShape = e.target.hasAttribute('data-shape-id');
                const isHandle = e.target.classList.contains('handle') ||
                                e.target.classList.contains('handle-rotation');

                if (isShape || isHandle) {
                    this.isDragging = true;
                }
            });

            svg.addEventListener('mouseup', () => {
                if (this.isDragging) {
                    this.isDragging = false;
                    this.updateVisibility();
                }
            });
        }
    }

    setActiveTool(toolName) {
        this.activeTool = toolName;

        // Update visual state
        this.palette.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === toolName);
        });

        this.updateVisibility();
    }

    updateVisibility() {
        const selectedShapes = appState.getSelectedShapes();

        // Show palette when Select tool is active AND nothing is selected
        // Hide when drawing tools are active OR shapes are selected
        if (this.activeTool === 'select' && selectedShapes.length === 0) {
            this.show();
        } else {
            this.hide();
        }
    }

    show() {
        this.palette.style.display = 'flex';
    }

    hide() {
        this.palette.style.display = 'none';
    }
}
