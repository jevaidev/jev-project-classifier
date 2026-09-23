import assert from 'node:assert/strict';
import test from 'node:test';
import {evaluateBaseline} from '../src/evaluate.js';
import type {ClassificationFile} from '../src/types.js';

test('evaluates Jev suggestions against hidden human scenario labels', () => {
  const file = {
    schemaVersion: 1,
    generatedAt: '2026-09-23T00:00:00Z',
    notice: 'pending human review',
    classifications: [
      {
        schemaVersion: 1,
        profile: 'project',
        candidate: {
          id: 'github:example/tool',
          sourceType: 'github_repository',
          title: 'example/tool',
          sourceUrl: 'https://github.com/example/tool',
          collectedAt: '2026-09-23T00:00:00Z',
          metadata: {humanBaseline: {scenarios: ['agents', 'engineering']}}
        },
        starRank: 1,
        model: 'jev-test',
        answers: {},
        primaryTag: 'agents',
        suggestedTags: ['agents', 'safety'],
        secondaryTagCandidates: [{tag: 'safety', probability: 0.7}],
        reviewFlags: [],
        recommendation: 'needs_careful_review',
        reviewStatus: 'pending_human_review',
        classifiedAt: '2026-09-23T00:00:00Z',
        rubricVersion: 'test',
        usage: {inputTokens: 1, outputTokens: 1}
      }
    ]
  } satisfies ClassificationFile;
  const evaluation = evaluateBaseline(file, () => new Date('2026-09-23T01:00:00Z'));
  assert.equal(evaluation.itemsWithTagBaseline, 1);
  assert.equal(evaluation.microPrecision, 0.5);
  assert.equal(evaluation.microRecall, 0.5);
  assert.equal(evaluation.microF1, 0.5);
  assert.equal(evaluation.primaryTagAccuracy, 1);
  assert.deepEqual(evaluation.items[0].missingTags, ['engineering']);
  assert.deepEqual(evaluation.items[0].extraTags, ['safety']);
});
