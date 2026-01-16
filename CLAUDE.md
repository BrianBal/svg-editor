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

### Shape Hierarchy

Base class `Shape` (`js/Shape.js`) defines the interface for all shapes:
- Each shape type extends `Shape` and implements: `createSVGElement()`, `updateElement()`, `getBounds()`, `clone()`
- Shape types: `Rectangle`, `Ellipse`, `Line`, `Polyline`, `Star`, `TextShape`
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
- `Polyline`: `points[]`

### Tool System

Tools handle canvas interactions and follow a common interface:
- Methods: `onMouseDown(e, pos)`, `onMouseMove(e, pos)`, `onMouseUp(e, pos)`, `onDoubleClick(e, pos)`
- `SVGCanvas` delegates mouse events to the active tool
- Tools: `SelectTool`, `RectangleTool`, `EllipseTool`, `LineTool`, `PolylineTool`, `StarTool`, `TextTool`

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
- `Gradient` - Gradient data model for linear/radial gradients
- `GradientManager` - Manages SVG `<defs>` element and gradient elements

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
