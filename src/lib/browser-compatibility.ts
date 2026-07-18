/** Install the small set of built-in polyfills required by the tablet WebView. */
export function installBrowserCompatibility() {
  const arrayPrototype = Array.prototype as { at?: unknown };

  if (typeof arrayPrototype.at === "function") {
    return;
  }

  Object.defineProperty(Array.prototype, "at", {
    configurable: true,
    value<T>(this: T[], index: number): T | undefined {
      const relativeIndex = Math.trunc(index) || 0;
      const resolvedIndex = relativeIndex < 0 ? this.length + relativeIndex : relativeIndex;

      return resolvedIndex < 0 || resolvedIndex >= this.length ? undefined : this[resolvedIndex];
    },
    writable: true,
  });
}

installBrowserCompatibility();
