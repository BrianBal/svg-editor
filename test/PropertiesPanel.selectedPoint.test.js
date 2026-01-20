import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const jsDir = join(__dirname, '..', 'js');

// Load PropertiesPanel after other dependencies are set up
const loadPropertiesPanel = () => {
    const code = readFileSync(join(jsDir, 'PropertiesPanel.js'), 'utf-8');
    const wrappedCode = `
        with (this) {
            ${code}
            return typeof PropertiesPanel !== 'undefined' ? PropertiesPanel : undefined;
        }
    `;
    const fn = new Function(wrappedCode);
    return fn.call(globalThis);
};

describe('PropertiesPanel - Selected Point Schema', () => {
    let PropertiesPanel;
    let panel;
    let mockCanvas;

    beforeEach(() => {
        // Add properties panel container
        document.body.innerHTML += `
            <div id="properties-content"></div>
        `;

        // Create mock canvas with selection
        mockCanvas = {
            selection: {
                selectedPointIndex: null,
                getSelectedPointIndex() {
                    return this.selectedPointIndex;
                },
                updateHandles: vi.fn()
            }
        };

        // Load PropertiesPanel class
        PropertiesPanel = loadPropertiesPanel();
        panel = new PropertiesPanel(mockCanvas);
    });

    describe('getSelectedPointSchema() for Polyline', () => {
        let polyline;

        beforeEach(() => {
            polyline = new Polyline([
                { x: 10, y: 20 },
                { x: 100, y: 150 },
                { x: 200, y: 50 }
            ]);
        });

        it('returns schema with pointX and pointY properties', () => {
            const schema = panel.getSelectedPointSchema(polyline, 0);

            expect(schema).toHaveProperty('pointX');
            expect(schema).toHaveProperty('pointY');
        });

        it('pointX schema returns correct value', () => {
            const schema = panel.getSelectedPointSchema(polyline, 1);

            expect(schema.pointX.get()).toBe(100);
        });

        it('pointY schema returns correct value', () => {
            const schema = panel.getSelectedPointSchema(polyline, 1);

            expect(schema.pointY.get()).toBe(150);
        });

        it('pointX set calls movePoint', () => {
            const movePointSpy = vi.spyOn(polyline, 'movePoint');
            const schema = panel.getSelectedPointSchema(polyline, 1);

            schema.pointX.set(polyline, 120);

            expect(movePointSpy).toHaveBeenCalledWith(1, 120, 150);
        });

        it('pointY set calls movePoint', () => {
            const movePointSpy = vi.spyOn(polyline, 'movePoint');
            const schema = panel.getSelectedPointSchema(polyline, 1);

            schema.pointY.set(polyline, 180);

            expect(movePointSpy).toHaveBeenCalledWith(1, 100, 180);
        });

        it('does not include handle properties for polyline', () => {
            const schema = panel.getSelectedPointSchema(polyline, 0);

            expect(schema).not.toHaveProperty('handleInX');
            expect(schema).not.toHaveProperty('handleInY');
            expect(schema).not.toHaveProperty('handleOutX');
            expect(schema).not.toHaveProperty('handleOutY');
        });

        it('returns correct values for different point indices', () => {
            const schema0 = panel.getSelectedPointSchema(polyline, 0);
            const schema2 = panel.getSelectedPointSchema(polyline, 2);

            expect(schema0.pointX.get()).toBe(10);
            expect(schema0.pointY.get()).toBe(20);
            expect(schema2.pointX.get()).toBe(200);
            expect(schema2.pointY.get()).toBe(50);
        });
    });

    describe('getSelectedPointSchema() for Path', () => {
        let path;

        beforeEach(() => {
            path = new Path([
                { x: 0, y: 0, handleIn: null, handleOut: { x: 30, y: 10 } },
                { x: 100, y: 50, handleIn: { x: 70, y: 40 }, handleOut: { x: 130, y: 60 } },
                { x: 200, y: 0, handleIn: { x: 170, y: 10 }, handleOut: null }
            ]);
        });

        it('returns schema with pointX and pointY properties', () => {
            const schema = panel.getSelectedPointSchema(path, 1);

            expect(schema).toHaveProperty('pointX');
            expect(schema).toHaveProperty('pointY');
        });

        it('returns handle properties when point has handleIn', () => {
            const schema = panel.getSelectedPointSchema(path, 1);

            expect(schema).toHaveProperty('handleInX');
            expect(schema).toHaveProperty('handleInY');
        });

        it('returns handle properties when point has handleOut', () => {
            const schema = panel.getSelectedPointSchema(path, 1);

            expect(schema).toHaveProperty('handleOutX');
            expect(schema).toHaveProperty('handleOutY');
        });

        it('does not include handleIn properties when point has no handleIn', () => {
            const schema = panel.getSelectedPointSchema(path, 0);

            expect(schema).not.toHaveProperty('handleInX');
            expect(schema).not.toHaveProperty('handleInY');
        });

        it('does not include handleOut properties when point has no handleOut', () => {
            const schema = panel.getSelectedPointSchema(path, 2);

            expect(schema).not.toHaveProperty('handleOutX');
            expect(schema).not.toHaveProperty('handleOutY');
        });

        it('handleInX returns correct value', () => {
            const schema = panel.getSelectedPointSchema(path, 1);

            expect(schema.handleInX.get()).toBe(70);
        });

        it('handleInY returns correct value', () => {
            const schema = panel.getSelectedPointSchema(path, 1);

            expect(schema.handleInY.get()).toBe(40);
        });

        it('handleOutX returns correct value', () => {
            const schema = panel.getSelectedPointSchema(path, 1);

            expect(schema.handleOutX.get()).toBe(130);
        });

        it('handleOutY returns correct value', () => {
            const schema = panel.getSelectedPointSchema(path, 1);

            expect(schema.handleOutY.get()).toBe(60);
        });

        it('handleInX set calls moveHandle with mirror=false', () => {
            const moveHandleSpy = vi.spyOn(path, 'moveHandle');
            const schema = panel.getSelectedPointSchema(path, 1);

            schema.handleInX.set(path, 80);

            expect(moveHandleSpy).toHaveBeenCalledWith(1, 'in', 80, 40, false);
        });

        it('handleOutY set calls moveHandle with mirror=false', () => {
            const moveHandleSpy = vi.spyOn(path, 'moveHandle');
            const schema = panel.getSelectedPointSchema(path, 1);

            schema.handleOutY.set(path, 75);

            expect(moveHandleSpy).toHaveBeenCalledWith(1, 'out', 130, 75, false);
        });

        it('pointX set uses movePoint for path', () => {
            const movePointSpy = vi.spyOn(path, 'movePoint');
            const schema = panel.getSelectedPointSchema(path, 1);

            schema.pointX.set(path, 110);

            expect(movePointSpy).toHaveBeenCalledWith(1, 110, 50);
        });
    });

    describe('getSelectedPointSchema() edge cases', () => {
        it('returns empty schema for invalid point index', () => {
            const polyline = new Polyline([{ x: 0, y: 0 }]);
            const schema = panel.getSelectedPointSchema(polyline, 5);

            expect(schema).toEqual({});
        });

        it('returns empty schema for negative point index', () => {
            const polyline = new Polyline([{ x: 0, y: 0 }]);
            const schema = panel.getSelectedPointSchema(polyline, -1);

            expect(schema).toEqual({});
        });
    });

    describe('Schema property metadata', () => {
        let polyline;

        beforeEach(() => {
            polyline = new Polyline([{ x: 50, y: 75 }]);
        });

        it('pointX has correct type', () => {
            const schema = panel.getSelectedPointSchema(polyline, 0);

            expect(schema.pointX.type).toBe('number');
        });

        it('pointX has correct group', () => {
            const schema = panel.getSelectedPointSchema(polyline, 0);

            expect(schema.pointX.group).toBe('selectedPoint');
        });

        it('pointX has suffix', () => {
            const schema = panel.getSelectedPointSchema(polyline, 0);

            expect(schema.pointX.suffix).toBe('px');
        });

        it('pointY has correct label', () => {
            const schema = panel.getSelectedPointSchema(polyline, 0);

            expect(schema.pointY.label).toBe('Y');
        });
    });
});

describe('PropertiesPanel - point:selected Event Handling', () => {
    let PropertiesPanel;
    let panel;
    let mockCanvas;
    let renderSpy;

    beforeEach(() => {
        document.body.innerHTML += `
            <div id="properties-content"></div>
        `;

        mockCanvas = {
            selection: {
                selectedPointIndex: null,
                getSelectedPointIndex() {
                    return this.selectedPointIndex;
                },
                updateHandles: vi.fn()
            }
        };

        PropertiesPanel = loadPropertiesPanel();
        panel = new PropertiesPanel(mockCanvas);
        renderSpy = vi.spyOn(panel, 'render');
    });

    it('re-renders when point:selected event is emitted', () => {
        renderSpy.mockClear();

        eventBus.emit('point:selected', { shape: null, pointIndex: null });

        expect(renderSpy).toHaveBeenCalled();
    });

    it('re-renders when point selection changes', () => {
        const polyline = new Polyline([{ x: 0, y: 0 }, { x: 100, y: 100 }]);
        appState.addShape(polyline);
        renderSpy.mockClear();

        eventBus.emit('point:selected', { shape: polyline, pointIndex: 0 });

        expect(renderSpy).toHaveBeenCalled();
    });
});
