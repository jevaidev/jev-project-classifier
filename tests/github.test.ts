import assert from 'node:assert/strict';
import test from 'node:test';
import {assertRepositorySlug, collectRepository} from '../src/github.js';

const repository = {
  id: 42,
  full_name: 'community/example',
  html_url: 'https://github.com/community/example',
  description: 'A Jev example',
  topics: ['jev', 'example'],
  stargazers_count: 81,
  forks_count: 4,
  language: 'TypeScript',
  license: {spdx_id: 'MIT'},
  created_at: '2026-09-01T00:00:00Z',
  pushed_at: '2026-09-20T00:00:00Z',
  archived: false,
  default_branch: 'main'
};

test('collects and normalizes repository evidence without changing Star data', async () => {
  const fetchImpl: typeof fetch = async input => {
    const url = String(input);
    if (url.endsWith('/repos/community/example')) {
      return Response.json(repository);
    }
    if (url.endsWith('/readme')) {
      return new Response('A long README about a working Jev integration.');
    }
    if (url.includes('/commits?per_page=1')) {
      return Response.json([{commit: {committer: {date: '2026-09-22T12:00:00Z'}}}]);
    }
    return new Response('not found', {status: 404});
  };
  const result = await collectRepository('community/example', {
    fetchImpl,
    now: () => new Date('2026-09-23T00:00:00Z')
  });
  assert.equal(result.id, 'github:community/example');
  assert.equal(result.content, 'A long README about a working Jev integration.');
  assert.equal(result.github?.stars, 81);
  assert.equal(result.github?.lastCommitAt, '2026-09-22T12:00:00Z');
  assert.equal(result.github?.license, 'MIT');
  assert.equal(result.collectedAt, '2026-09-23T00:00:00.000Z');
});

test('rejects malformed repository slugs before any request', () => {
  assert.throws(() => assertRepositorySlug('https://github.com/community/example'), /Invalid GitHub repository slug/);
  assert.throws(() => assertRepositorySlug('only-a-name'), /Invalid GitHub repository slug/);
});
