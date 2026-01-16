import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('ClipboardManager', () => {
    let clipboard;
    let mockCanvas;

    beforeEach(() => {
        clipboard = window.clipboardManager;

        // Mock navigator.clipboard
        Object.defineProperty(navigator, 'clipboard', {
            value: {
                writeText: vi.fn().mockResolvedValue(undefined),
                readText: vi.fn().mockResolvedValue('')
            },
            writable: true,
            configurable: true
        });

        // Mock canvas
        mockCanvas = {
            shapesLayer: document.getElementById('shapes-layer'),
            removeShape: vi.fn()
        };
        window.app = { canvas: mockCanvas };
    });

    afterEach(() => {
        delete window.app;
    });

    describe('copy()', () => {
        it('returns false when nothing is selected', async () => {
            const result = await clipboard.copy();
            expect(result).toBe(false);
            expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
        });

        it('copies selected shape to clipboard as SVG', async () => {
            const rect = new Rectangle(10, 20, 100, 50);
            appState.addShape(rect);
            appState.selectShape(rect.id);

            const result = await clipboard.copy();

            expect(result).toBe(true);
            expect(navigator.clipboard.writeText).toHaveBeenCalled();
            const svgContent = navigator.clipboard.writeText.mock.calls[0][0];
            expect(svgContent).toContain('<svg');
            expect(svgContent).toContain('<rect');
        });

        it('copies multiple selected shapes', async () => {
            const rect = new Rectangle(10, 20, 100, 50);
            const ellipse = new Ellipse(200, 200, 50, 30);
            appState.addShape(rect);
            appState.addShape(ellipse);
            appState.selectShape(rect.id);
            appState.addToSelection(ellipse.id);

            await clipboard.copy();

            const svgContent = navigator.clipboard.writeText.mock.calls[0][0];
            expect(svgContent).toContain('<rect');
            expect(svgContent).toContain('<ellipse');
        });

        it('includes gradients in copied SVG', async () => {
            const rect = new Rectangle(10, 20, 100, 50);
            const gradient = new Gradient('linear');
            gradient.stops = [
                { offset: 0, color: '#ff0000' },
                { offset: 100, color: '#0000ff' }
            ];
            rect.fillGradient = gradient;
            rect.fill = `url(#${gradient.id})`;
            appState.addShape(rect);
            appState.selectShape(rect.id);

            await clipboard.copy();

            const svgContent = navigator.clipboard.writeText.mock.calls[0][0];
            expect(svgContent).toContain('<defs>');
            expect(svgContent).toContain('linearGradient');
        });

        it('resets paste count on copy', async () => {
            clipboard.pasteCount = 5;

            const rect = new Rectangle(10, 20, 100, 50);
            appState.addShape(rect);
            appState.selectShape(rect.id);

            await clipboard.copy();

            expect(clipboard.pasteCount).toBe(0);
        });

        it('handles clipboard write failure gracefully', async () => {
            navigator.clipboard.writeText.mockRejectedValue(new Error('Permission denied'));

            const rect = new Rectangle(10, 20, 100, 50);
            appState.addShape(rect);
            appState.selectShape(rect.id);

            const result = await clipboard.copy();

            expect(result).toBe(false);
        });
    });

    describe('paste()', () => {
        it('returns null for non-SVG clipboard content', async () => {
            navigator.clipboard.readText.mockResolvedValue('plain text');

            const result = await clipboard.paste();

            expect(result).toBeNull();
        });

        it('returns null for empty clipboard', async () => {
            navigator.clipboard.readText.mockResolvedValue('');

            const result = await clipboard.paste();

            expect(result).toBeNull();
        });

        it('creates shapes from clipboard SVG', async () => {
            const svgContent = `<svg xmlns="http://www.w3.org/2000/svg">
                <rect x="10" y="20" width="100" height="50" stroke="#000000" fill="none"/>
            </svg>`;
            navigator.clipboard.readText.mockResolvedValue(svgContent);

            const result = await clipboard.paste();

            expect(result).toHaveLength(1);
            expect(result[0].type).toBe('rectangle');
        });

        it('offsets pasted shapes incrementally', async () => {
            const svgContent = `<svg xmlns="http://www.w3.org/2000/svg">
                <rect x="10" y="20" width="100" height="50" stroke="#000000" fill="none"/>
            </svg>`;
            navigator.clipboard.readText.mockResolvedValue(svgContent);

            // First paste
            clipboard.pasteCount = 0;
            const result1 = await clipboard.paste();
            expect(result1[0].x).toBe(30); // 10 + 20
            expect(result1[0].y).toBe(40); // 20 + 20

            // Second paste
            const result2 = await clipboard.paste();
            expect(result2[0].x).toBe(50); // 10 + 40
            expect(result2[0].y).toBe(60); // 20 + 40
        });

        it('selects pasted shapes', async () => {
            const svgContent = `<svg xmlns="http://www.w3.org/2000/svg">
                <rect x="10" y="20" width="100" height="50" stroke="#000000" fill="none"/>
            </svg>`;
            navigator.clipboard.readText.mockResolvedValue(svgContent);

            const result = await clipboard.paste();

            expect(appState.isSelected(result[0].id)).toBe(true);
        });

        it('parses multiple shapes', async () => {
            const svgContent = `<svg xmlns="http://www.w3.org/2000/svg">
                <rect x="10" y="20" width="100" height="50" stroke="#000" fill="none"/>
                <ellipse cx="200" cy="200" rx="50" ry="30" stroke="#000" fill="none"/>
            </svg>`;
            navigator.clipboard.readText.mockResolvedValue(svgContent);

            const result = await clipboard.paste();

            expect(result).toHaveLength(2);
            expect(result.map(s => s.type)).toContain('rectangle');
            expect(result.map(s => s.type)).toContain('ellipse');
        });

        it('handles clipboard read failure gracefully', async () => {
            navigator.clipboard.readText.mockRejectedValue(new Error('Permission denied'));

            const result = await clipboard.paste();

            expect(result).toBeNull();
        });
    });

    describe('cut()', () => {
        it('returns false when nothing is selected', async () => {
            const result = await clipboard.cut();
            expect(result).toBe(false);
        });

        it('copies and deletes selected shapes', async () => {
            const rect = new Rectangle(10, 20, 100, 50);
            appState.addShape(rect);
            appState.selectShape(rect.id);

            const result = await clipboard.cut();

            expect(result).toBe(true);
            expect(navigator.clipboard.writeText).toHaveBeenCalled();
            expect(mockCanvas.removeShape).toHaveBeenCalledWith(rect);
        });

        it('deselects all after cut', async () => {
            const rect = new Rectangle(10, 20, 100, 50);
            appState.addShape(rect);
            appState.selectShape(rect.id);

            await clipboard.cut();

            expect(appState.getSelectedShapes()).toHaveLength(0);
        });
    });

    describe('generateSVGFragment()', () => {
        it('removes data-shape-id attributes', () => {
            const rect = new Rectangle(10, 20, 100, 50);
            rect.createSVGElement();
            document.getElementById('shapes-layer').appendChild(rect.element);

            const svg = clipboard.generateSVGFragment([rect]);

            expect(svg).not.toContain('data-shape-id');
        });

        it('sets viewBox based on shape bounds', () => {
            const rect = new Rectangle(50, 100, 200, 150);

            const svg = clipboard.generateSVGFragment([rect]);

            expect(svg).toContain('viewBox="50 100 200 150"');
        });
    });

    describe('parseShapesFromSVG()', () => {
        it('parses rectangles', () => {
            const svg = `<svg xmlns="http://www.w3.org/2000/svg">
                <rect x="10" y="20" width="100" height="50"/>
            </svg>`;

            const shapes = clipboard.parseShapesFromSVG(svg);

            expect(shapes).toHaveLength(1);
            expect(shapes[0].type).toBe('rectangle');
            expect(shapes[0].x).toBe(10);
            expect(shapes[0].y).toBe(20);
            expect(shapes[0].width).toBe(100);
            expect(shapes[0].height).toBe(50);
        });

        it('parses ellipses', () => {
            const svg = `<svg xmlns="http://www.w3.org/2000/svg">
                <ellipse cx="100" cy="100" rx="50" ry="30"/>
            </svg>`;

            const shapes = clipboard.parseShapesFromSVG(svg);

            expect(shapes).toHaveLength(1);
            expect(shapes[0].type).toBe('ellipse');
            expect(shapes[0].cx).toBe(100);
            expect(shapes[0].cy).toBe(100);
        });

        it('parses circles as ellipses', () => {
            const svg = `<svg xmlns="http://www.w3.org/2000/svg">
                <circle cx="100" cy="100" r="50"/>
            </svg>`;

            const shapes = clipboard.parseShapesFromSVG(svg);

            expect(shapes).toHaveLength(1);
            expect(shapes[0].type).toBe('ellipse');
            expect(shapes[0].rx).toBe(50);
            expect(shapes[0].ry).toBe(50);
        });

        it('parses lines', () => {
            const svg = `<svg xmlns="http://www.w3.org/2000/svg">
                <line x1="10" y1="20" x2="100" y2="80"/>
            </svg>`;

            const shapes = clipboard.parseShapesFromSVG(svg);

            expect(shapes).toHaveLength(1);
            expect(shapes[0].type).toBe('line');
        });

        it('parses polylines', () => {
            const svg = `<svg xmlns="http://www.w3.org/2000/svg">
                <polyline points="10,20 30,40 50,60"/>
            </svg>`;

            const shapes = clipboard.parseShapesFromSVG(svg);

            expect(shapes).toHaveLength(1);
            expect(shapes[0].type).toBe('polyline');
            expect(shapes[0].points).toHaveLength(3);
        });

        it('parses paths', () => {
            const svg = `<svg xmlns="http://www.w3.org/2000/svg">
                <path d="M 10 20 L 100 80"/>
            </svg>`;

            const shapes = clipboard.parseShapesFromSVG(svg);

            expect(shapes).toHaveLength(1);
            expect(shapes[0].type).toBe('path');
        });

        it('parses text', () => {
            const svg = `<svg xmlns="http://www.w3.org/2000/svg">
                <text x="100" y="100" font-size="24" font-family="Arial">Hello</text>
            </svg>`;

            const shapes = clipboard.parseShapesFromSVG(svg);

            expect(shapes).toHaveLength(1);
            expect(shapes[0].type).toBe('text');
            expect(shapes[0].text).toBe('Hello');
        });

        it('parses stroke and fill attributes', () => {
            const svg = `<svg xmlns="http://www.w3.org/2000/svg">
                <rect x="10" y="20" width="100" height="50" stroke="#ff0000" fill="#00ff00" stroke-width="3"/>
            </svg>`;

            const shapes = clipboard.parseShapesFromSVG(svg);

            expect(shapes[0].stroke).toBe('#ff0000');
            expect(shapes[0].fill).toBe('#00ff00');
            expect(shapes[0].strokeWidth).toBe(3);
        });

        it('parses rotation transform', () => {
            const svg = `<svg xmlns="http://www.w3.org/2000/svg">
                <rect x="10" y="20" width="100" height="50" transform="rotate(45, 60, 45)"/>
            </svg>`;

            const shapes = clipboard.parseShapesFromSVG(svg);

            expect(shapes[0].rotation).toBe(45);
        });

        it('returns empty array for invalid SVG', () => {
            const shapes = clipboard.parseShapesFromSVG('not valid svg');

            expect(shapes).toHaveLength(0);
        });
    });

    describe('getCombinedBounds()', () => {
        it('returns default bounds for empty array', () => {
            const bounds = clipboard.getCombinedBounds([]);

            expect(bounds).toEqual({ x: 0, y: 0, width: 100, height: 100 });
        });

        it('returns bounds for single shape', () => {
            const rect = new Rectangle(10, 20, 100, 50);

            const bounds = clipboard.getCombinedBounds([rect]);

            expect(bounds).toEqual({ x: 10, y: 20, width: 100, height: 50 });
        });

        it('returns combined bounds for multiple shapes', () => {
            const rect = new Rectangle(10, 20, 100, 50);
            const ellipse = new Ellipse(200, 200, 50, 30);

            const bounds = clipboard.getCombinedBounds([rect, ellipse]);

            expect(bounds.x).toBe(10);
            expect(bounds.y).toBe(20);
            expect(bounds.width).toBe(240); // 250 - 10
            expect(bounds.height).toBe(210); // 230 - 20
        });
    });
});
