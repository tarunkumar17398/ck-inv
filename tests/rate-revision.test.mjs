import { describe, expect, test } from "bun:test";
import {
  applyManualPrice,
  calculateRevisedPrice,
  DEFAULT_RATE_REVISION_SETTINGS,
} from "../src/lib/rateRevision.ts";

describe("calculateRevisedPrice", () => {
  test("recognizes legacy decimal kilograms from a plausible current price", () => {
    const result = calculateRevisedPrice({ weight: "5.2", price: 10000 }, DEFAULT_RATE_REVISION_SETTINGS);
    expect(result.weightKg).toBe(5.2);
    expect(result.newPrice).toBe(14000);
    expect(result.note).toBe("Capped");
  });

  test("converts whole-gram stock using the current price per kilogram", () => {
    const result = calculateRevisedPrice({ weight: "5200", price: 10000 }, DEFAULT_RATE_REVISION_SETTINGS);
    expect(result.weightKg).toBe(5.2);
    expect(result.newPrice).toBe(14000);
  });

  test("calculates and rounds a blank price from a weight", () => {
    const result = calculateRevisedPrice({ weight: "5", price: null }, DEFAULT_RATE_REVISION_SETTINGS);
    expect(result.newPrice).toBe(20300);
    expect(result.note).toBe("Revised");
  });

  test("uses ten-rupee rounding below one thousand", () => {
    const result = calculateRevisedPrice({ weight: "0.2", price: null }, DEFAULT_RATE_REVISION_SETTINGS);
    expect(result.newPrice).toBe(810);
  });

  test("skips prices already at or above the configured old-rate threshold", () => {
    const result = calculateRevisedPrice({ weight: "5", price: 20000 }, DEFAULT_RATE_REVISION_SETTINGS);
    expect(result.skipReason).toBe("Already above old rate");
  });

  test("does not reduce an existing price when rounding would otherwise do so", () => {
    const result = calculateRevisedPrice(
      { weight: "0.1", price: 1005 },
      { ...DEFAULT_RATE_REVISION_SETTINGS, maxIncreasePct: 0, oldRateThreshold: 20000 },
    );
    expect(result.newPrice).toBeNull();
    expect(result.skipReason).toBe("No increase needed");
  });

  test("keeps a capped rounded price at or below the cap", () => {
    const settings = { ...DEFAULT_RATE_REVISION_SETTINGS, maxIncreasePct: 39.9 };
    const result = calculateRevisedPrice({ weight: "5", price: 10000 }, settings);
    expect(result.newPrice).toBe(13900);
    expect(result.newPrice).toBeLessThanOrEqual(10000 * 1.399);
  });

  test("flags weights that cannot produce a plausible price per kilogram", () => {
    const result = calculateRevisedPrice({ weight: "not-a-weight", price: 10000 }, DEFAULT_RATE_REVISION_SETTINGS);
    expect(result.skipReason).toBe("Check weight");
  });

  test("allows a manual increase even when formula estimation cannot read weight", () => {
    const calculated = calculateRevisedPrice({ weight: null, price: 500 }, DEFAULT_RATE_REVISION_SETTINGS);
    const result = applyManualPrice(calculated, 500, "700");
    expect(result.newPrice).toBe(700);
    expect(result.note).toBe("Manual");
  });

  test("rejects a manual price decrease", () => {
    const calculated = calculateRevisedPrice({ weight: "1", price: 500 }, DEFAULT_RATE_REVISION_SETTINGS);
    const result = applyManualPrice(calculated, 500, "499");
    expect(result.newPrice).toBeNull();
    expect(result.skipReason).toBe("Price cannot decrease");
  });

  test("rejects a manual price under ₹100", () => {
    const calculated = calculateRevisedPrice({ weight: "1", price: 50 }, DEFAULT_RATE_REVISION_SETTINGS);
    const result = applyManualPrice(calculated, 50, "99");
    expect(result.newPrice).toBeNull();
    expect(result.skipReason).toBe("Minimum price is ₹100");
  });
});