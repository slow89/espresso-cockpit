import { describe, expect, it } from "vitest";

import { installBrowserCompatibility } from "./browser-compatibility";

describe("installBrowserCompatibility", () => {
  it("adds Array.at for the tablet's older WebView", () => {
    const originalAt = Array.prototype.at;

    try {
      Object.defineProperty(Array.prototype, "at", {
        configurable: true,
        value: undefined,
        writable: true,
      });

      installBrowserCompatibility();

      expect(["first", "last"].at(-1)).toBe("last");
      expect(["first", "last"].at(4)).toBeUndefined();
    } finally {
      Object.defineProperty(Array.prototype, "at", {
        configurable: true,
        value: originalAt,
        writable: true,
      });
    }
  });
});
