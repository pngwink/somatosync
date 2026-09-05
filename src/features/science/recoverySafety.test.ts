import { describe, expect, it } from "vitest";
import { interpretActivityTolerance, isAcuteRecovery } from "./recoverySafety";
import type { RecoveryProfile } from "../recovery/recoveryProfile";

function profile(injuryDate: string): RecoveryProfile {
  return {
    injuryDate,
    ageGroup: "adult",
    injuryCause: "other",
    focuses: ["daily-life"],
    workingWithClinician: null,
    accessibilityPreference: "standard",
    setupStatus: "completed",
    riskContext: {
      priorConcussions: false,
      headacheHistory: false,
      sleepHistory: false,
      mentalHealthHistory: false,
      learningAttentionNeeds: false,
      neckInjury: false,
      lossOfConsciousness: false,
    },
    updatedAt: "2026-08-23T00:00:00.000Z",
  };
}

describe("recovery safety helpers", () => {
  it("classifies a <=2 point increase that settles within an hour as mild and brief", () => {
    expect(interpretActivityTolerance(3, 5, "30-60").response).toBe("mild-brief");
  });

  it("does not call a prolonged or >2 point increase mild and brief", () => {
    expect(interpretActivityTolerance(3, 6, "lt-15").response).toBe("significant-prolonged");
    expect(interpretActivityTolerance(3, 5, "gt-60").response).toBe("significant-prolonged");
    expect(interpretActivityTolerance(3, 3, "not-yet").response).toBe("significant-prolonged");
  });

  it("recognizes an injury date within the first 48 hours", () => {
    expect(isAcuteRecovery(profile("2026-08-23"), new Date("2026-08-23T11:00:00"))).toBe(true);
    expect(isAcuteRecovery(profile("2026-08-21"), new Date("2026-08-23T11:00:00"))).toBe(false);
  });
});
