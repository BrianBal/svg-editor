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

        it('parses text elements with fontSize and fontFamily', () => {
            const svgWithText = `
                <svg xmlns="http://www.w3.org/2000/svg">
                    <text x="100" y="200" font-size="48" font-family="Georgia">Hello World</text>
                </svg>
            `;
            const parser = new DOMParser();
            const doc = parser.parseFromString(svgWithText, 'image/svg+xml');

            fileManager.parseShapes(doc.querySelector('svg'));

            expect(mockCanvas.addShape).toHaveBeenCalledTimes(1);
            const shape = mockCanvas.addShape.mock.calls[0][0];
            expect(shape.x).toBe(100);
            expect(shape.y).toBe(200);
            expect(shape.text).toBe('Hello World');
            expect(shape.fontSize).toBe(48);
            expect(shape.fontFamily).toBe('Georgia');
        });

        it('parses path elements with corner points', () => {
            const svgWithPath = `
                <svg xmlns="http://www.w3.org/2000/svg">
                    <path d="M 10 10 L 100 10 L 100 100 L 10 100 Z" stroke="#000000" fill="none"/>
                </svg>
            `;
            const parser = new DOMParser();
            const doc = parser.parseFromString(svgWithPath, 'image/svg+xml');

            fileManager.parseShapes(doc.querySelector('svg'));

            expect(mockCanvas.addShape).toHaveBeenCalledTimes(1);
            const shape = mockCanvas.addShape.mock.calls[0][0];
            expect(shape.type).toBe('path');
            expect(shape.points.length).toBe(4);
            expect(shape.closed).toBe(true);
            expect(shape.points[0]).toEqual({ x: 10, y: 10, handleIn: null, handleOut: null });
            expect(shape.points[1]).toEqual({ x: 100, y: 10, handleIn: null, handleOut: null });
        });

        it('parses path elements with cubic bezier curves', () => {
            const svgWithPath = `
                <svg xmlns="http://www.w3.org/2000/svg">
                    <path d="M 10 50 C 30 10 70 10 90 50" stroke="#000000" fill="none"/>
                </svg>
            `;
            const parser = new DOMParser();
            const doc = parser.parseFromString(svgWithPath, 'image/svg+xml');

            fileManager.parseShapes(doc.querySelector('svg'));

            expect(mockCanvas.addShape).toHaveBeenCalledTimes(1);
            const shape = mockCanvas.addShape.mock.calls[0][0];
            expect(shape.type).toBe('path');
            expect(shape.points.length).toBe(2);
            expect(shape.closed).toBe(false);
            // First point should have handleOut
            expect(shape.points[0].handleOut).toEqual({ x: 30, y: 10 });
            // Second point should have handleIn
            expect(shape.points[1].handleIn).toEqual({ x: 70, y: 10 });
        });

        it('parses open path elements (without Z)', () => {
            const svgWithPath = `
                <svg xmlns="http://www.w3.org/2000/svg">
                    <path d="M 10 10 L 100 100" stroke="#000000" fill="none"/>
                </svg>
            `;
            const parser = new DOMParser();
            const doc = parser.parseFromString(svgWithPath, 'image/svg+xml');

            fileManager.parseShapes(doc.querySelector('svg'));

            const shape = mockCanvas.addShape.mock.calls[0][0];
            expect(shape.closed).toBe(false);
        });

        it('applies stroke and fill attributes to path', () => {
            const svgWithPath = `
                <svg xmlns="http://www.w3.org/2000/svg">
                    <path d="M 10 10 L 100 100 L 50 150" stroke="#ff0000" stroke-width="3" fill="#00ff00"/>
                </svg>
            `;
            const parser = new DOMParser();
            const doc = parser.parseFromString(svgWithPath, 'image/svg+xml');

            fileManager.parseShapes(doc.querySelector('svg'));

            const shape = mockCanvas.addShape.mock.calls[0][0];
            expect(shape.stroke).toBe('#ff0000');
            expect(shape.strokeWidth).toBe(3);
            expect(shape.fill).toBe('#00ff00');
        });

        it('preserves layer order when loading shapes', () => {
            const svgMixed = `
                <svg xmlns="http://www.w3.org/2000/svg">
                    <polyline id="shape-3" points="0,0 10,10 20,0" fill="red"/>
                    <polyline id="shape-4" points="30,0 40,10 50,0" fill="green"/>
                    <rect id="shape-1" x="60" y="0" width="20" height="20" fill="blue"
                          transform="translate(70, 10) skewY(-27) translate(-70, -10)"/>
                    <rect id="shape-2" x="90" y="0" width="20" height="20" fill="yellow"
                          transform="translate(100, 10) skewY(26) translate(-100, -10)"/>
                    <line id="shape-7" x1="0" y1="30" x2="100" y2="30" stroke="black"/>
                </svg>
            `;
            const parser = new DOMParser();
            const doc = parser.parseFromString(svgMixed, 'image/svg+xml');

            fileManager.parseShapes(doc.querySelector('svg'));

            // Verify shapes were added in document order
            expect(mockCanvas.addShape).toHaveBeenCalledTimes(5);

            // Check that shapes were added in the correct order
            // (polyline, polyline, rect, rect, line)
            const calls = mockCanvas.addShape.mock.calls;
            expect(calls[0][0].type).toBe('polyline'); // shape-3
            expect(calls[1][0].type).toBe('polyline'); // shape-4
            expect(calls[2][0].type).toBe('rectangle'); // shape-1
            expect(calls[3][0].type).toBe('rectangle'); // shape-2
            expect(calls[4][0].type).toBe('line'); // shape-7
        });

        it('preserves layer order with shapes in shapes-layer group', () => {
            const svgWithGroup = `
                <svg xmlns="http://www.w3.org/2000/svg">
                    <defs></defs>
                    <g id="shapes-layer">
                        <ellipse cx="50" cy="50" rx="30" ry="20" fill="purple"/>
                        <rect x="100" y="100" width="50" height="50" fill="orange"/>
                        <polyline points="200,200 250,250 300,200" fill="cyan"/>
                    </g>
                </svg>
            `;
            const parser = new DOMParser();
            const doc = parser.parseFromString(svgWithGroup, 'image/svg+xml');

            fileManager.parseShapes(doc.querySelector('svg'));

            // Verify shapes were added in document order from shapes-layer
            expect(mockCanvas.addShape).toHaveBeenCalledTimes(3);

            const calls = mockCanvas.addShape.mock.calls;
            expect(calls[0][0].type).toBe('ellipse');
            expect(calls[1][0].type).toBe('rectangle');
            expect(calls[2][0].type).toBe('polyline');
        });

        describe('opacity preservation', () => {
            it('preserves opacity when loading shapes', () => {
                const svgWithOpacity = `
                    <svg xmlns="http://www.w3.org/2000/svg">
                        <rect x="10" y="10" width="50" height="50" fill="red" opacity="0.5"/>
                        <ellipse cx="100" cy="100" rx="30" ry="20" fill="blue" opacity="0.75"/>
                        <polyline points="200,200 250,250 300,200" fill="green" opacity="0.3"/>
                        <line x1="0" y1="300" x2="100" y2="300" stroke="black" opacity="0.6"/>
                        <text x="200" y="300" font-size="24" opacity="0.8">Test</text>
                        <path d="M 10 50 L 100 50" stroke="purple" opacity="0.4"/>
                    </svg>
                `;
                const parser = new DOMParser();
                const doc = parser.parseFromString(svgWithOpacity, 'image/svg+xml');

                fileManager.parseShapes(doc.querySelector('svg'));

                expect(mockCanvas.addShape).toHaveBeenCalledTimes(6);

                const calls = mockCanvas.addShape.mock.calls;

                // Rectangle - opacity 0.5 (50%)
                expect(calls[0][0].type).toBe('rectangle');
                expect(calls[0][0].opacity).toBe(50);

                // Ellipse - opacity 0.75 (75%)
                expect(calls[1][0].type).toBe('ellipse');
                expect(calls[1][0].opacity).toBe(75);

                // Polyline - opacity 0.3 (30%)
                expect(calls[2][0].type).toBe('polyline');
                expect(calls[2][0].opacity).toBe(30);

                // Line - opacity 0.6 (60%)
                expect(calls[3][0].type).toBe('line');
                expect(calls[3][0].opacity).toBe(60);

                // Text - opacity 0.8 (80%)
                expect(calls[4][0].type).toBe('text');
                expect(calls[4][0].opacity).toBe(80);

                // Path - opacity 0.4 (40%)
                expect(calls[5][0].type).toBe('path');
                expect(calls[5][0].opacity).toBe(40);
            });

            it('defaults to 100% opacity when attribute is missing', () => {
                const svgNoOpacity = `
                    <svg xmlns="http://www.w3.org/2000/svg">
                        <rect x="10" y="10" width="50" height="50" fill="red"/>
                    </svg>
                `;
                const parser = new DOMParser();
                const doc = parser.parseFromString(svgNoOpacity, 'image/svg+xml');

                fileManager.parseShapes(doc.querySelector('svg'));

                const shape = mockCanvas.addShape.mock.calls[0][0];
                expect(shape.opacity).toBe(100);  // Default value from Shape constructor
            });

            it('handles opacity="0" correctly', () => {
                const svgZeroOpacity = `
                    <svg xmlns="http://www.w3.org/2000/svg">
                        <rect x="10" y="10" width="50" height="50" fill="red" opacity="0"/>
                    </svg>
                `;
                const parser = new DOMParser();
                const doc = parser.parseFromString(svgZeroOpacity, 'image/svg+xml');

                fileManager.parseShapes(doc.querySelector('svg'));

                const shape = mockCanvas.addShape.mock.calls[0][0];
                expect(shape.opacity).toBe(0);
            });
        });
    });
});
