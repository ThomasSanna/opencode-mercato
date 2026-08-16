import { describe, expect, test } from "bun:test";
import type { SourceId, SourceProvenance } from "../../src/core/model";
import { SOURCE_TRUST, bestTrust } from "../../src/core/trust";

describe("SOURCE_TRUST", () => {
  test("fixed values match spec §5 (30/20/15)", () => {
    expect(SOURCE_TRUST).toEqual({
      cafe: { level: "high", score: 30 },
      awesome: { level: "medium", score: 20 },
      ecosystem: { level: "medium", score: 15 },
    });
  });
});

describe("bestTrust", () => {
  const prov = (source: SourceId, score: number, level: "high" | "medium" | "low"): SourceProvenance =>
    ({ source, trust: { level, score }, rawId: "x", seenAt: 0 });

  test("returns the highest score", () => {
    expect(bestTrust([prov("awesome", 20, "medium"), prov("ecosystem", 15, "medium"), prov("cafe", 30, "high")]))
      .toEqual({ level: "high", score: 30 });
  });

  test("ties keep the first occurrence", () => {
    expect(bestTrust([prov("ecosystem", 20, "medium"), prov("awesome", 20, "medium")]))
      .toEqual({ level: "medium", score: 20 });
  });

  test("empty list yields low/0", () => {
    expect(bestTrust([])).toEqual({ level: "low", score: 0 });
  });
});