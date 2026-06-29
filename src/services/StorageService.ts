import * as FileSystem from 'expo-file-system';

export class PersistentLocalStorage {
    private cache: { [key: string]: string } = {};
    private filePath: string = FileSystem.documentDirectory + 'matrix_localstorage.json';
    private saveTimeout: NodeJS.Timeout | null = null;
    public isInitialized: boolean = false; // Cờ đánh dấu trạng thái nạp file từ đĩa

    async init() {
        try {
            const fileInfo = await FileSystem.getInfoAsync(this.filePath);
            if (fileInfo.exists) {
                const content = await FileSystem.readAsStringAsync(this.filePath);
                this.cache = JSON.parse(content);
                console.log(`📁 Loaded ${Object.keys(this.cache).length} keys from PersistentLocalStorage`);
            }
        } catch (e) {
            console.error("Failed to initialize PersistentLocalStorage:", e);
            this.cache = {};
        } finally {
            this.isInitialized = true;
        }
    }

    getItem(key: string): string | null {
        return this.cache[key] !== undefined ? this.cache[key] : null;
    }

    setItem(key: string, value: string): void {
        this.cache[key] = String(value);
        this.save();
    }

    removeItem(key: string): void {
        delete this.cache[key];
        this.save();
    }

    key(index: number): string | null {
        const keys = Object.keys(this.cache);
        return keys[index] !== undefined ? keys[index] : null;
    }

    get length(): number {
        return Object.keys(this.cache).length;
    }

    private save() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        this.saveTimeout = setTimeout(async () => {
            try {
                await FileSystem.writeAsStringAsync(this.filePath, JSON.stringify(this.cache));
            } catch (e) {
                console.error("Failed to save PersistentLocalStorage:", e);
            }
        }, 100);
    }

    async clear() {
        this.cache = {};
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        try {
            await FileSystem.deleteAsync(this.filePath, { idempotent: true });
            console.log("📁 Cleared PersistentLocalStorage file.");
        } catch (e) { }
    }
}

export const persistentLocalStorage = new PersistentLocalStorage();
