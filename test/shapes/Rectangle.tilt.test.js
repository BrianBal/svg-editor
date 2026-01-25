import { describe, it, expect, beforeEach } from 'vitest';

describe('Rectangle Tilt', () => {
    let rect;

    beforeEach(() => {
        rect = new Rectangle(100, 100, 200, 150);
    });

    describe('Tilt Properties', () => {
        it('should initialize with zero tilt values', () => {
            expect(rect.tiltTop).toBe(0);
            expect(rect.tiltBottom).toBe(0);
            expect(rect.tiltLeft).toBe(0);
            expect(rect.tiltRight).toBe(0);
        });

        it('should set tilt top value', () => {
            rect.setTiltTop(50);
            expect(rect.tiltTop).toBe(50);
        });

        it('should set tilt bottom value', () => {
            rect.setTiltBottom(30);
            expect(rect.tiltBottom).toBe(30);
        });

        it('should set tilt left value', () => {
            rect.setTiltLeft(40);
            expect(rect.tiltLeft).toBe(40);
        });

        it('should set tilt right value', () => {
            rect.setTiltRight(60);
            expect(rect.tiltRight).toBe(60);
        });

        it('should clamp tilt values to 0-100 range (min)', () => {
            rect.setTiltTop(-10);
            expect(rect.tiltTop).toBe(0);

            rect.setTiltBottom(-50);
            expect(rect.tiltBottom).toBe(0);
        });

        it('should clamp tilt values to 0-100 range (max)', () => {
            rect.setTiltTop(150);
            expect(rect.tiltTop).toBe(100);

            rect.setTiltBottom(200);
            expect(rect.tiltBottom).toBe(100);
        });
    });

    describe('hasTilt', () => {
        it('should return false when no tilt is applied', () => {
            expect(rect.hasTilt()).toBe(false);
        });

        it('should return true when tiltTop is set', () => {
            rect.setTiltTop(10);
            expect(rect.hasTilt()).toBe(true);
        });

        it('should return true when any tilt is set', () => {
            rect.setTiltBottom(5);
            expect(rect.hasTilt()).toBe(true);
        });
    });

    describe('getTiltedPoints', () => {
        it('should calculate correct points for tiltTop=0', () => {
            rect.setTiltTop(0);
            const points = rect.getTiltedPoints();

            // Top edge should be full width
            expect(points[0].x).toBe(100); // Top-left x
            expect(points[1].x).toBe(300); // Top-right x
        });

        it('should calculate correct points for tiltTop=50%', () => {
            // tiltTop=50 means top edge moves inward by 50% of width / 2 = 50px on each side
            rect.setTiltTop(50);
            const points = rect.getTiltedPoints();

            const expectedInset = (50 / 100) * 200 / 2; // 50px
            expect(points[0].x).toBe(100 + expectedInset); // Top-left x = 150
            expect(points[1].x).toBe(300 - expectedInset); // Top-right x = 250
        });

        it('should calculate correct points for tiltBottom=50%', () => {
            rect.setTiltBottom(50);
            const points = rect.getTiltedPoints();

            const expectedInset = (50 / 100) * 200 / 2; // 50px
            expect(points[3].x).toBe(100 + expectedInset); // Bottom-left x = 150
            expect(points[2].x).toBe(300 - expectedInset); // Bottom-right x = 250
        });

        it('should calculate correct points for tiltLeft=40%', () => {
            // tiltLeft=40 means left edge moves inward by 40% of height / 2 = 30px on each side
            rect.setTiltLeft(40);
            const points = rect.getTiltedPoints();

            const expectedInset = (40 / 100) * 150 / 2; // 30px
            expect(points[0].y).toBe(100 + expectedInset); // Top-left y = 130
            expect(points[3].y).toBe(250 - expectedInset); // Bottom-left y = 220
        });

        it('should calculate correct points for tiltRight=60%', () => {
            rect.setTiltRight(60);
            const points = rect.getTiltedPoints();

            const expectedInset = (60 / 100) * 150 / 2; // 45px
            expect(points[1].y).toBe(100 + expectedInset); // Top-right y = 145
            expect(points[2].y).toBe(250 - expectedInset); // Bottom-right y = 205
        });

        it('should handle combined tilts correctly', () => {
            rect.setTiltTop(50);
            rect.setTiltLeft(40);
            const points = rect.getTiltedPoints();

            // Top-left should have both offsets
            expect(points[0].x).toBe(150); // 100 + 50px
            expect(points[0].y).toBe(130); // 100 + 30px
        });

        it('should return 4 points in correct order', () => {
            rect.setTiltTop(10);
            const points = rect.getTiltedPoints();

            expect(points).toHaveLength(4);
            // Order: top-left, top-right, bottom-right, bottom-left
            expect(points[0].y).toBeLessThan(points[3].y); // Top-left y < bottom-left y
            expect(points[0].x).toBeLessThan(points[1].x); // Top-left x < top-right x
        });
    });

    describe('SVG Element Creation', () => {
        beforeEach(() => {
            // Setup global Shape counter
            Shape.resetIdCounter();
        });

        it('should create rect element when no tilt applied', () => {
            const el = rect.createSVGElement();
            expect(el.tagName).toBe('rect');
            expect(el.getAttribute('x')).toBe('100');
            expect(el.getAttribute('y')).toBe('100');
            expect(el.getAttribute('width')).toBe('200');
            expect(el.getAttribute('height')).toBe('150');
        });

        it('should create polygon element when tilt applied', () => {
            rect.setTiltTop(50);
            const el = rect.createSVGElement();
            expect(el.tagName).toBe('polygon');
            expect(el.getAttribute('data-is-rectangle')).toBe('true');
        });

        it('should store rectangle data in polygon attributes', () => {
            rect.setTiltTop(30);
            rect.setTiltLeft(20);
            const el = rect.createSVGElement();

            expect(el.getAttribute('data-rect-x')).toBe('100');
            expect(el.getAttribute('data-rect-y')).toBe('100');
            expect(el.getAttribute('data-rect-width')).toBe('200');
            expect(el.getAttribute('data-rect-height')).toBe('150');
            expect(el.getAttribute('data-tilt-top')).toBe('30');
            expect(el.getAttribute('data-tilt-left')).toBe('20');
            expect(el.getAttribute('data-tilt-bottom')).toBe('0');
            expect(el.getAttribute('data-tilt-right')).toBe('0');
        });

        it('should generate correct polygon points string', () => {
            rect.setTiltTop(50); // 50px inset on top edge
            const el = rect.createSVGElement();
            const pointsStr = el.getAttribute('points');

            // Should have 4 coordinate pairs
            const coords = pointsStr.split(' ');
            expect(coords).toHaveLength(4);

            // First point (top-left) should have x=150
            expect(coords[0]).toContain('150');
        });
    });

    describe('Element Updates', () => {
        beforeEach(() => {
            Shape.resetIdCounter();
            rect.createSVGElement();
        });

        it('should switch from rect to polygon when tilt added', () => {
            expect(rect.element.tagName).toBe('rect');

            rect.setTiltTop(10);

            expect(rect.element.tagName).toBe('polygon');
        });

        it('should switch from polygon to rect when tilt removed', () => {
            rect.setTiltTop(50);
            expect(rect.element.tagName).toBe('polygon');

            rect.setTiltTop(0);

            expect(rect.element.tagName).toBe('rect');
        });

        it('should handle element replacement when switching types', () => {
            // Add to DOM
            const parent = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            parent.appendChild(rect.element);

            expect(rect.element.tagName).toBe('rect');
            expect(parent.children.length).toBe(1);

            // Switch to polygon
            rect.setTiltTop(10);

            expect(rect.element.tagName).toBe('polygon');
            expect(parent.children.length).toBe(1); // Still only one child
            expect(parent.children[0]).toBe(rect.element); // New element is in DOM
        });

        it('should maintain element reference after multiple tilt changes', () => {
            const parent = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            parent.appendChild(rect.element);

            // Switch to polygon
            rect.setTiltTop(10);
            const polygonElement = rect.element;

            // Change tilt value (should update existing polygon, not recreate)
            rect.setTiltTop(20);

            expect(rect.element).toBe(polygonElement); // Same element reference
            expect(rect.element.tagName).toBe('polygon');
        });

        it('should update polygon points when tilt changes', () => {
            rect.setTiltTop(30);
            const pointsBefore = rect.element.getAttribute('points');

            rect.setTiltTop(60);
            const pointsAfter = rect.element.getAttribute('points');

            expect(pointsAfter).not.toBe(pointsBefore);
        });

        it('should update data attributes when tilt changes', () => {
            rect.setTiltTop(30);

            rect.setTiltBottom(40);

            expect(rect.element.getAttribute('data-tilt-bottom')).toBe('40');
        });
    });

    describe('Clone', () => {
        it('should clone tilt properties', () => {
            rect.setTiltTop(30);
            rect.setTiltBottom(20);
            rect.setTiltLeft(10);
            rect.setTiltRight(40);

            const clone = rect.clone();

            expect(clone.tiltTop).toBe(30);
            expect(clone.tiltBottom).toBe(20);
            expect(clone.tiltLeft).toBe(10);
            expect(clone.tiltRight).toBe(40);
        });
    });

    describe('Integration with transforms', () => {
        beforeEach(() => {
            Shape.resetIdCounter();
            rect.createSVGElement();
        });

        it('should work with rotation', () => {
            rect.setTiltTop(50);
            rect.setRotation(45);

            expect(rect.hasTilt()).toBe(true);
            expect(rect.rotation).toBe(45);
            expect(rect.element.tagName).toBe('polygon');
        });

        it('should work with skew', () => {
            rect.setTiltTop(30);
            rect.setSkewX(20);

            expect(rect.hasTilt()).toBe(true);
            expect(rect.skewX).toBe(20);
        });
    });
});
