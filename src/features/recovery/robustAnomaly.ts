export interface UnexpectedChangeEvaluation {
  isUnexpected: boolean;
  score: number;
  reference: number;
  relativeWorseChange: number;
  absoluteChange: number;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function robustDeviation(current: number, prior: number[]): { score: number; reference: number; relativeChange: number } {
  const reference = median(prior);
  const deviations = prior.map((value) => Math.abs(value - reference));
  const mad = median(deviations);
  const relativeChange = reference === 0 ? 0 : ((current - reference) / Math.abs(reference)) * 100;

  if (mad > 0.0001) {
    return {
      score: (0.6745 * (current - reference)) / mad,
      reference,
      relativeChange,
    };
  }

  return {
    score: relativeChange === 0 ? 0 : Math.sign(relativeChange) * Math.min(6, Math.abs(relativeChange) / 12),
    reference,
    relativeChange,
  };
}

export function evaluateUnexpectedChange(
  current: number,
  prior: number[],
  higherIsWorse: boolean,
  minimumAbsoluteChange: number,
  minimumRelativeChange: number
): UnexpectedChangeEvaluation {
  if (prior.length < 4 || !Number.isFinite(current) || prior.some((value) => !Number.isFinite(value))) {
    return { isUnexpected: false, score: 0, reference: prior.length ? median(prior) : current, relativeWorseChange: 0, absoluteChange: 0 };
  }

  const { score, reference, relativeChange } = robustDeviation(current, prior);
  const signedWorseScore = higherIsWorse ? score : -score;
  const absoluteChange = Math.abs(current - reference);
  const relativeWorseChange = higherIsWorse ? relativeChange : -relativeChange;
  return {
    isUnexpected: signedWorseScore >= 2.5
      && absoluteChange >= minimumAbsoluteChange
      && relativeWorseChange >= minimumRelativeChange,
    score: signedWorseScore,
    reference,
    relativeWorseChange,
    absoluteChange,
  };
}
