import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {collectRepositories, type GithubCollectorOptions} from '../github.js';
import {readLiteralArray} from '../literal-data.js';
import type {Candidate, Profile} from '../types.js';

type ProjectCatalogEntry = {
  repo: string;
  name: string;
  kind: string;
  summary: string;
  scenarios: string[];
  ranked: boolean;
};

type SystemOneEntry = {
  name: string;
  repo: string;
  base: string;
  kind: string;
  featured: boolean;
};

type UserCaseEntry = {
  id: string;
  title: string;
  summary: string;
  decision: string;
  takeaway: string;
  patterns: string[];
  scenarios: string[];
  maturity: string;
  author: string;
  published: string;
  checked: string;
  source: {platform: 'x' | 'youtube'; url: string};
};

export type JevAiDevImportOptions = GithubCollectorOptions & {limit?: number};

const assertLimit = (limit: number | undefined): number | undefined => {
  if (limit === undefined) return undefined;
  if (!Number.isInteger(limit) || limit < 1) throw new Error('Import limit must be a positive integer.');
  return limit;
};

const selectDiverse = <T>(items: T[], limit: number | undefined, labels: (item: T) => string[]): T[] => {
  if (limit === undefined || limit >= items.length) return items;
  const selected: T[] = [];
  const used = new Set<number>();
  const allLabels = [...new Set(items.flatMap(labels))];
  for (const label of allLabels) {
    const index = items.findIndex((item, itemIndex) => !used.has(itemIndex) && labels(item).includes(label));
    if (index >= 0) {
      selected.push(items[index]);
      used.add(index);
      if (selected.length === limit) return selected;
    }
  }
  for (const [index, item] of items.entries()) {
    if (!used.has(index)) selected.push(item);
    if (selected.length === limit) break;
  }
  return selected;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const stringArray = (value: unknown, field: string): string[] => {
  if (!Array.isArray(value) || !value.every(item => typeof item === 'string')) {
    throw new Error(`${field} must be an array of strings.`);
  }
  return value;
};

const projectEntry = (value: unknown): ProjectCatalogEntry => {
  if (!isRecord(value)
    || typeof value.repo !== 'string'
    || typeof value.name !== 'string'
    || typeof value.kind !== 'string'
    || typeof value.summary !== 'string'
    || typeof value.ranked !== 'boolean') {
    throw new Error('Invalid project catalog entry in jevai.dev source data.');
  }
  return {...value, scenarios: stringArray(value.scenarios, 'Project scenarios')} as ProjectCatalogEntry;
};

const systemOneEntry = (value: unknown): SystemOneEntry => {
  if (!isRecord(value)
    || typeof value.name !== 'string'
    || typeof value.repo !== 'string'
    || typeof value.base !== 'string'
    || typeof value.kind !== 'string'
    || typeof value.featured !== 'boolean') {
    throw new Error('Invalid System One entry in jevai.dev source data.');
  }
  return value as unknown as SystemOneEntry;
};

const userCaseEntry = (value: unknown): UserCaseEntry => {
  if (!isRecord(value)
    || typeof value.id !== 'string'
    || typeof value.title !== 'string'
    || typeof value.summary !== 'string'
    || typeof value.decision !== 'string'
    || typeof value.takeaway !== 'string'
    || typeof value.maturity !== 'string'
    || typeof value.author !== 'string'
    || typeof value.published !== 'string'
    || typeof value.checked !== 'string'
    || !isRecord(value.source)
    || (value.source.platform !== 'x' && value.source.platform !== 'youtube')
    || typeof value.source.url !== 'string') {
    throw new Error('Invalid User Case entry in jevai.dev source data.');
  }
  return {
    ...value,
    patterns: stringArray(value.patterns, 'User Case patterns'),
    scenarios: stringArray(value.scenarios, 'User Case scenarios'),
    source: {platform: value.source.platform, url: value.source.url}
  } as UserCaseEntry;
};

const loadProjectCandidates = async (siteRoot: string, options: JevAiDevImportOptions): Promise<Candidate[]> => {
  const raw = await readFile(join(siteRoot, 'src/data/project-catalog.json'), 'utf8');
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('jevai.dev project catalog must be an array.');
  const catalog = parsed.map(projectEntry).filter(item => item.ranked);
  const selected = selectDiverse(catalog, assertLimit(options.limit), item => item.scenarios);
  const candidates = await collectRepositories(selected.map(item => item.repo), options);
  return candidates.map((candidate, index) => ({
    ...candidate,
    metadata: {
      adapter: 'jevai.dev',
      humanBaseline: {
        name: selected[index].name,
        kind: selected[index].kind,
        summary: selected[index].summary,
        scenarios: selected[index].scenarios
      }
    }
  }));
};

const loadSystemOneCandidates = async (siteRoot: string, options: JevAiDevImportOptions): Promise<Candidate[]> => {
  const filePath = join(siteRoot, 'src/data/system-one-projects.ts');
  const entries = (await readLiteralArray(filePath, 'systemOneProjects')).map(systemOneEntry);
  const selected = selectDiverse(entries, assertLimit(options.limit), item => [item.kind]);
  const candidates = await collectRepositories(selected.map(item => item.repo), options);
  return candidates.map((candidate, index) => ({
    ...candidate,
    metadata: {
      adapter: 'jevai.dev',
      humanBaseline: {
        name: selected[index].name,
        kind: selected[index].kind,
        base: selected[index].base,
        featured: selected[index].featured
      }
    }
  }));
};

const loadUseCaseCandidates = async (siteRoot: string, options: JevAiDevImportOptions): Promise<Candidate[]> => {
  const filePath = join(siteRoot, 'src/data/user-cases.ts');
  const entries = (await readLiteralArray(filePath, 'userCaseCollection')).map(userCaseEntry);
  const selected = selectDiverse(entries, assertLimit(options.limit), item => item.scenarios);
  const collectedAt = (options.now ?? (() => new Date()))().toISOString();
  return selected.map(item => ({
    id: `jevai-use-case:${item.id}`,
    sourceType: item.source.platform === 'x' ? 'x_post' : 'youtube_video',
    title: item.title,
    sourceUrl: item.source.url,
    summary: item.summary,
    content: [
      `Observed decision: ${item.decision}`,
      `Editorial evidence note: ${item.takeaway}`,
      `Source author: ${item.author}`,
      `Maturity: ${item.maturity}`,
      `Published: ${item.published}`,
      `Last checked: ${item.checked}`
    ].join('\n'),
    metadata: {
      adapter: 'jevai.dev',
      humanBaseline: {
        scenarios: item.scenarios,
        patterns: item.patterns,
        maturity: item.maturity
      }
    },
    collectedAt
  }));
};

/** Maintainer adapter for a local checkout of the jevai.dev site source. */
export const loadJevAiDevCandidates = async (
  siteRoot: string,
  profile: Profile,
  options: JevAiDevImportOptions = {}
): Promise<Candidate[]> => {
  if (profile === 'project') return loadProjectCandidates(siteRoot, options);
  if (profile === 'system-one') return loadSystemOneCandidates(siteRoot, options);
  return loadUseCaseCandidates(siteRoot, options);
};
