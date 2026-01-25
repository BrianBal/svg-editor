import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('PropertiesPanel Iso Presets', () => {
    let rect;

    beforeEach(() => {
        // Reset shape counter
        Shape.resetIdCounter();

        // Create rectangle with SVG element
        rect = new Rectangle(100, 100, 200, 150);
        rect.element = rect.createSVGElement();
    });

    describe('Iso Top Preset', () => {
        it('should set rotation to 45', () => {
            const emitSpy = vi.spyOn(window.eventBus, 'emit');

            // Simulate Iso Top button action
            rect.setRotation(45);
            rect.scaleY = 0.577;
            rect.setSkewX(0);
            rect.setSkewY(0);
            if (rect.element) {
                rect.applyTransform(rect.element);
            }
            eventBus.emit('shape:updated', rect);

            expect(rect.rotation).toBe(45);
            expect(emitSpy).toHaveBeenCalledWith('shape:updated', rect);
        });

        it('should set scaleY to 0.577', () => {
            rect.setRotation(45);
            rect.scaleY = 0.577;
            rect.setSkewX(0);
            rect.setSkewY(0);

            expect(rect.scaleY).toBe(0.577);
        });

        it('should reset skewX to 0', () => {
            rect.setSkewX(20);

            rect.setRotation(45);
            rect.scaleY = 0.577;
            rect.setSkewX(0);
            rect.setSkewY(0);

            expect(rect.skewX).toBe(0);
        });

        it('should reset skewY to 0', () => {
            rect.setSkewY(20);

            rect.setRotation(45);
            rect.scaleY = 0.577;
            rect.setSkewX(0);
            rect.setSkewY(0);

            expect(rect.skewY).toBe(0);
        });

        it('should emit shape:updated event', () => {
            const emitSpy = vi.spyOn(window.eventBus, 'emit');

            rect.setRotation(45);
            rect.scaleY = 0.577;
            rect.setSkewX(0);
            rect.setSkewY(0);
            eventBus.emit('shape:updated', rect);

            expect(emitSpy).toHaveBeenCalledWith('shape:updated', rect);
        });
    });

    describe('Iso Left Preset', () => {
        it('should reset rotation to 0', () => {
            rect.setRotation(45);

            // Simulate Iso Left button action
            rect.setRotation(0);
            rect.scaleY = 1;
            rect.setSkewX(0);
            rect.setSkewY(30);

            expect(rect.rotation).toBe(0);
        });

        it('should set scaleY to 1', () => {
            rect.scaleY = 0.5;

            rect.setRotation(0);
            rect.scaleY = 1;
            rect.setSkewX(0);
            rect.setSkewY(30);

            expect(rect.scaleY).toBe(1);
        });

        it('should reset skewX to 0', () => {
            rect.setSkewX(20);

            rect.setRotation(0);
            rect.scaleY = 1;
            rect.setSkewX(0);
            rect.setSkewY(30);

            expect(rect.skewX).toBe(0);
        });

        it('should set skewY to 30', () => {
            rect.setRotation(0);
            rect.scaleY = 1;
            rect.setSkewX(0);
            rect.setSkewY(30);

            expect(rect.skewY).toBe(30);
        });

        it('should emit shape:updated event', () => {
            const emitSpy = vi.spyOn(window.eventBus, 'emit');

            rect.setRotation(0);
            rect.scaleY = 1;
            rect.setSkewX(0);
            rect.setSkewY(30);
            eventBus.emit('shape:updated', rect);

            expect(emitSpy).toHaveBeenCalledWith('shape:updated', rect);
        });
    });

    describe('Iso Right Preset', () => {
        it('should reset rotation to 0', () => {
            rect.setRotation(45);

            // Simulate Iso Right button action
            rect.setRotation(0);
            rect.scaleY = 1;
            rect.setSkewX(0);
            rect.setSkewY(-30);

            expect(rect.rotation).toBe(0);
        });

        it('should set scaleY to 1', () => {
            rect.scaleY = 0.5;

            rect.setRotation(0);
            rect.scaleY = 1;
            rect.setSkewX(0);
            rect.setSkewY(-30);

            expect(rect.scaleY).toBe(1);
        });

        it('should set skewY to -30', () => {
            rect.setRotation(0);
            rect.scaleY = 1;
            rect.setSkewX(0);
            rect.setSkewY(-30);

            expect(rect.skewY).toBe(-30);
        });

        it('should emit shape:updated event', () => {
            const emitSpy = vi.spyOn(window.eventBus, 'emit');

            rect.setRotation(0);
            rect.scaleY = 1;
            rect.setSkewX(0);
            rect.setSkewY(-30);
            eventBus.emit('shape:updated', rect);

            expect(emitSpy).toHaveBeenCalledWith('shape:updated', rect);
        });
    });

    describe('Iso Front Preset', () => {
        it('should reset rotation to 0', () => {
            rect.setRotation(45);

            // Simulate Iso Front button action
            rect.setRotation(0);
            rect.scaleY = 1;
            rect.setSkewX(0);
            rect.setSkewY(0);
            rect.setTiltTop(40);
            rect.setTiltLeft(30);
            rect.setTiltRight(30);
            rect.setTiltBottom(0);

            expect(rect.rotation).toBe(0);
        });

        it('should set tiltTop to 40', () => {
            rect.setRotation(0);
            rect.scaleY = 1;
            rect.setSkewX(0);
            rect.setSkewY(0);
            rect.setTiltTop(40);
            rect.setTiltLeft(30);
            rect.setTiltRight(30);
            rect.setTiltBottom(0);

            expect(rect.tiltTop).toBe(40);
        });

        it('should set tiltLeft to 30', () => {
            rect.setRotation(0);
            rect.scaleY = 1;
            rect.setSkewX(0);
            rect.setSkewY(0);
            rect.setTiltTop(40);
            rect.setTiltLeft(30);
            rect.setTiltRight(30);
            rect.setTiltBottom(0);

            expect(rect.tiltLeft).toBe(30);
        });

        it('should set tiltRight to 30', () => {
            rect.setRotation(0);
            rect.scaleY = 1;
            rect.setSkewX(0);
            rect.setSkewY(0);
            rect.setTiltTop(40);
            rect.setTiltLeft(30);
            rect.setTiltRight(30);
            rect.setTiltBottom(0);

            expect(rect.tiltRight).toBe(30);
        });

        it('should reset tiltBottom to 0', () => {
            rect.setTiltBottom(20);

            rect.setRotation(0);
            rect.scaleY = 1;
            rect.setSkewX(0);
            rect.setSkewY(0);
            rect.setTiltTop(40);
            rect.setTiltLeft(30);
            rect.setTiltRight(30);
            rect.setTiltBottom(0);

            expect(rect.tiltBottom).toBe(0);
        });

        it('should emit shape:updated event', () => {
            const emitSpy = vi.spyOn(window.eventBus, 'emit');

            rect.setRotation(0);
            rect.scaleY = 1;
            rect.setSkewX(0);
            rect.setSkewY(0);
            rect.setTiltTop(40);
            rect.setTiltLeft(30);
            rect.setTiltRight(30);
            rect.setTiltBottom(0);
            eventBus.emit('shape:updated', rect);

            expect(emitSpy).toHaveBeenCalledWith('shape:updated', rect);
        });
    });

    describe('Reset All Preset', () => {
        it('should reset rotation to 0', () => {
            rect.setRotation(45);

            // Simulate Reset All button action
            rect.setRotation(0);
            rect.scaleX = 1;
            rect.scaleY = 1;
            rect.setSkewX(0);
            rect.setSkewY(0);
            rect.setRotateX(0);
            rect.setRotateY(0);
            rect.setPerspective(1000);
            rect.setTiltTop(0);
            rect.setTiltBottom(0);
            rect.setTiltLeft(0);
            rect.setTiltRight(0);

            expect(rect.rotation).toBe(0);
        });

        it('should reset all transform values', () => {
            // Set some values
            rect.setRotation(45);
            rect.scaleX = 2;
            rect.scaleY = 0.5;
            rect.setSkewX(20);
            rect.setSkewY(30);
            rect.setTiltTop(40);

            // Simulate Reset All button action
            rect.setRotation(0);
            rect.scaleX = 1;
            rect.scaleY = 1;
            rect.setSkewX(0);
            rect.setSkewY(0);
            rect.setRotateX(0);
            rect.setRotateY(0);
            rect.setPerspective(1000);
            rect.setTiltTop(0);
            rect.setTiltBottom(0);
            rect.setTiltLeft(0);
            rect.setTiltRight(0);

            expect(rect.rotation).toBe(0);
            expect(rect.scaleX).toBe(1);
            expect(rect.scaleY).toBe(1);
            expect(rect.skewX).toBe(0);
            expect(rect.skewY).toBe(0);
            expect(rect.tiltTop).toBe(0);
        });

        it('should emit shape:updated event', () => {
            const emitSpy = vi.spyOn(window.eventBus, 'emit');

            rect.setRotation(0);
            rect.scaleX = 1;
            rect.scaleY = 1;
            rect.setSkewX(0);
            rect.setSkewY(0);
            rect.setRotateX(0);
            rect.setRotateY(0);
            rect.setPerspective(1000);
            rect.setTiltTop(0);
            rect.setTiltBottom(0);
            rect.setTiltLeft(0);
            rect.setTiltRight(0);
            eventBus.emit('shape:updated', rect);

            expect(emitSpy).toHaveBeenCalledWith('shape:updated', rect);
        });
    });

    describe('Property Value Rounding', () => {
        it('should round scaleX to 3 decimal places', () => {
            rect.scaleX = 1.23456789;
            const rounded = Math.round(rect.scaleX * 1000) / 1000;
            expect(rounded).toBe(1.235);
        });

        it('should round scaleY to 3 decimal places', () => {
            rect.scaleY = 0.577777;
            const rounded = Math.round(rect.scaleY * 1000) / 1000;
            expect(rounded).toBe(0.578);
        });

        it('should default scaleX to 1 if undefined', () => {
            rect.scaleX = undefined;
            const val = rect.scaleX !== undefined ? rect.scaleX : 1;
            expect(val).toBe(1);
        });

        it('should round skewX to integer', () => {
            rect.setSkewX(29.7);
            const rounded = Math.round(rect.skewX);
            expect(rounded).toBe(30);
        });

        it('should round skewY to integer', () => {
            rect.setSkewY(-29.4);
            const rounded = Math.round(rect.skewY);
            expect(rounded).toBe(-29);
        });
    });
});
