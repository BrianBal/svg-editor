import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Polyline', () => {
    let polyline;
    let emitSpy;

    beforeEach(() => {
        emitSpy = vi.spyOn(window.eventBus, 'emit');
        polyline = new Polyline([
            { x: 0, y: 0 },
            { x: 100, y: 50 },
            { x: 50, y: 100 }
        ]);
    });

    describe('constructor', () => {
        it('creates polyline with specified points', () => {
            expect(polyline.points).toHaveLength(3);
            expect(polyline.points[0]).toEqual({ x: 0, y: 0 });
        });

        it('uses empty array when no points specified', () => {
            const emptyPolyline = new Polyline();
            expect(emptyPolyline.points).toEqual([]);
        });

        it('sets type to polyline', () => {
            expect(polyline.type).toBe('polyline');
        });
    });

    describe('getPointsString()', () => {
        it('returns correctly formatted points string', () => {
            expect(polyline.getPointsString()).toBe('0,0 100,50 50,100');
        });

        it('returns empty string for empty polyline', () => {
            const empty = new Polyline([]);
            expect(empty.getPointsString()).toBe('');
        });
    });

    describe('getBounds()', () => {
        it('returns correct bounding box', () => {
            expect(polyline.getBounds()).toEqual({
                x: 0,
                y: 0,
                width: 100,
                height: 100
            });
        });

        it('returns zero bounds for empty polyline', () => {
            const empty = new Polyline([]);
            expect(empty.getBounds()).toEqual({
                x: 0,
                y: 0,
                width: 0,
                height: 0
            });
        });

        it('handles negative coordinates', () => {
            const negPolyline = new Polyline([
                { x: -50, y: -25 },
                { x: 50, y: 75 }
            ]);

            expect(negPolyline.getBounds()).toEqual({
                x: -50,
                y: -25,
                width: 100,
                height: 100
            });
        });
    });

    describe('addPoint()', () => {
        it('appends point to end by default', () => {
            polyline.addPoint(200, 200);

            expect(polyline.points).toHaveLength(4);
            expect(polyline.points[3]).toEqual({ x: 200, y: 200 });
        });

        it('inserts point at specified index', () => {
            polyline.addPoint(25, 25, 1);

            expect(polyline.points).toHaveLength(4);
            expect(polyline.points[1]).toEqual({ x: 25, y: 25 });
        });

        it('emits shape:updated event', () => {
            polyline.addPoint(200, 200);

            expect(emitSpy).toHaveBeenCalledWith('shape:updated', polyline);
        });
    });

    describe('movePoint()', () => {
        it('moves point to new position', () => {
            polyline.movePoint(1, 150, 75);

            expect(polyline.points[1]).toEqual({ x: 150, y: 75 });
        });

        it('emits shape:updated event', () => {
            polyline.movePoint(0, 10, 10);

            expect(emitSpy).toHaveBeenCalledWith('shape:updated', polyline);
        });

        it('does nothing for invalid index', () => {
            emitSpy.mockClear();
            polyline.movePoint(999, 0, 0);

            expect(emitSpy).not.toHaveBeenCalled();
        });
    });

    describe('removePoint()', () => {
        it('removes point at index', () => {
            polyline.removePoint(1);

            expect(polyline.points).toHaveLength(2);
            expect(polyline.points[1]).toEqual({ x: 50, y: 100 });
        });

        it('returns true on success', () => {
            expect(polyline.removePoint(1)).toBe(true);
        });

        it('does not remove if only 2 points remain', () => {
            const twoPoints = new Polyline([
                { x: 0, y: 0 },
                { x: 100, y: 100 }
            ]);

            expect(twoPoints.removePoint(0)).toBe(false);
            expect(twoPoints.points).toHaveLength(2);
        });

        it('emits shape:updated event on success', () => {
            polyline.removePoint(1);

            expect(emitSpy).toHaveBeenCalledWith('shape:updated', polyline);
        });
    });

    describe('removeLastPoint()', () => {
        it('removes the last point', () => {
            polyline.removeLastPoint();

            expect(polyline.points).toHaveLength(2);
            expect(polyline.points[1]).toEqual({ x: 100, y: 50 });
        });

        it('returns true on success', () => {
            expect(polyline.removeLastPoint()).toBe(true);
        });

        it('does not remove if only 2 points remain', () => {
            const twoPoints = new Polyline([
                { x: 0, y: 0 },
                { x: 100, y: 100 }
            ]);

            expect(twoPoints.removeLastPoint()).toBe(false);
            expect(twoPoints.points).toHaveLength(2);
        });
    });

    describe('addPointBetween()', () => {
        it('inserts midpoint between two points', () => {
            polyline.addPointBetween(0);

            expect(polyline.points).toHaveLength(4);
            expect(polyline.points[1]).toEqual({ x: 50, y: 25 }); // midpoint of (0,0) and (100,50)
        });

        it('emits shape:updated event', () => {
            polyline.addPointBetween(0);

            expect(emitSpy).toHaveBeenCalledWith('shape:updated', polyline);
        });

        it('does nothing for last point', () => {
            emitSpy.mockClear();
            polyline.addPointBetween(2);

            expect(emitSpy).not.toHaveBeenCalled();
        });
    });

    describe('move()', () => {
        it('moves all points by delta', () => {
            polyline.move(10, 20);

            expect(polyline.points[0]).toEqual({ x: 10, y: 20 });
            expect(polyline.points[1]).toEqual({ x: 110, y: 70 });
            expect(polyline.points[2]).toEqual({ x: 60, y: 120 });
        });

        it('emits shape:updated event', () => {
            polyline.move(10, 10);

            expect(emitSpy).toHaveBeenCalledWith('shape:updated', polyline);
        });
    });

    describe('clone()', () => {
        it('creates new polyline with offset points', () => {
            const copy = polyline.clone(15);

            expect(copy).not.toBe(polyline);
            expect(copy.points[0]).toEqual({ x: 15, y: 15 });
            expect(copy.points[1]).toEqual({ x: 115, y: 65 });
        });

        it('creates independent copy of points array', () => {
            const copy = polyline.clone();
            copy.points[0].x = 999;

            expect(polyline.points[0].x).toBe(0);
        });

        it('copies style attributes', () => {
            polyline.stroke = '#ff0000';
            polyline.fill = 'none';

            const copy = polyline.clone();

            expect(copy.stroke).toBe('#ff0000');
            expect(copy.fill).toBe('none');
        });
    });

    describe('createSVGElement()', () => {
        it('creates polyline SVG element', () => {
            const el = polyline.createSVGElement();

            expect(el.tagName).toBe('polyline');
            expect(el.getAttribute('points')).toBe('0,0 100,50 50,100');
        });
    });
});
