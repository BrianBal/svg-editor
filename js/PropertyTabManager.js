/**
 * Tab mapping configuration - maps tabs to property keys
 */
const TabMapping = {
    fill: {
        id: 'fill',
        label: 'Fill',
        properties: ['fill'],
        order: 1
    },
    stroke: {
        id: 'stroke',
        label: 'Stroke',
        properties: ['stroke', 'strokeWidth', 'strokeDash', 'strokeLinecap', 'strokeLinejoin'],
        order: 2
    },
    position: {
        id: 'position',
        label: 'Position',
        properties: ['x', 'y'],
        order: 3
    },
    size: {
        id: 'size',
        label: 'Size',
        properties: ['width', 'height'],
        order: 4
    },
    transform: {
        id: 'transform',
        label: 'Transform',
        properties: ['rotation', 'scaleX', 'scaleY', 'flipHorizontal', 'flipVertical'],
        order: 5
    },
    advanced: {
        id: 'advanced',
        label: 'Advanced',
        properties: ['opacity', 'skewX', 'skewY', 'rotateX', 'rotateY', 'perspective'],
        order: 6
    },
    // Shape-specific tabs (conditional)
    rectangle: {
        id: 'rectangle',
        label: 'Rectangle',
        properties: ['cornerRadius', 'tiltTop', 'tiltBottom', 'tiltLeft', 'tiltRight'],
        order: 10,
        condition: (shapes) => shapes.every(s => s.type === 'rectangle')
    },
    ellipse: {
        id: 'ellipse',
        label: 'Ellipse',
        properties: ['rx', 'ry'],
        order: 10,
        condition: (shapes) => shapes.every(s => s.type === 'ellipse')
    },
    star: {
        id: 'star',
        label: 'Star',
        properties: ['points', 'innerRadius', 'outerRadius'],
        order: 10,
        condition: (shapes) => shapes.every(s => s.type === 'star')
    },
    text: {
        id: 'text',
        label: 'Text',
        properties: ['text', 'fontSize', 'fontFamily'],
        order: 10,
        condition: (shapes) => shapes.every(s => s.type === 'text')
    },
    polyline: {
        id: 'polyline',
        label: 'Polyline',
        properties: ['pointCount', 'closed'],
        order: 10,
        condition: (shapes) => shapes.every(s => s.type === 'polyline')
    },
    path: {
        id: 'path',
        label: 'Path',
        properties: ['pointCount', 'closed'],
        order: 10,
        condition: (shapes) => shapes.every(s => s.type === 'path')
    },
    line: {
        id: 'line',
        label: 'Line',
        properties: ['x1', 'y1', 'x2', 'y2', 'length'],
        order: 10,
        condition: (shapes) => shapes.every(s => s.type === 'line')
    }
};

/**
 * PropertyTabManager - Orchestrates ToolContextPanel and PropertyWindow
 * Determines which tabs to show based on active tool and selection
 */
class PropertyTabManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.activeTool = 'select';
        this.activeTab = null;
        this.currentPropertyWindow = null;
        this.currentPointToolWindow = null;
        this.isDragging = false;

        this.toolContextPanel = new ToolContextPanel(this);
        this.attachEventListeners();
    }

    attachEventListeners() {
        // Listen to tool changes
        window.eventBus.on('tool:changed', (toolName) => {
            this.onToolChanged(toolName);
        });

        // Listen to selection changes (but not during drag)
        window.eventBus.on('selection:changed', () => {
            if (!this.isDragging) {
                this.updateUI();
            }
        });

        // Listen to tab clicks
        window.eventBus.on('tab:clicked', (tabId) => {
            this.onTabClicked(tabId);
        });

        // Listen to point selection events
        window.eventBus.on('point:selected', ({ shape, pointIndex }) => {
            this.onPointSelectionChanged(shape, pointIndex);
        });

        // Track drag state to prevent toolbar from hiding during drag
        const svg = document.getElementById('svg-canvas');
        if (svg) {
            svg.addEventListener('mousedown', (e) => {
                // Check if we're clicking on a shape or handle
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
                    // Update UI after drag completes
                    this.updateUI();
                }
            });
        }
    }

    onToolChanged(toolName) {
        this.activeTool = toolName;
        this.updateUI();
    }

    updateUI() {
        const selectedShapes = appState.getSelectedShapes();

        if (this.activeTool === 'select') {
            // Select tool active
            if (selectedShapes.length > 0) {
                // Show tabs for selected shapes
                const shapeType = this.getCommonShapeType(selectedShapes);
                if (shapeType) {
                    this.toolContextPanel.show(shapeType);
                    this.updateTabsForShapes(selectedShapes);
                } else {
                    // Mixed types - hide tool context, show tools palette
                    this.toolContextPanel.hide();
                    this.closePropertyWindow();
                }
            } else {
                // Nothing selected - hide tool context, show tools palette
                this.toolContextPanel.hide();
                this.closePropertyWindow();
            }
        } else {
            // Drawing tool active - show tool context panel with appropriate tabs
            this.toolContextPanel.show(this.activeTool);
            this.updateTabsForTool(this.activeTool);
        }
    }

    updateTabsForTool(toolName) {
        const tabs = this.getTabsForTool(toolName);
        this.toolContextPanel.setTabs(tabs);
    }

    updateTabsForShapes(shapes) {
        const tabs = this.getTabsForShapes(shapes);
        this.toolContextPanel.setTabs(tabs);
    }

    getCommonShapeType(shapes) {
        if (shapes.length === 0) return null;
        const firstType = shapes[0].type;
        const allSameType = shapes.every(s => s.type === firstType);
        return allSameType ? firstType : null;
    }

    getTabsForTool(toolName) {
        const tabs = [];

        // Get core tabs (always available)
        const coreTabs = ['fill', 'stroke', 'position', 'size', 'transform', 'advanced'];
        coreTabs.forEach(tabId => {
            tabs.push(TabMapping[tabId]);
        });

        // Add tool-specific tab based on active tool
        const toolToShapeType = {
            'rectangle': 'rectangle',
            'ellipse': 'ellipse',
            'star': 'star',
            'text': 'text',
            'polyline': 'polyline',
            'pen': 'path',
            'line': 'line'
        };

        const shapeType = toolToShapeType[toolName];
        if (shapeType && TabMapping[shapeType]) {
            tabs.push(TabMapping[shapeType]);
        }

        // Sort by order
        tabs.sort((a, b) => a.order - b.order);

        return tabs;
    }

    getTabsForShapes(shapes) {
        const tabs = [];

        // Get core tabs (always available)
        const coreTabs = ['fill', 'stroke', 'position', 'size', 'transform', 'advanced'];
        coreTabs.forEach(tabId => {
            tabs.push(TabMapping[tabId]);
        });

        // Add shape-specific tabs if applicable
        if (shapes.length > 0) {
            Object.values(TabMapping).forEach(tab => {
                if (tab.condition && tab.condition(shapes)) {
                    tabs.push(tab);
                }
            });
        }

        // Sort by order
        tabs.sort((a, b) => a.order - b.order);

        return tabs;
    }

    onTabClicked(tabId) {
        if (this.activeTab === tabId) {
            // Toggle close if same tab clicked
            this.closePropertyWindow();
            this.activeTab = null;
            this.toolContextPanel.setActiveTab(null);
        } else {
            // Open new tab
            this.activeTab = tabId;
            this.toolContextPanel.setActiveTab(tabId);
            this.openPropertyWindow(tabId);
        }
    }

    openPropertyWindow(tabId) {
        // Close existing window
        this.closePropertyWindow();

        // Create new window
        const selectedShapes = appState.getSelectedShapes();
        const tab = TabMapping[tabId];

        if (!tab) return;

        this.currentPropertyWindow = new PropertyWindow();
        this.currentPropertyWindow.open(tab, selectedShapes);
    }

    closePropertyWindow() {
        if (this.currentPropertyWindow) {
            this.currentPropertyWindow.close();
            this.currentPropertyWindow = null;
        }
    }

    isPropertyWindowOpen() {
        return this.currentPropertyWindow !== null;
    }

    onPointSelectionChanged(shape, pointIndex) {
        if (pointIndex !== null && shape) {
            // Point selected - open point tool window
            this.openPointToolWindow(shape, pointIndex);
        } else {
            // Point deselected - close point tool window
            this.closePointToolWindow();
        }
    }

    openPointToolWindow(shape, pointIndex) {
        // Close any existing point window
        this.closePointToolWindow();

        // Close regular property window if open
        this.closePropertyWindow();
        this.activeTab = null;
        this.toolContextPanel.setActiveTab(null);

        // Create and open point tool window
        this.currentPointToolWindow = new PointToolWindow();
        this.currentPointToolWindow.openForPoint(shape, pointIndex);
    }

    closePointToolWindow() {
        if (this.currentPointToolWindow) {
            this.currentPointToolWindow.close();
            this.currentPointToolWindow = null;
        }
    }

    isPointToolWindowOpen() {
        return this.currentPointToolWindow !== null;
    }
}
