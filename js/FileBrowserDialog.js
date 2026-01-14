class FileBrowserDialog {
    constructor(fileManager) {
        this.fileManager = fileManager;
        this.isOpen = false;
        this.sortField = 'lastModified';
        this.sortDirection = 'desc';

        this.createDialog();
        this.setupEventListeners();
    }

    createDialog() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'file-browser-overlay';
        this.overlay.innerHTML = `
            <div class="file-browser-dialog">
                <div class="file-browser-header">
                    <h2>Open File</h2>
                    <button class="file-browser-close" title="Close">&times;</button>
                </div>
                <div class="file-browser-toolbar">
                    <button class="btn file-browser-new">New File</button>
                    <div class="file-browser-sort">
                        <label>Sort by:</label>
                        <select class="file-browser-sort-select">
                            <option value="lastModified">Last Modified</option>
                            <option value="name">Name</option>
                        </select>
                        <button class="btn file-browser-sort-dir" title="Toggle sort direction">
                            <span class="sort-icon"></span>
                        </button>
                    </div>
                </div>
                <div class="file-browser-content">
                    <div class="file-browser-grid"></div>
                    <div class="file-browser-empty" hidden>
                        <p>No saved files yet.</p>
                        <p>Create a new file or import an SVG from disk.</p>
                    </div>
                </div>
                <div class="file-browser-footer">
                    <button class="btn file-browser-import">Import from disk...</button>
                    <input type="file" class="file-browser-file-input" accept=".svg" hidden>
                </div>
            </div>
        `;

        document.body.appendChild(this.overlay);

        this.dialog = this.overlay.querySelector('.file-browser-dialog');
        this.grid = this.overlay.querySelector('.file-browser-grid');
        this.emptyState = this.overlay.querySelector('.file-browser-empty');
        this.sortSelect = this.overlay.querySelector('.file-browser-sort-select');
        this.sortDirBtn = this.overlay.querySelector('.file-browser-sort-dir');
        this.fileInput = this.overlay.querySelector('.file-browser-file-input');
    }

    setupEventListeners() {
        this.overlay.querySelector('.file-browser-close').addEventListener('click', () => this.close());
        this.overlay.querySelector('.file-browser-new').addEventListener('click', () => this.handleNewFile());
        this.overlay.querySelector('.file-browser-import').addEventListener('click', () => this.fileInput.click());

        this.updateSortIcon();

        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        });

        this.sortSelect.addEventListener('change', (e) => {
            this.sortField = e.target.value;
            this.refreshGrid();
        });

        this.sortDirBtn.addEventListener('click', () => {
            this.sortDirection = this.sortDirection === 'desc' ? 'asc' : 'desc';
            this.updateSortIcon();
            this.refreshGrid();
        });

        this.fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleImport(file);
            }
            this.fileInput.value = '';
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }

    async open() {
        this.isOpen = true;
        this.overlay.classList.add('open');
        await this.refreshGrid();
    }

    close() {
        this.isOpen = false;
        this.overlay.classList.remove('open');
    }

    async refreshGrid() {
        const files = await fileDatabase.getFilesSorted(this.sortField, this.sortDirection);

        this.grid.innerHTML = '';

        if (files.length === 0) {
            this.grid.hidden = true;
            this.emptyState.hidden = false;
            return;
        }

        this.grid.hidden = false;
        this.emptyState.hidden = true;

        files.forEach(file => {
            const item = this.createFileItem(file);
            this.grid.appendChild(item);
        });
    }

    createFileItem(file) {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.dataset.fileId = file.id;

        const lastModified = new Date(file.lastModified).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        item.innerHTML = `
            <div class="file-item-thumbnail">
                ${file.thumbnail ? file.thumbnail : '<div class="file-item-placeholder"></div>'}
            </div>
            <div class="file-item-info">
                <div class="file-item-name" title="${file.name}">${file.name}</div>
                <div class="file-item-date">${lastModified}</div>
            </div>
            <button class="file-item-delete" title="Delete file">&times;</button>
        `;

        item.addEventListener('click', (e) => {
            if (!e.target.classList.contains('file-item-delete')) {
                this.handleOpenFile(file.id);
            }
        });

        item.querySelector('.file-item-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleDeleteFile(file.id, file.name);
        });

        return item;
    }

    updateSortIcon() {
        const icon = this.sortDirBtn.querySelector('.sort-icon');
        icon.textContent = this.sortDirection === 'desc' ? '\u2193' : '\u2191';
    }

    async handleNewFile() {
        await this.fileManager.newFile();
        this.close();
    }

    async handleOpenFile(id) {
        await this.fileManager.openFile(id);
        this.close();
    }

    async handleDeleteFile(id, name) {
        if (!confirm(`Delete "${name}"?`)) {
            return;
        }

        await fileDatabase.deleteFile(id);

        if (this.fileManager.currentFileId === id) {
            this.fileManager.currentFileId = null;
            this.fileManager.isDirty = false;
            eventBus.emit('file:opened', { id: null, name: 'Untitled' });
        }

        await this.refreshGrid();
    }

    async handleImport(file) {
        try {
            await this.fileManager.importFromFile(file);
            this.close();
        } catch (error) {
            alert('Failed to import file: ' + error.message);
        }
    }
}
