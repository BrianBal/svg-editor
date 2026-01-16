import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const jsDir = join(__dirname, '..', '..', 'js');

// Load FileManager class
const fileManagerCode = readFileSync(join(jsDir, 'FileManager.js'), 'utf-8');
const wrappedCode = `
    with (this) {
        ${fileManagerCode}
        return typeof FileManager !== 'undefined' ? FileManager : undefined;
    }
`;
const fn = new Function(wrappedCode);
const FileManager = fn.call(globalThis);

describe('FileManager', () => {
    let fileManager;
    let mockCanvas;

    beforeEach(() => {
        // Create mock canvas with required methods
        mockCanvas = {
            addShape: vi.fn(),
            clear: vi.fn()
        };

        // Create FileManager instance with mock canvas
        fileManager = new FileManager(mockCanvas);

        // Setup DOM with canvas-background rect (simulating real app)
        document.body.innerHTML = `
            <svg id="svg-canvas" xmlns="http://www.w3.org/2000/svg">
                <rect id="canvas-background" x="0" y="0" width="800" height="600" fill="white"/>
                <g id="shapes-layer">
                    <rect data-shape-id="shape-1" x="10" y="10" width="100" height="100"/>
                </g>
                <g id="handles-layer"></g>
            </svg>
        `;
    });

    describe('getSVGContent()', () => {
        it('excludes canvas-background rect from saved content', () => {
            const content = fileManager.getSVGContent();

            expect(content).not.toContain('canvas-background');
        });

        it('includes user shapes in saved content', () => {
            const content = fileManager.getSVGContent();

            // The rect inside shapes-layer should be preserved (minus data-shape-id)
            expect(content).toContain('<rect');
            expect(content).toContain('width="100"');
        });

        it('removes handles-layer from saved content', () => {
            const content = fileManager.getSVGContent();

            expect(content).not.toContain('handles-layer');
        });

        it('removes data-shape-id attributes from saved content', () => {
            const content = fileManager.getSVGContent();

            expect(content).not.toContain('data-shape-id');
        });
    });

    describe('parseShapes()', () => {
        it('skips rect elements with id canvas-background', () => {
            const svgWithBackground = `
                <svg xmlns="http://www.w3.org/2000/svg">
                    <rect id="canvas-background" x="0" y="0" width="800" height="600"/>
                    <rect x="10" y="10" width="100" height="100"/>
                </svg>
            `;
            const parser = new DOMParser();
            const doc = parser.parseFromString(svgWithBackground, 'image/svg+xml');

            fileManager.parseShapes(doc.querySelector('svg'));

            // Should only add 1 shape (the non-background rect)
            expect(mockCanvas.addShape).toHaveBeenCalledTimes(1);
        });

        it('parses regular rect elements as shapes', () => {
            const svgWithRects = `
                <svg xmlns="http://www.w3.org/2000/svg">
                    <rect x="10" y="20" width="100" height="50"/>
                    <rect x="200" y="200" width="50" height="50"/>
                </svg>
            `;
            const parser = new DOMParser();
            const doc = parser.parseFromString(svgWithRects, 'image/svg+xml');

            fileManager.parseShapes(doc.querySelector('svg'));

            expect(mockCanvas.addShape).toHaveBeenCalledTimes(2);
        });

        it('does not create shape for canvas-background even with other attributes', () => {
            const svgWithBackground = `
                <svg xmlns="http://www.w3.org/2000/svg">
                    <rect id="canvas-background" x="0" y="0" width="800" height="600" fill="blue" stroke="red"/>
                </svg>
            `;
            const parser = new DOMParser();
            const doc = parser.parseFromString(svgWithBackground, 'image/svg+xml');

            fileManager.parseShapes(doc.querySelector('svg'));

            expect(mockCanvas.addShape).not.toHaveBeenCalled();
        });

        it('parses linear gradient fills from defs', () => {
            const svgWithGradient = `
                <svg xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="gradient-1" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stop-color="#ff0000"/>
                            <stop offset="100%" stop-color="#0000ff"/>
                        </linearGradient>
                    </defs>
                    <rect x="10" y="10" width="100" height="100" fill="url(#gradient-1)"/>
                </svg>
            `;
            const parser = new DOMParser();
            const doc = parser.parseFromString(svgWithGradient, 'image/svg+xml');

            fileManager.parseShapes(doc.querySelector('svg'));

            expect(mockCanvas.addShape).toHaveBeenCalledTimes(1);
            const shape = mockCanvas.addShape.mock.calls[0][0];
            expect(shape.fillGradient).not.toBeNull();
            expect(shape.fillGradient.type).toBe('linear');
            expect(shape.fillGradient.stops).toHaveLength(2);
            expect(shape.fillGradient.stops[0].color).toBe('#ff0000');
        });

        it('parses radial gradient fills from defs', () => {
            const svgWithGradient = `
                <svg xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <radialGradient id="gradient-2" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stop-color="#ffffff"/>
                            <stop offset="100%" stop-color="#000000"/>
                        </radialGradient>
                    </defs>
                    <rect x="10" y="10" width="100" height="100" fill="url(#gradient-2)"/>
                </svg>
            `;
            const parser = new DOMParser();
            const doc = parser.parseFromString(svgWithGradient, 'image/svg+xml');

            fileManager.parseShapes(doc.querySelector('svg'));

            expect(mockCanvas.addShape).toHaveBeenCalledTimes(1);
            const shape = mockCanvas.addShape.mock.calls[0][0];
            expect(shape.fillGradient).not.toBeNull();
            expect(shape.fillGradient.type).toBe('radial');
        });

        it('handles shapes with solid fill after gradient shapes', () => {
            const svgMixed = `
                <svg xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="gradient-1" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stop-color="#ff0000"/>
                            <stop offset="100%" stop-color="#0000ff"/>
                        </linearGradient>
                    </defs>
                    <rect x="10" y="10" width="100" height="100" fill="url(#gradient-1)"/>
                    <rect x="200" y="10" width="100" height="100" fill="#00ff00"/>
                </svg>
            `;
            const parser = new DOMParser();
            const doc = parser.parseFromString(svgMixed, 'image/svg+xml');

            fileManager.parseShapes(doc.querySelector('svg'));

            expect(mockCanvas.addShape).toHaveBeenCalledTimes(2);

            const gradientShape = mockCanvas.addShape.mock.calls[0][0];
            expect(gradientShape.fillGradient).not.toBeNull();

            const solidShape = mockCanvas.addShape.mock.calls[1][0];
            expect(solidShape.fill).toBe('#00ff00');
            expect(solidShape.fillGradient).toBeNull();
        });
    });
});
