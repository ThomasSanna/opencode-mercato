import { describe, expect, it } from "bun:test";
import { clampIndex, computeWindow } from "../../src/core/window";

describe("window calculation", () => {
  it("clampIndex clamps within 0 and count - 1", () => {
    expect(clampIndex(-5, 10)).toBe(0);
    expect(clampIndex(5, 10)).toBe(5);
    expect(clampIndex(15, 10)).toBe(9);
    expect(clampIndex(0, 0)).toBe(0);
  });

  it("computeWindow returns entire range when items <= windowSize", () => {
    const res = computeWindow(2, 5, 10);
    expect(res.start).toBe(0);
    expect(res.end).toBe(5);
  });

  it("computeWindow centers the selected index when enough items exist", () => {
    const res = computeWindow(10, 50, 10);
    expect(res.start).toBe(5);
    expect(res.end).toBe(15);
  });

  it("computeWindow handles boundaries at start and end", () => {
    const startRes = computeWindow(1, 50, 10);
    expect(startRes.start).toBe(0);
    expect(startRes.end).toBe(10);

    const endRes = computeWindow(49, 50, 10);
    expect(endRes.start).toBe(40);
    expect(endRes.end).toBe(50);
  });
});
