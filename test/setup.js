import { beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const jsDir = join(__dirname, '..', 'js');

// Files and their exported class names
const files = [
    { file: 'EventBus.js', className: 'EventBus' },
    { file: 'SVGTransform.js', className: 'SVGTransform' },
    { file: 'State.js', className: 'State' },
    { file: 'Gradient.js', className: 'Gradient' },
    { file: 'GradientManager.js', className: 'GradientManager' },
    { file: 'Shape.js', className: 'Shape' },
    { file: 'PointBasedShape.js', className: 'PointBasedShape' },
    { file: 'Rectangle.js', className: 'Rectangle' },
    { file: 'Ellipse.js', className: 'Ellipse' },
    { file: 'Star.js', className: 'Star' },
    { file: 'Polyline.js', className: 'Polyline' },
    { file: 'Path.js', className: 'Path' },
    { file: 'Line.js', className: 'Line' },
    { file: 'TextShape.js', className: 'TextShape' },
    { file: 'HistoryManager.js', className: 'HistoryManager' },
    { file: 'ClipboardManager.js', className: 'ClipboardManager' },
    { file: 'PenTool.js', className: 'PenTool' },
    { file: 'CommandPalette.js', className: 'CommandPalette' },
    { file: 'Selection.js', className: 'Selection' },
    { file: 'SVGTransform.js', className: 'SVGTransform' },
];

// Load each file and extract the class into globalThis
files.forEach(({ file, className }) => {
    const code = readFileSync(join(jsDir, file), 'utf-8');
    // Wrap code to return the class, using Function constructor
    // The Function body will have access to globalThis vars we've set
    const wrappedCode = `
        with (this) {
            ${code}
            return typeof ${className} !== 'undefined' ? ${className} : undefined;
        }
    `;
    const fn = new Function(wrappedCode);
    const result = fn.call(globalThis);
    if (result) {
        globalThis[className] = result;
    }
});

beforeEach(() => {
    // Fresh EventBus and State for each test
    globalThis.eventBus = new globalThis.EventBus();
    globalThis.appState = new globalThis.State();

    // Also set on window for code that uses window.eventBus
    if (typeof window !== 'undefined') {
        window.eventBus = globalThis.eventBus;
        window.appState = globalThis.appState;
    }

    // Reset shape ID counter for predictable IDs
    globalThis.Shape.resetIdCounter();
    globalThis.Gradient.resetIdCounter();

    // Create minimal DOM structure for tests that need it
    document.body.innerHTML = `
        <svg id="svg-canvas" xmlns="http://www.w3.org/2000/svg">
            <g id="shapes-layer"></g>
            <g id="handles-layer"></g>
        </svg>
    `;

    // Fresh HistoryManager for each test
    globalThis.historyManager = new globalThis.HistoryManager();
    if (typeof window !== 'undefined') {
        window.historyManager = globalThis.historyManager;
    }

    // Fresh ClipboardManager for each test
    globalThis.clipboardManager = new globalThis.ClipboardManager();
    if (typeof window !== 'undefined') {
        window.clipboardManager = globalThis.clipboardManager;
    }
});
