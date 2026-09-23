import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';
import {profiles, type Candidate, type ClassificationFile} from './types.js';

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

export const assertCandidates = (value: unknown): Candidate[] => {
  if (!Array.isArray(value)) throw new Error('Candidate input must be a JSON array.');
  for (const [index, item] of value.entries()) {
    if (!isRecord(item)
      || typeof item.id !== 'string'
      || typeof item.sourceType !== 'string'
      || typeof item.title !== 'string'
      || typeof item.sourceUrl !== 'string'
      || typeof item.collectedAt !== 'string') {
      throw new Error(`Candidate at index ${index} is missing required fields.`);
    }
  }
  return value as Candidate[];
};

export const assertClassificationFile = (value: unknown): ClassificationFile => {
  if (!isRecord(value)
    || value.schemaVersion !== 1
    || typeof value.generatedAt !== 'string'
    || typeof value.notice !== 'string'
    || !Array.isArray(value.classifications)) {
    throw new Error('Classification input is not a supported classification file.');
  }
  for (const [index, item] of value.classifications.entries()) {
    if (!isRecord(item)
      || !profiles.includes(item.profile as (typeof profiles)[number])
      || item.reviewStatus !== 'pending_human_review') {
      throw new Error(`Classification at index ${index} is invalid.`);
    }
  }
  return value as unknown as ClassificationFile;
};

export const readJson = async (path: string): Promise<unknown> => {
  const raw = await readFile(path, 'utf8');
  try {
    return JSON.parse(raw) as unknown;
  } catch (error) {
    throw new Error(`Could not parse JSON file ${path}.`, {cause: error});
  }
};

export const writeJson = async (path: string, value: unknown): Promise<void> => {
  await mkdir(dirname(path), {recursive: true});
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

export const writeText = async (path: string, value: string): Promise<void> => {
  await mkdir(dirname(path), {recursive: true});
  await writeFile(path, value.endsWith('\n') ? value : `${value}\n`, 'utf8');
};
