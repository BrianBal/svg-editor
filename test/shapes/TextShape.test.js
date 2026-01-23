import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('TextShape', () => {
    let text;
    let emitSpy;

    beforeEach(() => {
        emitSpy = vi.spyOn(window.eventBus, 'emit');
        text = new TextShape(10, 50, 'Hello', 24, 'Arial');
    });

    describe('constructor', () => {
        it('creates text shape with specified properties', () => {
            expect(text.x).toBe(10);
            expect(text.y).toBe(50);
            expect(text.text).toBe('Hello');
            expect(text.fontSize).toBe(24);
            expect(text.fontFamily).toBe('Arial');
        });

        it('uses default values when none specified', () => {
            const defaultText = new TextShape();
            expect(defaultText.x).toBe(0);
            expect(defaultText.y).toBe(0);
            expect(defaultText.text).toBe('Text');
            expect(defaultText.fontSize).toBe(24);
            expect(defaultText.fontFamily).toBe('Arial');
        });

        it('sets type to text', () => {
            expect(text.type).toBe('text');
        });
    });

    describe('createSVGElement()', () => {
        it('creates text SVG element', () => {
            const el = text.createSVGElement();

            expect(el.tagName).toBe('text');
            expect(el.getAttribute('x')).toBe('10');
            expect(el.getAttribute('y')).toBe('50');
            expect(el.getAttribute('font-size')).toBe('24');
            expect(el.getAttribute('font-family')).toBe('Arial');
            expect(el.textContent).toBe('Hello');
        });

        it('applies style attributes', () => {
            text.stroke = '#ff0000';
            text.fill = '#0000ff';

            const el = text.createSVGElement();

            expect(el.getAttribute('stroke')).toBe('#ff0000');
            expect(el.getAttribute('fill')).toBe('#0000ff');
        });
    });

    describe('updateElement()', () => {
        it('updates SVG element attributes', () => {
            text.createSVGElement();
            text.x = 100;
            text.y = 200;
            text.fontSize = 36;
            text.fontFamily = 'Helvetica';
            text.text = 'Updated';

            text.updateElement();

            expect(text.element.getAttribute('x')).toBe('100');
            expect(text.element.getAttribute('y')).toBe('200');
            expect(text.element.getAttribute('font-size')).toBe('36');
            expect(text.element.getAttribute('font-family')).toBe('Helvetica');
            expect(text.element.textContent).toBe('Updated');
        });

        it('does nothing if element not created', () => {
            text.element = null;
            expect(() => text.updateElement()).not.toThrow();
        });
    });

    describe('move()', () => {
        it('moves by delta values', () => {
            text.move(20, 30);

            expect(text.x).toBe(30); // 10 + 20
            expect(text.y).toBe(80); // 50 + 30
        });

        it('emits shape:updated event', () => {
            text.move(10, 10);

            expect(emitSpy).toHaveBeenCalledWith('shape:updated', text);
        });
    });

    describe('moveTo()', () => {
        it('positions text at given point adjusted for baseline', () => {
            text.moveTo(100, 100);

            expect(text.x).toBe(100);
            expect(text.y).toBe(124); // 100 + fontSize (24)
        });

        it('emits shape:updated event', () => {
            text.moveTo(50, 50);

            expect(emitSpy).toHaveBeenCalledWith('shape:updated', text);
        });
    });

    describe('setText()', () => {
        it('updates text content', () => {
            text.setText('New text');

            expect(text.text).toBe('New text');
        });

        it('emits shape:updated event', () => {
            text.setText('Changed');

            expect(emitSpy).toHaveBeenCalledWith('shape:updated', text);
        });

        it('updates element if created', () => {
            text.createSVGElement();
            text.setText('Updated');

            expect(text.element.textContent).toBe('Updated');
        });
    });

    describe('setFontSize()', () => {
        it('updates font size', () => {
            text.setFontSize(36);

            expect(text.fontSize).toBe(36);
        });

        it('emits shape:updated event', () => {
            text.setFontSize(48);

            expect(emitSpy).toHaveBeenCalledWith('shape:updated', text);
        });

        it('updates element if created', () => {
            text.createSVGElement();
            text.setFontSize(32);

            expect(text.element.getAttribute('font-size')).toBe('32');
        });
    });

    describe('setFontFamily()', () => {
        it('updates font family', () => {
            text.setFontFamily('Courier New');

            expect(text.fontFamily).toBe('Courier New');
        });

        it('emits shape:updated event', () => {
            text.setFontFamily('Verdana');

            expect(emitSpy).toHaveBeenCalledWith('shape:updated', text);
        });

        it('updates element if created', () => {
            text.createSVGElement();
            text.setFontFamily('Georgia');

            expect(text.element.getAttribute('font-family')).toBe('Georgia');
        });
    });

    describe('getBounds()', () => {
        it('returns estimated bounds when element not created', () => {
            const bounds = text.getBounds();

            expect(bounds.x).toBe(10);
            expect(bounds.y).toBe(26); // 50 - 24
            expect(bounds.width).toBeGreaterThan(0);
            expect(bounds.height).toBe(24);
        });

        it('uses element getBBox when available', () => {
            text.createSVGElement();
            // Append to DOM so getBBox works
            document.getElementById('shapes-layer').appendChild(text.element);

            const bounds = text.getBounds();

            expect(bounds).toBeDefined();
            expect(bounds.x).toBeDefined();
            expect(bounds.y).toBeDefined();
            expect(bounds.width).toBeGreaterThan(0);
            expect(bounds.height).toBeGreaterThan(0);
        });
    });

    describe('clone()', () => {
        it('creates new text shape with offset', () => {
            const copy = text.clone(15);

            expect(copy).not.toBe(text);
            expect(copy.x).toBe(25); // 10 + 15
            expect(copy.y).toBe(65); // 50 + 15
            expect(copy.text).toBe('Hello');
            expect(copy.fontSize).toBe(24);
            expect(copy.fontFamily).toBe('Arial');
        });

        it('uses default offset of 10', () => {
            const copy = text.clone();

            expect(copy.x).toBe(20); // 10 + 10
            expect(copy.y).toBe(60); // 50 + 10
        });

        it('copies style attributes', () => {
            text.stroke = '#ff0000';
            text.fill = '#00ff00';
            text.strokeWidth = 2;

            const copy = text.clone();

            expect(copy.stroke).toBe('#ff0000');
            expect(copy.fill).toBe('#00ff00');
            expect(copy.strokeWidth).toBe(2);
        });

        it('creates independent instance', () => {
            const copy = text.clone();
            copy.text = 'Different';

            expect(text.text).toBe('Hello');
        });
    });

    describe('rotation and transforms', () => {
        it('applies rotation transform to element', () => {
            text.createSVGElement();
            text.setRotation(45);

            const transform = text.element.getAttribute('transform');
            expect(transform).toContain('rotate(45');
        });

        it('updates transform when text is rotated', () => {
            text.createSVGElement();
            document.getElementById('shapes-layer').appendChild(text.element);
            text.setRotation(90);
            const originalTransform = text.element.getAttribute('transform');

            text.move(50, 0);

            const newTransform = text.element.getAttribute('transform');
            expect(newTransform).toContain('rotate(90');
            // Transform should be reapplied (even if center doesn't change much)
            expect(text.element.hasAttribute('transform')).toBe(true);
        });

        it('maintains transform after setText', () => {
            text.createSVGElement();
            text.setRotation(30);

            text.setText('Different length text');

            const transform = text.element.getAttribute('transform');
            expect(transform).toContain('rotate(30');
        });

        it('maintains transform after setFontSize', () => {
            text.createSVGElement();
            text.setRotation(60);

            text.setFontSize(48);

            const transform = text.element.getAttribute('transform');
            expect(transform).toContain('rotate(60');
        });

        it('handles both flip and rotation transforms', () => {
            text.createSVGElement();
            text.setRotation(15);
            text.flipHorizontal();

            text.move(0, 30);

            expect(text.rotation).toBe(15);
            expect(text.scaleX).toBe(-1);
            const transform = text.element.getAttribute('transform');
            expect(transform).toContain('scale(-1, 1)');
            expect(transform).toContain('rotate(15');
        });
    });
});
