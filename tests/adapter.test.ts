import assert from 'node:assert/strict';
import {access, mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {loadJevAiDevCandidates} from '../src/adapters/jevai-dev.js';

const missing = async (path: string): Promise<boolean> => {
  try {
    await access(path);
    return false;
  } catch {
    return true;
  }
};

test('site adapter parses TypeScript data without executing source code', async () => {
  const root = await mkdtemp(join(tmpdir(), 'jev-classifier-adapter-'));
  const dataDirectory = join(root, 'src/data');
  const sentinel = join(root, 'executed.txt');
  await mkdir(dataDirectory, {recursive: true});
  await writeFile(join(dataDirectory, 'system-one-projects.ts'), `
    import {writeFileSync} from 'node:fs';
    writeFileSync(${JSON.stringify(sentinel)}, 'should not run');
    export const systemOneProjects = [{
      name: 'Example',
      repo: 'community/example',
      base: 'Example Base',
      kind: 'model',
      featured: true
    }];
  `, 'utf8');

  const repository = {
    id: 42,
    full_name: 'community/example',
    html_url: 'https://github.com/community/example',
    description: 'A safe fixture',
    topics: ['jev'],
    stargazers_count: 10,
    forks_count: 1,
    language: 'TypeScript',
    license: {spdx_id: 'MIT'},
    created_at: '2026-09-01T00:00:00Z',
    pushed_at: '2026-09-20T00:00:00Z',
    archived: false,
    default_branch: 'main'
  };
  const fetchImpl: typeof fetch = async input => {
    const url = String(input);
    if (url.endsWith('/repos/community/example')) return Response.json(repository);
    if (url.endsWith('/readme')) return new Response('README');
    if (url.includes('/commits?per_page=1')) return Response.json([]);
    return new Response('not found', {status: 404});
  };

  try {
    const candidates = await loadJevAiDevCandidates(root, 'system-one', {fetchImpl});
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].title, 'community/example');
    assert.equal(await missing(sentinel), true);
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('site adapter reads the literal User Case collection without evaluating computed exports', async () => {
  const root = await mkdtemp(join(tmpdir(), 'jev-classifier-use-case-'));
  const dataDirectory = join(root, 'src/data');
  await mkdir(dataDirectory, {recursive: true});
  await writeFile(join(dataDirectory, 'user-cases.ts'), `
    const userCaseCollection: unknown[] = [{
      id: 'example',
      title: 'Example use case',
      summary: 'Summary',
      decision: 'Which action?',
      takeaway: 'Review the result.',
      patterns: ['Choice'],
      scenarios: ['agents'],
      maturity: 'Prototype',
      author: 'Example',
      published: '2026-09-23',
      checked: '2026-09-23',
      source: {platform: 'x', url: 'https://x.com/example/status/1'}
    }];
    export const userCases = userCaseCollection.map(() => { throw new Error('must not execute'); });
  `, 'utf8');
  try {
    const candidates = await loadJevAiDevCandidates(root, 'use-case');
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].id, 'jevai-use-case:example');
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('literal importer blocks prototype property names', async () => {
  const root = await mkdtemp(join(tmpdir(), 'jev-classifier-prototype-'));
  const dataDirectory = join(root, 'src/data');
  await mkdir(dataDirectory, {recursive: true});
  await writeFile(join(dataDirectory, 'system-one-projects.ts'), `
    export const systemOneProjects = [{
      '__proto__': {repo: 'attacker/repository'},
      name: 'Example', base: 'Base', kind: 'model', featured: true
    }];
  `, 'utf8');
  try {
    await assert.rejects(
      loadJevAiDevCandidates(root, 'system-one'),
      /Blocked property name/
    );
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});
