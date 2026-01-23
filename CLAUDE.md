# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start            # Start local development server (http-server with no cache)
npm test             # Run all tests once
npm run test:watch   # Run tests in watch mode during development
```

No build step or linting configured. This is a vanilla JavaScript application served via static files.

## Testing

### Requirements

- **Every source file in `js/` must have a corresponding unit test file in `test/`**
- **Target at least 90% code coverage** - ensure all public methods and branches are tested
- Run `npm test` before committing changes to catch regressions
- When adding new features or classes, add tests first or alongside the implementation

### Framework

- **Vitest** - Fast, modern test runner
- **happy-dom** - DOM simulation with SVG support

### Test Structure

```
test/
├── setup.js              # Global setup, loads source files into test environment
├── core/                 # Tests for EventBus, State
├── shapes/               # Tests for Shape classes (Rectangle, Ellipse, Star, etc.)
└── tools/                # Tests for Tool classes (SelectTool, RectangleTool, etc.)
```

### Writing Tests

Tests use Vitest globals (`describe`, `it`, `expect`, `vi`). The setup file loads all source classes into `globalThis` and resets state between tests.

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ClassName', () => {
    let instance;
    let emitSpy;

    beforeEach(() => {
        emitSpy = vi.spyOn(window.eventBus, 'emit');
        instance = new ClassName();
    });

    it('does something', () => {
        instance.doSomething();
        expect(instance.value).toBe(expected);
        expect(emitSpy).toHaveBeenCalledWith('event:name', instance);
    });
});
```

### Test Isolation

- Fresh `eventBus` and `appState` instances are created before each test
- `Shape.resetIdCounter()` ensures predictable shape IDs
- Minimal DOM structure (`#svg-canvas`, `#shapes-layer`, `#handles-layer`) is created for each test

### What to Test

- **Shapes**: `getBounds()`, `resize()`, `move()`, `clone()`, `createSVGElement()`, `updateElement()`
- **State**: CRUD operations, selection, reordering, event emissions
- **Tools**: Mouse event handling, state machines, shape creation
- **EventBus**: `on()`, `off()`, `emit()`, unsubscribe functionality
- **UI Components**: DOM updates, user interactions

## Architecture

### Core Pattern: Event-Driven State Management

The app uses a simple pub/sub pattern for component communication:
- `EventBus` (`js/EventBus.js`) - Global event emitter exposed as `window.eventBus`
- `State` (`js/State.js`) - Centralized state management exposed as `window.appState`

Components communicate via events rather than direct references. Key events:
- `shape:created`, `shape:deleted`, `shape:selected`, `shape:deselected`, `shape:updated`
- `tool:changed`, `shapes:reordered`, `canvas:loaded`, `document:background`
- `history:changed` - emitted when undo/redo stacks change
- `selection:changed` - emitted when selection changes (array of selected shapes)

### Multi-Select System

The app supports selecting and manipulating multiple shapes simultaneously.

#### Selection State

- `appState.selectedShapeIds` - Array of selected shape IDs
- `appState.selectedShapeId` - Backwards-compatible getter returning first selected ID
- Methods: `selectShape(id)`, `addToSelection(id)`, `removeFromSelection(id)`, `toggleSelection(id)`, `selectRange(fromId, toId)`, `getSelectedShapes()`, `isSelected(id)`

#### Selection Behavior

- **Canvas**: Click to select, Shift+click to toggle in/out of selection
- **Layers Panel**: Click to select, Shift+click for range selection, Ctrl/Cmd+click to toggle
- **Properties Panel**: Shows only properties with identical values across all selected shapes

#### Multi-Shape Operations

- **Move**: Drag any selected shape to move all together (maintains relative positions)
- **Resize**: Drag handles to resize proportionally based on combined bounding box
- **Rotate**: Drag rotation handle to rotate all shapes around combined center
- **Delete**: Delete/Backspace removes all selected shapes
- **Arrow keys**: Move all selected shapes

#### History Integration

Multi-shape operations use `historyManager.beginMultiTransaction(type, targetIds)` and `endMultiTransaction()` to batch changes into a single undo/redo action.

### Shape Hierarchy

Base class `Shape` (`js/Shape.js`) defines the interface for all shapes:
- Each shape type extends `Shape` and implements: `createSVGElement()`, `updateElement()`, `getBounds()`, `clone()`
- Shape types: `Rectangle`, `Ellipse`, `Line`, `Polyline`, `Path`, `Star`, `TextShape`
- `PointBasedShape` (`js/PointBasedShape.js`) is a shared base class for `Polyline` and `Path`
- Shapes are stored in `appState.shapes[]` and rendered to `#shapes-layer` SVG group

#### Shape Properties

All shapes inherit these base properties from `Shape`:
- `stroke`, `fill`, `strokeWidth` - Basic appearance
- `fillGradient` - Gradient instance when fill is a gradient (see Gradient System below)
- `opacity` - Transparency (0-100%)
- `strokeDash` - Line style: `'solid'`, `'dashed'`, `'dotted'`
- `strokeLinecap` - Line endings: `'butt'`, `'round'`, `'square'`
- `strokeLinejoin` - Corner style: `'miter'`, `'round'`, `'bevel'`
- `rotation` - Rotation angle in degrees (0-360)

Shape-specific properties:
- `Rectangle`: `rx` (corner radius)
- `Ellipse`: `rx`, `ry` (radii)
- `Star`: `points`, `innerRadius`, `outerRadius`
- `TextShape`: `text`, `fontSize`, `fontFamily`
- `Line`: `x1`, `y1`, `x2`, `y2`
- `Polyline`: `points[]` (array of `{x, y}`)
- `Path`: `points[]` (array of `{x, y, handleIn, handleOut}`), `closed` (boolean)

### Tool System

Tools handle canvas interactions and follow a common interface:
- Methods: `onMouseDown(e, pos)`, `onMouseMove(e, pos)`, `onMouseUp(e, pos)`, `onDoubleClick(e, pos)`
- `SVGCanvas` delegates mouse events to the active tool
- Tools: `SelectTool`, `RectangleTool`, `EllipseTool`, `LineTool`, `PolylineTool`, `PenTool`, `StarTool`, `TextTool`

#### PenTool (Bezier Paths)

The `PenTool` creates bezier curve paths with control handles:
- **Click** to add corner points (no handles)
- **Click + drag** to add curve points with symmetric handles
- **Click near first point** (within 15px) to close the path
- **Double-click** or **Escape** to finish an open path
- Keyboard shortcut: `B`

#### SmartPencilTool (Intelligent Shape Recognition)

The `SmartPencilTool` (`js/SmartPencilTool.js`) automatically recognizes hand-drawn shapes and converts them to perfect geometric shapes.

**How It Works:**
1. User draws freehand with the Smart Pencil tool
2. After 1.5 seconds of inactivity, recognition activates
3. Raw points are simplified using Ramer-Douglas-Peucker algorithm
4. Recognition algorithm analyzes the simplified path
5. Recognized shapes replace the freehand drawing

**Recognized Shapes:**
- **Line** - Straight or nearly straight paths
- **Circle** - Round, closed shapes with uniform radius
- **Rectangle** - Closed shapes with 4-ish corners
- **Triangle** - Closed shapes with 3-ish corners
- **Polyline** - Fallback for unrecognized shapes

**Recognition Algorithms:**

The tool supports two recognition algorithms that can be switched dynamically:

1. **Threshold Algorithm** (default) - Uses geometric heuristics
   - Analyzes circularity, corner detection, aspect ratio
   - Very fast (<1ms per recognition)
   - Works well with precise mouse input and clear corners
   - Best for shapes with distinct geometric features
   - **Accuracy on trackpad data: 68%**

2. **Coverage Algorithm** - Uses area overlap matching
   - Creates template shapes and calculates overlap percentage
   - Uses grid sampling (50x50 default) for efficient comparison
   - Rotation-invariant and distortion-tolerant
   - Slower but still fast (~9ms per recognition)
   - Better handles rough or distorted shapes
   - **Accuracy on trackpad data: 64%**

**Switching Algorithms:**

```javascript
// Get the smart pencil tool instance
const smartTool = canvas.tools.smart;

// Use threshold algorithm (default - recommended)
smartTool.recognitionAlgorithm = 'threshold';

// Use coverage algorithm
smartTool.recognitionAlgorithm = 'coverage';
```

**Configuration:**

```javascript
// Threshold algorithm settings
smartTool.CIRCLE_CIRCULARITY_MIN = 0.93;  // Circle detection threshold
smartTool.CORNER_ANGLE_THRESHOLD = 130;   // Corner detection sensitivity
smartTool.CORNER_LOOK_AHEAD = 2;          // Corner detection window

// Coverage algorithm settings
smartTool.COVERAGE_CIRCLE_THRESHOLD = 0.60;     // 60% overlap for circles
smartTool.COVERAGE_RECT_THRESHOLD = 0.55;       // 55% overlap for rectangles
smartTool.COVERAGE_TRIANGLE_THRESHOLD = 0.50;   // 50% overlap for triangles
smartTool.COVERAGE_GRID_SIZE = 50;              // Grid resolution
```

**Recognition Process:**

*Threshold Algorithm:*
1. Simplifies points (removes redundant points)
2. Calculates geometric properties (circularity, corners, aspect ratio)
3. Detects corners on raw points (before simplification)
4. Tests shapes in priority order: Line → Circle → Rectangle → Triangle
5. Falls back to polyline if no match

*Coverage Algorithm:*
1. Simplifies points
2. Tests line recognition (distance-based)
3. For closed shapes:
   - Creates template shapes (circle, rectangle, triangle)
   - Samples grid points over bounding box
   - Counts overlapping pixels (Jaccard similarity)
   - Selects best match above threshold
4. Falls back to polyline if no match

**Key Features:**

- **Point simplification**: Ramer-Douglas-Peucker reduces point count while preserving shape
- **Visual feedback**: Blue preview path with pulse animation during recognition delay
- **Debouncing**: 1.5-second delay prevents premature recognition
- **Threshold tuning**: Both algorithms tuned based on real trackpad data analysis
- **Performance**: Both algorithms fast enough for real-time use (<30ms worst case)

**Testing:**

The SmartPencilTool has comprehensive test coverage:
- `test/tools/SmartPencilTool.test.js` - Threshold algorithm tests (50 tests)
- `test/tools/SmartPencilTool.coverage.test.js` - Coverage algorithm tests (38 tests)
- `test/tools/SmartPencilTool.realdata.test.js` - Real trackpad data validation
- `test/tools/SmartPencilTool.algorithm-comparison.test.js` - Algorithm comparison

**Recommendation:**

Use the **threshold algorithm** (default) for best results:
- More accurate overall (68% vs 64% on real trackpad data)
- 41x faster (0.2ms vs 8.9ms average)
- Better tuned for trackpad input with rounded corners

The coverage algorithm is available as an alternative for cases where rotation-invariant or objective overlap scoring is needed.

### DOM Structure

- `#svg-canvas` - Main SVG element
- `#shapes-layer` - Contains all shape elements (z-order matches array order)
- `#handles-layer` - Contains selection handles and outlines (managed by `Selection` class)

### Key Classes

- `SVGCanvas` - Main canvas controller; manages shape lifecycle and tool delegation
- `Selection` - Handles selection visualization, resize handles, and rotation handle
- `LayersPanel` - UI for layer ordering and visibility
- `PropertiesPanel` - Schema-driven property editor (see below)
- `SVGLoader` - File import/export functionality
- `HistoryManager` - Undo/redo system exposed as `window.historyManager`
- `ClipboardManager` - Copy/cut/paste using system clipboard, exposed as `window.clipboardManager`
- `CommandPalette` - Searchable command palette for quick access to all commands
- `Gradient` - Gradient data model for linear/radial gradients
- `GradientManager` - Manages SVG `<defs>` element and gradient elements

### Clipboard System

The `ClipboardManager` (`js/ClipboardManager.js`) handles copy/cut/paste operations using the system clipboard with SVG text format.

#### Keyboard Shortcuts

- **Ctrl+C / Cmd+C** - Copy selected shapes as SVG
- **Ctrl+X / Cmd+X** - Cut (copy then delete)
- **Ctrl+V / Cmd+V** - Paste SVG from clipboard

#### How It Works

1. **Copy**: Generates SVG containing only selected shapes and their gradients via `generateSVGFragment()`, writes to system clipboard with `navigator.clipboard.writeText()`

2. **Paste**: Reads SVG text from clipboard, parses shapes using same patterns as `FileManager.parseShapes()`, offsets positions to avoid overlap, adds to canvas, selects pasted shapes

3. **Offset Stacking**: Consecutive pastes offset by 20px increments (20, 40, 60...). Counter resets on new copy.

#### Features

- Copies as valid SVG text (can paste into text editors)
- Pastes SVG from any source (external editors, other applications)
- Supports multiple shapes with gradients
- Preserves stroke, fill, rotation, and other attributes
- Integrates with undo/redo (shape creation auto-tracked by HistoryManager)

### Command Palette

The `CommandPalette` (`js/CommandPalette.js`) provides a searchable command interface for quick access to all editor features.

#### Keyboard Shortcut

- **Ctrl+K / Cmd+K** - Open command palette

#### Features

- **Fuzzy search**: Type to filter commands, matches prioritized by position in label
- **Keyboard navigation**: Arrow keys to navigate, Enter to execute, Escape to close
- **Context-aware**: Commands only appear when available (e.g., alignment requires 2+ shapes selected)
- **Shortcut display**: Shows keyboard shortcut next to each command

#### Available Commands (32 total)

- **Tools (8)**: Select, Rectangle, Ellipse, Line, Polyline, Pen, Star, Text
- **Alignment (6)**: Align Left, Center Horizontal, Right, Top, Middle Vertical, Bottom (requires 2+ selected)
- **Distribute (2)**: Horizontal, Vertical (requires 3+ selected)
- **Shape Operations (6)**: Delete, Duplicate, Bring Forward, Send Backward, Bring to Front, Send to Back
- **Flip (2)**: Horizontal, Vertical
- **File (2)**: Save, Export SVG
- **View (3)**: Zoom In, Zoom Out, Reset Zoom
- **Edit (3)**: Undo, Redo, Deselect All

#### Adding New Commands

Commands are registered in `CommandPalette.registerCommands()`:
```javascript
this.commands.push({
    id: 'category:action',
    label: 'Human Readable Label',
    shortcut: 'Ctrl+X',  // or null
    action: () => { /* execute command */ },
    isAvailable: () => true  // or condition function
});
```

#### Alignment Helper Functions

The CommandPalette includes helper functions for alignment operations:
- `alignShapes(direction)` - Aligns selected shapes (left, right, center-h, top, bottom, middle-v)
- `distributeShapes(direction)` - Distributes shapes with equal spacing (horizontal, vertical)
- `reorderShapes(action)` - Changes z-order (bring-forward, send-backward, bring-to-front, send-to-back)

### Gradient System

The gradient system allows shapes to have linear or radial gradient fills instead of solid colors.

#### How It Works

1. `Gradient` class (`js/Gradient.js`) stores gradient data:
   - `type`: `'linear'` or `'radial'`
   - `stops[]`: Array of `{offset, color}` objects (offset 0-100)
   - `angle`: Rotation for linear gradients (0-360 degrees)
   - `cx`, `cy`, `r`: Center and radius for radial gradients

2. `GradientManager` (`js/GradientManager.js`) manages SVG `<defs>`:
   - Creates/updates `<linearGradient>` or `<radialGradient>` elements
   - Each shape gets its own gradient instance (not shared)
   - Exposed as `window.gradientManager`

3. `Shape.setFill(value)` handles both colors and gradients:
   - Pass a `Gradient` instance to set gradient fill
   - Pass a color string to set solid fill
   - Gradient is stored in `shape.fillGradient`
   - Fill attribute becomes `url(#gradient-id)`

#### UI in PropertiesPanel

The fill property uses a custom `'fill'` type that renders:
- Mode toggle: None | Solid | Linear | Radial
- For gradients: Square preview with draggable stop markers
- Double-click marker to edit color, right-click to remove
- Angle input (linear) or size slider (radial)
- Click empty area to add new stops

#### Serialization

Gradients are fully serialized for undo/redo and file persistence:
- `HistoryManager` serializes `fillGradient` in shape state
- `SVGLoader` imports gradients from `<defs>` and exports them on save

### Rotation & Transform System

Shapes support rotation via the `transform` SVG attribute.

#### How It Works

1. Each shape has a `rotation` property (0-360 degrees)
2. Rotation is applied via `transform="rotate(angle, cx, cy)"` centered on the shape's bounding box
3. Methods: `setRotation(degrees)`, `flipHorizontal()`, `flipVertical()`
4. All shapes call `this.updateRotationTransform()` in their `updateElement()` method to keep rotation center synchronized with shape position/size

#### Rotated Shape Movement & Selection

Rotated shapes move correctly in screen coordinates and maintain proper selection UI alignment:

- **Transform Center Updates**: All shape classes update their rotation transform center whenever the shape is moved, resized, or modified. This ensures the rotation pivot point stays centered on the shape's bounding box.
- **Selection Outline**: The selection outline rotates with the shape by copying its `transform` attribute, ensuring visual alignment.
- **Resize Handles**: Positioned at the actual rotated corners using `getTransformedPoint()` to convert local coordinates through the rotation matrix.
- **Rotation Handle**: Extends from the top-center in the rotated direction, maintaining proper orientation.
- **Movement**: Shapes move in screen coordinates (straight up/down/left/right) even when rotated, avoiding diagonal drift.

#### UI Components

- **Rotation Handle**: Circular handle above the selection box, drag to rotate
- **Shift Key**: Hold while dragging to snap to 15° increments
- **Properties Panel**: Rotation input (degrees) and Flip H/V buttons in Transform section

#### Flip Operations

- `flipHorizontal()`: Mirrors rotation around Y-axis (180 - angle)
- `flipVertical()`: Mirrors rotation around X-axis (360 - angle)

#### Persistence

- Rotation is serialized in `HistoryManager` for undo/redo
- Rotation is saved/loaded via `FileManager` (parsed from `transform` attribute)

### Schema-Driven Properties Panel

The `PropertiesPanel` (`js/PropertiesPanel.js`) auto-generates UI controls from property schemas defined on shape classes.

#### How It Works

1. Each shape class defines a static `properties` getter returning a schema object
2. When a shape is selected, the panel reads its schema and renders appropriate controls
3. When nothing is selected, document properties (canvas size, background, default styles) are shown

#### Property Schema Format

```javascript
static get properties() {
    return {
        ...Shape.properties,  // Inherit base properties
        cornerRadius: {
            type: 'number',      // Control type: number, color, select, range, checkbox, button, textarea, fill
            label: 'Corner Radius',
            group: 'rectangle',  // Section grouping
            suffix: 'px',        // Unit display
            min: 0,              // Validation
            get: (shape) => shape.rx,
            set: (shape, value) => shape.setCornerRadius(value)
        },
    };
}
```

The `fill` type is special - it renders a mode toggle (None/Solid/Linear/Radial) and appropriate controls for each mode.

#### Adding New Properties

To add a property to a shape:
1. Add the property to the shape class constructor
2. Add getter/setter methods if needed
3. Add entry to the static `properties` schema
4. The UI control appears automatically

#### Features

- **Collapsible sections**: Click headers to collapse, state persisted to localStorage
- **Keyboard shortcuts**: Arrow keys adjust number inputs (Shift for 10x step)
- **Context-aware**: Shows different properties based on selection state

### File Management

Files are persisted to IndexedDB for local storage:
- `FileDatabase` (`js/FileDatabase.js`) - IndexedDB wrapper exposed as `window.fileDatabase`
- `FileManager` (`js/FileManager.js`) - Handles save/load operations, auto-save, and dirty state tracking
- `FileBrowserDialog` (`js/FileBrowserDialog.js`) - Modal UI for browsing, opening, and deleting saved files

### Undo/Redo System

The `HistoryManager` (`js/HistoryManager.js`) provides undo/redo functionality:

#### How It Works

- Uses a hybrid Command/Snapshot pattern - captures shape state before and after operations
- Transactions batch continuous operations (drag, resize) into single undo actions
- Listens to shape events (`shape:created`, `shape:deleted`, etc.) to auto-record actions
- History clears on file load (`canvas:loaded` event)

#### Transaction API

For continuous operations like dragging, wrap with transactions:
```javascript
historyManager.beginTransaction('move', shapeId);
// ... perform mutations ...
historyManager.endTransaction();
```

Transaction types: `'move'`, `'resize'`, `'property'`

#### Keyboard Shortcuts

- **Ctrl+Z / Cmd+Z** - Undo
- **Ctrl+Shift+Z / Cmd+Shift+Z** - Redo

#### Integration Points

When adding new mutation operations:
1. For instantaneous changes (property edits): The event system auto-captures these
2. For continuous changes (drag/resize): Wrap in `beginTransaction()`/`endTransaction()`
3. PropertiesPanel uses micro-transactions with 300ms debounce for input fields
