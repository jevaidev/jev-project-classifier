import {DEFAULT_README_LIMIT, DEFAULT_SEARCH_LIMIT, githubHeaders} from './config.js';
import type {Candidate, GithubMetadata} from './types.js';

type FetchLike = typeof fetch;

type GithubRepositoryResponse = {
  id: number;
  full_name: string;
  html_url: string;
  description: string | null;
  topics?: string[];
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  license: {spdx_id?: string | null} | null;
  created_at: string;
  pushed_at: string;
  archived: boolean;
  default_branch: string;
};

type GithubCommitResponse = Array<{
  commit?: {committer?: {date?: string | null} | null};
}>;

type GithubSearchResponse = {items?: GithubRepositoryResponse[]};

export type GithubCollectorOptions = {
  fetchImpl?: FetchLike;
  readmeLimit?: number;
  now?: () => Date;
};

const apiRoot = 'https://api.github.com';
const repoPattern = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

export const assertRepositorySlug = (repository: string): string => {
  const normalized = repository.trim();
  if (!repoPattern.test(normalized)) {
    throw new Error(`Invalid GitHub repository slug: ${repository}. Expected owner/repository.`);
  }
  return normalized;
};

const githubJson = async <T>(url: string, fetchImpl: FetchLike): Promise<T> => {
  const response = await fetchImpl(url, {headers: githubHeaders()});
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`GitHub API request failed with HTTP ${response.status} for ${url}.`);
  }
  return response.json() as Promise<T>;
};

const readReadme = async (
  repository: string,
  fetchImpl: FetchLike,
  readmeLimit: number
): Promise<string> => {
  const response = await fetchImpl(`${apiRoot}/repos/${repository}/readme`, {
    headers: {...githubHeaders(), Accept: 'application/vnd.github.raw+json'}
  });
  if (response.status === 404) return '';
  if (!response.ok) {
    throw new Error(`GitHub README request failed (${response.status}) for ${repository}.`);
  }
  return (await response.text()).slice(0, readmeLimit);
};

const readLastCommitAt = async (
  repository: string,
  fallback: string,
  fetchImpl: FetchLike
): Promise<string> => {
  const response = await fetchImpl(`${apiRoot}/repos/${repository}/commits?per_page=1`, {
    headers: githubHeaders()
  });
  if (response.status === 409 || response.status === 404) return fallback;
  if (!response.ok) {
    throw new Error(`GitHub commits request failed (${response.status}) for ${repository}.`);
  }
  const commits = await response.json() as GithubCommitResponse;
  return commits[0]?.commit?.committer?.date ?? fallback;
};

const normalizeLicense = (repository: GithubRepositoryResponse): string | null => {
  const license = repository.license?.spdx_id?.trim();
  return license && license !== 'NOASSERTION' ? license : null;
};

const toCandidate = async (
  repository: GithubRepositoryResponse,
  options: Required<Pick<GithubCollectorOptions, 'fetchImpl' | 'readmeLimit' | 'now'>>
): Promise<Candidate> => {
  const [content, lastCommitAt] = await Promise.all([
    readReadme(repository.full_name, options.fetchImpl, options.readmeLimit),
    readLastCommitAt(repository.full_name, repository.pushed_at, options.fetchImpl)
  ]);
  const github: GithubMetadata = {
    githubId: repository.id,
    fullName: repository.full_name,
    htmlUrl: repository.html_url,
    description: repository.description,
    topics: repository.topics ?? [],
    stars: repository.stargazers_count,
    forks: repository.forks_count,
    language: repository.language,
    license: normalizeLicense(repository),
    createdAt: repository.created_at,
    lastCommitAt,
    pushedAt: repository.pushed_at,
    archived: repository.archived,
    defaultBranch: repository.default_branch
  };
  return {
    id: `github:${repository.full_name.toLowerCase()}`,
    sourceType: 'github_repository',
    title: repository.full_name,
    sourceUrl: repository.html_url,
    summary: repository.description ?? undefined,
    content: content || undefined,
    github,
    collectedAt: options.now().toISOString()
  };
};

const resolvedOptions = (options: GithubCollectorOptions = {}) => ({
  fetchImpl: options.fetchImpl ?? fetch,
  readmeLimit: options.readmeLimit ?? DEFAULT_README_LIMIT,
  now: options.now ?? (() => new Date())
});

export const collectRepository = async (
  repository: string,
  options: GithubCollectorOptions = {}
): Promise<Candidate> => {
  const slug = assertRepositorySlug(repository);
  const resolved = resolvedOptions(options);
  const data = await githubJson<GithubRepositoryResponse>(
    `${apiRoot}/repos/${slug}`,
    resolved.fetchImpl
  );
  return toCandidate(data, resolved);
};

export const collectRepositories = async (
  repositories: string[],
  options: GithubCollectorOptions = {}
): Promise<Candidate[]> => {
  const results: Candidate[] = [];
  for (const repository of repositories) {
    results.push(await collectRepository(repository, options));
  }
  return results;
};

export const discoverRepositories = async (
  query: string,
  limit = DEFAULT_SEARCH_LIMIT,
  options: GithubCollectorOptions = {}
): Promise<Candidate[]> => {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) throw new Error('GitHub search query cannot be empty.');
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error('GitHub search limit must be an integer from 1 to 100.');
  }
  const resolved = resolvedOptions(options);
  const url = `${apiRoot}/search/repositories?q=${encodeURIComponent(normalizedQuery)}&per_page=${limit}`;
  const search = await githubJson<GithubSearchResponse>(url, resolved.fetchImpl);
  const candidates: Candidate[] = [];
  for (const repository of (search.items ?? []).slice(0, limit)) {
    candidates.push(await toCandidate(repository, resolved));
  }
  return candidates;
};
