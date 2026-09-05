import { describe, expect, it } from "vitest";
import { retrieveResearchEvidence } from "./hybridRetrieval";

describe("BM25 research fallback", () => {
  it.each([
    ["What does 0.20 lateral sway mean?", "balance-result"],
    ["How should I return to my job after a vehicle crash?", "return-work-daily-life"],
    ["Why is one readiness score misleading?", "multi-domain"],
  ])("retrieves %s", async (question, expectedTopic) => {
    const result = await retrieveResearchEvidence(question, {
      useDense: false,
      useReranker: false,
      resultLimit: 3,
    });
    expect(result.candidates.map((candidate) => candidate.topic.id)).toContain(expectedTopic);
  });
});
