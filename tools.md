# SVG Editor - Missing Features & Implementation Plan

This document lists SVG capabilities not yet supported, ordered by importance/frequency of use.

---

## Currently Supported

- **Shapes**: Rectangle, Ellipse, Line, Polyline, Star, Text
- **Attributes**: Stroke color, fill color, stroke width
- **Interactions**: Select, move, resize, point editing (polyline/line)
- **File ops**: Save/load (IndexedDB), SVG import/export

---

## Missing Features

### 1. Undo/Redo
**Priority: Critical**

Most essential editing feature. Without it, mistakes are permanent.

**Suggestion**: Implement command pattern with history stack.
- Create `Command` base class with `execute()` and `undo()` methods
- Commands: `CreateShapeCommand`, `DeleteShapeCommand`, `MoveShapeCommand`, `ResizeShapeCommand`, `ChangeAttributeCommand`
- Store command history in `State.js` with `undoStack[]` and `redoStack[]`
- Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Shift+Z (redo)

---

### 2. Opacity/Transparency
**Priority: High**

Essential for layered designs, overlapping shapes, and visual depth.

**Suggestion**: Add opacity slider (0-100%) to appearance panel.
- Add `opacity` property to `Shape` base class (default: 1)
- Apply via `element.setAttribute('opacity', this.opacity)`
- UI: Range slider in appearance section
- Support both fill-opacity and stroke-opacity for advanced use

---

### 3. Gradient Fills
**Priority: High**

Solid colors are limiting. Gradients are fundamental to modern design.

**Suggestion**: Extend color picker to support gradient mode.
- Add gradient type toggle: Solid | Linear | Radial
- For gradients, show:
  - Start/end colors (linear) or center/outer colors (radial)
  - Angle control (linear) or focal point (radial)
- Store as `<defs>` with unique IDs, reference via `url(#gradient-id)`
- Each shape with gradient gets its own `<linearGradient>` or `<radialGradient>` in defs

---

### 4. Rotation/Transform
**Priority: High**

Cannot rotate shapes at all currently. Major limitation.

**Suggestion**: Add rotation handle and transform support.
- Add rotation handle (circular icon) above selection box
- Store `rotation` property on shapes (degrees, default: 0)
- Apply via `transform="rotate(angle, cx, cy)"` attribute
- UI: Rotation angle input in properties panel
- Hold Shift while rotating to snap to 15° increments

---

### 5. Path Tool (Bezier Curves)
**Priority: High**

Polylines only support straight segments. Paths enable curves.

**Suggestion**: Add pen tool for bezier path creation.
- New `Path` shape class storing path data (`d` attribute)
- New `PathTool` for drawing:
  - Click to add point
  - Drag to add curve with control handles
  - Double-click to finish
- Point types: Corner, Smooth, Symmetric
- Edit mode: Show control handles, allow handle adjustment
- Consider simplified mode first (quadratic curves only)

---

### 6. Copy/Paste
**Priority: High**

Basic editing operation. Currently only "duplicate" exists.

**Suggestion**: Implement clipboard operations.
- Store copied shape(s) in `State.clipboardShapes`
- Ctrl+C: Copy selected shape to clipboard
- Ctrl+V: Paste at mouse position or center with offset
- Ctrl+X: Cut (copy + delete)
- Ctrl+D: Duplicate in place (existing behavior)
- Support multi-shape copy when multi-select is added

---

### 7. Multi-Select
**Priority: High**

Can only select one shape at a time. Limiting for batch operations.

**Suggestion**: Support multiple selection.
- Change `selectedShapeId` to `selectedShapeIds[]` array
- Shift+click to add/remove from selection
- Drag selection box (marquee) to select multiple
- Move/delete/style operations apply to all selected
- Group selection shows combined bounding box

---

### 8. Alignment Tools
**Priority: Medium-High**

Essential for precise layouts. Requires multi-select first.

**Suggestion**: Add alignment toolbar/buttons.
- Align: Left, Center, Right, Top, Middle, Bottom
- Distribute: Horizontal, Vertical (equal spacing)
- UI: Row of alignment icons in toolbar or properties panel
- Works on multi-selected shapes
- Align to: Selection bounds or canvas

---

### 9. Stroke Dash Pattern
**Priority: Medium-High**

Common for diagrams, borders, and decorative lines.

**Suggestion**: Add dash pattern selector to appearance panel.
- Presets: Solid, Dashed, Dotted, Dash-dot
- Custom: Input for `stroke-dasharray` values
- Optional: `stroke-dashoffset` for animation prep
- UI: Dropdown with visual previews of patterns

---

### 10. Rounded Rectangles
**Priority: Medium-High**

Very common shape. Currently requires workarounds.

**Suggestion**: Add corner radius property to rectangles.
- Add `rx` and `ry` properties to `Rectangle` class
- UI: Corner radius slider/input in properties panel
- Apply via `rx` and `ry` attributes on `<rect>`
- Option: Lock rx/ry for uniform corners

---

### 11. Circle Shape
**Priority: Medium**

Circles are distinct from ellipses conceptually. Minor but nice to have.

**Suggestion**: Add dedicated circle tool.
- New `Circle` class extending `Shape`
- Single radius property (not rx/ry)
- Uses `<circle>` SVG element
- Tool: Drag from center, radius = distance
- Alternative: Option to constrain ellipse to circle (hold Shift)

---

### 12. Groups
**Priority: Medium**

Organization feature. Important for complex drawings.

**Suggestion**: Support grouping shapes.
- New `Group` class containing child shapes
- Renders as `<g>` element with children inside
- Grouped shapes move/transform together
- UI: Group button, Ungroup button
- Keyboard: Ctrl+G (group), Ctrl+Shift+G (ungroup)
- LayersPanel shows group hierarchy

---

### 13. Text Formatting
**Priority: Medium**

Font size and family exist but aren't editable in UI.

**Suggestion**: Expose text properties in panel.
- Font family dropdown (web-safe fonts + system fonts)
- Font size input (px or pt)
- Font weight: Normal, Bold
- Font style: Normal, Italic
- Text alignment: Left, Center, Right
- Line height for multi-line text

---

### 14. Grid & Snapping
**Priority: Medium**

Precision alignment without manual coordinate entry.

**Suggestion**: Add toggleable grid and snap behavior.
- Grid overlay on canvas (configurable size: 10px, 20px, etc.)
- Snap to grid when moving/resizing
- Snap to other shapes (edge, center)
- Smart guides (alignment lines when near other shapes)
- UI: Toggle buttons in toolbar, grid size in settings

---

### 15. Keyboard Shortcuts
**Priority: Medium**

Power user feature. Many shortcuts already logical but unimplemented.

**Suggestion**: Implement common shortcuts.
- Tools: V (select), R (rectangle), E (ellipse), L (line), P (polyline), S (star), T (text)
- Edit: Delete/Backspace (delete), Ctrl+D (duplicate)
- Arrange: Ctrl+] (bring forward), Ctrl+[ (send backward)
- View: Ctrl+0 (fit to canvas), Ctrl++ (zoom in), Ctrl+- (zoom out)
- File: Ctrl+S (save), Ctrl+O (open)

---

### 16. Stroke Line Caps & Joins
**Priority: Medium**

Affects appearance of line endpoints and corners.

**Suggestion**: Add linecap and linejoin options.
- Line cap: Butt, Round, Square
- Line join: Miter, Round, Bevel
- UI: Dropdown selectors in appearance panel (show when stroke is not 'none')
- Apply via `stroke-linecap` and `stroke-linejoin` attributes

---

### 17. Zoom & Pan
**Priority: Medium**

Essential for detailed work on large canvases.

**Suggestion**: Add viewport controls.
- Zoom: Mouse wheel, zoom buttons, percentage input
- Pan: Middle-mouse drag or Space+drag
- Fit to canvas button
- Zoom to selection
- Display current zoom level in status bar
- Modify viewBox rather than scaling elements

---

### 18. Markers (Arrowheads)
**Priority: Medium**

Common for diagrams, flowcharts, and annotations.

**Suggestion**: Add marker support for lines and polylines.
- Marker types: Arrow, Circle, Square, Diamond
- Positions: Start, End, Both
- Size relative to stroke width
- Store in `<defs>` as `<marker>` elements
- Apply via `marker-start`, `marker-end` attributes
- UI: Dropdown for line/polyline shapes

---

### 19. Layers Panel Improvements
**Priority: Low-Medium**

Current layers panel is basic.

**Suggestion**: Enhance layer management.
- Visibility toggle (eye icon) per shape
- Lock toggle (lock icon) to prevent editing
- Drag-to-reorder (already exists)
- Color-coded layer indicators
- Collapse groups
- Search/filter layers

---

### 20. Drop Shadow / Filters
**Priority: Low-Medium**

Popular visual effect for depth and emphasis.

**Suggestion**: Add filter effects.
- Start with drop shadow (most common)
  - Offset X/Y, blur radius, color, opacity
- Implement as SVG `<filter>` in `<defs>`
- UI: "Effects" section in properties panel
- Future: Blur, glow, color matrix

---

### 21. Pattern Fills
**Priority: Low**

Repeating patterns for backgrounds and textures.

**Suggestion**: Support pattern fills.
- Predefined patterns: Stripes, Dots, Crosshatch, Checkerboard
- Pattern properties: Size, rotation, colors
- Store as `<pattern>` in `<defs>`
- Reference via `url(#pattern-id)`
- Future: Custom patterns from shape groups

---

### 22. Import Improvements
**Priority: Low**

Current import is limited (no paths, circles, text, transforms).

**Suggestion**: Expand SVG import capabilities.
- Parse `<circle>` elements (convert to Ellipse)
- Parse `<text>` elements
- Parse basic `<path>` elements (lines, curves)
- Handle `transform` attributes (decompose matrix)
- Parse `<g>` groups
- Handle `style` attributes (not just presentation attributes)
- Gradients and patterns from defs

---

### 23. Export Options
**Priority: Low**

Currently only exports full SVG.

**Suggestion**: Add export formats and options.
- PNG export (rasterize at specified DPI)
- Selection-only export
- Optimized SVG (remove metadata, minify)
- Copy SVG to clipboard
- Embed fonts option for text

---

### 24. Arc/Pie Shapes
**Priority: Low**

Useful for charts and decorative elements.

**Suggestion**: Add arc shape tool.
- Properties: Center, radius, start angle, end angle
- Option: Pie slice (closed) vs arc (open)
- Render as `<path>` with arc commands
- Resize handles adjust radius, rotation handle adjusts angles

---

### 25. Clipping & Masking
**Priority: Low**

Advanced compositing feature.

**Suggestion**: Support clip paths and masks.
- Use any shape as a clipping mask for another
- UI: "Clip to shape below" context menu option
- Store as `<clipPath>` in defs
- Apply via `clip-path="url(#clip-id)"`

---

## Implementation Phases

**Phase 1 - Essential Editing**
1. Undo/Redo
2. Copy/Paste
3. Keyboard shortcuts
4. Opacity

**Phase 2 - Visual Features**
5. Gradients
6. Rotation
7. Rounded rectangles
8. Stroke dash patterns

**Phase 3 - Advanced Tools**
9. Path tool (bezier)
10. Multi-select
11. Alignment tools
12. Grid & snapping

**Phase 4 - Polish**
13. Groups
14. Text formatting
15. Zoom & pan
16. Markers
17. Filters
