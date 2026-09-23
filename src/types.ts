import type {EntryType, Questions, SystemOneResult} from '@typesafe-ai/sdk';

export const profiles = ['project', 'system-one', 'use-case'] as const;
export type Profile = (typeof profiles)[number];

export type GithubMetadata = {
  githubId: number;
  fullName: string;
  htmlUrl: string;
  description: string | null;
  topics: string[];
  stars: number;
  forks: number;
  language: string | null;
  license: string | null;
  createdAt: string;
  lastCommitAt: string;
  pushedAt: string;
  archived: boolean;
  defaultBranch: string;
};

export type Candidate = {
  id: string;
  sourceType: 'github_repository' | 'x_post' | 'youtube_video' | 'web_page' | 'manual';
  title: string;
  sourceUrl: string;
  summary?: string;
  content?: string;
  github?: GithubMetadata;
  metadata?: Record<string, unknown>;
  collectedAt: string;
};

export type DecisionRequest = {
  state: EntryType;
  questions: Questions;
  model?: string;
};

export type DecisionRunner = (request: DecisionRequest) => Promise<SystemOneResult<Questions>>;

export type NormalizedAnswer =
  | {type: 'choice'; choice: string; confidence: number; probabilities: Record<string, number>}
  | {type: 'score'; score: number; confidence: number; probabilities: Record<string, number>}
  | {type: 'noul'; probabilityYes: number};

export type Classification = {
  schemaVersion: 1;
  profile: Profile;
  candidate: Candidate;
  starRank: number | null;
  model: string;
  answers: Record<string, NormalizedAnswer>;
  primaryTag: string | null;
  suggestedTags: string[];
  secondaryTagCandidates: Array<{tag: string; probability: number}>;
  reviewFlags: string[];
  recommendation: 'ready_for_human_review' | 'needs_careful_review' | 'likely_unrelated';
  reviewStatus: 'pending_human_review';
  classifiedAt: string;
  rubricVersion: string;
  usage: {inputTokens: number; outputTokens: number};
};

export type ClassificationFile = {
  schemaVersion: 1;
  generatedAt: string;
  notice: string;
  classifications: Classification[];
};
