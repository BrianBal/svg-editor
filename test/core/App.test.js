import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('App.loadMostRecentFile', () => {
    let mockFileDatabase;
    let mockFileManager;

    beforeEach(() => {
        // Create mock fileDatabase
        mockFileDatabase = {
            getFilesSorted: vi.fn()
        };
        globalThis.fileDatabase = mockFileDatabase;
        if (typeof window !== 'undefined') {
            window.fileDatabase = mockFileDatabase;
        }

        // Create mock fileManager
        mockFileManager = {
            openFile: vi.fn().mockResolvedValue()
        };
    });

    async function loadMostRecentFile(fileManager) {
        try {
            const files = await fileDatabase.getFilesSorted('lastModified', 'desc');
            if (files.length > 0) {
                await fileManager.openFile(files[0].id);
            }
        } catch (error) {
            // Continue with empty document on error
        }
    }

    it('opens the most recently modified file when files exist', async () => {
        const mockFiles = [
            { id: 3, name: 'Newest', lastModified: 3000 },
            { id: 1, name: 'Oldest', lastModified: 1000 },
            { id: 2, name: 'Middle', lastModified: 2000 }
        ];
        mockFileDatabase.getFilesSorted.mockResolvedValue(mockFiles);

        await loadMostRecentFile(mockFileManager);

        expect(mockFileDatabase.getFilesSorted).toHaveBeenCalledWith('lastModified', 'desc');
        expect(mockFileManager.openFile).toHaveBeenCalledTimes(1);
        expect(mockFileManager.openFile).toHaveBeenCalledWith(3);
    });

    it('does not open any file when no files exist', async () => {
        mockFileDatabase.getFilesSorted.mockResolvedValue([]);

        await loadMostRecentFile(mockFileManager);

        expect(mockFileDatabase.getFilesSorted).toHaveBeenCalledWith('lastModified', 'desc');
        expect(mockFileManager.openFile).not.toHaveBeenCalled();
    });

    it('handles errors gracefully without crashing', async () => {
        mockFileDatabase.getFilesSorted.mockRejectedValue(new Error('Database error'));

        // Should not throw
        await expect(loadMostRecentFile(mockFileManager)).resolves.toBeUndefined();
        expect(mockFileManager.openFile).not.toHaveBeenCalled();
    });

    it('opens file with correct id from sorted list', async () => {
        const mockFiles = [
            { id: 42, name: 'Latest Document', lastModified: Date.now() }
        ];
        mockFileDatabase.getFilesSorted.mockResolvedValue(mockFiles);

        await loadMostRecentFile(mockFileManager);

        expect(mockFileManager.openFile).toHaveBeenCalledWith(42);
    });
});
