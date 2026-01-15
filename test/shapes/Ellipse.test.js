import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Ellipse', () => {
    let ellipse;
    let emitSpy;

    beforeEach(() => {
        emitSpy = vi.spyOn(window.eventBus, 'emit');
        ellipse = new Ellipse(100, 100, 50, 30);
    });

    describe('constructor', () => {
        it('creates ellipse with specified dimensions', () => {
            expect(ellipse.cx).toBe(100);
            expect(ellipse.cy).toBe(100);
            expect(ellipse.rx).toBe(50);
            expect(ellipse.ry).toBe(30);
        });

        it('uses default dimensions when none specified', () => {
            const defaultEllipse = new Ellipse();
            expect(defaultEllipse.cx).toBe(0);
            expect(defaultEllipse.cy).toBe(0);
            expect(defaultEllipse.rx).toBe(50);
            expect(defaultEllipse.ry).toBe(50);
        });

        it('sets type to ellipse', () => {
            expect(ellipse.type).toBe('ellipse');
        });
    });

    describe('getBounds()', () => {
        it('returns correct bounding box', () => {
            expect(ellipse.getBounds()).toEqual({
                x: 50,   // 100 - 50
                y: 70,   // 100 - 30
                width: 100,  // 50 * 2
                height: 60   // 30 * 2
            });
        });
    });

    describe('resize()', () => {
        it('updates radii and center from bounding box', () => {
            ellipse.resize(0, 0, 200, 100);

            expect(ellipse.rx).toBe(100); // 200 / 2
            expect(ellipse.ry).toBe(50);  // 100 / 2
            expect(ellipse.cx).toBe(100); // 0 + 100
            expect(ellipse.cy).toBe(50);  // 0 + 50
        });

        it('enforces minimum radius of 1', () => {
            ellipse.resize(0, 0, 0, 0);

            expect(ellipse.rx).toBe(1);
            expect(ellipse.ry).toBe(1);
        });

        it('emits shape:updated event', () => {
            ellipse.resize(0, 0, 100, 100);

            expect(emitSpy).toHaveBeenCalledWith('shape:updated', ellipse);
        });
    });

    describe('move()', () => {
        it('moves center by delta values', () => {
            ellipse.move(20, 30);

            expect(ellipse.cx).toBe(120); // 100 + 20
            expect(ellipse.cy).toBe(130); // 100 + 30
        });

        it('emits shape:updated event', () => {
            ellipse.move(10, 10);

            expect(emitSpy).toHaveBeenCalledWith('shape:updated', ellipse);
        });
    });

    describe('moveTo()', () => {
        it('positions ellipse so bounding box starts at given point', () => {
            ellipse.moveTo(0, 0);

            expect(ellipse.cx).toBe(50); // 0 + rx
            expect(ellipse.cy).toBe(30); // 0 + ry
        });

        it('emits shape:updated event', () => {
            ellipse.moveTo(50, 50);

            expect(emitSpy).toHaveBeenCalledWith('shape:updated', ellipse);
        });
    });

    describe('clone()', () => {
        it('creates new ellipse with offset', () => {
            const copy = ellipse.clone(15);

            expect(copy).not.toBe(ellipse);
            expect(copy.cx).toBe(115); // 100 + 15
            expect(copy.cy).toBe(115); // 100 + 15
            expect(copy.rx).toBe(50);
            expect(copy.ry).toBe(30);
        });

        it('copies style attributes', () => {
            ellipse.stroke = '#ff0000';
            ellipse.fill = '#0000ff';

            const copy = ellipse.clone();

            expect(copy.stroke).toBe('#ff0000');
            expect(copy.fill).toBe('#0000ff');
        });
    });

    describe('createSVGElement()', () => {
        it('creates ellipse SVG element', () => {
            const el = ellipse.createSVGElement();

            expect(el.tagName).toBe('ellipse');
            expect(el.getAttribute('cx')).toBe('100');
            expect(el.getAttribute('cy')).toBe('100');
            expect(el.getAttribute('rx')).toBe('50');
            expect(el.getAttribute('ry')).toBe('30');
        });
    });
});
