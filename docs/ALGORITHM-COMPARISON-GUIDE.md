# Shape Recognition Algorithm Comparison Guide

## Quick Testing Guide

### Step 1: Open the Editor

```bash
npm start
```

Open http://localhost:8080 in your browser.

### Step 2: Enable Smart Pencil Tool

Press `P` or click the Smart Pencil tool in the toolbar.

### Step 3: Test with Threshold Algorithm (Default)

The tool starts with the threshold algorithm. Draw these shapes:

1. **Circle** - Draw a rough circle
2. **Rectangle** - Draw a rough rectangle with corners
3. **Triangle** - Draw a rough triangle
4. **Line** - Draw a straight-ish line

Wait 1.5 seconds after each drawing to see what it recognizes.

### Step 4: Switch to Coverage Algorithm

Open the browser console (F12) and run:

```javascript
// Get the smart pencil tool
const smartTool = window.canvas.tools.smart;

// Switch to coverage algorithm
smartTool.recognitionAlgorithm = 'coverage';

console.log('✅ Coverage algorithm enabled');
```

### Step 5: Test with Coverage Algorithm

Draw the same shapes again and compare results:

1. **Circle** - Should be more forgiving of distortions
2. **Rectangle** - Should work even with rounded corners
3. **Triangle** - Should work with rough edges
4. **Line** - Should work the same

### Step 6: Switch Back to Threshold

```javascript
smartTool.recognitionAlgorithm = 'threshold';
console.log('✅ Threshold algorithm enabled');
```

## What to Look For

### Threshold Algorithm
- **Strengths:** Fast, works well with clear corners
- **Weaknesses:** May miss shapes with smooth/rounded corners
- **Best for:** Shapes drawn with precise mouse input

### Coverage Algorithm
- **Strengths:** Handles distortion, rotation-invariant, objective scoring
- **Weaknesses:** Slightly slower (but still fast enough)
- **Best for:** Shapes drawn with trackpad or rough input

## Common Scenarios

### Scenario 1: Rough Circle Recognition

**Drawing:** A wobbly circle with uneven edges

**Threshold:** May recognize as rectangle if it detects corners in the wobbles
**Coverage:** More likely to recognize as circle based on overall roundness

### Scenario 2: Rounded Rectangle

**Drawing:** Rectangle with significantly rounded corners

**Threshold:** May fail to recognize (not enough sharp corners)
**Coverage:** More likely to succeed (matches bounding box shape)

### Scenario 3: Perfect Shapes

**Drawing:** Precise, clean shapes with clear corners

**Threshold:** ✅ Excellent recognition
**Coverage:** ✅ Excellent recognition (both work well)

### Scenario 4: Lines

**Drawing:** Straight or slightly wobbly lines

**Threshold:** Uses aspect ratio heuristic
**Coverage:** Uses distance-based metric (both should work similarly)

## Tuning the Coverage Algorithm

If you want to make recognition more or less strict:

```javascript
// Make circle recognition more strict (default: 0.60)
smartTool.COVERAGE_CIRCLE_THRESHOLD = 0.70;

// Make rectangle recognition more lenient (default: 0.55)
smartTool.COVERAGE_RECT_THRESHOLD = 0.50;

// Make triangle recognition more strict (default: 0.50)
smartTool.COVERAGE_TRIANGLE_THRESHOLD = 0.60;

// Adjust grid resolution for accuracy (default: 50)
smartTool.COVERAGE_GRID_SIZE = 100; // Higher = more accurate but slower
```

## Performance Testing

To measure recognition time:

```javascript
// Add timing to see performance
const originalRecognize = smartTool.recognizeAndReplaceCoverageAlgorithm.bind(smartTool);
smartTool.recognizeAndReplaceCoverageAlgorithm = function() {
    const start = performance.now();
    const result = originalRecognize();
    const duration = performance.now() - start;
    console.log(`⏱️ Recognition took ${duration.toFixed(2)}ms`);
    return result;
};
```

Expected times:
- Small shapes (50px): ~5ms
- Medium shapes (200px): ~10ms
- Large shapes (500px): ~50ms

## Debugging Recognition

To see what's being detected:

```javascript
// Enable corner detection debug output (threshold algorithm)
smartTool.DEBUG_CORNERS = true;

// Log coverage scores (add this to calculateOverlap method temporarily)
console.log(`Overlap: ${(overlap.overlapPercentage * 100).toFixed(1)}%`);
```

## Real-World Testing

Test with actual trackpad drawings from the collected data:

```bash
npm test -- SmartPencilTool.realdata.test.js
```

This runs both algorithms against real user-drawn shapes and reports accuracy.

## When to Use Each Algorithm

### Use Threshold Algorithm When:
- Users draw with precise mouse input
- Shapes have clear, distinct corners
- Performance is critical (<1ms requirement)
- You want the current default behavior

### Use Coverage Algorithm When:
- Users draw with trackpad (smooth, rounded input)
- Shapes are rough or distorted
- Rotation-invariant recognition is needed
- Objective scoring metric is preferred
- 5-15ms recognition time is acceptable

## Toggle Feature (Optional Enhancement)

You could add a UI toggle to switch algorithms:

```javascript
// Add to PropertiesPanel or toolbar
const algorithmToggle = document.createElement('button');
algorithmToggle.textContent = 'Coverage Algorithm: OFF';
algorithmToggle.onclick = () => {
    smartTool.recognitionAlgorithm =
        smartTool.recognitionAlgorithm === 'threshold' ? 'coverage' : 'threshold';
    algorithmToggle.textContent =
        `Coverage Algorithm: ${smartTool.recognitionAlgorithm === 'coverage' ? 'ON' : 'OFF'}`;
};
```

## Advanced: Side-by-Side Comparison

To test both algorithms on the same drawing:

```javascript
function compareAlgorithms(points) {
    // Save original settings
    const originalAlgorithm = smartTool.recognitionAlgorithm;
    const originalPoints = smartTool.rawPoints;

    // Test threshold
    smartTool.recognitionAlgorithm = 'threshold';
    smartTool.rawPoints = points;
    smartTool.recognizeAndReplace();
    const thresholdResult = window.appState.shapes[window.appState.shapes.length - 1];

    // Test coverage
    smartTool.recognitionAlgorithm = 'coverage';
    smartTool.rawPoints = points;
    smartTool.recognizeAndReplace();
    const coverageResult = window.appState.shapes[window.appState.shapes.length - 1];

    console.log('Threshold:', thresholdResult?.constructor.name);
    console.log('Coverage:', coverageResult?.constructor.name);

    // Restore
    smartTool.recognitionAlgorithm = originalAlgorithm;
    smartTool.rawPoints = originalPoints;
}
```

## Conclusion

Both algorithms have their strengths. The threshold algorithm is the current default and works well for most cases. The coverage algorithm provides an alternative that may work better for rough trackpad input and distorted shapes. Try both and see which works best for your use case!
