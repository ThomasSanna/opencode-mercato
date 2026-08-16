import type { SourceId, SourceProvenance, Trust } from "./model";

/** Fixed per-source trust (spec §5). */
export const SOURCE_TRUST: Record<SourceId, Trust> = {
  cafe: { level: "high", score: 30 },
  awesome: { level: "medium", score: 20 },
  ecosystem: { level: "medium", score: 15 },
};

/** Highest-score trust among provenances; ties keep the first occurrence. */
export function bestTrust(provenances: SourceProvenance[]): Trust {
  let best: Trust = { level: "low", score: 0 };
  for (const p of provenances) {
    if (p.trust.score > best.score) best = p.trust;
  }
  return best;
}