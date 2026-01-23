import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Shape 3D Transforms', () => {
    let rect;
    let emitSpy;

    beforeEach(() => {
        emitSpy = vi.spyOn(window.eventBus, 'emit');
        rect = new Rectangle(100, 100, 200, 150);
    });

    describe('Property Initialization', () => {
        it('initializes with default 3D properties', () => {
            expect(rect.rotateX).toBe(0);
            expect(rect.rotateY).toBe(0);
            expect(rect.perspective).toBe(1000);
        });
    });

    describe('setRotateX', () => {
        it('sets rotateX property', () => {
            rect.setRotateX(45);
            expect(rect.rotateX).toBe(45);
            expect(emitSpy).toHaveBeenCalledWith('shape:updated', rect);
        });

        it('clamps rotateX to -180 to 180', () => {
            rect.setRotateX(200);
            expect(rect.rotateX).toBe(180);

            rect.setRotateX(-200);
            expect(rect.rotateX).toBe(-180);
        });

        it('updates transform attribute', () => {
            rect.createSVGElement();
            rect.setRotateX(30);
            const transform = rect.element.getAttribute('transform');
            expect(transform).toBeTruthy();
            expect(transform).toContain('matrix');
        });
    });

    describe('setRotateY', () => {
        it('sets rotateY property', () => {
            rect.setRotateY(45);
            expect(rect.rotateY).toBe(45);
            expect(emitSpy).toHaveBeenCalledWith('shape:updated', rect);
        });

        it('clamps rotateY to -180 to 180', () => {
            rect.setRotateY(200);
            expect(rect.rotateY).toBe(180);

            rect.setRotateY(-200);
            expect(rect.rotateY).toBe(-180);
        });

        it('updates transform attribute', () => {
            rect.createSVGElement();
            rect.setRotateY(30);
            const transform = rect.element.getAttribute('transform');
            expect(transform).toBeTruthy();
            expect(transform).toContain('matrix');
        });
    });

    describe('setPerspective', () => {
        it('sets perspective property', () => {
            rect.setPerspective(2000);
            expect(rect.perspective).toBe(2000);
            expect(emitSpy).toHaveBeenCalledWith('shape:updated', rect);
        });

        it('clamps perspective to 100 to 5000', () => {
            rect.setPerspective(50);
            expect(rect.perspective).toBe(100);

            rect.setPerspective(10000);
            expect(rect.perspective).toBe(5000);
        });

        it('updates transform when rotateX/Y are non-zero', () => {
            rect.createSVGElement();
            rect.setRotateX(30);
            const transform1 = rect.element.getAttribute('transform');

            rect.setPerspective(500);
            const transform2 = rect.element.getAttribute('transform');

            expect(transform2).not.toBe(transform1);
        });
    });

    describe('calculate3DMatrix', () => {
        it('returns null when no 3D rotation', () => {
            const bounds = rect.getBounds();
            const cx = bounds.x + bounds.width / 2;
            const cy = bounds.y + bounds.height / 2;

            const matrix = rect.calculate3DMatrix(cx, cy);
            expect(matrix).toBeNull();
        });

        it('generates matrix string for rotateX', () => {
            rect.rotateX = 45;
            const bounds = rect.getBounds();
            const cx = bounds.x + bounds.width / 2;
            const cy = bounds.y + bounds.height / 2;

            const matrix = rect.calculate3DMatrix(cx, cy);
            expect(matrix).toBeTruthy();
            expect(matrix).toMatch(/^matrix\([^)]+\)$/);
        });

        it('generates matrix string for rotateY', () => {
            rect.rotateY = 45;
            const bounds = rect.getBounds();
            const cx = bounds.x + bounds.width / 2;
            const cy = bounds.y + bounds.height / 2;

            const matrix = rect.calculate3DMatrix(cx, cy);
            expect(matrix).toBeTruthy();
            expect(matrix).toMatch(/^matrix\([^)]+\)$/);
        });

        it('combines rotateX and rotateY', () => {
            rect.rotateX = 30;
            rect.rotateY = 30;
            const bounds = rect.getBounds();
            const cx = bounds.x + bounds.width / 2;
            const cy = bounds.y + bounds.height / 2;

            const matrix = rect.calculate3DMatrix(cx, cy);
            expect(matrix).toBeTruthy();
            expect(matrix).toMatch(/^matrix\([^)]+\)$/);
        });

        it('applies perspective to depth calculation', () => {
            rect.rotateX = 45;
            rect.perspective = 500;
            const bounds = rect.getBounds();
            const cx = bounds.x + bounds.width / 2;
            const cy = bounds.y + bounds.height / 2;

            const matrix1 = rect.calculate3DMatrix(cx, cy);

            rect.perspective = 2000;
            const matrix2 = rect.calculate3DMatrix(cx, cy);

            expect(matrix1).not.toBe(matrix2);
        });
    });

    describe('fitAffineMatrix', () => {
        it('returns identity matrix for degenerate points', () => {
            const sourcePoints = [[0, 0], [0, 0], [0, 0]];
            const targetPoints = [[0, 0], [0, 0], [0, 0]];

            const [a, b, c, d, e, f] = rect.fitAffineMatrix(sourcePoints, targetPoints);
            expect(a).toBe(1);
            expect(b).toBe(0);
            expect(c).toBe(0);
            expect(d).toBe(1);
            expect(e).toBe(0);
            expect(f).toBe(0);
        });

        it('calculates identity transform for identical points', () => {
            const sourcePoints = [[0, 0], [100, 0], [0, 100]];
            const targetPoints = [[0, 0], [100, 0], [0, 100]];

            const [a, b, c, d, e, f] = rect.fitAffineMatrix(sourcePoints, targetPoints);
            expect(Math.abs(a - 1)).toBeLessThan(1e-10);
            expect(Math.abs(b)).toBeLessThan(1e-10);
            expect(Math.abs(c)).toBeLessThan(1e-10);
            expect(Math.abs(d - 1)).toBeLessThan(1e-10);
            expect(Math.abs(e)).toBeLessThan(1e-10);
            expect(Math.abs(f)).toBeLessThan(1e-10);
        });

        it('calculates scale transform', () => {
            const sourcePoints = [[0, 0], [100, 0], [0, 100]];
            const targetPoints = [[0, 0], [200, 0], [0, 200]];

            const [a, b, c, d, e, f] = rect.fitAffineMatrix(sourcePoints, targetPoints);
            expect(Math.abs(a - 2)).toBeLessThan(1e-10);
            expect(Math.abs(d - 2)).toBeLessThan(1e-10);
        });

        it('calculates translation transform', () => {
            const sourcePoints = [[0, 0], [100, 0], [0, 100]];
            const targetPoints = [[50, 75], [150, 75], [50, 175]];

            const [a, b, c, d, e, f] = rect.fitAffineMatrix(sourcePoints, targetPoints);
            expect(Math.abs(e - 50)).toBeLessThan(1e-10);
            expect(Math.abs(f - 75)).toBeLessThan(1e-10);
        });
    });

    describe('Transform Order', () => {
        it('applies transforms in correct order: scale → skew → 3D → rotation', () => {
            rect.createSVGElement();
            rect.scaleX = -1; // flip horizontal
            rect.skewX = 20;
            rect.rotateX = 30;
            rect.rotation = 45;

            rect.updateElement();
            const transform = rect.element.getAttribute('transform');

            expect(transform).toBeTruthy();
            expect(transform).toContain('scale');
            expect(transform).toContain('skewX');
            expect(transform).toContain('matrix');
            expect(transform).toContain('rotate');

            // Verify order
            const scaleIndex = transform.indexOf('scale');
            const skewIndex = transform.indexOf('skewX');
            const matrixIndex = transform.indexOf('matrix');
            const rotateIndex = transform.indexOf('rotate');

            expect(scaleIndex).toBeLessThan(skewIndex);
            expect(skewIndex).toBeLessThan(matrixIndex);
            expect(matrixIndex).toBeLessThan(rotateIndex);
        });

        it('omits 3D matrix when rotateX and rotateY are zero', () => {
            rect.createSVGElement();
            rect.scaleX = -1;
            rect.skewX = 20;
            rect.rotation = 45;
            // rotateX and rotateY remain 0

            rect.updateElement();
            const transform = rect.element.getAttribute('transform');

            expect(transform).toBeTruthy();
            expect(transform).toContain('scale');
            expect(transform).toContain('skewX');
            expect(transform).toContain('rotate');
            expect(transform).not.toContain('matrix');
        });
    });

    describe('copyAttributesTo', () => {
        it('copies 3D properties to cloned shape', () => {
            rect.rotateX = 30;
            rect.rotateY = 45;
            rect.perspective = 2000;

            const clone = rect.clone();

            expect(clone.rotateX).toBe(30);
            expect(clone.rotateY).toBe(45);
            expect(clone.perspective).toBe(2000);
        });
    });

    describe('Data Attributes', () => {
        it('adds data-rotate-x when rotateX is non-zero', () => {
            rect.createSVGElement();
            rect.rotateX = 45;
            rect.updateElement();

            expect(rect.element.getAttribute('data-rotate-x')).toBe('45');
        });

        it('adds data-rotate-y when rotateY is non-zero', () => {
            rect.createSVGElement();
            rect.rotateY = 60;
            rect.updateElement();

            expect(rect.element.getAttribute('data-rotate-y')).toBe('60');
        });

        it('adds data-perspective when perspective is not 1000', () => {
            rect.createSVGElement();
            rect.perspective = 2000;
            rect.rotateX = 30; // Need some 3D rotation for visible effect
            rect.updateElement();

            expect(rect.element.getAttribute('data-perspective')).toBe('2000');
        });

        it('does not add data attributes when values are default', () => {
            rect.createSVGElement();
            // Default values: rotateX=0, rotateY=0, perspective=1000
            rect.updateElement();

            expect(rect.element.hasAttribute('data-rotate-x')).toBe(false);
            expect(rect.element.hasAttribute('data-rotate-y')).toBe(false);
            expect(rect.element.hasAttribute('data-perspective')).toBe(false);
        });
    });

    describe('Edge Cases', () => {
        it('handles extreme rotateX = 90° (edge-on view)', () => {
            rect.createSVGElement();
            rect.setRotateX(90);
            expect(rect.rotateX).toBe(90);

            const transform = rect.element.getAttribute('transform');
            expect(transform).toBeTruthy();
            expect(transform).toContain('matrix');
        });

        it('handles extreme rotateY = 90° (edge-on view)', () => {
            rect.createSVGElement();
            rect.setRotateY(90);
            expect(rect.rotateY).toBe(90);

            const transform = rect.element.getAttribute('transform');
            expect(transform).toBeTruthy();
            expect(transform).toContain('matrix');
        });

        it('handles minimum perspective = 100', () => {
            rect.rotateX = 45;
            rect.setPerspective(100);
            expect(rect.perspective).toBe(100);

            const bounds = rect.getBounds();
            const cx = bounds.x + bounds.width / 2;
            const cy = bounds.y + bounds.height / 2;
            const matrix = rect.calculate3DMatrix(cx, cy);
            expect(matrix).toBeTruthy();
        });

        it('combines 3D rotation with extreme skew', () => {
            rect.createSVGElement();
            rect.skewX = 89;
            rect.skewY = 89;
            rect.rotateX = 45;
            rect.rotateY = 45;

            rect.updateElement();
            const transform = rect.element.getAttribute('transform');
            expect(transform).toBeTruthy();
        });
    });

    describe('Integration with Other Transforms', () => {
        it('works with flip horizontal', () => {
            rect.createSVGElement();
            rect.flipHorizontal();
            rect.setRotateX(30);
            rect.updateElement();

            const transform = rect.element.getAttribute('transform');
            expect(transform).toContain('scale');
            expect(transform).toContain('matrix');
        });

        it('works with flip vertical', () => {
            rect.createSVGElement();
            rect.flipVertical();
            rect.setRotateY(30);
            rect.updateElement();

            const transform = rect.element.getAttribute('transform');
            expect(transform).toContain('scale');
            expect(transform).toContain('matrix');
        });

        it('works with skew transforms', () => {
            rect.createSVGElement();
            rect.setSkewX(20);
            rect.setSkewY(15);
            rect.setRotateX(30);
            rect.updateElement();

            const transform = rect.element.getAttribute('transform');
            expect(transform).toContain('skewX');
            expect(transform).toContain('skewY');
            expect(transform).toContain('matrix');
        });

        it('works with 2D rotation', () => {
            rect.createSVGElement();
            rect.setRotation(45);
            rect.setRotateX(30);
            rect.updateElement();

            const transform = rect.element.getAttribute('transform');
            expect(transform).toContain('matrix');
            expect(transform).toContain('rotate(45');
        });

        it('combines all transforms correctly', () => {
            rect.createSVGElement();
            rect.flipHorizontal();
            rect.setSkewX(20);
            rect.setRotateX(30);
            rect.setRotateY(20);
            rect.setRotation(45);
            rect.updateElement();

            const transform = rect.element.getAttribute('transform');
            expect(transform).toContain('scale');
            expect(transform).toContain('skewX');
            expect(transform).toContain('matrix');
            expect(transform).toContain('rotate');
        });
    });
});

describe('Shape 3D Transforms - HistoryManager Integration', () => {
    let rect;

    beforeEach(() => {
        rect = new Rectangle(100, 100, 200, 150);
        rect.rotateX = 30;
        rect.rotateY = 45;
        rect.perspective = 2000;
        rect.scaleX = -1;
        rect.scaleY = 1;
        appState.addShape(rect);
    });

    describe('Serialization', () => {
        it('includes rotateX in serialized state', () => {
            const state = window.historyManager.serializeShape(rect);
            expect(state.rotateX).toBe(30);
        });

        it('includes rotateY in serialized state', () => {
            const state = window.historyManager.serializeShape(rect);
            expect(state.rotateY).toBe(45);
        });

        it('includes perspective in serialized state', () => {
            const state = window.historyManager.serializeShape(rect);
            expect(state.perspective).toBe(2000);
        });

        it('includes scaleX in serialized state (bug fix)', () => {
            const state = window.historyManager.serializeShape(rect);
            expect(state.scaleX).toBe(-1);
        });

        it('includes scaleY in serialized state (bug fix)', () => {
            const state = window.historyManager.serializeShape(rect);
            expect(state.scaleY).toBe(1);
        });
    });

    describe('Deserialization', () => {
        it('restores rotateX from state', () => {
            const state = window.historyManager.serializeShape(rect);
            const newShape = window.historyManager.deserializeShape(state);

            expect(newShape.rotateX).toBe(30);
        });

        it('restores rotateY from state', () => {
            const state = window.historyManager.serializeShape(rect);
            const newShape = window.historyManager.deserializeShape(state);

            expect(newShape.rotateY).toBe(45);
        });

        it('restores perspective from state', () => {
            const state = window.historyManager.serializeShape(rect);
            const newShape = window.historyManager.deserializeShape(state);

            expect(newShape.perspective).toBe(2000);
        });

        it('restores scaleX from state (bug fix)', () => {
            const state = window.historyManager.serializeShape(rect);
            const newShape = window.historyManager.deserializeShape(state);

            expect(newShape.scaleX).toBe(-1);
        });

        it('restores scaleY from state (bug fix)', () => {
            const state = window.historyManager.serializeShape(rect);
            const newShape = window.historyManager.deserializeShape(state);

            expect(newShape.scaleY).toBe(1);
        });

        it('uses default values when properties are missing', () => {
            const state = {
                type: 'rectangle',
                id: 'shape-1',
                x: 100,
                y: 100,
                width: 200,
                height: 150,
                stroke: '#000000',
                fill: 'none',
                strokeWidth: 2,
                opacity: 100,
                strokeDash: 'solid',
                strokeLinecap: 'butt',
                strokeLinejoin: 'miter',
                visible: true
            };

            const newShape = window.historyManager.deserializeShape(state);
            expect(newShape.rotateX).toBe(0);
            expect(newShape.rotateY).toBe(0);
            expect(newShape.perspective).toBe(1000);
            expect(newShape.scaleX).toBe(1);
            expect(newShape.scaleY).toBe(1);
        });
    });
});

describe('Shape 3D Transforms - All Shape Types', () => {
    it('works with Rectangle', () => {
        const rect = new Rectangle(100, 100, 200, 150);
        rect.setRotateX(30);
        expect(rect.rotateX).toBe(30);
    });

    it('works with Ellipse', () => {
        const ellipse = new Ellipse(200, 150, 50, 30);
        ellipse.setRotateY(45);
        expect(ellipse.rotateY).toBe(45);
    });

    it('works with Star', () => {
        const star = new Star(200, 150, 50, 5, 20);
        star.setRotateX(30);
        star.setRotateY(30);
        expect(star.rotateX).toBe(30);
        expect(star.rotateY).toBe(30);
    });

    it('works with Line', () => {
        const line = new Line(100, 100, 300, 200);
        line.setRotateX(45);
        expect(line.rotateX).toBe(45);
    });

    it('works with Polyline', () => {
        const polyline = new Polyline([
            { x: 100, y: 100 },
            { x: 200, y: 150 },
            { x: 150, y: 200 }
        ]);
        polyline.setRotateY(60);
        expect(polyline.rotateY).toBe(60);
    });

    it('works with Path', () => {
        const path = new Path([
            { x: 100, y: 100, handleIn: null, handleOut: null },
            { x: 200, y: 150, handleIn: null, handleOut: null }
        ], false);
        path.setRotateX(30);
        expect(path.rotateX).toBe(30);
    });

    it('works with TextShape', () => {
        const text = new TextShape(100, 100, 'Hello');
        text.setRotateX(20);
        text.setRotateY(25);
        expect(text.rotateX).toBe(20);
        expect(text.rotateY).toBe(25);
    });
});
