import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('GradientManager', () => {
    let manager;
    let svg;

    beforeEach(() => {
        // Reset the global manager and create fresh instance
        manager = new GradientManager();
        svg = document.getElementById('svg-canvas');
        manager.init(svg);
    });

    describe('init()', () => {
        it('creates defs element if not present', () => {
            const newSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            const newManager = new GradientManager();

            newManager.init(newSvg);

            expect(newSvg.querySelector('defs')).not.toBeNull();
        });

        it('uses existing defs element', () => {
            const newSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            const existingDefs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            existingDefs.id = 'existing-defs';
            newSvg.appendChild(existingDefs);
            const newManager = new GradientManager();

            newManager.init(newSvg);

            expect(newManager.defs.id).toBe('existing-defs');
        });

        it('stores reference to svg', () => {
            expect(manager.svg).toBe(svg);
        });
    });

    describe('addOrUpdateGradient()', () => {
        it('adds gradient to defs', () => {
            const gradient = new Gradient('linear');

            manager.addOrUpdateGradient(gradient);

            const el = manager.defs.querySelector(`#${gradient.id}`);
            expect(el).not.toBeNull();
            expect(el.tagName).toBe('linearGradient');
        });

        it('tracks gradient in internal map', () => {
            const gradient = new Gradient('linear');

            manager.addOrUpdateGradient(gradient);

            expect(manager.hasGradient(gradient.id)).toBe(true);
        });

        it('replaces existing gradient with same ID', () => {
            const gradient = new Gradient('linear');
            gradient.stops[0].color = '#ff0000';

            manager.addOrUpdateGradient(gradient);

            // Update the gradient
            gradient.stops[0].color = '#00ff00';
            manager.addOrUpdateGradient(gradient);

            const elements = manager.defs.querySelectorAll(`#${gradient.id}`);
            expect(elements.length).toBe(1);

            const stop = elements[0].querySelector('stop');
            expect(stop.getAttribute('stop-color')).toBe('#00ff00');
        });

        it('handles radial gradients', () => {
            const gradient = new Gradient('radial');

            manager.addOrUpdateGradient(gradient);

            const el = manager.defs.querySelector(`#${gradient.id}`);
            expect(el.tagName).toBe('radialGradient');
        });
    });

    describe('removeGradient()', () => {
        it('removes gradient from defs', () => {
            const gradient = new Gradient('linear');
            manager.addOrUpdateGradient(gradient);

            manager.removeGradient(gradient.id);

            expect(manager.defs.querySelector(`#${gradient.id}`)).toBeNull();
        });

        it('removes gradient from tracking map', () => {
            const gradient = new Gradient('linear');
            manager.addOrUpdateGradient(gradient);

            manager.removeGradient(gradient.id);

            expect(manager.hasGradient(gradient.id)).toBe(false);
        });

        it('handles non-existent gradient gracefully', () => {
            expect(() => manager.removeGradient('non-existent')).not.toThrow();
        });
    });

    describe('hasGradient()', () => {
        it('returns true for existing gradient', () => {
            const gradient = new Gradient('linear');
            manager.addOrUpdateGradient(gradient);

            expect(manager.hasGradient(gradient.id)).toBe(true);
        });

        it('returns false for non-existent gradient', () => {
            expect(manager.hasGradient('non-existent')).toBe(false);
        });
    });

    describe('getGradientElement()', () => {
        it('returns gradient DOM element', () => {
            const gradient = new Gradient('linear');
            manager.addOrUpdateGradient(gradient);

            const el = manager.getGradientElement(gradient.id);

            expect(el).not.toBeNull();
            expect(el.tagName).toBe('linearGradient');
        });

        it('returns undefined for non-existent gradient', () => {
            expect(manager.getGradientElement('non-existent')).toBeUndefined();
        });
    });

    describe('clear()', () => {
        it('removes all gradients from defs', () => {
            const grad1 = new Gradient('linear');
            const grad2 = new Gradient('radial');
            manager.addOrUpdateGradient(grad1);
            manager.addOrUpdateGradient(grad2);

            manager.clear();

            expect(manager.defs.querySelectorAll('linearGradient, radialGradient').length).toBe(0);
        });

        it('clears tracking map', () => {
            const gradient = new Gradient('linear');
            manager.addOrUpdateGradient(gradient);

            manager.clear();

            expect(manager.hasGradient(gradient.id)).toBe(false);
        });
    });

    describe('getUsedGradientIds()', () => {
        it('returns empty set when no gradients used', () => {
            const usedIds = manager.getUsedGradientIds();
            expect(usedIds.size).toBe(0);
        });

        it('finds gradient IDs in fill attributes', () => {
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('fill', 'url(#test-gradient)');
            svg.querySelector('#shapes-layer').appendChild(rect);

            const usedIds = manager.getUsedGradientIds();

            expect(usedIds.has('test-gradient')).toBe(true);
        });

        it('finds gradient IDs in stroke attributes', () => {
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('stroke', 'url(#stroke-gradient)');
            svg.querySelector('#shapes-layer').appendChild(rect);

            const usedIds = manager.getUsedGradientIds();

            expect(usedIds.has('stroke-gradient')).toBe(true);
        });
    });

    describe('cleanupUnused()', () => {
        it('removes gradients not referenced by any shape', () => {
            const grad1 = new Gradient('linear');
            const grad2 = new Gradient('linear');
            manager.addOrUpdateGradient(grad1);
            manager.addOrUpdateGradient(grad2);

            // Only reference grad1
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('fill', `url(#${grad1.id})`);
            svg.querySelector('#shapes-layer').appendChild(rect);

            const removed = manager.cleanupUnused();

            expect(removed).toBe(1);
            expect(manager.hasGradient(grad1.id)).toBe(true);
            expect(manager.hasGradient(grad2.id)).toBe(false);
        });

        it('keeps all gradients when all are used', () => {
            const grad1 = new Gradient('linear');
            const grad2 = new Gradient('linear');
            manager.addOrUpdateGradient(grad1);
            manager.addOrUpdateGradient(grad2);

            const rect1 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect1.setAttribute('fill', `url(#${grad1.id})`);
            svg.querySelector('#shapes-layer').appendChild(rect1);

            const rect2 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect2.setAttribute('fill', `url(#${grad2.id})`);
            svg.querySelector('#shapes-layer').appendChild(rect2);

            const removed = manager.cleanupUnused();

            expect(removed).toBe(0);
        });
    });
});
