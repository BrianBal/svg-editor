import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Rectangle', () => {
    let rect;
    let emitSpy;

    beforeEach(() => {
        emitSpy = vi.spyOn(window.eventBus, 'emit');
        rect = new Rectangle(10, 20, 100, 50);
    });

    describe('constructor', () => {
        it('creates rectangle with specified dimensions', () => {
            expect(rect.x).toBe(10);
            expect(rect.y).toBe(20);
            expect(rect.width).toBe(100);
            expect(rect.height).toBe(50);
        });

        it('uses default dimensions when none specified', () => {
            const defaultRect = new Rectangle();
            expect(defaultRect.x).toBe(0);
            expect(defaultRect.y).toBe(0);
            expect(defaultRect.width).toBe(100);
            expect(defaultRect.height).toBe(100);
        });

        it('sets type to rectangle', () => {
            expect(rect.type).toBe('rectangle');
        });

        it('generates unique id', () => {
            const rect2 = new Rectangle();
            expect(rect.id).not.toBe(rect2.id);
        });
    });

    describe('getBounds()', () => {
        it('returns correct bounds', () => {
            expect(rect.getBounds()).toEqual({
                x: 10,
                y: 20,
                width: 100,
                height: 50
            });
        });
    });

    describe('resize()', () => {
        it('updates dimensions', () => {
            rect.resize(5, 10, 200, 100);

            expect(rect.x).toBe(5);
            expect(rect.y).toBe(10);
            expect(rect.width).toBe(200);
            expect(rect.height).toBe(100);
        });

        it('enforces minimum dimension of 1', () => {
            rect.resize(0, 0, 0, 0);

            expect(rect.width).toBe(1);
            expect(rect.height).toBe(1);
        });

        it('emits shape:updated event', () => {
            rect.resize(5, 10, 200, 100);

            expect(emitSpy).toHaveBeenCalledWith('shape:updated', rect);
        });
    });

    describe('move()', () => {
        it('moves by delta values', () => {
            rect.move(15, 25);

            expect(rect.x).toBe(25); // 10 + 15
            expect(rect.y).toBe(45); // 20 + 25
        });

        it('emits shape:updated event', () => {
            rect.move(10, 10);

            expect(emitSpy).toHaveBeenCalledWith('shape:updated', rect);
        });
    });

    describe('moveTo()', () => {
        it('moves to absolute position', () => {
            rect.moveTo(50, 60);

            expect(rect.x).toBe(50);
            expect(rect.y).toBe(60);
        });

        it('emits shape:updated event', () => {
            rect.moveTo(50, 60);

            expect(emitSpy).toHaveBeenCalledWith('shape:updated', rect);
        });
    });

    describe('clone()', () => {
        it('creates new rectangle with offset', () => {
            const copy = rect.clone(20);

            expect(copy).not.toBe(rect);
            expect(copy.x).toBe(30); // 10 + 20
            expect(copy.y).toBe(40); // 20 + 20
            expect(copy.width).toBe(100);
            expect(copy.height).toBe(50);
        });

        it('uses default offset of 10', () => {
            const copy = rect.clone();

            expect(copy.x).toBe(20); // 10 + 10
            expect(copy.y).toBe(30); // 20 + 10
        });

        it('copies style attributes', () => {
            rect.stroke = '#ff0000';
            rect.fill = '#00ff00';
            rect.strokeWidth = 5;

            const copy = rect.clone();

            expect(copy.stroke).toBe('#ff0000');
            expect(copy.fill).toBe('#00ff00');
            expect(copy.strokeWidth).toBe(5);
        });

        it('creates independent instance', () => {
            const copy = rect.clone();
            copy.x = 999;

            expect(rect.x).toBe(10);
        });
    });

    describe('createSVGElement()', () => {
        it('creates rect SVG element', () => {
            const el = rect.createSVGElement();

            expect(el.tagName).toBe('rect');
            expect(el.getAttribute('x')).toBe('10');
            expect(el.getAttribute('y')).toBe('20');
            expect(el.getAttribute('width')).toBe('100');
            expect(el.getAttribute('height')).toBe('50');
        });

        it('applies style attributes', () => {
            rect.stroke = '#ff0000';
            rect.fill = '#00ff00';
            rect.strokeWidth = 3;

            const el = rect.createSVGElement();

            expect(el.getAttribute('stroke')).toBe('#ff0000');
            expect(el.getAttribute('fill')).toBe('#00ff00');
            expect(el.getAttribute('stroke-width')).toBe('3');
        });

        it('sets data-shape-id attribute', () => {
            const el = rect.createSVGElement();

            expect(el.dataset.shapeId).toBe(rect.id);
        });
    });

    describe('updateElement()', () => {
        it('updates SVG element attributes', () => {
            rect.createSVGElement();
            rect.x = 50;
            rect.y = 60;
            rect.width = 200;
            rect.height = 150;

            rect.updateElement();

            expect(rect.element.getAttribute('x')).toBe('50');
            expect(rect.element.getAttribute('y')).toBe('60');
            expect(rect.element.getAttribute('width')).toBe('200');
            expect(rect.element.getAttribute('height')).toBe('150');
        });

        it('does nothing if element not created', () => {
            rect.element = null;
            expect(() => rect.updateElement()).not.toThrow();
        });
    });
});
