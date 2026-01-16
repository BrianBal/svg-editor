# SVG Editor - Missing Features & Implementation Plan

This document lists SVG capabilities not yet supported, ordered by importance/frequency of use.

---

## Currently Supported

- **Shapes**: Rectangle, Ellipse, Line, Polyline, Path (bezier curves), Star, Text
- **Attributes**: Stroke color, fill color, stroke width, opacity, stroke dash, linecap, linejoin
- **Gradient Fills**: Linear and radial gradients with multi-stop support, angle control, interactive stop editing
- **Rotation/Transform**: Rotation property, rotation handle UI (drag to rotate, Shift for 15° snap), flip horizontal/vertical
- **Interactions**: Select, move, resize, rotate, point editing (polyline/line), bezier handle editing (path), multi-select (Shift+click, range select in layers panel)
- **Tools**: Pen tool for bezier paths (click for corners, click+drag for curves, close path detection)
- **File ops**: Save/load (IndexedDB), SVG import/export (including gradients, rotation, paths)
- **Editing**: Undo/Redo (Ctrl+Z / Ctrl+Shift+Z, Cmd+Z / Cmd+Shift+Z on Mac)

---

## Missing Features

### 4. Copy/Paste
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

### 5. Alignment Tools
**Priority: Medium-High**

Essential for precise layouts. Requires multi-select first.

**Suggestion**: Add alignment toolbar/buttons.
- Align: Left, Center, Right, Top, Middle, Bottom
- Distribute: Horizontal, Vertical (equal spacing)
- UI: Row of alignment icons in toolbar or properties panel
- Works on multi-selected shapes
- Align to: Selection bounds or canvas

---

### 6. Stroke Dash Pattern (UI Only)
**Priority: Medium-High**

Common for diagrams, borders, and decorative lines.

**Suggestion**: Add dash pattern selector to appearance panel.
- Presets: Solid, Dashed, Dotted, Dash-dot
- Custom: Input for `stroke-dasharray` values
- Optional: `stroke-dashoffset` for animation prep
- UI: Dropdown with visual previews of patterns

---

### 7. Rounded Rectangles (UI Only)
**Priority: Medium-High**

Very common shape. Currently requires workarounds.

**Suggestion**: Add corner radius property to rectangles.
- Add `rx` and `ry` properties to `Rectangle` class
- UI: Corner radius slider/input in properties panel
- Apply via `rx` and `ry` attributes on `<rect>`
- Option: Lock rx/ry for uniform corners

---

### 8. Circle Shape
**Priority: Medium**

Circles are distinct from ellipses conceptually. Minor but nice to have.

**Suggestion**: Add dedicated circle tool.
- New `Circle` class extending `Shape`
- Single radius property (not rx/ry)
- Uses `<circle>` SVG element
- Tool: Drag from center, radius = distance
- Alternative: Option to constrain ellipse to circle (hold Shift)

---

### 9. Groups
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

### 10. Text Formatting
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

### 11. Grid & Snapping
**Priority: Medium**

Precision alignment without manual coordinate entry.

**Suggestion**: Add toggleable grid and snap behavior.
- Grid overlay on canvas (configurable size: 10px, 20px, etc.)
- Snap to grid when moving/resizing
- Snap to other shapes (edge, center)
- Smart guides (alignment lines when near other shapes)
- UI: Toggle buttons in toolbar, grid size in settings

---

### 12. Keyboard Shortcuts
**Priority: Medium**

Power user feature. Many shortcuts already logical but unimplemented.

**Suggestion**: Implement common shortcuts.
- Tools: V (select), R (rectangle), E (ellipse), L (line), P (polyline), S (star), T (text)
- Edit: Delete/Backspace (delete), Ctrl+D (duplicate)
- Arrange: Ctrl+] (bring forward), Ctrl+[ (send backward)
- View: Ctrl+0 (fit to canvas), Ctrl++ (zoom in), Ctrl+- (zoom out)
- File: Ctrl+S (save), Ctrl+O (open)

---

### 13. Stroke Line Caps & Joins (UI Only)
**Priority: Medium**

Affects appearance of line endpoints and corners.

**Suggestion**: Add linecap and linejoin options.
- Line cap: Butt, Round, Square
- Line join: Miter, Round, Bevel
- UI: Dropdown selectors in appearance panel (show when stroke is not 'none')
- Apply via `stroke-linecap` and `stroke-linejoin` attributes

---

### 14. Zoom & Pan
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

### 15. Markers (Arrowheads)
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

### 16. Layers Panel Improvements
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

### 17. Drop Shadow / Filters
**Priority: Low-Medium**

Popular visual effect for depth and emphasis.

**Suggestion**: Add filter effects.
- Start with drop shadow (most common)
  - Offset X/Y, blur radius, color, opacity
- Implement as SVG `<filter>` in `<defs>`
- UI: "Effects" section in properties panel
- Future: Blur, glow, color matrix

---

### 18. Pattern Fills
**Priority: Low**

Repeating patterns for backgrounds and textures.

**Suggestion**: Support pattern fills.
- Predefined patterns: Stripes, Dots, Crosshatch, Checkerboard
- Pattern properties: Size, rotation, colors
- Store as `<pattern>` in `<defs>`
- Reference via `url(#pattern-id)`
- Future: Custom patterns from shape groups

---

### 19. Import Improvements
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

### 20. Export Options
**Priority: Low**

Currently only exports full SVG.

**Suggestion**: Add export formats and options.
- PNG export (rasterize at specified DPI)
- Selection-only export
- Optimized SVG (remove metadata, minify)
- Copy SVG to clipboard
- Embed fonts option for text

---

### 21. Arc/Pie Shapes
**Priority: Low**

Useful for charts and decorative elements.

**Suggestion**: Add arc shape tool.
- Properties: Center, radius, start angle, end angle
- Option: Pie slice (closed) vs arc (open)
- Render as `<path>` with arc commands
- Resize handles adjust radius, rotation handle adjusts angles

---

### 22. Clipping & Masking
**Priority: Low**

Advanced compositing feature.

**Suggestion**: Support clip paths and masks.
- Use any shape as a clipping mask for another
- UI: "Clip to shape below" context menu option
- Store as `<clipPath>` in defs
- Apply via `clip-path="url(#clip-id)"`

---

### 23. Image Element
**Priority: High**

Embedding raster images is fundamental for many design workflows.

**Suggestion**: Add image import and placement tool.
- New `Image` shape class using `<image>` SVG element
- Drag-drop image files onto canvas
- File picker button in toolbar
- Properties: x, y, width, height, preserveAspectRatio
- Support common formats: PNG, JPG, GIF, WebP
- Option: Embed as base64 or link to external URL
- Resize handles maintain aspect ratio by default (Shift to unlock)

---

### 24. Polygon Shape
**Priority: Medium**

Closed arbitrary shapes (like Polyline but automatically closed).

**Suggestion**: Add dedicated polygon tool.
- New `Polygon` class extending `Shape`
- Uses `<polygon>` SVG element (not `<path>`)
- Similar to Polyline but automatically closes path
- Click to add vertices, double-click to finish
- Point editing mode for adjusting vertices
- Useful for creating custom closed shapes like triangles, hexagons, etc.

---

### 25. Symbol & Use (Component Reuse)
**Priority: Medium**

Create reusable components that can be instanced multiple times efficiently.

**Suggestion**: Support SVG symbols and use elements.
- New `Symbol` class wrapping shapes in `<symbol>` within `<defs>`
- New `SymbolInstance` class using `<use>` element
- UI: "Create Symbol" button to convert selection to reusable symbol
- Symbol library panel showing available symbols
- Drag symbol from library to create instance
- Edit symbol to update all instances
- Properties on instance: x, y, width, height (overrides)

---

### 26. Text on Path
**Priority: Low-Medium**

Text that follows a curved path for decorative and design purposes.

**Suggestion**: Support textPath element.
- Extend `TextShape` with optional path binding
- UI: "Attach to Path" option when text and path both selected
- Uses `<textPath>` element referencing a path's ID
- Properties: startOffset (position along path), text-anchor
- Path must be a Path or Polyline shape
- Text reflows when path is edited

---

### 27. Blend Modes
**Priority: Low-Medium**

Layer blending for visual effects and compositing.

**Suggestion**: Add blend mode property to shapes.
- Property: `mix-blend-mode` on shape elements
- Modes: Normal, Multiply, Screen, Overlay, Darken, Lighten, Color-Dodge, Color-Burn, Hard-Light, Soft-Light, Difference, Exclusion, Hue, Saturation, Color, Luminosity
- UI: Dropdown in appearance panel
- Works with opacity for combined effects

---

### 28. SVG Animation
**Priority: Low**

Native SVG animations without JavaScript.

**Suggestion**: Support SMIL animation elements.
- Basic support for `<animate>` element
- Properties that can be animated: position, size, color, opacity, transform
- UI: Animation timeline panel (complex)
- Simpler approach: Preset animations (pulse, fade, spin, bounce)
- Export option to include or strip animations
- Note: SMIL has limited browser support; consider CSS animations as alternative

---

### 29. Accessibility (Title & Description)
**Priority: Low**

Proper accessibility metadata for screen readers and SEO.

**Suggestion**: Support title and desc elements.
- Add `<title>` and `<desc>` elements to shapes
- UI: "Accessibility" section in properties panel
- Title field: Short label for the shape
- Description field: Longer description of purpose
- Also support document-level title/desc on root `<svg>`
- Improves screen reader compatibility

---

### 30. Foreign Object (HTML Embedding)
**Priority: Low**

Embed HTML content within SVG for rich text or interactive elements.

**Suggestion**: Support foreignObject element.
- New `ForeignObject` shape class
- Properties: x, y, width, height
- Contains HTML content (div with contenteditable)
- Use cases: Rich formatted text, forms, iframes
- UI: Insert HTML block tool
- Note: Limited support when SVG is used as image

---

### 31. Additional Filter Effects
**Priority: Low**

Expand filter capabilities beyond basic drop shadow.

**Suggestion**: Add more SVG filter primitives.
- **Morphology** (erode/dilate): Thicken or thin shapes
- **Turbulence**: Generate noise/texture patterns
- **Displacement Map**: Warp shapes using another image
- **Lighting Effects**: feDistantLight, fePointLight, feSpotLight
- **Blend**: feBlend for compositing layers
- **Composite**: feComposite for boolean operations on filter results
- **Tile**: feTile for repeating patterns
- UI: Filter stack editor allowing multiple effects to be chained
- Presets: Emboss, Bevel, Inner Shadow, Outer Glow, Noise

---

### 32. Stroke Miter Limit
**Priority: Low**

Control how sharp corners are rendered when using miter joins.

**Suggestion**: Add stroke-miterlimit property.
- Applies when `stroke-linejoin` is set to "miter"
- Determines when miter join switches to bevel (for very sharp angles)
- Default value: 4
- UI: Number input in stroke section (visible when linejoin is miter)
- Higher values allow sharper points, lower values bevel sooner

---

## Implementation Phases

**Phase 1 - Essential Editing** *(Partially Complete)*
1. ~~Undo/Redo~~ ✓
2. Copy/Paste
3. Keyboard shortcuts (partially done)
4. ~~Opacity~~ ✓

**Phase 2 - Visual Features** *(Partially Complete)*
5. ~~Gradients~~ ✓
6. ~~Rotation/Transform~~ ✓ (rotation property, rotation handle, flip H/V, 15° snap with Shift)
7. Rounded rectangles (UI only - property exists)
8. Stroke dash patterns (UI only - property exists)
9. Image element

**Phase 3 - Advanced Tools** *(Partially Complete)*
10. ~~Path tool (bezier)~~ ✓
11. ~~Multi-select~~ ✓ (Shift+click toggle, range select in layers, combined bounds, multi-move/resize/rotate, undo/redo support)
12. Alignment tools
13. Grid & snapping
14. Polygon shape

**Phase 4 - Polish**
15. Groups
16. Text formatting
17. Zoom & pan (partially done)
18. Markers
19. Filters (drop shadow, blur)
20. Symbol & Use (components)
21. Blend modes

**Phase 5 - Advanced Features**
22. Text on path
23. Additional filter effects
24. Clipping & masking
25. Animation (basic)
26. Accessibility (title/desc)
27. Foreign object
28. Stroke miter limit
