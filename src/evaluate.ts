import type {Candidate, ClassificationFile} from './types.js';

type EvaluationItem = {
  id: string;
  title: string;
  expectedTags: string[];
  suggestedTags: string[];
  matchedTags: string[];
  missingTags: string[];
  extraTags: string[];
};

export type BaselineEvaluation = {
  evaluatedAt: string;
  itemsWithTagBaseline: number;
  microPrecision: number | null;
  microRecall: number | null;
  microF1: number | null;
  exactTagMatches: number;
  primaryTagMatches: number;
  primaryTagAccuracy: number | null;
  items: EvaluationItem[];
  note: string;
};

const baselineScenarios = (candidate: Candidate): string[] => {
  const baseline = candidate.metadata?.humanBaseline;
  if (typeof baseline !== 'object' || baseline === null || Array.isArray(baseline)) return [];
  const scenarios = (baseline as Record<string, unknown>).scenarios;
  return Array.isArray(scenarios) && scenarios.every(value => typeof value === 'string')
    ? [...new Set(scenarios)]
    : [];
};

const ratio = (numerator: number, denominator: number): number | null => (
  denominator === 0 ? null : Number((numerator / denominator).toFixed(4))
);

export const evaluateBaseline = (
  file: ClassificationFile,
  now: () => Date = () => new Date()
): BaselineEvaluation => {
  const items: EvaluationItem[] = [];
  let truePositive = 0;
  let falsePositive = 0;
  let falseNegative = 0;
  for (const classification of file.classifications) {
    const expectedTags = baselineScenarios(classification.candidate).sort();
    if (expectedTags.length === 0) continue;
    const suggestedTags = [...new Set(classification.suggestedTags)].sort();
    const matchedTags = suggestedTags.filter(tag => expectedTags.includes(tag));
    const missingTags = expectedTags.filter(tag => !suggestedTags.includes(tag));
    const extraTags = suggestedTags.filter(tag => !expectedTags.includes(tag));
    truePositive += matchedTags.length;
    falsePositive += extraTags.length;
    falseNegative += missingTags.length;
    items.push({
      id: classification.candidate.id,
      title: classification.candidate.title,
      expectedTags,
      suggestedTags,
      matchedTags,
      missingTags,
      extraTags
    });
  }
  const precision = ratio(truePositive, truePositive + falsePositive);
  const recall = ratio(truePositive, truePositive + falseNegative);
  const f1 = precision === null || recall === null || precision + recall === 0
    ? null
    : Number(((2 * precision * recall) / (precision + recall)).toFixed(4));
  const primaryTagMatches = file.classifications.filter(classification => {
    const expected = baselineScenarios(classification.candidate);
    return classification.primaryTag !== null && expected.includes(classification.primaryTag);
  }).length;
  const itemsWithPrimaryBaseline = file.classifications.filter(classification => (
    classification.primaryTag !== null && baselineScenarios(classification.candidate).length > 0
  )).length;
  return {
    evaluatedAt: now().toISOString(),
    itemsWithTagBaseline: items.length,
    microPrecision: precision,
    microRecall: recall,
    microF1: f1,
    exactTagMatches: items.filter(item => item.missingTags.length === 0 && item.extraTags.length === 0).length,
    primaryTagMatches,
    primaryTagAccuracy: ratio(primaryTagMatches, itemsWithPrimaryBaseline),
    items,
    note: 'This compares Jev suggestions with a human baseline. It measures agreement, not objective truth; disagreements require editorial review.'
  };
};
