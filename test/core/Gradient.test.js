import { describe, it, expect, beforeEach } from 'vitest';

describe('Gradient', () => {
    beforeEach(() => {
        Gradient.resetIdCounter();
    });

    describe('constructor', () => {
        it('creates linear gradient by default', () => {
            const grad = new Gradient();
            expect(grad.type).toBe('linear');
        });

        it('creates radial gradient when specified', () => {
            const grad = new Gradient('radial');
            expect(grad.type).toBe('radial');
        });

        it('initializes with two default stops', () => {
            const grad = new Gradient();
            expect(grad.stops.length).toBe(2);
            expect(grad.stops[0]).toEqual({ offset: 0, color: '#000000' });
            expect(grad.stops[1]).toEqual({ offset: 100, color: '#ffffff' });
        });

        it('generates unique IDs', () => {
            const grad1 = new Gradient();
            const grad2 = new Gradient();
            expect(grad1.id).toBe('gradient-1');
            expect(grad2.id).toBe('gradient-2');
        });

        it('initializes linear gradient properties', () => {
            const grad = new Gradient('linear');
            expect(grad.angle).toBe(0);
        });

        it('initializes radial gradient properties', () => {
            const grad = new Gradient('radial');
            expect(grad.cx).toBe(50);
            expect(grad.cy).toBe(50);
            expect(grad.r).toBe(50);
        });
    });

    describe('clone()', () => {
        it('creates independent copy', () => {
            const grad = new Gradient('linear');
            grad.angle = 45;
            grad.stops[0].color = '#ff0000';

            const copy = grad.clone();

            expect(copy.type).toBe('linear');
            expect(copy.angle).toBe(45);
            expect(copy.stops[0].color).toBe('#ff0000');
            expect(copy.id).not.toBe(grad.id);
        });

        it('does not share stops array', () => {
            const grad = new Gradient();
            const copy = grad.clone();

            copy.stops[0].color = '#ff0000';
            expect(grad.stops[0].color).toBe('#000000');
        });

        it('copies radial gradient properties', () => {
            const grad = new Gradient('radial');
            grad.cx = 25;
            grad.cy = 75;
            grad.r = 80;

            const copy = grad.clone();

            expect(copy.cx).toBe(25);
            expect(copy.cy).toBe(75);
            expect(copy.r).toBe(80);
        });
    });

    describe('addStop()', () => {
        it('adds a new color stop', () => {
            const grad = new Gradient();
            grad.addStop(50, '#ff0000');

            expect(grad.stops.length).toBe(3);
            expect(grad.stops[1]).toEqual({ offset: 50, color: '#ff0000' });
        });

        it('maintains sorted order by offset', () => {
            const grad = new Gradient();
            grad.addStop(25, '#ff0000');
            grad.addStop(75, '#00ff00');

            expect(grad.stops[0].offset).toBe(0);
            expect(grad.stops[1].offset).toBe(25);
            expect(grad.stops[2].offset).toBe(75);
            expect(grad.stops[3].offset).toBe(100);
        });
    });

    describe('removeStop()', () => {
        it('removes stop at index', () => {
            const grad = new Gradient();
            grad.addStop(50, '#ff0000');

            grad.removeStop(1);

            expect(grad.stops.length).toBe(2);
        });

        it('does not remove if only 2 stops remain', () => {
            const grad = new Gradient();

            grad.removeStop(0);

            expect(grad.stops.length).toBe(2);
        });
    });

    describe('updateStop()', () => {
        it('updates stop color', () => {
            const grad = new Gradient();
            grad.updateStop(0, undefined, '#ff0000');

            expect(grad.stops[0].color).toBe('#ff0000');
        });

        it('updates stop offset', () => {
            const grad = new Gradient();
            grad.updateStop(0, 10, undefined);

            expect(grad.stops[0].offset).toBe(10);
        });

        it('re-sorts stops after offset update', () => {
            const grad = new Gradient();
            grad.addStop(50, '#ff0000');
            grad.updateStop(0, 75, undefined);

            expect(grad.stops[0].offset).toBe(50);
            expect(grad.stops[1].offset).toBe(75);
            expect(grad.stops[2].offset).toBe(100);
        });
    });

    describe('toCSS()', () => {
        it('generates CSS linear gradient', () => {
            const grad = new Gradient('linear');
            grad.angle = 90;

            const css = grad.toCSS();

            expect(css).toBe('linear-gradient(90deg, #000000 0%, #ffffff 100%)');
        });

        it('generates CSS radial gradient', () => {
            const grad = new Gradient('radial');
            grad.cx = 30;
            grad.cy = 70;

            const css = grad.toCSS();

            expect(css).toBe('radial-gradient(circle at 30% 70%, #000000 0%, #ffffff 100%)');
        });
    });

    describe('toSVGElement()', () => {
        it('creates linearGradient element for linear type', () => {
            const grad = new Gradient('linear');
            const el = grad.toSVGElement();

            expect(el.tagName).toBe('linearGradient');
            expect(el.getAttribute('id')).toBe(grad.id);
        });

        it('creates radialGradient element for radial type', () => {
            const grad = new Gradient('radial');
            const el = grad.toSVGElement();

            expect(el.tagName).toBe('radialGradient');
            expect(el.getAttribute('id')).toBe(grad.id);
        });

        it('includes color stops', () => {
            const grad = new Gradient();
            const el = grad.toSVGElement();
            const stops = el.querySelectorAll('stop');

            expect(stops.length).toBe(2);
            expect(stops[0].getAttribute('offset')).toBe('0%');
            expect(stops[0].getAttribute('stop-color')).toBe('#000000');
        });

        it('sets radial gradient attributes', () => {
            const grad = new Gradient('radial');
            grad.cx = 25;
            grad.cy = 75;
            grad.r = 60;

            const el = grad.toSVGElement();

            expect(el.getAttribute('cx')).toBe('25%');
            expect(el.getAttribute('cy')).toBe('75%');
            expect(el.getAttribute('r')).toBe('60%');
        });
    });

    describe('fromSVGElement()', () => {
        it('parses linear gradient element', () => {
            const el = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
            el.setAttribute('id', 'test-grad');
            el.setAttribute('x1', '0%');
            el.setAttribute('y1', '0%');
            el.setAttribute('x2', '100%');
            el.setAttribute('y2', '0%');

            const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            stop1.setAttribute('offset', '0%');
            stop1.setAttribute('stop-color', '#ff0000');
            el.appendChild(stop1);

            const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            stop2.setAttribute('offset', '100%');
            stop2.setAttribute('stop-color', '#0000ff');
            el.appendChild(stop2);

            const grad = Gradient.fromSVGElement(el);

            expect(grad.type).toBe('linear');
            expect(grad.id).toBe('test-grad');
            expect(grad.stops.length).toBe(2);
            expect(grad.stops[0].color).toBe('#ff0000');
        });

        it('parses radial gradient element', () => {
            const el = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
            el.setAttribute('id', 'test-radial');
            el.setAttribute('cx', '30%');
            el.setAttribute('cy', '70%');
            el.setAttribute('r', '40%');

            const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            stop1.setAttribute('offset', '0%');
            stop1.setAttribute('stop-color', '#ff0000');
            el.appendChild(stop1);

            const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            stop2.setAttribute('offset', '100%');
            stop2.setAttribute('stop-color', '#0000ff');
            el.appendChild(stop2);

            const grad = Gradient.fromSVGElement(el);

            expect(grad.type).toBe('radial');
            expect(grad.cx).toBe(30);
            expect(grad.cy).toBe(70);
            expect(grad.r).toBe(40);
        });
    });

    describe('serialize() and deserialize()', () => {
        it('serializes gradient to plain object', () => {
            const grad = new Gradient('linear');
            grad.angle = 45;
            grad.stops = [
                { offset: 0, color: '#ff0000' },
                { offset: 100, color: '#0000ff' }
            ];

            const data = grad.serialize();

            expect(data.id).toBe(grad.id);
            expect(data.type).toBe('linear');
            expect(data.angle).toBe(45);
            expect(data.stops.length).toBe(2);
        });

        it('deserializes plain object to gradient', () => {
            const data = {
                id: 'gradient-99',
                type: 'radial',
                stops: [
                    { offset: 0, color: '#ff0000' },
                    { offset: 100, color: '#0000ff' }
                ],
                angle: 0,
                cx: 25,
                cy: 75,
                r: 60
            };

            const grad = Gradient.deserialize(data);

            expect(grad.id).toBe('gradient-99');
            expect(grad.type).toBe('radial');
            expect(grad.cx).toBe(25);
            expect(grad.cy).toBe(75);
            expect(grad.r).toBe(60);
        });

        it('round-trips correctly', () => {
            const original = new Gradient('linear');
            original.angle = 135;
            original.addStop(50, '#00ff00');

            const restored = Gradient.deserialize(original.serialize());

            expect(restored.type).toBe(original.type);
            expect(restored.angle).toBe(original.angle);
            expect(restored.stops.length).toBe(original.stops.length);
        });
    });
});
