import { describe, expect, it } from "vitest";
import { extractVoiceSymptoms } from "./voiceSymptomExtraction";

describe("voice symptom understanding", () => {
  it("extracts explicit and inferred severity without asking the user to state every score", () => {
    const result = extractVoiceSymptoms(
      "My headache was a four after math class, bright lights bothered me, and I felt very tired during homework.",
    );
    const headache = result.symptoms.find((item) => item.id === "headache");
    const light = result.symptoms.find((item) => item.id === "sensitivityToLight");
    const fatigue = result.symptoms.find((item) => item.id === "fatigue");
    expect(headache?.severity).toBe(4);
    expect(headache?.severitySource).toBe("explicit");
    expect(light?.severity).toBe(2);
    expect(light?.rationale).toContain("mild");
    expect(fatigue?.severity).toBe(4);
    expect(result.activityContexts).toContain("School or homework");
  });

  it("uses functional impact to propose a stronger tentative score", () => {
    const result = extractVoiceSymptoms("The dizziness got so bad during reading that I had to stop and lie down.");
    const dizziness = result.symptoms.find((item) => item.id === "dizziness");
    expect(dizziness?.severity).toBe(4);
    expect(dizziness?.severitySource).toBe("functional-impact");
  });

  it("respects simple negation", () => {
    const result = extractVoiceSymptoms("I am not dizzy and I do not have a headache, but I have mild brain fog.");
    expect(result.symptoms.map((item) => item.id)).toEqual(["mentallyFoggy"]);
    expect(result.symptoms[0]?.severity).toBe(2);
  });

  it("routes danger-sign language", () => {
    const result = extractVoiceSymptoms("I keep throwing up and my speech is slurred.");
    expect(result.dangerSigns).toContain("Repeated vomiting");
    expect(result.dangerSigns).toContain("Slurred speech");
  });
});
