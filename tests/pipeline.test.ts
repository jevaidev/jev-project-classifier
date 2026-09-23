import assert from 'node:assert/strict';
import test from 'node:test';
import type {Questions, SystemOneResult} from '@typesafe-ai/sdk';
import {classifyCandidate} from '../src/jev.js';
import {classifyCandidates, rankByGithubStars, renderReviewMarkdown} from '../src/pipeline.js';
import type {Candidate, DecisionRunner} from '../src/types.js';

const candidate = (name: string, stars: number): Candidate => ({
  id: `github:${name.toLowerCase()}`,
  sourceType: 'github_repository',
  title: name,
  sourceUrl: `https://github.com/${name}`,
  collectedAt: '2026-09-23T00:00:00Z',
  github: {
    githubId: stars,
    fullName: name,
    htmlUrl: `https://github.com/${name}`,
    description: null,
    topics: [],
    stars,
    forks: 0,
    language: null,
    license: null,
    createdAt: '2026-09-01T00:00:00Z',
    lastCommitAt: '2026-09-22T00:00:00Z',
    pushedAt: '2026-09-22T00:00:00Z',
    archived: false,
    defaultBranch: 'main'
  }
});

const result = (answers: Record<string, unknown>): SystemOneResult<Questions> => ({
  model: 'jev-test',
  answers,
  usage: {input_tokens: 10, output_tokens: 5}
} as unknown as SystemOneResult<Questions>);

test('Star order is deterministic and independent from Jev output', async () => {
  const input = [candidate('z/low', 3), candidate('a/high', 100), candidate('b/high', 100)];
  assert.deepEqual(rankByGithubStars(input).map(item => item.title), ['a/high', 'b/high', 'z/low']);

  const runner: DecisionRunner = async () => result({
    relationship: {type: 'choice', choice: 'uses_jev', confidence: 0.9, probabilities: {uses_jev: 0.9, unrelated: 0.1}},
    evidence_quality: {type: 'score', score: 3, confidence: 0.8, legend: {}, probabilities: {'3': 1}},
    tag_engineering: {type: 'noul', noul: 0.8},
    needs_license_review: {type: 'noul', noul: 0.2}
  });
  const file = await classifyCandidates(input, 'project', runner, {now: () => new Date('2026-09-23T00:00:00Z')});
  assert.deepEqual(file.classifications.map(item => item.candidate.title), ['a/high', 'b/high', 'z/low']);
  assert.deepEqual(file.classifications.map(item => item.starRank), [1, 2, 3]);
  assert.ok(file.classifications.every(item => item.reviewStatus === 'pending_human_review'));
  assert.ok(file.notice.includes('not automatically published'));
});

test('extracts tags and review flags while keeping the decision pending', async () => {
  const runner: DecisionRunner = async () => result({
    relationship: {type: 'choice', choice: 'uses_jev', confidence: 0.8, probabilities: {uses_jev: 0.7, unrelated: 0.3}},
    evidence_quality: {type: 'score', score: 2.6, confidence: 0.7, legend: {}, probabilities: {'2': 0.4, '3': 0.6}},
    tag_support: {type: 'noul', noul: 0.72},
    tag_games: {type: 'noul', noul: 0.2},
    needs_claim_review: {type: 'noul', noul: 0.9}
  });
  const classification = await classifyCandidate(candidate('community/tool', 12), 'project', runner);
  assert.deepEqual(classification.suggestedTags, ['support']);
  assert.equal(classification.primaryTag, null);
  assert.deepEqual(classification.reviewFlags, ['claim_review']);
  assert.equal(classification.recommendation, 'needs_careful_review');
  assert.equal(classification.reviewStatus, 'pending_human_review');
});

test('only sends a confident unrelated result to the likely-unrelated queue', async () => {
  const runner: DecisionRunner = async () => result({
    relationship: {type: 'choice', choice: 'unrelated', confidence: 0.95, probabilities: {unrelated: 0.92}},
    evidence_quality: {type: 'score', score: 0.4, confidence: 0.9, legend: {}, probabilities: {'0': 0.8}}
  });
  const classification = await classifyCandidate(candidate('misc/tool', 50), 'project', runner);
  assert.equal(classification.recommendation, 'likely_unrelated');
  assert.equal(classification.reviewStatus, 'pending_human_review');
});

test('renders a human review checklist rather than publication output', async () => {
  const runner: DecisionRunner = async () => result({
    relationship: {type: 'choice', choice: 'uses_jev', confidence: 0.9, probabilities: {uses_jev: 0.9}},
    evidence_quality: {type: 'score', score: 3, confidence: 0.9, legend: {}, probabilities: {'3': 1}}
  });
  const file = await classifyCandidates([candidate('community/tool', 12)], 'project', runner);
  const markdown = renderReviewMarkdown(file);
  assert.match(markdown, /Human review checklist/);
  assert.match(markdown, /\[ \] Verify the source/);
  assert.match(markdown, /pending human review/i);
});
