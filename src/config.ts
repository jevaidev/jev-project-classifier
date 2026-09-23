export const DEFAULT_README_LIMIT = 12_000;
export const DEFAULT_SEARCH_LIMIT = 20;
export const DEFAULT_TAG_THRESHOLD = 0.55;
export const DEFAULT_REVIEW_FLAG_THRESHOLD = 0.65;
export const DEFAULT_RELATIONSHIP_REJECT_THRESHOLD = 0.85;
export const RUBRIC_VERSION = '2026-09-23.1';

export const githubHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'jev-project-classifier',
    'X-GitHub-Api-Version': '2022-11-28'
  };
  if (process.env.GITHUB_TOKEN?.trim()) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN.trim()}`;
  return headers;
};
