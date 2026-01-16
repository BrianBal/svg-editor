import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('CommandPalette', () => {
    let palette;
    let mockCanvas;

    beforeEach(() => {
        // Create a mock canvas with necessary methods
        mockCanvas = {
            selection: {
                updateHandles: vi.fn()
            },
            removeShape: vi.fn(),
            addShape: vi.fn(),
            syncDOMOrder: vi.fn()
        };

        // Set up window.app mock
        window.app = {
            canvas: mockCanvas,
            fileManager: {
                saveCurrentFile: vi.fn(),
                exportToFile: vi.fn()
            },
            zoom: 100,
            updateZoom: vi.fn()
        };

        palette = new CommandPalette();
    });

    afterEach(() => {
        // Clean up DOM
        if (palette && palette.overlay) {
            palette.overlay.remove();
        }
        delete window.app;
    });

    describe('initialization', () => {
        it('creates overlay element', () => {
            expect(palette.overlay).toBeDefined();
            expect(palette.overlay.className).toBe('command-palette-overlay');
        });

        it('creates input element', () => {
            expect(palette.input).toBeDefined();
            expect(palette.input.className).toBe('command-palette-input');
        });

        it('creates list element', () => {
            expect(palette.list).toBeDefined();
            expect(palette.list.className).toBe('command-palette-list');
        });

        it('registers default commands', () => {
            expect(palette.commands.length).toBeGreaterThan(0);
        });

        it('includes tool commands', () => {
            const toolCommands = palette.commands.filter(cmd => cmd.id.startsWith('tool:'));
            expect(toolCommands.length).toBe(8);
        });

        it('includes alignment commands', () => {
            const alignCommands = palette.commands.filter(cmd => cmd.id.startsWith('align:'));
            expect(alignCommands.length).toBe(6);
        });

        it('includes distribute commands', () => {
            const distributeCommands = palette.commands.filter(cmd => cmd.id.startsWith('distribute:'));
            expect(distributeCommands.length).toBe(2);
        });
    });

    describe('open/close', () => {
        it('opens the palette', () => {
            palette.open();
            expect(palette.isOpen).toBe(true);
            expect(palette.overlay.classList.contains('open')).toBe(true);
        });

        it('closes the palette', () => {
            palette.open();
            palette.close();
            expect(palette.isOpen).toBe(false);
            expect(palette.overlay.classList.contains('open')).toBe(false);
        });

        it('toggles the palette', () => {
            expect(palette.isOpen).toBe(false);
            palette.toggle();
            expect(palette.isOpen).toBe(true);
            palette.toggle();
            expect(palette.isOpen).toBe(false);
        });

        it('clears query on open', () => {
            palette.query = 'test';
            palette.input.value = 'test';
            palette.open();
            expect(palette.query).toBe('');
            expect(palette.input.value).toBe('');
        });

        it('resets selectedIndex on open', () => {
            palette.selectedIndex = 5;
            palette.open();
            expect(palette.selectedIndex).toBe(0);
        });
    });

    describe('filtering', () => {
        it('shows all available commands when query is empty', () => {
            palette.query = '';
            palette.filterCommands();
            // Should show all commands that are available (tools are always available)
            expect(palette.filtered.length).toBeGreaterThan(0);
        });

        it('filters commands by label', () => {
            palette.query = 'rect';
            palette.filterCommands();
            expect(palette.filtered.length).toBeGreaterThan(0);
            expect(palette.filtered.some(cmd => cmd.label.toLowerCase().includes('rect'))).toBe(true);
        });

        it('filters case-insensitively', () => {
            palette.query = 'RECT';
            palette.filterCommands();
            expect(palette.filtered.some(cmd => cmd.label.toLowerCase().includes('rect'))).toBe(true);
        });

        it('prioritizes matches at start of label', () => {
            palette.query = 'se';
            palette.filterCommands();
            // 'Select Tool' should come before 'Deselect All'
            const selectIndex = palette.filtered.findIndex(cmd => cmd.label === 'Select Tool');
            const deselectIndex = palette.filtered.findIndex(cmd => cmd.label === 'Deselect All');
            if (selectIndex !== -1 && deselectIndex !== -1) {
                expect(selectIndex).toBeLessThan(deselectIndex);
            }
        });

        it('excludes unavailable commands', () => {
            // With no shapes selected, alignment commands should be unavailable
            appState.selectedShapeIds = [];
            palette.query = 'align';
            palette.filterCommands();
            expect(palette.filtered.length).toBe(0);
        });

        it('includes alignment commands when shapes are selected', () => {
            // Add shapes and select them
            const rect1 = new Rectangle(10, 10, 50, 50);
            const rect2 = new Rectangle(100, 10, 50, 50);
            appState.addShape(rect1);
            appState.addShape(rect2);
            appState.selectShape(rect1.id);
            appState.addToSelection(rect2.id);

            palette.query = 'align';
            palette.filterCommands();
            expect(palette.filtered.length).toBeGreaterThan(0);
        });
    });

    describe('navigation', () => {
        beforeEach(() => {
            palette.open();
        });

        it('selectNext increments selectedIndex', () => {
            palette.selectedIndex = 0;
            palette.selectNext();
            expect(palette.selectedIndex).toBe(1);
        });

        it('selectNext wraps around', () => {
            palette.selectedIndex = palette.filtered.length - 1;
            palette.selectNext();
            expect(palette.selectedIndex).toBe(0);
        });

        it('selectPrevious decrements selectedIndex', () => {
            palette.selectedIndex = 1;
            palette.selectPrevious();
            expect(palette.selectedIndex).toBe(0);
        });

        it('selectPrevious wraps around', () => {
            palette.selectedIndex = 0;
            palette.selectPrevious();
            expect(palette.selectedIndex).toBe(palette.filtered.length - 1);
        });
    });

    describe('command execution', () => {
        it('executeSelected runs the selected command', () => {
            const mockAction = vi.fn();
            palette.filtered = [{ id: 'test', label: 'Test', action: mockAction, isAvailable: () => true }];
            palette.selectedIndex = 0;
            palette.executeSelected();
            expect(mockAction).toHaveBeenCalled();
        });

        it('closes palette after execution', () => {
            palette.open();
            palette.filtered = [{ id: 'test', label: 'Test', action: vi.fn(), isAvailable: () => true }];
            palette.selectedIndex = 0;
            palette.executeSelected();
            expect(palette.isOpen).toBe(false);
        });

        it('tool commands change the active tool', () => {
            const setToolSpy = vi.spyOn(appState, 'setTool');
            const rectCommand = palette.commands.find(cmd => cmd.id === 'tool:rectangle');
            rectCommand.action();
            expect(setToolSpy).toHaveBeenCalledWith('rectangle');
        });
    });

    describe('highlightMatch', () => {
        it('returns original text when no query', () => {
            palette.query = '';
            expect(palette.highlightMatch('Test')).toBe('Test');
        });

        it('wraps matching text in mark tags', () => {
            palette.query = 'est';
            expect(palette.highlightMatch('Test')).toBe('T<mark>est</mark>');
        });

        it('handles case-insensitive highlighting', () => {
            palette.query = 'TEST';
            expect(palette.highlightMatch('Test')).toBe('<mark>Test</mark>');
        });
    });

    describe('alignment functions', () => {
        let rect1, rect2, rect3;

        beforeEach(() => {
            rect1 = new Rectangle(10, 10, 50, 50);
            rect2 = new Rectangle(100, 30, 50, 50);
            rect3 = new Rectangle(200, 20, 50, 50);
            appState.addShape(rect1);
            appState.addShape(rect2);
            appState.addShape(rect3);
            appState.selectShape(rect1.id);
            appState.addToSelection(rect2.id);
            appState.addToSelection(rect3.id);
        });

        it('aligns shapes left', () => {
            palette.alignShapes('left');
            // All shapes should have x = 10 (leftmost)
            expect(rect1.x).toBe(10);
            expect(rect2.x).toBe(10);
            expect(rect3.x).toBe(10);
        });

        it('aligns shapes right', () => {
            palette.alignShapes('right');
            // All shapes should align to rightmost edge (200 + 50 = 250)
            expect(rect1.x + rect1.width).toBe(250);
            expect(rect2.x + rect2.width).toBe(250);
            expect(rect3.x + rect3.width).toBe(250);
        });

        it('aligns shapes top', () => {
            palette.alignShapes('top');
            // All shapes should have y = 10 (topmost)
            expect(rect1.y).toBe(10);
            expect(rect2.y).toBe(10);
            expect(rect3.y).toBe(10);
        });

        it('aligns shapes bottom', () => {
            palette.alignShapes('bottom');
            // All shapes should align to bottommost edge (30 + 50 = 80)
            expect(rect1.y + rect1.height).toBe(80);
            expect(rect2.y + rect2.height).toBe(80);
            expect(rect3.y + rect3.height).toBe(80);
        });

        it('aligns shapes center horizontal', () => {
            palette.alignShapes('center-h');
            // Center of combined bounds: (10 + 250) / 2 = 130
            expect(rect1.x + rect1.width / 2).toBe(130);
            expect(rect2.x + rect2.width / 2).toBe(130);
            expect(rect3.x + rect3.width / 2).toBe(130);
        });

        it('aligns shapes middle vertical', () => {
            palette.alignShapes('middle-v');
            // Center of combined bounds: (10 + 80) / 2 = 45
            expect(rect1.y + rect1.height / 2).toBe(45);
            expect(rect2.y + rect2.height / 2).toBe(45);
            expect(rect3.y + rect3.height / 2).toBe(45);
        });

        it('uses history transaction for alignment', () => {
            const beginSpy = vi.spyOn(historyManager, 'beginMultiTransaction');
            const endSpy = vi.spyOn(historyManager, 'endMultiTransaction');
            palette.alignShapes('left');
            expect(beginSpy).toHaveBeenCalledWith('move', expect.any(Array));
            expect(endSpy).toHaveBeenCalled();
        });
    });

    describe('distribute functions', () => {
        let rect1, rect2, rect3;

        beforeEach(() => {
            rect1 = new Rectangle(0, 0, 20, 20);
            rect2 = new Rectangle(50, 0, 20, 20);
            rect3 = new Rectangle(100, 0, 20, 20);
            appState.addShape(rect1);
            appState.addShape(rect2);
            appState.addShape(rect3);
            appState.selectShape(rect1.id);
            appState.addToSelection(rect2.id);
            appState.addToSelection(rect3.id);
        });

        it('distributes shapes horizontally with equal spacing', () => {
            palette.distributeShapes('horizontal');
            // First stays at 0, last stays at 100
            // Total width: 3 * 20 = 60
            // Total span: 120 - 0 = 120
            // Space between: (120 - 60) / 2 = 30
            expect(rect1.x).toBe(0);
            expect(rect2.x).toBe(50); // 0 + 20 + 30 = 50
            expect(rect3.x).toBe(100); // 50 + 20 + 30 = 100
        });

        it('distributes shapes vertically with equal spacing', () => {
            // Set up vertically arranged shapes
            rect1.y = 0;
            rect2.y = 50;
            rect3.y = 100;
            palette.distributeShapes('vertical');
            expect(rect1.y).toBe(0);
            expect(rect3.y).toBe(100);
        });
    });

    describe('reorder functions', () => {
        let rect1, rect2, rect3;

        beforeEach(() => {
            rect1 = new Rectangle(10, 10, 50, 50);
            rect2 = new Rectangle(100, 10, 50, 50);
            rect3 = new Rectangle(200, 10, 50, 50);
            appState.addShape(rect1);
            appState.addShape(rect2);
            appState.addShape(rect3);
        });

        it('brings shape forward', () => {
            appState.selectShape(rect1.id);
            palette.reorderShapes('bring-forward');
            expect(appState.getShapeIndex(rect1.id)).toBe(1);
        });

        it('sends shape backward', () => {
            appState.selectShape(rect3.id);
            palette.reorderShapes('send-backward');
            expect(appState.getShapeIndex(rect3.id)).toBe(1);
        });

        it('brings shape to front', () => {
            appState.selectShape(rect1.id);
            palette.reorderShapes('bring-to-front');
            expect(appState.getShapeIndex(rect1.id)).toBe(2);
        });

        it('sends shape to back', () => {
            appState.selectShape(rect3.id);
            palette.reorderShapes('send-to-back');
            expect(appState.getShapeIndex(rect3.id)).toBe(0);
        });
    });

    describe('flip functions', () => {
        let rect;

        beforeEach(() => {
            rect = new Rectangle(10, 10, 50, 50);
            rect.rotation = 45;
            appState.addShape(rect);
            appState.selectShape(rect.id);
        });

        it('flips shape horizontally', () => {
            palette.flipShapes('horizontal');
            expect(rect.rotation).toBe(135); // 180 - 45 = 135
        });

        it('flips shape vertically', () => {
            palette.flipShapes('vertical');
            expect(rect.rotation).toBe(315); // 360 - 45 = 315
        });
    });

    describe('keyboard events', () => {
        beforeEach(() => {
            palette.open();
        });

        it('ArrowDown triggers selectNext', () => {
            const selectNextSpy = vi.spyOn(palette, 'selectNext');
            palette.input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
            expect(selectNextSpy).toHaveBeenCalled();
        });

        it('ArrowUp triggers selectPrevious', () => {
            const selectPreviousSpy = vi.spyOn(palette, 'selectPrevious');
            palette.input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
            expect(selectPreviousSpy).toHaveBeenCalled();
        });

        it('Enter triggers executeSelected', () => {
            const executeSpy = vi.spyOn(palette, 'executeSelected');
            palette.input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
            expect(executeSpy).toHaveBeenCalled();
        });

        it('Escape closes palette', () => {
            palette.input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
            expect(palette.isOpen).toBe(false);
        });
    });

    describe('render', () => {
        it('renders filtered commands', () => {
            palette.open();
            const items = palette.list.querySelectorAll('.command-palette-item');
            expect(items.length).toBe(palette.filtered.length);
        });

        it('marks selected item', () => {
            palette.open();
            const selected = palette.list.querySelector('.command-palette-item.selected');
            expect(selected).toBeDefined();
            expect(selected.dataset.index).toBe('0');
        });

        it('shows empty message when no results', () => {
            palette.query = 'xyznonexistent';
            palette.filterCommands();
            palette.render();
            expect(palette.list.innerHTML).toContain('No commands found');
        });

        it('shows shortcut when available', () => {
            palette.open();
            const shortcuts = palette.list.querySelectorAll('.command-palette-shortcut');
            expect(shortcuts.length).toBeGreaterThan(0);
        });
    });
});
