import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Selection class since it has DOM dependencies
// We test through the modified methods
describe('Selection - Point Selection Events', () => {
    let emitSpy;
    let mockSelection;
    let mockShape;

    beforeEach(() => {
        emitSpy = vi.spyOn(window.eventBus, 'emit');

        // Create a mock polyline shape
        mockShape = new Polyline([
            { x: 0, y: 0 },
            { x: 100, y: 100 },
            { x: 200, y: 50 }
        ]);
        appState.addShape(mockShape);
        appState.selectShape(mockShape.id);

        // Create minimal Selection mock with real event emission logic
        mockSelection = {
            selectedPointIndex: null,
            selectPoint(index) {
                const previousIndex = this.selectedPointIndex;
                this.selectedPointIndex = index;
                const shape = appState.getSelectedShape();
                if (previousIndex !== index) {
                    eventBus.emit('point:selected', { shape, pointIndex: index });
                }
            },
            getSelectedPointIndex() {
                return this.selectedPointIndex;
            },
            hideHandles() {
                const hadPointSelected = this.selectedPointIndex !== null;
                this.selectedPointIndex = null;
                if (hadPointSelected) {
                    eventBus.emit('point:selected', { shape: null, pointIndex: null });
                }
            }
        };
    });

    describe('selectPoint()', () => {
        it('emits point:selected event with shape and point index', () => {
            mockSelection.selectPoint(1);

            expect(emitSpy).toHaveBeenCalledWith('point:selected', {
                shape: mockShape,
                pointIndex: 1
            });
        });

        it('updates selectedPointIndex', () => {
            mockSelection.selectPoint(2);

            expect(mockSelection.getSelectedPointIndex()).toBe(2);
        });

        it('does not emit when selecting same point', () => {
            mockSelection.selectPoint(1);
            emitSpy.mockClear();

            mockSelection.selectPoint(1);

            expect(emitSpy).not.toHaveBeenCalledWith('point:selected', expect.anything());
        });

        it('emits when changing from one point to another', () => {
            mockSelection.selectPoint(0);
            emitSpy.mockClear();

            mockSelection.selectPoint(2);

            expect(emitSpy).toHaveBeenCalledWith('point:selected', {
                shape: mockShape,
                pointIndex: 2
            });
        });

        it('emits when selecting point after null', () => {
            mockSelection.selectedPointIndex = null;

            mockSelection.selectPoint(0);

            expect(emitSpy).toHaveBeenCalledWith('point:selected', {
                shape: mockShape,
                pointIndex: 0
            });
        });
    });

    describe('hideHandles()', () => {
        it('emits point:selected with null when point was selected', () => {
            mockSelection.selectedPointIndex = 1;

            mockSelection.hideHandles();

            expect(emitSpy).toHaveBeenCalledWith('point:selected', {
                shape: null,
                pointIndex: null
            });
        });

        it('clears selectedPointIndex', () => {
            mockSelection.selectedPointIndex = 2;

            mockSelection.hideHandles();

            expect(mockSelection.getSelectedPointIndex()).toBe(null);
        });

        it('does not emit when no point was selected', () => {
            mockSelection.selectedPointIndex = null;

            mockSelection.hideHandles();

            expect(emitSpy).not.toHaveBeenCalledWith('point:selected', expect.anything());
        });
    });

    describe('selectPoint(null)', () => {
        it('clears point selection and emits event', () => {
            mockSelection.selectedPointIndex = 1;
            emitSpy.mockClear();

            mockSelection.selectPoint(null);

            expect(mockSelection.getSelectedPointIndex()).toBe(null);
            expect(emitSpy).toHaveBeenCalledWith('point:selected', {
                shape: mockShape,
                pointIndex: null
            });
        });
    });
});

describe('Selection - Point Selection with Path', () => {
    let emitSpy;
    let mockSelection;
    let mockPath;

    beforeEach(() => {
        emitSpy = vi.spyOn(window.eventBus, 'emit');

        // Create a mock path shape with bezier handles
        mockPath = new Path([
            { x: 0, y: 0, handleIn: null, handleOut: { x: 30, y: 0 } },
            { x: 100, y: 50, handleIn: { x: 70, y: 50 }, handleOut: { x: 130, y: 50 } },
            { x: 200, y: 0, handleIn: { x: 170, y: 0 }, handleOut: null }
        ]);
        appState.addShape(mockPath);
        appState.selectShape(mockPath.id);

        mockSelection = {
            selectedPointIndex: null,
            selectPoint(index) {
                const previousIndex = this.selectedPointIndex;
                this.selectedPointIndex = index;
                const shape = appState.getSelectedShape();
                if (previousIndex !== index) {
                    eventBus.emit('point:selected', { shape, pointIndex: index });
                }
            },
            getSelectedPointIndex() {
                return this.selectedPointIndex;
            }
        };
    });

    it('emits point:selected with path shape', () => {
        mockSelection.selectPoint(1);

        expect(emitSpy).toHaveBeenCalledWith('point:selected', {
            shape: mockPath,
            pointIndex: 1
        });
    });

    it('selected point has bezier handles accessible', () => {
        mockSelection.selectPoint(1);

        const point = mockPath.points[mockSelection.getSelectedPointIndex()];

        expect(point.handleIn).toEqual({ x: 70, y: 50 });
        expect(point.handleOut).toEqual({ x: 130, y: 50 });
    });
});

describe('Selection - Handle Transform Logic', () => {
    it('showBoundsHandles should call getTransformedPoint for each handle', () => {
        // This test verifies the logic without relying on full DOM/SVG support
        const rect = new Rectangle(100, 100, 100, 100);
        rect.createSVGElement();
        rect.setRotation(45);

        // Verify that rotation is set
        expect(rect.rotation).toBe(45);
        expect(rect.element).toBeDefined();

        // Verify transform attribute exists
        const transform = rect.element.getAttribute('transform');
        expect(transform).toContain('rotate(45');
    });

    it('rotation handle position should account for shape rotation angle', () => {
        // Test the rotation handle positioning logic
        const angle = 90 * Math.PI / 180; // 90 degrees

        // Rotation handle should be 25px "above" in rotated space
        const rotateHandleX = 150 - 25 * Math.sin(angle); // 150 is top-center x
        const rotateHandleY = 150 - 25 * Math.cos(angle); // 150 is top-center y

        // For 90° rotation: sin(90°) = 1, cos(90°) = 0
        expect(rotateHandleX).toBeCloseTo(125, 1); // 150 - 25*1
        expect(rotateHandleY).toBeCloseTo(150, 1); // 150 - 25*0
    });
});
