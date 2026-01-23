import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Star', () => {
    let star;
    let emitSpy;

    beforeEach(() => {
        emitSpy = vi.spyOn(window.eventBus, 'emit');
        star = new Star(100, 100, 50, 25, 5);
    });

    describe('constructor', () => {
        it('creates star with specified parameters', () => {
            expect(star.cx).toBe(100);
            expect(star.cy).toBe(100);
            expect(star.outerRadius).toBe(50);
            expect(star.innerRadius).toBe(25);
            expect(star.points).toBe(5);
        });

        it('uses default values when none specified', () => {
            const defaultStar = new Star();
            expect(defaultStar.cx).toBe(0);
            expect(defaultStar.cy).toBe(0);
            expect(defaultStar.outerRadius).toBe(50);
            expect(defaultStar.innerRadius).toBe(25);
            expect(defaultStar.points).toBe(5);
        });

        it('sets type to star', () => {
            expect(star.type).toBe('star');
        });
    });

    describe('getPointsString()', () => {
        it('generates correct number of vertices', () => {
            const pointsStr = star.getPointsString();
            const points = pointsStr.split(' ');

            // 5-point star has 10 vertices (5 outer + 5 inner)
            expect(points).toHaveLength(10);
        });

        it('alternates between outer and inner radius', () => {
            const pointsStr = star.getPointsString();
            const points = pointsStr.split(' ').map(p => {
                const [x, y] = p.split(',').map(Number);
                return { x, y };
            });

            // Check distances from center
            for (let i = 0; i < points.length; i++) {
                const dist = Math.sqrt(
                    Math.pow(points[i].x - 100, 2) +
                    Math.pow(points[i].y - 100, 2)
                );
                const expectedRadius = i % 2 === 0 ? 50 : 25;
                expect(dist).toBeCloseTo(expectedRadius, 5);
            }
        });

        it('first point is at top (12 o\'clock position)', () => {
            const pointsStr = star.getPointsString();
            const firstPoint = pointsStr.split(' ')[0];
            const [x, y] = firstPoint.split(',').map(Number);

            expect(x).toBeCloseTo(100);  // Center x
            expect(y).toBeCloseTo(50);   // 100 - 50 (top)
        });
    });

    describe('getBounds()', () => {
        it('returns bounding box based on outer radius', () => {
            expect(star.getBounds()).toEqual({
                x: 50,      // 100 - 50
                y: 50,      // 100 - 50
                width: 100, // 50 * 2
                height: 100 // 50 * 2
            });
        });
    });

    describe('resize()', () => {
        it('uses minimum of width/height for size', () => {
            star.resize(0, 0, 200, 100);

            // Takes minimum (100), so outerRadius = 50
            expect(star.outerRadius).toBe(50);
        });

        it('sets innerRadius to half of outerRadius', () => {
            star.resize(0, 0, 100, 100);

            expect(star.outerRadius).toBe(50);
            expect(star.innerRadius).toBe(25);
        });

        it('centers star in bounding box', () => {
            star.resize(0, 0, 100, 100);

            expect(star.cx).toBe(50);
            expect(star.cy).toBe(50);
        });

        it('enforces minimum radius of 1', () => {
            star.resize(0, 0, 0, 0);

            expect(star.outerRadius).toBe(1);
        });

        it('emits shape:updated event', () => {
            star.resize(0, 0, 100, 100);

            expect(emitSpy).toHaveBeenCalledWith('shape:updated', star);
        });
    });

    describe('move()', () => {
        it('moves center by delta values', () => {
            star.move(20, 30);

            expect(star.cx).toBe(120);
            expect(star.cy).toBe(130);
        });

        it('emits shape:updated event', () => {
            star.move(10, 10);

            expect(emitSpy).toHaveBeenCalledWith('shape:updated', star);
        });
    });

    describe('moveTo()', () => {
        it('positions star so bounding box starts at given point', () => {
            star.moveTo(0, 0);

            expect(star.cx).toBe(50); // 0 + outerRadius
            expect(star.cy).toBe(50);
        });
    });

    describe('clone()', () => {
        it('creates new star with offset', () => {
            const copy = star.clone(20);

            expect(copy).not.toBe(star);
            expect(copy.cx).toBe(120);
            expect(copy.cy).toBe(120);
            expect(copy.outerRadius).toBe(50);
            expect(copy.innerRadius).toBe(25);
            expect(copy.points).toBe(5);
        });

        it('copies style attributes', () => {
            star.stroke = '#ff0000';
            star.fill = '#ffff00';

            const copy = star.clone();

            expect(copy.stroke).toBe('#ff0000');
            expect(copy.fill).toBe('#ffff00');
        });
    });

    describe('createSVGElement()', () => {
        it('creates polygon SVG element', () => {
            const el = star.createSVGElement();

            expect(el.tagName).toBe('polygon');
            expect(el.getAttribute('points')).toBeTruthy();
        });
    });

    describe('different point counts', () => {
        it('creates 6-point star with 12 vertices', () => {
            const hexStar = new Star(100, 100, 50, 25, 6);
            const points = hexStar.getPointsString().split(' ');

            expect(points).toHaveLength(12);
        });

        it('creates 3-point star with 6 vertices', () => {
            const triStar = new Star(100, 100, 50, 25, 3);
            const points = triStar.getPointsString().split(' ');

            expect(points).toHaveLength(6);
        });
    });

    describe('rotation and transforms', () => {
        it('updates transform center after move', () => {
            star.createSVGElement();
            star.setRotation(60);
            const originalTransform = star.element.getAttribute('transform');

            star.move(30, 40);

            const newTransform = star.element.getAttribute('transform');
            expect(newTransform).not.toBe(originalTransform);
            expect(newTransform).toContain('rotate(60');
        });

        it('updates transform center after resize', () => {
            star.createSVGElement();
            star.setRotation(120);
            const originalTransform = star.element.getAttribute('transform');

            star.resize(0, 0, 150, 150);

            const newTransform = star.element.getAttribute('transform');
            expect(newTransform).not.toBe(originalTransform);
            expect(newTransform).toContain('rotate(120');
        });

        it('updates transform center after moveTo', () => {
            star.createSVGElement();
            star.setRotation(15);
            const originalTransform = star.element.getAttribute('transform');

            star.moveTo(150, 150);

            const newTransform = star.element.getAttribute('transform');
            expect(newTransform).not.toBe(originalTransform);
            expect(newTransform).toContain('rotate(15');
        });

        it('handles flipped and rotated movement', () => {
            star.createSVGElement();
            star.setRotation(72);
            star.flipHorizontal();

            star.move(25, 0);

            expect(star.rotation).toBe(72);
            expect(star.scaleX).toBe(-1);
            const transform = star.element.getAttribute('transform');
            expect(transform).toContain('scale(-1, 1)');
            expect(transform).toContain('rotate(72');
        });
    });
});
