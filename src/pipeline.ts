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

const markdownText = (value: string): string => value
  .replaceAll('\\', '\\\\')
  .replaceAll('\r', ' ')
  .replaceAll('\n', ' ')
  .replaceAll('&', '&amp;')
  .replaceAll('`', '\\`')
  .replaceAll('*', '\\*')
  .replaceAll('_', '\\_')
  .replaceAll('|', '\\|')
  .replaceAll('[', '\\[')
  .replaceAll(']', '\\]')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');

const safeHttpUrl = (value: string): string | null => {
  try {
    const url = new URL(value);
    if ((url.protocol !== 'https:' && url.protocol !== 'http:') || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
};

export const renderReviewMarkdown = (file: ClassificationFile): string => {
  const rows = file.classifications.map(item => {
    const relationship = item.answers.relationship;
    const relationText = relationship?.type === 'choice' ? relationship.choice : 'unknown';
    const stars = item.candidate.github?.stars?.toLocaleString('en-US') ?? '—';
    const secondary = item.secondaryTagCandidates
      .map(candidate => `${candidate.tag} (${candidate.probability.toFixed(2)})`)
      .join(', ');
    const sourceUrl = safeHttpUrl(item.candidate.sourceUrl);
    const title = markdownText(item.candidate.title);
    const candidateCell = sourceUrl ? `[${title}](<${sourceUrl}>)` : `${title} (invalid source URL)`;
    return `| ${candidateCell} | ${stars} | ${item.starRank ?? '—'} | ${markdownText(relationText)} | ${markdownText(item.primaryTag ?? '—')} | ${markdownText(secondary || '—')} | ${markdownText(item.reviewFlags.join(', ') || '—')} | ${markdownText(item.recommendation)} |`;
  });
  const checks = file.classifications.map(item => {
    const sourceUrl = safeHttpUrl(item.candidate.sourceUrl);
    const source = sourceUrl ? `[${markdownText(sourceUrl)}](<${sourceUrl}>)` : 'Invalid source URL — verify manually.';
    return [
      `### ${markdownText(item.candidate.title)}`,
      '',
      `- [ ] Verify the source and relationship classification.`,
      `- [ ] Check licensing, identity, and material claims when flagged.`,
      `- [ ] Accept or edit primary tag: ${markdownText(item.primaryTag ?? 'none')}.`,
      `- [ ] Review secondary tag candidates: ${markdownText(item.secondaryTagCandidates.map(candidate => `${candidate.tag} (${candidate.probability.toFixed(2)})`).join(', ') || 'none')}.`,
      `- Source: ${source}`,
      ''
    ].join('\n');
  });
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
