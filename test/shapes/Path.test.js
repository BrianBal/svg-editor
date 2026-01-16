import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Path', () => {
    let path;
    let emitSpy;

    beforeEach(() => {
        emitSpy = vi.spyOn(window.eventBus, 'emit');
    });

    describe('constructor', () => {
        it('creates empty path', () => {
            path = new Path();
            expect(path.type).toBe('path');
            expect(path.points).toEqual([]);
            expect(path.closed).toBe(false);
        });

        it('creates path with points', () => {
            const points = [
                { x: 10, y: 20, handleIn: null, handleOut: null },
                { x: 30, y: 40, handleIn: null, handleOut: null }
            ];
            path = new Path(points);
            expect(path.points).toEqual(points);
            expect(path.closed).toBe(false);
        });

        it('creates closed path', () => {
            const points = [
                { x: 10, y: 10, handleIn: null, handleOut: null },
                { x: 50, y: 10, handleIn: null, handleOut: null },
                { x: 30, y: 50, handleIn: null, handleOut: null }
            ];
            path = new Path(points, true);
            expect(path.closed).toBe(true);
        });

        it('inherits from PointBasedShape', () => {
            path = new Path();
            expect(path instanceof PointBasedShape).toBe(true);
            expect(path instanceof Shape).toBe(true);
        });
    });

    describe('getPathData()', () => {
        it('returns empty string for empty path', () => {
            path = new Path([]);
            expect(path.getPathData()).toBe('');
        });

        it('generates M command for first point', () => {
            path = new Path([{ x: 10, y: 20, handleIn: null, handleOut: null }]);
            expect(path.getPathData()).toBe('M 10 20');
        });

        it('generates L commands for corner points', () => {
            path = new Path([
                { x: 10, y: 20, handleIn: null, handleOut: null },
                { x: 30, y: 40, handleIn: null, handleOut: null },
                { x: 50, y: 20, handleIn: null, handleOut: null }
            ]);
            expect(path.getPathData()).toBe('M 10 20 L 30 40 L 50 20');
        });

        it('generates C commands for curved points', () => {
            path = new Path([
                { x: 10, y: 20, handleIn: null, handleOut: { x: 20, y: 20 } },
                { x: 50, y: 20, handleIn: { x: 40, y: 20 }, handleOut: null }
            ]);
            expect(path.getPathData()).toBe('M 10 20 C 20 20 40 20 50 20');
        });

        it('generates Z for closed paths', () => {
            path = new Path([
                { x: 10, y: 10, handleIn: null, handleOut: null },
                { x: 50, y: 10, handleIn: null, handleOut: null },
                { x: 30, y: 50, handleIn: null, handleOut: null }
            ], true);
            expect(path.getPathData()).toBe('M 10 10 L 50 10 L 30 50 Z');
        });

        it('handles mixed corner and curve points', () => {
            path = new Path([
                { x: 10, y: 20, handleIn: null, handleOut: null },
                { x: 30, y: 40, handleIn: null, handleOut: { x: 40, y: 40 } },
                { x: 60, y: 20, handleIn: { x: 50, y: 20 }, handleOut: null }
            ]);
            expect(path.getPathData()).toBe('M 10 20 L 30 40 C 40 40 50 20 60 20');
        });

        it('uses anchor as control point when handle is missing', () => {
            path = new Path([
                { x: 10, y: 20, handleIn: null, handleOut: { x: 20, y: 20 } },
                { x: 50, y: 20, handleIn: null, handleOut: null }  // No handleIn
            ]);
            // Should use curr anchor (50, 20) as cp2
            expect(path.getPathData()).toBe('M 10 20 C 20 20 50 20 50 20');
        });

        it('generates closing curve for closed path with handles', () => {
            path = new Path([
                { x: 10, y: 10, handleIn: { x: 5, y: 10 }, handleOut: null },
                { x: 50, y: 50, handleIn: null, handleOut: { x: 55, y: 50 } }
            ], true);
            const d = path.getPathData();
            expect(d).toContain('C 55 50 5 10 10 10');
            expect(d).toContain('Z');
        });
    });

    describe('getBounds()', () => {
        it('returns zero bounds for empty path', () => {
            path = new Path([]);
            const bounds = path.getBounds();
            expect(bounds).toEqual({ x: 0, y: 0, width: 0, height: 0 });
        });

        it('calculates bounds from anchor points', () => {
            path = new Path([
                { x: 10, y: 20, handleIn: null, handleOut: null },
                { x: 50, y: 60, handleIn: null, handleOut: null }
            ]);
            const bounds = path.getBounds();
            expect(bounds).toEqual({ x: 10, y: 20, width: 40, height: 40 });
        });

        it('includes control handles in bounds', () => {
            path = new Path([
                { x: 20, y: 20, handleIn: null, handleOut: { x: 100, y: 20 } },
                { x: 50, y: 50, handleIn: { x: 50, y: 100 }, handleOut: null }
            ]);
            const bounds = path.getBounds();
            expect(bounds.x).toBe(20);
            expect(bounds.y).toBe(20);
            expect(bounds.width).toBe(80);  // 100 - 20
            expect(bounds.height).toBe(80); // 100 - 20
        });
    });

    describe('point manipulation', () => {
        beforeEach(() => {
            path = new Path([
                { x: 10, y: 10, handleIn: null, handleOut: { x: 20, y: 10 } },
                { x: 50, y: 50, handleIn: { x: 40, y: 50 }, handleOut: { x: 60, y: 50 } },
                { x: 90, y: 10, handleIn: { x: 80, y: 10 }, handleOut: null }
            ]);
            path.createSVGElement();
        });

        it('addPoint() adds corner point', () => {
            path.addPoint(100, 100);
            expect(path.points.length).toBe(4);
            expect(path.points[3]).toEqual({ x: 100, y: 100, handleIn: null, handleOut: null });
            expect(emitSpy).toHaveBeenCalledWith('shape:updated', path);
        });

        it('addPoint() adds point with handles', () => {
            path.addPoint(100, 100, { x: 95, y: 100 }, { x: 105, y: 100 });
            expect(path.points[3]).toEqual({
                x: 100,
                y: 100,
                handleIn: { x: 95, y: 100 },
                handleOut: { x: 105, y: 100 }
            });
        });

        it('movePoint() moves anchor and handles together', () => {
            path.movePoint(1, 60, 60);

            expect(path.points[1].x).toBe(60);
            expect(path.points[1].y).toBe(60);
            // Handles should move by the same offset (dx=10, dy=10)
            expect(path.points[1].handleIn).toEqual({ x: 50, y: 60 });
            expect(path.points[1].handleOut).toEqual({ x: 70, y: 60 });
            expect(emitSpy).toHaveBeenCalledWith('shape:updated', path);
        });

        it('movePoint() works when point has no handles', () => {
            path.points[0].handleOut = null;
            path.movePoint(0, 20, 20);

            expect(path.points[0].x).toBe(20);
            expect(path.points[0].y).toBe(20);
            expect(path.points[0].handleIn).toBeNull();
            expect(path.points[0].handleOut).toBeNull();
        });

        it('moveHandle() updates handle position', () => {
            path.moveHandle(1, 'in', 35, 55, false);

            expect(path.points[1].handleIn).toEqual({ x: 35, y: 55 });
            expect(emitSpy).toHaveBeenCalledWith('shape:updated', path);
        });

        it('moveHandle() mirrors opposite handle by default', () => {
            // Point 1 is at (50, 50), handleIn at (40, 50), handleOut at (60, 50)
            path.moveHandle(1, 'in', 30, 50);

            // handleIn moved to (30, 50) - offset from anchor is (-20, 0)
            expect(path.points[1].handleIn).toEqual({ x: 30, y: 50 });
            // handleOut should mirror: anchor + (-offset) = (50+20, 50+0) = (70, 50)
            expect(path.points[1].handleOut).toEqual({ x: 70, y: 50 });
        });

        it('moveHandle() does not mirror when mirror=false', () => {
            const originalHandleOut = { ...path.points[1].handleOut };
            path.moveHandle(1, 'in', 30, 50, false);

            expect(path.points[1].handleIn).toEqual({ x: 30, y: 50 });
            expect(path.points[1].handleOut).toEqual(originalHandleOut);
        });

        it('removePoint() removes point', () => {
            const removed = path.removePoint(1);

            expect(removed).toBe(true);
            expect(path.points.length).toBe(2);
            expect(path.points[1].x).toBe(90);
            expect(emitSpy).toHaveBeenCalledWith('shape:updated', path);
        });

        it('removePoint() enforces minimum 2 points', () => {
            path.removePoint(2);
            const removed = path.removePoint(1);

            expect(removed).toBe(false);
            expect(path.points.length).toBe(2);
        });

        it('removeLastPoint() removes last point', () => {
            const removed = path.removeLastPoint();

            expect(removed).toBe(true);
            expect(path.points.length).toBe(2);
            expect(path.points[path.points.length - 1].x).toBe(50);
        });

        it('removeLastPoint() enforces minimum 2 points', () => {
            path.removeLastPoint();
            const removed = path.removeLastPoint();

            expect(removed).toBe(false);
            expect(path.points.length).toBe(2);
        });
    });

    describe('closePath()', () => {
        beforeEach(() => {
            path = new Path([
                { x: 10, y: 10, handleIn: null, handleOut: null },
                { x: 50, y: 50, handleIn: null, handleOut: null }
            ]);
            path.createSVGElement();
        });

        it('sets closed flag', () => {
            expect(path.closed).toBe(false);
            path.closePath();
            expect(path.closed).toBe(true);
        });

        it('updates path data with Z', () => {
            path.closePath();
            expect(path.getPathData()).toContain('Z');
        });

        it('emits shape:updated event', () => {
            path.closePath();
            expect(emitSpy).toHaveBeenCalledWith('shape:updated', path);
        });
    });

    describe('isNearFirstPoint()', () => {
        beforeEach(() => {
            path = new Path([
                { x: 100, y: 100, handleIn: null, handleOut: null },
                { x: 200, y: 200, handleIn: null, handleOut: null }
            ]);
        });

        it('returns true within threshold', () => {
            expect(path.isNearFirstPoint(105, 105)).toBe(true);
            expect(path.isNearFirstPoint(100, 110)).toBe(true);
        });

        it('returns false outside threshold', () => {
            expect(path.isNearFirstPoint(120, 100)).toBe(false);
            expect(path.isNearFirstPoint(100, 120)).toBe(false);
        });

        it('returns false for empty path', () => {
            const emptyPath = new Path([]);
            expect(emptyPath.isNearFirstPoint(0, 0)).toBe(false);
        });

        it('respects custom threshold', () => {
            expect(path.isNearFirstPoint(125, 100, 30)).toBe(true);
            expect(path.isNearFirstPoint(125, 100, 20)).toBe(false);
        });
    });

    describe('move()', () => {
        beforeEach(() => {
            path = new Path([
                { x: 10, y: 10, handleIn: null, handleOut: { x: 20, y: 10 } },
                { x: 50, y: 50, handleIn: { x: 40, y: 50 }, handleOut: null }
            ]);
            path.createSVGElement();
        });

        it('moves all anchors by offset', () => {
            path.move(10, 20);

            expect(path.points[0].x).toBe(20);
            expect(path.points[0].y).toBe(30);
            expect(path.points[1].x).toBe(60);
            expect(path.points[1].y).toBe(70);
        });

        it('moves all handles by offset', () => {
            path.move(10, 20);

            expect(path.points[0].handleOut).toEqual({ x: 30, y: 30 });
            expect(path.points[1].handleIn).toEqual({ x: 50, y: 70 });
        });

        it('emits shape:updated event', () => {
            path.move(5, 5);
            expect(emitSpy).toHaveBeenCalledWith('shape:updated', path);
        });
    });

    describe('clone()', () => {
        beforeEach(() => {
            path = new Path([
                { x: 10, y: 10, handleIn: null, handleOut: { x: 20, y: 10 } },
                { x: 50, y: 50, handleIn: { x: 40, y: 50 }, handleOut: null }
            ], true);
            path.stroke = '#ff0000';
            path.fill = '#00ff00';
            path.strokeWidth = 3;
            path.opacity = 75;
        });

        it('creates copy with offset', () => {
            const copy = path.clone(15);

            expect(copy.points[0].x).toBe(25);
            expect(copy.points[0].y).toBe(25);
            expect(copy.points[1].x).toBe(65);
            expect(copy.points[1].y).toBe(65);
        });

        it('deep clones handles', () => {
            const copy = path.clone(15);

            expect(copy.points[0].handleOut).toEqual({ x: 35, y: 25 });
            expect(copy.points[1].handleIn).toEqual({ x: 55, y: 65 });

            // Verify it's a deep clone - modifying original doesn't affect copy
            path.points[0].handleOut.x = 999;
            expect(copy.points[0].handleOut.x).toBe(35);
        });

        it('copies closed state', () => {
            const copy = path.clone();
            expect(copy.closed).toBe(true);
        });

        it('copies all shape attributes', () => {
            const copy = path.clone();

            expect(copy.stroke).toBe('#ff0000');
            expect(copy.fill).toBe('#00ff00');
            expect(copy.strokeWidth).toBe(3);
            expect(copy.opacity).toBe(75);
        });

        it('creates independent copy', () => {
            const copy = path.clone();
            copy.points[0].x = 999;

            expect(path.points[0].x).toBe(10);
        });
    });

    describe('addPointBetween()', () => {
        beforeEach(() => {
            path = new Path([
                { x: 10, y: 10, handleIn: null, handleOut: null },
                { x: 50, y: 50, handleIn: null, handleOut: null }
            ]);
            path.createSVGElement();
        });

        it('inserts midpoint between two points', () => {
            path.addPointBetween(0);

            expect(path.points.length).toBe(3);
            expect(path.points[1]).toEqual({
                x: 30,
                y: 30,
                handleIn: null,
                handleOut: null
            });
        });

        it('emits shape:updated event', () => {
            path.addPointBetween(0);
            expect(emitSpy).toHaveBeenCalledWith('shape:updated', path);
        });
    });

    describe('SVG element', () => {
        it('createSVGElement() creates path element', () => {
            path = new Path([
                { x: 10, y: 20, handleIn: null, handleOut: null },
                { x: 30, y: 40, handleIn: null, handleOut: null }
            ]);
            const el = path.createSVGElement();

            expect(el.tagName).toBe('path');
            expect(el.getAttribute('id')).toBe(path.id);
            expect(el.getAttribute('d')).toBe('M 10 20 L 30 40');
        });

        it('updateElement() updates d attribute', () => {
            path = new Path([
                { x: 10, y: 20, handleIn: null, handleOut: null }
            ]);
            path.createSVGElement();

            path.addPoint(50, 60);
            expect(path.element.getAttribute('d')).toBe('M 10 20 L 50 60');
        });

        it('applies common attributes', () => {
            path = new Path([{ x: 10, y: 20, handleIn: null, handleOut: null }]);
            path.stroke = '#ff0000';
            path.fill = '#00ff00';
            path.strokeWidth = 5;
            const el = path.createSVGElement();

            expect(el.getAttribute('stroke')).toBe('#ff0000');
            expect(el.getAttribute('fill')).toBe('#00ff00');
            expect(el.getAttribute('stroke-width')).toBe('5');
        });
    });

    describe('properties panel', () => {
        it('has pointCount property', () => {
            const props = Path.properties;
            expect(props.pointCount).toBeDefined();
            expect(props.pointCount.type).toBe('number');
            expect(props.pointCount.readonly).toBe(true);
        });

        it('pointCount getter returns correct value', () => {
            path = new Path([
                { x: 10, y: 10, handleIn: null, handleOut: null },
                { x: 20, y: 20, handleIn: null, handleOut: null },
                { x: 30, y: 30, handleIn: null, handleOut: null }
            ]);
            expect(Path.properties.pointCount.get(path)).toBe(3);
        });

        it('has closed property', () => {
            const props = Path.properties;
            expect(props.closed).toBeDefined();
            expect(props.closed.type).toBe('checkbox');
        });

        it('closed getter/setter work', () => {
            path = new Path([
                { x: 10, y: 10, handleIn: null, handleOut: null },
                { x: 20, y: 20, handleIn: null, handleOut: null }
            ]);
            path.createSVGElement();

            expect(Path.properties.closed.get(path)).toBe(false);

            Path.properties.closed.set(path, true);
            expect(path.closed).toBe(true);
            expect(emitSpy).toHaveBeenCalledWith('shape:updated', path);
        });

        it('has addPoint button', () => {
            const props = Path.properties;
            expect(props.addPoint).toBeDefined();
            expect(props.addPoint.type).toBe('button');
        });

        it('has removePoint button', () => {
            const props = Path.properties;
            expect(props.removePoint).toBeDefined();
            expect(props.removePoint.type).toBe('button');
        });
    });

    describe('serialization round-trip', () => {
        it('save then load preserves exact path data', () => {
            const original = new Path([
                { x: 10, y: 10, handleIn: null, handleOut: { x: 30, y: 10 } },
                { x: 50, y: 50, handleIn: { x: 50, y: 30 }, handleOut: { x: 50, y: 70 } },
                { x: 90, y: 10, handleIn: { x: 70, y: 10 }, handleOut: null }
            ], true);
            original.stroke = '#ff0000';
            original.fill = '#00ff00';
            original.strokeWidth = 3;
            original.opacity = 80;
            original.strokeDash = 'dashed';

            // Serialize
            const serialized = historyManager.serializeShape(original);

            // Deserialize
            const restored = historyManager.deserializeShape(serialized);

            // Verify all properties match
            expect(restored.points.length).toBe(original.points.length);
            for (let i = 0; i < original.points.length; i++) {
                expect(restored.points[i].x).toBe(original.points[i].x);
                expect(restored.points[i].y).toBe(original.points[i].y);
                expect(restored.points[i].handleIn).toEqual(original.points[i].handleIn);
                expect(restored.points[i].handleOut).toEqual(original.points[i].handleOut);
            }
            expect(restored.closed).toBe(original.closed);
            expect(restored.stroke).toBe(original.stroke);
            expect(restored.fill).toBe(original.fill);
            expect(restored.strokeWidth).toBe(original.strokeWidth);
            expect(restored.opacity).toBe(original.opacity);
            expect(restored.strokeDash).toBe(original.strokeDash);
        });
    });
});
