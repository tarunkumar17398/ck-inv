export interface RateRevisionSettings {
  ratePerKg: number;
  markup: number;
  oldRateThreshold: number;
  maxIncreasePct: number;
  roundTo: 10 | 50 | 100 | 200;
}

export const DEFAULT_RATE_REVISION_SETTINGS: RateRevisionSettings = {
  ratePerKg: 1500,
  markup: 2.7,
  oldRateThreshold: 3600,
  maxIncreasePct: 40,
  roundTo: 100,
};

export interface RateRevisionItem {
  price: number | null;
  weight: string | null;
}

export interface RateRevisionResult {
  weightKg: number | null;
  currentPerKg: number | null;
  formulaPrice: number | null;
  newPrice: number | null;
  note: string;
  capped: boolean;
  skipReason: string | null;
}

function parsePositive(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number.parseFloat(value.trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function inferWeightKg(weight: string | null, price: number | null): number | null {
  if (!weight?.trim()) return null;
  const raw = Number.parseFloat(weight.trim());
  if (!Number.isFinite(raw) || raw <= 0) return null;

  if (price !== null) {
    const candidates = [raw, raw / 1000].filter((kg) => {
      const perKg = price / kg;
      return Number.isFinite(perKg) && perKg >= 300 && perKg <= 60000;
    });

    if (candidates.length === 1) return candidates[0];
    if (candidates.length > 1) {
      return raw % 1 !== 0 || raw < 50 ? raw : raw / 1000;
    }
    return null;
  }

  return raw % 1 !== 0 || raw < 50 ? raw : raw / 1000;
}

function roundPrice(target: number, step: number): number {
  const roundingStep = target < 1000 ? 10 : step;
  return Math.round(target / roundingStep) * roundingStep;
}

export function calculateRevisedPrice(
  item: RateRevisionItem,
  settings: RateRevisionSettings,
): RateRevisionResult {
  const currentPrice = parsePositive(item.price);
  const weightKg = inferWeightKg(item.weight, currentPrice);

  if (weightKg === null) {
    return {
      weightKg: null,
      currentPerKg: null,
      formulaPrice: null,
      newPrice: null,
      note: "Check weight",
      capped: false,
      skipReason: "Check weight",
    };
  }

  const currentPerKg = currentPrice === null ? null : currentPrice / weightKg;
  if (currentPerKg !== null && currentPerKg >= settings.oldRateThreshold) {
    return {
      weightKg,
      currentPerKg,
      formulaPrice: null,
      newPrice: null,
      note: "Already above old rate",
      capped: false,
      skipReason: "Already above old rate",
    };
  }

  const formulaPrice = weightKg * settings.ratePerKg * settings.markup;
  const uncappedTarget = Math.max(currentPrice ?? 0, formulaPrice);
  const cap = currentPrice !== null && settings.maxIncreasePct > 0
    ? currentPrice * (1 + settings.maxIncreasePct / 100)
    : Number.POSITIVE_INFINITY;
  const capped = uncappedTarget > cap;
  const target = Math.min(uncappedTarget, cap);
  const rounded = roundPrice(target, settings.roundTo);

  // Keep prices monotonic and make sure a rounded capped result never exceeds the cap.
  const safeRounded = capped && rounded > cap
    ? Math.max(currentPrice ?? 0, Math.floor(cap / (target < 1000 ? 10 : settings.roundTo)) * (target < 1000 ? 10 : settings.roundTo))
    : Math.max(currentPrice ?? 0, rounded);

  if (safeRounded <= (currentPrice ?? 0)) {
    return {
      weightKg,
      currentPerKg,
      formulaPrice,
      newPrice: null,
      note: "No increase needed",
      capped,
      skipReason: "No increase needed",
    };
  }

  return {
    weightKg,
    currentPerKg,
    formulaPrice,
    newPrice: safeRounded,
    note: capped ? "Capped" : "Revised",
    capped,
    skipReason: null,
  };
}

export function applyManualPrice(
  result: RateRevisionResult,
  currentPrice: number | null,
  manualValue: string,
): RateRevisionResult {
  if (!manualValue.trim()) return result;
  const manualPrice = Number.parseFloat(manualValue);

  if (!Number.isFinite(manualPrice) || manualPrice <= 0) {
    return { ...result, newPrice: null, note: "Enter a valid price", skipReason: "Enter a valid price" };
  }
  if (manualPrice < 100) {
    return { ...result, newPrice: null, note: "Minimum price is ₹100", skipReason: "Minimum price is ₹100" };
  }
  if (currentPrice !== null && manualPrice < currentPrice) {
    return { ...result, newPrice: null, note: "Price cannot decrease", skipReason: "Price cannot decrease" };
  }
  if (currentPrice !== null && manualPrice === currentPrice) {
    return { ...result, newPrice: null, note: "No increase needed", skipReason: "No increase needed" };
  }

  return { ...result, newPrice: manualPrice, note: "Manual", capped: false, skipReason: null };
}