import { describe, it, expect } from "vitest";
import { evaluateReactionQuality } from "./reactionQuality";

describe("evaluateReactionQuality", () => {
  it("marks the assessment invalid when fewer than 7 valid trials exist", () => {
    const result = evaluateReactionQuality({
      validTrialCount: 5,
      falseStarts: 0,
      focusLossCount: 0,
      coefficientOfVariation: 5,
      abandoned: false,
    });
    expect(result.quality).toBe("invalid");
  });

  it("marks the assessment invalid when abandoned, regardless of trial count", () => {
    const result = evaluateReactionQuality({
      validTrialCount: 10,
      falseStarts: 0,
      focusLossCount: 0,
      coefficientOfVariation: 5,
      abandoned: true,
    });
    expect(result.quality).toBe("invalid");
  });

  it("rates a clean session with 9+ valid trials and no interruptions as high", () => {
    const result = evaluateReactionQuality({
      validTrialCount: 10,
      falseStarts: 0,
      focusLossCount: 0,
      coefficientOfVariation: 10,
      abandoned: false,
    });
    expect(result.quality).toBe("high");
  });

  it("rates a session with one false start and 8 valid trials as moderate", () => {
    const result = evaluateReactionQuality({
      validTrialCount: 8,
      falseStarts: 1,
      focusLossCount: 0,
      coefficientOfVariation: 18,
      abandoned: false,
    });
    expect(result.quality).toBe("moderate");
  });

  it("rates a session with multiple interruptions and high variability as limited", () => {
    const result = evaluateReactionQuality({
      validTrialCount: 7,
      falseStarts: 2,
      focusLossCount: 2,
      coefficientOfVariation: 40,
      abandoned: false,
    });
    expect(result.quality).toBe("limited");
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("always returns at least one human-readable reason", () => {
    const result = evaluateReactionQuality({
      validTrialCount: 3,
      falseStarts: 0,
      focusLossCount: 0,
      coefficientOfVariation: null,
      abandoned: false,
    });
    expect(result.reasons.length).toBeGreaterThan(0);
  });
});
