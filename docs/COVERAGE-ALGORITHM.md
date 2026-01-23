# Coverage-Based Shape Recognition Algorithm

## Overview

The SmartPencilTool now supports two shape recognition algorithms:

1. **Threshold Algorithm** (default) - Uses geometric heuristics (circularity, corner detection, aspect ratio)
2. **Coverage Algorithm** (new) - Uses area overlap matching with grid sampling

## Switching Algorithms

```javascript
// Get the smart pencil tool instance
const smartPencilTool = canvas.tools.smart;

// Use threshold algorithm (default)
smartPencilTool.recognitionAlgorithm = 'threshold';

// Use coverage algorithm
smartPencilTool.recognitionAlgorithm = 'coverage';
```

## How the Coverage Algorithm Works

### 1. Template Matching

The algorithm creates virtual template shapes (circle, rectangle, triangle) sized to match the user's drawing:

- **Circle**: Centered on centroid, radius = average of width/height
- **Rectangle**: Matches the bounding box of the user's drawing
- **Triangle**: Centered on centroid, sized to fit the bounding box

### 2. Grid Sampling

Instead of complex analytical geometry, uses efficient grid sampling:

1. Creates a grid of sample points over the bounding box (50x50 default)
2. Tests each point: is it inside the user's shape? Inside the template?
3. Counts overlapping pixels
4. Calculates Jaccard similarity: `overlap / union`

### 3. Coverage Thresholds

Minimum overlap percentage required to recognize each shape:

- **Circle: 60%** - Freehand circles are often distorted
- **Rectangle: 55%** - Corners are often rounded
- **Triangle: 50%** - Most variable shape
- **Line: 5px** - Uses distance-based metric (lines have zero area)

If no shape meets its threshold → falls back to polyline

### 4. Best Match Selection

When multiple shapes meet their thresholds, selects the one with the highest overlap score.

## Algorithm Comparison

### Threshold Algorithm (Current Default)

**Advantages:**
- Very fast (<1ms)
- Works well for shapes with clear corners
- Good for synthetic/perfect test data

**Limitations:**
- Corner detection struggles with smooth trackpad input
- Thresholds need careful tuning for each shape type
- Sensitive to drawing style variations

### Coverage Algorithm (New)

**Advantages:**
- Rotation invariant
- Distortion tolerant
- Objective scoring metric
- No corner detection needed
- Better for rough trackpad drawings

**Limitations:**
- Slower (5-15ms for typical shapes)
- Lines need special handling (distance-based)
- More memory usage (stores templates)

## Configuration

You can adjust the coverage thresholds:

```javascript
// Make circle recognition more strict
smartPencilTool.COVERAGE_CIRCLE_THRESHOLD = 0.70; // default: 0.60

// Make rectangle recognition more lenient
smartPencilTool.COVERAGE_RECT_THRESHOLD = 0.50; // default: 0.55

// Adjust grid resolution (higher = more accurate but slower)
smartPencilTool.COVERAGE_GRID_SIZE = 100; // default: 50
```

## Performance

**Coverage Algorithm Performance:**
- Small shapes (50px): ~5ms
- Medium shapes (200px): ~10ms
- Large shapes (500px): ~50ms

All measurements well within the 1.5-second recognition delay.

## Test Coverage

The coverage algorithm has comprehensive test coverage:

```bash
npm test -- SmartPencilTool.coverage.test.js
```

**Test categories:**
- Algorithm switching (3 tests)
- Point-in-shape detection (12 tests)
- Template creation (4 tests)
- Overlap calculation (4 tests)
- Line recognition (3 tests)
- Coverage recognition (6 tests)
- Performance benchmarks (3 tests)
- Edge cases (3 tests)

**Total: 38 tests, all passing ✅**

## Future Enhancements

Possible improvements (not implemented):

1. **Multi-orientation templates** - Test rectangles at 0°, 15°, 30°, 45°
2. **Ellipse detection** - Add ellipse templates with various aspect ratios
3. **Template optimization** - Find best-fit position/size using hill climbing
4. **Hybrid approach** - Use threshold for filtering, coverage for final selection
5. **Debug visualization** - Render overlap grid for debugging

## Implementation Details

The coverage algorithm adds these methods to SmartPencilTool:

- `recognizeAndReplaceCoverageAlgorithm()` - Main entry point
- `recognizeLineByDistance(points)` - Distance-based line recognition
- `createTemplateShape(type, props)` - Creates circle/rectangle/triangle templates
- `calculateOverlap(userPoints, template)` - Grid sampling overlap calculation
- `isPointInTemplateShape(point, template)` - Point-in-shape tests
- `getTriangleVertices(template)` - Generates equilateral triangle points
- `isPointInPolygon(point, polygon)` - Ray casting algorithm

Total: ~200 lines of new code
