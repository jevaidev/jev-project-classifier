import {classifyCandidate, deriveTagSignals, type ClassificationOptions} from './jev.js';
import type {Candidate, Classification, ClassificationFile, DecisionRunner, Profile} from './types.js';

export const rankByGithubStars = (candidates: Candidate[]): Candidate[] => [...candidates].sort((left, right) => {
  const starDifference = (right.github?.stars ?? -1) - (left.github?.stars ?? -1);
  if (starDifference !== 0) return starDifference;
  return left.title.localeCompare(right.title, 'en');
});

export const classifyCandidates = async (
  candidates: Candidate[],
  profile: Profile,
  runner: DecisionRunner,
  options: ClassificationOptions = {}
): Promise<ClassificationFile> => {
  const ranked = rankByGithubStars(candidates);
  const classifications: Classification[] = [];
  for (const [index, candidate] of ranked.entries()) {
    classifications.push(await classifyCandidate(candidate, profile, runner, {
      ...options,
      starRank: candidate.github ? index + 1 : null
    }));
  }
  return {
    schemaVersion: 1,
    generatedAt: (options.now ?? (() => new Date()))().toISOString(),
    notice: 'Jev suggestions only. Every item remains pending human review; this file is not automatically published.',
    classifications
  };
};

export const rederiveClassificationFile = (
  file: ClassificationFile,
  tagThreshold?: number,
  now: () => Date = () => new Date()
): ClassificationFile => ({
  ...file,
  generatedAt: now().toISOString(),
  classifications: file.classifications.map(classification => ({
    ...classification,
    ...deriveTagSignals(classification.answers, classification.profile, tagThreshold)
  }))
});

const tableText = (value: string): string => value
  .replaceAll('\\', '\\\\')
  .replaceAll('|', '\\|')
  .replaceAll('[', '\\[')
  .replaceAll(']', '\\]')
  .replaceAll('\n', ' ');

export const renderReviewMarkdown = (file: ClassificationFile): string => {
  const rows = file.classifications.map(item => {
    const relationship = item.answers.relationship;
    const relationText = relationship?.type === 'choice' ? relationship.choice : 'unknown';
    const stars = item.candidate.github?.stars?.toLocaleString('en-US') ?? '—';
    const secondary = item.secondaryTagCandidates
      .map(candidate => `${candidate.tag} (${candidate.probability.toFixed(2)})`)
      .join(', ');
    return `| [${tableText(item.candidate.title)}](<${item.candidate.sourceUrl.replaceAll('>', '%3E')}>) | ${stars} | ${item.starRank ?? '—'} | ${relationText} | ${item.primaryTag ?? '—'} | ${secondary || '—'} | ${item.reviewFlags.join(', ') || '—'} | ${item.recommendation} |`;
  });
  const checks = file.classifications.map(item => [
    `### ${item.candidate.title}`,
    '',
    `- [ ] Verify the source and relationship classification.`,
    `- [ ] Check licensing, identity, and material claims when flagged.`,
    `- [ ] Accept or edit primary tag: ${item.primaryTag ?? 'none'}.`,
    `- [ ] Review secondary tag candidates: ${item.secondaryTagCandidates.map(candidate => `${candidate.tag} (${candidate.probability.toFixed(2)})`).join(', ') || 'none'}.`,
    `- Source: ${item.candidate.sourceUrl}`,
    ''
  ].join('\n'));
  return [
    '# Jev classification review queue',
    '',
    `Generated: ${file.generatedAt}`,
    '',
    `> ${file.notice}`,
    '',
    '| Candidate | Stars | Star rank | Jev relationship | Primary tag | Secondary candidates | Review flags | Recommendation |',
    '| --- | ---: | ---: | --- | --- | --- | --- | --- |',
    ...rows,
    '',
    '## Human review checklist',
    '',
    ...checks
  ].join('\n');
};
