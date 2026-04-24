// Vitest setup
// Server action tests use node environment (no DOM needed)
// Component tests can override with @vitest-environment jsdom per file

// Bun's built-in `localStorage` requires --localstorage-file and shadows
// jsdom's Storage implementation when vitest is launched via `bun run`.
// Replace it with an in-memory polyfill so tests that use localStorage work
// regardless of runner. Scoped to the jsdom `window` — node-env tests are
// unaffected because this block is a no-op without `window`.
if (typeof window !== "undefined") {
  class MemoryStorage implements Storage {
    private store = new Map<string, string>();
    get length() {
      return this.store.size;
    }
    clear() {
      this.store.clear();
    }
    getItem(key: string) {
      return this.store.has(key) ? (this.store.get(key) as string) : null;
    }
    key(index: number) {
      return Array.from(this.store.keys())[index] ?? null;
    }
    removeItem(key: string) {
      this.store.delete(key);
    }
    setItem(key: string, value: string) {
      this.store.set(key, String(value));
    }
  }
  const localStorage = new MemoryStorage();
  const sessionStorage = new MemoryStorage();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: localStorage,
  });
  Object.defineProperty(window, "sessionStorage", {
    configurable: true,
    value: sessionStorage,
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: localStorage,
  });
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: sessionStorage,
  });
}
