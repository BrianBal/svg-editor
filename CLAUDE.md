# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start     # Start local development server (http-server with no cache)
```

No build step, tests, or linting configured. This is a vanilla JavaScript application served via static files.

## Architecture

### Core Pattern: Event-Driven State Management

The app uses a simple pub/sub pattern for component communication:
- `EventBus` (`js/EventBus.js`) - Global event emitter exposed as `window.eventBus`
- `State` (`js/State.js`) - Centralized state management exposed as `window.appState`

Components communicate via events rather than direct references. Key events:
- `shape:created`, `shape:deleted`, `shape:selected`, `shape:deselected`, `shape:updated`
- `tool:changed`, `shapes:reordered`, `canvas:loaded`

### Shape Hierarchy

Base class `Shape` (`js/Shape.js`) defines the interface for all shapes:
- Each shape type extends `Shape` and implements: `createSVGElement()`, `updateElement()`, `getBounds()`, `clone()`
- Shape types: `Rectangle`, `Ellipse`, `Line`, `Polyline`, `Star`, `TextShape`
- Shapes are stored in `appState.shapes[]` and rendered to `#shapes-layer` SVG group

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
- `Selection` - Handles selection visualization and resize/point handles
- `LayersPanel` - UI for layer ordering and visibility
- `ToolsPanel` - Property editor for selected shapes
- `SVGLoader` - File import/export functionality
