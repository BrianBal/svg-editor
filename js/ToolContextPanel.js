/**
 * ToolContextPanel - Shows [tool icon] + [tab buttons] layout
 * Replaces ToolsPalette when a drawing tool is active
 */
class ToolContextPanel {
    constructor(tabManager) {
        this.tabManager = tabManager;
        this.container = document.getElementById('toolbar-container');
        this.currentTool = null;
        this.tabs = [];
        this.activeTabId = null;

        // Tool icons (same as ToolsPalette)
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
    }

    show(toolName) {
        // Only re-render if tool changed or panel doesn't exist
        if (this.currentTool !== toolName || !this.panel) {
            this.currentTool = toolName;
            this.render();
        }
        if (this.panel) {
            this.panel.style.display = 'flex';
        }
    }

    hide() {
        if (this.panel) {
            this.panel.style.display = 'none';
        }
    }

    setTabs(tabs) {
        // Check if tabs actually changed
        const tabsChanged = !this.tabs ||
            tabs.length !== this.tabs.length ||
            tabs.some((tab, i) => !this.tabs[i] || tab.id !== this.tabs[i].id);

        if (tabsChanged) {
            this.tabs = tabs;
            this.renderTabs();
        }
    }

    setActiveTab(tabId) {
        this.activeTabId = tabId;
        if (this.panel) {
            this.panel.querySelectorAll('.tool-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.tabId === tabId);
            });
        }
    }

    render() {
        // Remove existing panel if any
        const existing = document.getElementById('tool-context-panel');
        const isUpdate = !!existing;
        if (existing) existing.remove();

        const panel = document.createElement('div');
        panel.className = 'tool-context overlay-panel';
        panel.id = 'tool-context-panel';
        panel.style.display = 'none';

        // Skip animation on updates (only animate initial render)
        if (isUpdate) {
            panel.style.animation = 'none';
        }

        // Tool icon
        const iconContainer = document.createElement('div');
        iconContainer.className = 'tool-context-icon';
        iconContainer.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${this.toolIcons[this.currentTool]}
            </svg>
        `;
        panel.appendChild(iconContainer);

        // Tabs container
        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'tool-tabs';
        tabsContainer.id = 'tool-tabs-container';
        panel.appendChild(tabsContainer);

        this.container.appendChild(panel);
        this.panel = panel;
    }

    renderTabs() {
        if (!this.panel) return;

        const tabsContainer = this.panel.querySelector('#tool-tabs-container');
        if (!tabsContainer) return;

        // Check if we're just updating existing tabs
        const existingTabs = tabsContainer.querySelectorAll('.tool-tab');
        const isUpdate = existingTabs.length > 0;

        tabsContainer.innerHTML = '';

        this.tabs.forEach((tab, index) => {
            const button = document.createElement('button');
            button.className = 'tool-tab';
            button.dataset.tabId = tab.id;
            button.textContent = tab.label;

            if (tab.id === this.activeTabId) {
                button.classList.add('active');
            }

            // Skip stagger animation on updates
            if (isUpdate) {
                button.style.animation = 'none';
            }

            button.addEventListener('click', () => {
                window.eventBus.emit('tab:clicked', tab.id);
            });

            tabsContainer.appendChild(button);
        });
    }
}
