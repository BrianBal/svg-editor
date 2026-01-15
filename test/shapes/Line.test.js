import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Line', () => {
    let line;
    let emitSpy;

    beforeEach(() => {
        emitSpy = vi.spyOn(window.eventBus, 'emit');
        line = new Line(10, 20, 110, 70);
    });

    describe('constructor', () => {
        it('creates line with specified endpoints', () => {
            expect(line.x1).toBe(10);
            expect(line.y1).toBe(20);
            expect(line.x2).toBe(110);
            expect(line.y2).toBe(70);
        });

        it('uses default endpoints when none specified', () => {
            const defaultLine = new Line();
            expect(defaultLine.x1).toBe(0);
            expect(defaultLine.y1).toBe(0);
            expect(defaultLine.x2).toBe(100);
            expect(defaultLine.y2).toBe(100);
        });

        it('sets type to line', () => {
            expect(line.type).toBe('line');
        });
    });

    describe('getBounds()', () => {
        it('returns correct bounding box', () => {
            expect(line.getBounds()).toEqual({
                x: 10,
                y: 20,
                width: 100,
                height: 50
            });
        });

        it('handles reversed endpoints', () => {
            const reversed = new Line(100, 100, 50, 25);

            expect(reversed.getBounds()).toEqual({
                x: 50,
                y: 25,
                width: 50,
                height: 75
            });
        });

        it('returns minimum width of 1 for vertical line', () => {
            const vertical = new Line(50, 0, 50, 100);

            expect(vertical.getBounds().width).toBe(1);
        });

        it('returns minimum height of 1 for horizontal line', () => {
            const horizontal = new Line(0, 50, 100, 50);

            expect(horizontal.getBounds().height).toBe(1);
        });
    });

    describe('move()', () => {
        it('moves both endpoints by delta', () => {
            line.move(15, 25);

            expect(line.x1).toBe(25);
            expect(line.y1).toBe(45);
            expect(line.x2).toBe(125);
            expect(line.y2).toBe(95);
        });

        it('emits shape:updated event', () => {
            line.move(10, 10);

            expect(emitSpy).toHaveBeenCalledWith('shape:updated', line);
        });
    });

    describe('moveTo()', () => {
        it('moves line so bounding box starts at given point', () => {
            line.moveTo(0, 0);

            // Original bounds: x=10, y=20
            // Move by dx=-10, dy=-20
            expect(line.x1).toBe(0);
            expect(line.y1).toBe(0);
            expect(line.x2).toBe(100);
            expect(line.y2).toBe(50);
        });
    });

    describe('movePoint()', () => {
        it('moves first endpoint when index is 0', () => {
            line.movePoint(0, 50, 50);

            expect(line.x1).toBe(50);
            expect(line.y1).toBe(50);
            expect(line.x2).toBe(110); // unchanged
            expect(line.y2).toBe(70);  // unchanged
        });

        it('moves second endpoint when index is 1', () => {
            line.movePoint(1, 200, 200);

            expect(line.x1).toBe(10);  // unchanged
            expect(line.y1).toBe(20);  // unchanged
            expect(line.x2).toBe(200);
            expect(line.y2).toBe(200);
        });

        it('emits shape:updated event', () => {
            line.movePoint(0, 50, 50);

            expect(emitSpy).toHaveBeenCalledWith('shape:updated', line);
        });
    });

    describe('clone()', () => {
        it('creates new line with offset', () => {
            const copy = line.clone(20);

            expect(copy).not.toBe(line);
            expect(copy.x1).toBe(30);
            expect(copy.y1).toBe(40);
            expect(copy.x2).toBe(130);
            expect(copy.y2).toBe(90);
        });

        it('uses default offset of 10', () => {
            const copy = line.clone();

            expect(copy.x1).toBe(20);
            expect(copy.y1).toBe(30);
        });

        it('copies style attributes', () => {
            line.stroke = '#ff0000';
            line.strokeWidth = 5;

            const copy = line.clone();

            expect(copy.stroke).toBe('#ff0000');
            expect(copy.strokeWidth).toBe(5);
        });
    });

    describe('createSVGElement()', () => {
        it('creates line SVG element', () => {
            const el = line.createSVGElement();

            expect(el.tagName).toBe('line');
            expect(el.getAttribute('x1')).toBe('10');
            expect(el.getAttribute('y1')).toBe('20');
            expect(el.getAttribute('x2')).toBe('110');
            expect(el.getAttribute('y2')).toBe('70');
        });

        it('applies style attributes', () => {
            line.stroke = '#ff0000';
            line.strokeWidth = 3;

            const el = line.createSVGElement();

            expect(el.getAttribute('stroke')).toBe('#ff0000');
            expect(el.getAttribute('stroke-width')).toBe('3');
        });
    });

    describe('updateElement()', () => {
        it('updates SVG element attributes', () => {
            line.createSVGElement();
            line.x1 = 50;
            line.y1 = 60;

            line.updateElement();

            expect(line.element.getAttribute('x1')).toBe('50');
            expect(line.element.getAttribute('y1')).toBe('60');
        });
    });
});
