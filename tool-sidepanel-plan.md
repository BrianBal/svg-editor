# Right Side Panel Redesign Plan

## Current State

The right panel has two parts:
1. **Main content area** - Property sections (Size, Position, Content, Appearance, Polyline)
2. **Tool icons sidebar** - 7 tool buttons

### Current Behavior
| State | What Shows |
|-------|------------|
| Nothing selected + Select tool | **Empty panel** (problem!) |
| Nothing selected + Drawing tool | Default colors only |
| Shape selected | Shape properties + appearance |

### Current Problems
1. Empty panel when nothing selected with Select tool - wasted space
2. Document settings buried in footer (width, height, viewbox)
3. No global/document-level settings accessible
4. Missing properties that shapes already support (text font size/family)
5. No way to set defaults before drawing
6. Hardcoded sections with manual show/hide logic
7. Adding new properties requires editing multiple files (HTML, JS, CSS)

---

## New Architecture: Schema-Driven Properties Panel

Instead of hardcoded HTML sections, the panel will be **auto-generated** from property schemas defined on each class.

### Core Concept

```
┌─────────────────────────────────────────────────────────┐
│  Context         Schema Source        Panel Shows       │
├─────────────────────────────────────────────────────────┤
│  Nothing         Document.properties  Document settings │
│  selected        + defaults schema    + default styles  │
├─────────────────────────────────────────────────────────┤
│  Shape           Shape.properties     Transform +       │
│  selected        + ShapeType.props    Appearance +      │
│                                       Type-specific     │
└─────────────────────────────────────────────────────────┘
```

### Benefits
- **Add property to shape → UI appears automatically**
- **Single source of truth** - property defined once on class
- **Consistent controls** - same property type = same UI control
- **Easy to extend** - new control types, new shapes, new properties
- **Less code** - no giant switch statements or manual DOM manipulation

---

## Property Schema Format

Each property is defined with metadata that determines how it renders:

```javascript
{
  type: 'number',           // Control type (see registry below)
  label: 'Width',           // Display label
  group: 'transform',       // Which section it appears in
  suffix: 'px',             // Unit suffix (optional)
  min: 1,                   // Validation (optional)
  max: 100,                 // Validation (optional)
  step: 1,                  // Input step (optional)
  options: [...],           // For select/radio types
  allowNone: true,          // For color type - show "None" button
  computed: (shape) => ..., // For derived values like bounds
  onChange: 'resize',       // Method to call on change (optional)
}
```

### Control Type Registry

| Type | Renders As | Used For |
|------|------------|----------|
| `number` | Number input with suffix | x, y, width, height, strokeWidth |
| `range` | Slider + value display | opacity, innerRadius % |
| `color` | Color picker + None button | fill, stroke |
| `text` | Single-line input | (future use) |
| `textarea` | Multi-line input | text content |
| `select` | Dropdown | fontFamily, strokeDash, lineCap |
| `radio` | Button group | alignment, point type |
| `checkbox` | Toggle | showGrid, snapToGrid, closePath |
| `button` | Action button | delete, duplicate, addPoint |
| `buttonGroup` | Row of buttons | z-order controls |

---

## Schema Definitions

### Document Properties (nothing selected)

```javascript
const DocumentProperties = {
  // Document group
  width: {
    type: 'number',
    label: 'Width',
    group: 'document',
    suffix: 'px',
    min: 1
  },
  height: {
    type: 'number',
    label: 'Height',
    group: 'document',
    suffix: 'px',
    min: 1
  },
  background: {
    type: 'color',
    label: 'Background',
    group: 'document',
    allowNone: true
  },

  // Grid group (future)
  showGrid: {
    type: 'checkbox',
    label: 'Show Grid',
    group: 'grid'
  },
  gridSize: {
    type: 'number',
    label: 'Grid Size',
    group: 'grid',
    suffix: 'px',
    min: 5
  },
  snapToGrid: {
    type: 'checkbox',
    label: 'Snap to Grid',
    group: 'grid'
  },
};

const DefaultStyleProperties = {
  defaultStroke: {
    type: 'color',
    label: 'Stroke',
    group: 'defaults',
    allowNone: true
  },
  defaultFill: {
    type: 'color',
    label: 'Fill',
    group: 'defaults',
    allowNone: true
  },
  defaultStrokeWidth: {
    type: 'number',
    label: 'Stroke Width',
    group: 'defaults',
    suffix: 'px',
    min: 0
  },
};
```

### Base Shape Properties

```javascript
// js/Shape.js
class Shape {
  static properties = {
    // Transform group - computed from getBounds()
    x: {
      type: 'number',
      label: 'X',
      group: 'transform',
      suffix: 'px',
      get: (shape) => shape.getBounds().x,
      set: (shape, value) => shape.moveTo(value, shape.getBounds().y)
    },
    y: {
      type: 'number',
      label: 'Y',
      group: 'transform',
      suffix: 'px',
      get: (shape) => shape.getBounds().y,
      set: (shape, value) => shape.moveTo(shape.getBounds().x, value)
    },
    width: {
      type: 'number',
      label: 'W',
      group: 'transform',
      suffix: 'px',
      min: 1,
      get: (shape) => shape.getBounds().width,
      // set defined per shape type
    },
    height: {
      type: 'number',
      label: 'H',
      group: 'transform',
      suffix: 'px',
      min: 1,
      get: (shape) => shape.getBounds().height,
      // set defined per shape type
    },
    rotation: {
      type: 'number',
      label: '↻',
      group: 'transform',
      suffix: '°',
      min: -360,
      max: 360
    },

    // Appearance group
    opacity: {
      type: 'range',
      label: 'Opacity',
      group: 'appearance',
      min: 0,
      max: 100,
      suffix: '%'
    },
    fill: {
      type: 'color',
      label: 'Fill',
      group: 'appearance',
      allowNone: true
    },
    stroke: {
      type: 'color',
      label: 'Stroke',
      group: 'appearance',
      allowNone: true
    },
    strokeWidth: {
      type: 'number',
      label: 'Width',
      group: 'stroke',
      suffix: 'px',
      min: 0,
      step: 0.5
    },
    strokeDash: {
      type: 'select',
      label: 'Style',
      group: 'stroke',
      options: [
        { value: 'solid', label: 'Solid' },
        { value: 'dashed', label: 'Dashed' },
        { value: 'dotted', label: 'Dotted' },
      ]
    },
    strokeLinecap: {
      type: 'select',
      label: 'Cap',
      group: 'stroke',
      options: [
        { value: 'butt', label: 'Butt' },
        { value: 'round', label: 'Round' },
        { value: 'square', label: 'Square' },
      ]
    },
    strokeLinejoin: {
      type: 'select',
      label: 'Join',
      group: 'stroke',
      options: [
        { value: 'miter', label: 'Miter' },
        { value: 'round', label: 'Round' },
        { value: 'bevel', label: 'Bevel' },
      ]
    },

    // Actions group
    duplicate: {
      type: 'button',
      label: 'Duplicate',
      group: 'actions',
      action: (shape, canvas) => canvas.duplicateShape(shape)
    },
    delete: {
      type: 'button',
      label: 'Delete',
      group: 'actions',
      variant: 'danger',
      action: (shape, canvas) => canvas.removeShape(shape)
    },
  };
}
```

### Shape-Specific Properties

```javascript
// js/Rectangle.js
class Rectangle extends Shape {
  static properties = {
    ...Shape.properties,

    // Override width/height with rectangle-specific setters
    width: {
      ...Shape.properties.width,
      set: (shape, value) => shape.resize(shape.x, shape.y, value, shape.height)
    },
    height: {
      ...Shape.properties.height,
      set: (shape, value) => shape.resize(shape.x, shape.y, shape.width, value)
    },

    // Rectangle-specific
    cornerRadius: {
      type: 'number',
      label: 'Corner Radius',
      group: 'rectangle',
      suffix: 'px',
      min: 0
    },
  };
}

// js/Star.js
class Star extends Shape {
  static properties = {
    ...Shape.properties,

    points: {
      type: 'number',
      label: 'Points',
      group: 'star',
      min: 3,
      max: 20,
      step: 1
    },
    innerRadius: {
      type: 'range',
      label: 'Inner Radius',
      group: 'star',
      min: 10,
      max: 90,
      suffix: '%'
    },
  };
}

// js/TextShape.js
class TextShape extends Shape {
  static properties = {
    ...Shape.properties,

    text: {
      type: 'textarea',
      label: 'Content',
      group: 'text',
      rows: 3
    },
    fontFamily: {
      type: 'select',
      label: 'Font',
      group: 'text',
      options: [
        { value: 'Arial', label: 'Arial' },
        { value: 'Helvetica', label: 'Helvetica' },
        { value: 'Georgia', label: 'Georgia' },
        { value: 'Times New Roman', label: 'Times' },
        { value: 'Courier New', label: 'Courier' },
        { value: 'Verdana', label: 'Verdana' },
      ]
    },
    fontSize: {
      type: 'number',
      label: 'Size',
      group: 'text',
      suffix: 'px',
      min: 8,
      max: 200
    },
    fontWeight: {
      type: 'select',
      label: 'Weight',
      group: 'text',
      options: [
        { value: 'normal', label: 'Normal' },
        { value: 'bold', label: 'Bold' },
      ]
    },
  };
}

// js/Polyline.js
class Polyline extends Shape {
  static properties = {
    ...Shape.properties,

    // Remove width/height editing for polylines (point-based only)
    width: { ...Shape.properties.width, hidden: true },
    height: { ...Shape.properties.height, hidden: true },

    pointCount: {
      type: 'number',
      label: 'Points',
      group: 'polyline',
      readonly: true,
      get: (shape) => shape.points.length
    },
    addPoint: {
      type: 'button',
      label: 'Add Point',
      group: 'polyline',
      action: (shape, canvas) => { /* add point logic */ }
    },
    removePoint: {
      type: 'button',
      label: 'Remove Point',
      group: 'polyline',
      action: (shape, canvas) => { /* remove point logic */ }
    },
    closePath: {
      type: 'checkbox',
      label: 'Close Path',
      group: 'polyline'
    },
  };
}
```

---

## Group Configuration

Groups define section headers and ordering:

```javascript
const PropertyGroups = {
  // Document context
  document: { label: 'Document', order: 1 },
  defaults: { label: 'Default Styles', order: 2 },
  grid: { label: 'Grid & Guides', order: 3, collapsed: true },

  // Shape context
  transform: { label: 'Transform', order: 1 },
  appearance: { label: 'Appearance', order: 2 },
  stroke: { label: null, order: 3, parent: 'appearance' }, // Subgroup

  // Shape-specific (order 10+ to appear after common groups)
  rectangle: { label: 'Rectangle', order: 10 },
  ellipse: { label: 'Ellipse', order: 10 },
  star: { label: 'Star', order: 10 },
  text: { label: 'Text', order: 10 },
  polyline: { label: 'Points', order: 10 },
  line: { label: 'Line', order: 10 },

  actions: { label: null, order: 99 }, // No header, always last
};
```

---

## PropertiesPanel Class

```javascript
// js/PropertiesPanel.js
class PropertiesPanel {
  constructor(canvas) {
    this.canvas = canvas;
    this.container = document.getElementById('properties-content');
    this.controls = new Map(); // Track rendered controls for updates

    // Control renderers
    this.renderers = {
      number: (prop, value) => this.renderNumberInput(prop, value),
      range: (prop, value) => this.renderRangeInput(prop, value),
      color: (prop, value) => this.renderColorPicker(prop, value),
      text: (prop, value) => this.renderTextInput(prop, value),
      textarea: (prop, value) => this.renderTextarea(prop, value),
      select: (prop, value) => this.renderSelect(prop, value),
      checkbox: (prop, value) => this.renderCheckbox(prop, value),
      button: (prop, value) => this.renderButton(prop, value),
      buttonGroup: (prop, value) => this.renderButtonGroup(prop, value),
    };

    this.setupEventListeners();
  }

  setupEventListeners() {
    eventBus.on('shape:selected', () => this.render());
    eventBus.on('shape:deselected', () => this.render());
    eventBus.on('shape:updated', (shape) => this.updateValues(shape));
    eventBus.on('tool:changed', () => this.render());
  }

  getContext() {
    const shape = appState.getSelectedShape();
    return {
      shape,
      tool: appState.activeTool,
      document: appState,
    };
  }

  render() {
    const context = this.getContext();
    this.container.innerHTML = '';
    this.controls.clear();

    let schema, target;

    if (context.shape) {
      // Shape selected - show shape properties
      schema = context.shape.constructor.properties;
      target = context.shape;
    } else {
      // Nothing selected - show document + defaults
      schema = { ...DocumentProperties, ...DefaultStyleProperties };
      target = context.document;
    }

    this.renderSchema(schema, target);
  }

  renderSchema(schema, target) {
    // Group properties by their group
    const groups = {};

    for (const [key, prop] of Object.entries(schema)) {
      if (prop.hidden) continue;

      const groupName = prop.group || 'other';
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push({ key, prop });
    }

    // Sort and render groups
    const sortedGroups = Object.entries(groups)
      .sort((a, b) => {
        const orderA = PropertyGroups[a[0]]?.order || 50;
        const orderB = PropertyGroups[b[0]]?.order || 50;
        return orderA - orderB;
      });

    for (const [groupName, props] of sortedGroups) {
      this.renderGroup(groupName, props, target);
    }
  }

  renderGroup(groupName, props, target) {
    const groupConfig = PropertyGroups[groupName] || { label: groupName };

    const section = document.createElement('section');
    section.className = 'properties-section';
    section.dataset.group = groupName;

    // Add header if group has a label
    if (groupConfig.label) {
      const header = document.createElement('h3');
      header.textContent = groupConfig.label;
      section.appendChild(header);
    }

    // Render each property in the group
    for (const { key, prop } of props) {
      const value = this.getValue(key, prop, target);
      const control = this.renderControl(key, prop, value, target);
      if (control) {
        section.appendChild(control);
        this.controls.set(key, { element: control, prop, target });
      }
    }

    this.container.appendChild(section);
  }

  getValue(key, prop, target) {
    if (prop.get) {
      return prop.get(target);
    }
    return target[key];
  }

  setValue(key, prop, target, value) {
    if (prop.set) {
      prop.set(target, value);
    } else if (typeof target[`set${key.charAt(0).toUpperCase() + key.slice(1)}`] === 'function') {
      // Try setProperty() method (e.g., setStroke, setFill)
      target[`set${key.charAt(0).toUpperCase() + key.slice(1)}`](value);
    } else {
      target[key] = value;
    }
  }

  renderControl(key, prop, value, target) {
    const renderer = this.renderers[prop.type];
    if (!renderer) {
      console.warn(`No renderer for property type: ${prop.type}`);
      return null;
    }

    const wrapper = document.createElement('div');
    wrapper.className = `property-control property-${prop.type}`;
    wrapper.dataset.property = key;

    const control = renderer(prop, value);

    // Attach change handler
    if (prop.type !== 'button') {
      control.addEventListener('input', (e) => {
        let newValue = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        if (prop.type === 'number' || prop.type === 'range') {
          newValue = parseFloat(newValue);
        }
        this.setValue(key, prop, target, newValue);
      });
    }

    wrapper.appendChild(control);
    return wrapper;
  }

  // Individual control renderers...
  renderNumberInput(prop, value) {
    const row = document.createElement('div');
    row.className = 'property-row';
    row.innerHTML = `
      <label>${prop.label}:</label>
      <div class="property-input-wrapper">
        <input type="number"
               value="${value || 0}"
               min="${prop.min ?? ''}"
               max="${prop.max ?? ''}"
               step="${prop.step || 1}"
               ${prop.readonly ? 'readonly' : ''}>
        ${prop.suffix ? `<span class="property-suffix">${prop.suffix}</span>` : ''}
      </div>
    `;
    return row;
  }

  renderColorPicker(prop, value) {
    const isNone = value === 'none';
    const row = document.createElement('div');
    row.className = 'property-row color-field';
    row.innerHTML = `
      <label>${prop.label}:</label>
      <input type="color" value="${isNone ? '#000000' : value}">
      ${prop.allowNone ? `<button class="no-color-btn ${isNone ? 'active' : ''}">None</button>` : ''}
    `;
    return row;
  }

  // ... other renderers

  updateValues(shape) {
    // Update only the values, not re-render entire panel
    if (shape !== appState.getSelectedShape()) return;

    for (const [key, { element, prop, target }] of this.controls) {
      const value = this.getValue(key, prop, target);
      const input = element.querySelector('input, select, textarea');
      if (input && document.activeElement !== input) {
        input.value = value;
      }
    }
  }
}
```

---

## Simplified HTML Structure

The HTML becomes minimal - just a container:

```html
<aside class="panel panel-right" id="tools-panel">
  <div class="panel-right-main">
    <!-- Properties are rendered dynamically here -->
    <div id="properties-content" class="panel-content"></div>
  </div>

  <!-- Tool Icons Sidebar (unchanged) -->
  <div class="panel-right-tools">
    <button class="tool-btn-icon active" data-tool="select" title="Select (V)">...</button>
    <button class="tool-btn-icon" data-tool="rectangle" title="Rectangle (R)">...</button>
    <!-- etc -->
  </div>
</aside>
```

---

## What the Panel Shows (Generated from Schemas)

### Nothing Selected
```
┌─────────────────────────────────┐
│ ▼ Document                      │  ← DocumentProperties
│   Width: [800] px               │
│   Height: [600] px              │
│   Background: [■] [None]        │
│                                 │
│ ▼ Default Styles                │  ← DefaultStyleProperties
│   Stroke: [■] [None]            │
│   Fill: [■] [None]              │
│   Stroke Width: [2] px          │
│                                 │
│ ▸ Grid & Guides                 │  ← collapsed by default
└─────────────────────────────────┘
```

### Rectangle Selected
```
┌─────────────────────────────────┐
│ ▼ Transform                     │  ← Shape.properties (transform group)
│   X: [100]  Y: [50] px          │
│   W: [200]  H: [150] px         │
│   ↻: [0] °                      │
│                                 │
│ ▼ Appearance                    │  ← Shape.properties (appearance group)
│   Opacity: [====●====] 100%     │
│   Fill: [■ blue] [None]         │
│   Stroke: [■ black] [None]      │
│   Width: [2] px                 │
│   Style: [Solid ▼]              │
│                                 │
│ ▼ Rectangle                     │  ← Rectangle.properties
│   Corner Radius: [0] px         │
│                                 │
│   [Duplicate] [Delete]          │  ← Shape.properties (actions group)
└─────────────────────────────────┘
```

### Star Selected
```
┌─────────────────────────────────┐
│ ▼ Transform                     │
│   ...                           │
│                                 │
│ ▼ Appearance                    │
│   ...                           │
│                                 │
│ ▼ Star                          │  ← Star.properties
│   Points: [5]                   │
│   Inner Radius: [===●===] 50%   │
│                                 │
│   [Duplicate] [Delete]          │
└─────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Core Infrastructure
**Goal: Build the schema-driven rendering system**

1. Create `PropertyGroups` configuration
2. Create `PropertiesPanel` class with:
   - Context detection (shape vs document)
   - Schema grouping and sorting
   - Control renderer registry
3. Create control renderers:
   - `number` (with suffix, min/max)
   - `color` (with None button)
   - `button`
4. Add `properties` static to `Shape` base class
5. Replace `ToolsPanel` with `PropertiesPanel`

**Files:**
- Create `js/PropertiesPanel.js`
- Modify `js/Shape.js` - add static properties
- Modify `index.html` - simplify panel HTML
- Modify `js/app.js` - use PropertiesPanel

---

### Phase 2: Document Properties
**Goal: Nothing-selected state shows document settings**

1. Define `DocumentProperties` schema
2. Define `DefaultStyleProperties` schema
3. Move canvas size from footer to panel
4. Add background color to State

**Files:**
- Modify `js/PropertiesPanel.js` - add document schemas
- Modify `js/State.js` - add background property
- Modify `index.html` - remove size from footer

---

### Phase 3: Shape-Specific Properties
**Goal: Each shape type has its own properties**

1. Add `properties` to each shape class:
   - Rectangle: cornerRadius
   - Star: points, innerRadius
   - TextShape: text, fontFamily, fontSize
   - Polyline: pointCount, addPoint, removePoint
   - Line: (uses base)
   - Ellipse: (uses base)
2. Add control renderers:
   - `range` (slider)
   - `select` (dropdown)
   - `textarea`
   - `checkbox`

**Files:**
- Modify all shape classes
- Modify `js/PropertiesPanel.js` - add renderers

---

### Phase 4: Advanced Properties
**Goal: Add remaining visual properties**

1. Add to Shape.properties:
   - opacity
   - rotation
   - strokeDash
   - strokeLinecap
   - strokeLinejoin
2. Add property support in Shape base class
3. Update `updateElement()` in shapes to apply new properties

**Files:**
- Modify `js/Shape.js`
- Modify all shape classes - updateElement()

---

### Phase 5: Polish
**Goal: Better UX and additional features**

1. Collapsible sections
2. Section memory (remember collapsed state)
3. Value updates without re-render
4. Keyboard shortcuts in inputs
5. Grid & guides properties

---

## Migration Path

1. Keep `ToolsPanel.js` working during development
2. Build `PropertiesPanel.js` alongside it
3. Feature-flag to switch between them
4. Once complete, remove `ToolsPanel.js`

---

## Summary

| Aspect | Old Approach | New Approach |
|--------|--------------|--------------|
| HTML | Hardcoded sections | Single container, JS renders |
| Show/hide logic | Manual per-section | Automatic from context |
| Adding property | Edit HTML + JS + CSS | Add to schema only |
| Property types | Inline per-property | Reusable renderers |
| Shape-specific UI | Switch statements | Class inheritance |
| Maintenance | Edit multiple files | Single source of truth |
