import assert from 'node:assert/strict';
import test from 'node:test';
import {rubrics} from '../src/rubrics.js';

test('defines separate versioned rubrics for all editorial profiles', () => {
  assert.deepEqual(Object.keys(rubrics), ['project', 'system-one', 'use-case']);
  for (const rubric of Object.values(rubrics)) {
    assert.match(rubric.version, /2026-09-23/);
    assert.ok(Object.keys(rubric.questions).length >= 10);
    assert.equal(rubric.questions.relationship.type, 'choice');
  }
});

test('project rubric separates classification, evidence, tags, and review flags', () => {
  const questions = rubrics.project.questions;
  assert.equal(questions.primary_category.type, 'choice');
  assert.equal(questions.evidence_quality.type, 'score');
  assert.equal(questions.tag_engineering.type, 'noul');
  assert.equal(questions.needs_license_review.type, 'noul');
  assert.equal(questions.needs_identity_review.type, 'noul');
});
