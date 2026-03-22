import { describe, expect, it } from "vitest";

import { formatBrewRatio } from "./recipe-utils";

describe("formatBrewRatio", () => {
  it("renders the brew ratio as dose to yield", () => {
    expect(formatBrewRatio(18, 36)).toBe("1:2.0");
    expect(formatBrewRatio(20, 50)).toBe("1:2.5");
  });

  it("falls back when the inputs are missing or invalid", () => {
    expect(formatBrewRatio(undefined, 36)).toBe("1:2.0");
    expect(formatBrewRatio(18, null)).toBe("1:2.0");
    expect(formatBrewRatio(0, 36)).toBe("1:2.0");
  });
});
