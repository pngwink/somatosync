import type { AssessmentResult, ResultTone } from "../../../types";

export interface ResultInterpretation {
  label: string;
  detail: string;
  tone: ResultTone;
}

function fromPercent(
  percent: number | null | undefined,
  labels: {
    first: string;
    firstDetail: string;
    improved: string;
    improvedDetail: string;
    similar: string;
    similarDetail: string;
    caution: string;
    cautionDetail: string;
  },
  threshold = 8
): ResultInterpretation {
  if (percent == null) {
    return { label: labels.first, detail: labels.firstDetail, tone: "info" };
  }
  if (percent >= threshold) {
    return { label: labels.improved, detail: labels.improvedDetail, tone: "positive" };
  }
  if (percent <= -threshold) {
    return { label: labels.caution, detail: labels.cautionDetail, tone: "caution" };
  }
  return { label: labels.similar, detail: labels.similarDetail, tone: "neutral" };
}

export function interpretAssessmentResult(result: AssessmentResult): ResultInterpretation {
  if (result.interpretationLabel && result.interpretationDetail && result.interpretationTone) {
    return {
      label: result.interpretationLabel,
      detail: result.interpretationDetail,
      tone: result.interpretationTone,
    };
  }

  switch (result.type) {
    case "symptom-check-in":
      return fromPercent(result.percentFromStart, {
        first: "Starting symptom snapshot",
        firstDetail: "Future PCSS results will be compared with this first assessment.",
        improved: "Lower symptom burden",
        improvedDetail: "Reported symptom severity is lower than the first assessment.",
        similar: "Similar symptom burden",
        similarDetail: "Reported symptom severity is close to the first assessment.",
        caution: "Higher symptom burden",
        cautionDetail: "Reported symptom severity is higher than the first assessment. Consider rechecking and sharing worsening symptoms with a clinician.",
      }, 10);
    case "reaction-time":
      return fromPercent(result.percentFromStart, {
        first: "Starting reaction-time result",
        firstDetail: "Future sessions will show whether reaction speed changes under similar conditions.",
        improved: "Faster than the starting result",
        improvedDetail: "Median reaction time is faster than the first recorded assessment.",
        similar: "Similar reaction speed",
        similarDetail: "Median reaction time is close to the first recorded assessment.",
        caution: "Slower than the starting result",
        cautionDetail: "Median reaction time is slower than the first recorded assessment. Fatigue, distractions, and symptoms can affect this result.",
      }, 7);
    case "balance":
      return fromPercent(result.percentFromStart, {
        first: "Starting movement recording",
        firstDetail: "Use future recordings made with the same stance, camera distance, and lighting for comparison.",
        improved: "Less movement than the start",
        improvedDetail: "Lateral movement was lower than in the first comparable camera recording.",
        similar: "Similar movement pattern",
        similarDetail: "Lateral movement was close to the first comparable camera recording.",
        caution: "More movement than the start",
        cautionDetail: "Lateral movement was higher than in the first comparable recording. Recheck only when standing feels safe.",
      }, 10);
    case "memory":
      return fromPercent(result.percentFromStart, {
        first: "Starting memory result",
        firstDetail: "Future sessions with a different word list will be compared with this result.",
        improved: "More words recalled",
        improvedDetail: "Delayed recall was higher than the first recorded memory task.",
        similar: "Similar recall",
        similarDetail: "Delayed recall was close to the first recorded memory task.",
        caution: "Fewer words recalled",
        cautionDetail: "Delayed recall was lower than the first recorded memory task. Rest, distractions, and repeated testing can affect performance.",
      }, 15);

    default:
      return {
        label: "Result recorded",
        detail: "This result is available for within-person comparison with future sessions.",
        tone: "neutral",
      };
  }
}
