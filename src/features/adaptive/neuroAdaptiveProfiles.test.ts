import { describe, expect, it } from "vitest";
import { planAdaptiveIntervention, profileSettings } from "./neuroAdaptiveEngine";
import type { AdaptiveCheckIn, StrainEstimate } from "./neuroAdaptiveTypes";

describe("adaptive profiles", () => {
  it("reduces information density in lower-stimulation modes", () => {
    expect(profileSettings("reduced-stimulation").reduceDensity).toBe(true);
    expect(profileSettings("audio-first").reduceDensity).toBe(true);
    expect(profileSettings("standard").reduceDensity).toBe(false);
  });
});


describe("symptom-matched Focus Mode adaptations", () => {
  const baseCheckIn: AdaptiveCheckIn = { lightSensitivity: 0, visualMotionDiscomfort: 0, mentalFatigue: 0 };

  function estimate(keys: StrainEstimate["reasons"][number]["key"][]): StrainEstimate {
    return {
      score: 70,
      band: "elevated",
      enoughSignals: true,
      reasons: keys.map((key) => ({ key, label: key, detail: key, contribution: 20 })),
      featureVector: [0, 0, 0, 0, 0, 0, 0],
      mlProbability: null,
    };
  }

  it("uses larger text for close viewing or squint tension without forcing unrelated changes", () => {
    const plan = planAdaptiveIntervention(estimate(["faceScale", "browTension"]), baseCheckIn);
    expect(plan.textScale).toBeGreaterThan(1);
    expect(plan.lineSpacing).toBeGreaterThan(1);
    expect(plan.reduceMotion).toBe(false);
    expect(plan.reduceDensity).toBe(false);
  });

  it("softens contrast for reported light sensitivity without forcing larger text", () => {
    const plan = planAdaptiveIntervention(null, { ...baseCheckIn, lightSensitivity: 4 });
    expect(plan.softContrast).toBe(true);
    expect(plan.textScale).toBe(1);
  });

  it("reduces motion for gaze or head-instability patterns without forcing text enlargement", () => {
    const plan = planAdaptiveIntervention(estimate(["gazeDeviation", "headMotion"]), baseCheckIn);
    expect(plan.reduceMotion).toBe(true);
    expect(plan.textScale).toBe(1);
  });

  it("reduces secondary detail for rereading or long-pause patterns", () => {
    const plan = planAdaptiveIntervention(estimate(["scrollReversalsPerMinute", "idleRatio"]), baseCheckIn);
    expect(plan.reduceDensity).toBe(true);
    expect(plan.textScale).toBe(1);
  });
});

describe("fast close-viewing + squint demo path", () => {
  it("treats sustained close viewing plus squint tension as enough independent evidence", async () => {
    const { estimateStrain } = await import("./neuroAdaptiveEngine");
    const reference = {
      blinkRateBpm: 12,
      browTension: 0.12,
      faceScale: 0.30,
      headMotion: 0.01,
      gazeDeviation: 0.05,
      scrollReversalsPerMinute: 0,
      idleRatio: 0,
    };
    const current = { ...reference, browTension: 0.25, faceScale: 0.36 };
    const model = {
      thresholdOffset: 0,
      weights: {
        blinkRateBpm: 0.14,
        browTension: 0.16,
        faceScale: 0.18,
        headMotion: 0.14,
        gazeDeviation: 0.14,
        scrollReversalsPerMinute: 0.14,
        idleRatio: 0.10,
      },
      confirmations: 0,
      rejections: 0,
      updatedAt: new Date(0).toISOString(),
    };
    const result = estimateStrain(reference, current, model, { lightSensitivity: 0, visualMotionDiscomfort: 0, mentalFatigue: 0 });
    expect(result.band).toBe("elevated");
    expect(result.enoughSignals).toBe(true);
    expect(result.reasons.map((reason) => reason.key)).toEqual(expect.arrayContaining(["faceScale", "browTension"]));
  });
});
