Need a way to save file locally using browser apis
would be great to have something like google docs kind a thing
list svg images in a grid allow users to select and edit
- sort by name or last modified
- auto persist changes

keep options open for a future web api to persist these on a server some where.


# Storage Approach

## Primary: IndexedDB
- Large storage capacity (50%+ of disk space)
- Store SVG content as strings or blobs
- Store metadata (name, lastModified, thumbnail) for fast listing
- Async API won't block UI
- Auto-persist changes on edit

## Database Schema
- `files` object store:
  - `id` (auto-increment primary key)
  - `name` (string, indexed)
  - `content` (SVG string)
  - `lastModified` (timestamp, indexed for sorting)
  - `thumbnail` (optional, for grid preview)

## Future Options
- File System Access API for power users who want actual files on disk
- REST API backend for cloud sync/collaboration


# User Interface

- minimal for now
have an open button in the top bar show grid of saved svg images at bottom have a button to open from file

- name of file should be in the top bar
- make name editable


# Implementation Plan

## Phase 1: Database Layer
1. Create `js/FileDatabase.js` - IndexedDB wrapper
   - `init()` - open/create database and object stores
   - `saveFile(file)` - insert or update file record
   - `getFile(id)` - retrieve single file by id
   - `getAllFiles()` - list all files (for grid)
   - `deleteFile(id)` - remove file
   - `getFilesSorted(field, direction)` - sorted listing

## Phase 2: File Manager Service
2. Create `js/FileManager.js` - high-level file operations
   - Track current file id and dirty state
   - `newFile()` - create blank file, save to db
   - `openFile(id)` - load file into canvas
   - `saveCurrentFile()` - persist current canvas state
   - `renameFile(id, name)` - update file name
   - `exportToFile()` - download as .svg (existing functionality)
   - `importFromFile()` - load from disk, save to db
   - Wire up auto-save on shape changes (debounced)

## Phase 3: Top Bar Updates
3. Update top bar UI
   - Add "Open" button (left side)
   - Add editable file name display
   - Show save status indicator (saved/saving)
   - Wire up name editing to `renameFile()`

## Phase 4: File Browser Dialog
4. Create `js/FileBrowserDialog.js` - modal for file selection
   - Grid view of saved files with thumbnails
   - Sort controls (name / last modified)
   - Click to open file
   - Delete button per file
   - "New File" button
   - "Import from disk" button at bottom

## Phase 5: Auto-Save & State Sync
5. Integrate with existing app state
   - Subscribe to shape events for auto-save trigger
   - Debounce saves (e.g., 1 second after last change)
   - Update `lastModified` on each save
   - Generate thumbnail on save (optional, can defer)

## Phase 6: Polish
6. Final touches
   - Handle unsaved changes warning when switching files
   - Keyboard shortcut for save (Ctrl+S)
   - Empty state for file browser (no files yet)
   - Error handling for IndexedDB failures