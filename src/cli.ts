#!/usr/bin/env node
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {DEFAULT_SEARCH_LIMIT} from './config.js';
import {collectRepositories, discoverRepositories} from './github.js';
import {assertCandidates, assertClassificationFile, readJson, writeJson, writeText} from './io.js';
import {createConfiguredRunner} from './jev.js';
import {classifyCandidates, rankByGithubStars, rederiveClassificationFile, renderReviewMarkdown} from './pipeline.js';
import {loadJevAiDevCandidates} from './adapters/jevai-dev.js';
import {evaluateBaseline} from './evaluate.js';
import {profiles, type Profile} from './types.js';

type ParsedArgs = {command?: string; values: Map<string, string[]>; flags: Set<string>};

const help = `jev-project-classifier

Jev classifies and suggests tags. GitHub Stars provide the deterministic ranking.
Every decision remains pending human review. This CLI never publishes or pushes content.

Commands:
  collect    Fetch named GitHub repositories and their README files
  discover   Search GitHub, then collect matching repositories
  rank-stars Sort collected GitHub repositories by current Star count
  classify   Ask Jev to classify and tag candidates using a review rubric
  review     Render a Markdown review queue from classification JSON
  import-jevai-dev  Maintainer adapter: import a local jevai.dev source checkout
  evaluate         Compare suggested tags with a human baseline
  rederive   Rebuild tag signals from saved Jev answers without another API call

Examples:
  npm run cli -- collect --repo typesafe-ai/typesafe-sdk-js --output data/candidates.json
  npm run cli -- discover --query "jev in:name,description,readme" --limit 20 --output data/candidates.json
  npm run cli -- rank-stars --input data/candidates.json --output data/ranked.json
  npm run cli -- classify --profile project --input data/candidates.json --output data/decisions.json
  npm run cli -- review --input data/decisions.json --output data/review.md
  npm run cli -- import-jevai-dev --site-root ../jevai --profile use-case --limit 5 --output data/pilot-use-cases.json
  npm run cli -- evaluate --input data/decisions.json --output data/evaluation.json
  npm run cli -- rederive --input data/decisions.json --output data/decisions-v2.json

Required environment for classify:
  OPENROUTER_API_KEY with JEV_PROVIDER=openrouter, or TYPESAFE_API_KEY

Optional environment:
  OPENROUTER_JEV_MODEL, TYPESAFE_BASE_URL, TYPESAFE_DEFAULT_MODEL, GITHUB_TOKEN
`;

const parseArgs = (argv: string[]): ParsedArgs => {
  const [command, ...rest] = argv;
  const parsed: ParsedArgs = {command, values: new Map(), flags: new Set()};
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith('--')) throw new Error(`Unexpected argument: ${token}`);
    const key = token.slice(2);
    const next = rest[index + 1];
    if (!next || next.startsWith('--')) {
      parsed.flags.add(key);
      continue;
    }
    parsed.values.set(key, [...(parsed.values.get(key) ?? []), next]);
    index += 1;
  }
  return parsed;
};

const one = (args: ParsedArgs, name: string, required = true): string | undefined => {
  const values = args.values.get(name) ?? [];
  if (values.length > 1) throw new Error(`--${name} may only be provided once.`);
  if (required && values.length === 0) throw new Error(`Missing required option --${name}.`);
  return values[0];
};

const many = (args: ParsedArgs, name: string): string[] => args.values.get(name) ?? [];

const numberOption = (args: ParsedArgs, name: string, fallback: number): number => {
  const raw = one(args, name, false);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`--${name} must be a number.`);
  return value;
};

const probabilityOption = (args: ParsedArgs, name: string, fallback: number): number => {
  const value = numberOption(args, name, fallback);
  if (value < 0 || value > 1) throw new Error(`--${name} must be between 0 and 1.`);
  return value;
};

const outputMessage = (path: string, count?: number): void => {
  const suffix = count === undefined ? '' : ` (${count} items)`;
  process.stdout.write(`Wrote ${path}${suffix}\n`);
};

const main = async (): Promise<void> => {
  if (existsSync(resolve('.env'))) process.loadEnvFile(resolve('.env'));
  const args = parseArgs(process.argv.slice(2));
  if (!args.command || args.command === 'help' || args.flags.has('help')) {
    process.stdout.write(help);
    return;
  }

  if (args.command === 'collect') {
    const repositories = many(args, 'repo');
    if (repositories.length === 0) throw new Error('Provide at least one --repo owner/repository.');
    const output = resolve(one(args, 'output')!);
    const candidates = await collectRepositories(repositories);
    await writeJson(output, candidates);
    outputMessage(output, candidates.length);
    return;
  }

  if (args.command === 'discover') {
    const query = one(args, 'query')!;
    const limit = numberOption(args, 'limit', DEFAULT_SEARCH_LIMIT);
    const output = resolve(one(args, 'output')!);
    const candidates = await discoverRepositories(query, limit);
    await writeJson(output, candidates);
    outputMessage(output, candidates.length);
    return;
  }

  if (args.command === 'rank-stars') {
    const input = resolve(one(args, 'input')!);
    const output = resolve(one(args, 'output')!);
    const candidates = assertCandidates(await readJson(input));
    const ranked = rankByGithubStars(candidates);
    await writeJson(output, ranked);
    outputMessage(output, ranked.length);
    return;
  }

  if (args.command === 'classify') {
    const profileValue = one(args, 'profile')!;
    if (!profiles.includes(profileValue as Profile)) {
      throw new Error(`--profile must be one of: ${profiles.join(', ')}.`);
    }
    const input = resolve(one(args, 'input')!);
    const output = resolve(one(args, 'output')!);
    const candidates = assertCandidates(await readJson(input));
    const file = await classifyCandidates(candidates, profileValue as Profile, createConfiguredRunner(), {
      model: one(args, 'model', false),
      tagThreshold: probabilityOption(args, 'tag-threshold', 0.55),
      reviewFlagThreshold: probabilityOption(args, 'review-threshold', 0.65),
      relationshipRejectThreshold: probabilityOption(args, 'reject-threshold', 0.85)
    });
    await writeJson(output, file);
    outputMessage(output, file.classifications.length);
    return;
  }

  if (args.command === 'review') {
    const input = resolve(one(args, 'input')!);
    const output = resolve(one(args, 'output')!);
    const file = assertClassificationFile(await readJson(input));
    await writeText(output, renderReviewMarkdown(file));
    outputMessage(output, file.classifications.length);
    return;
  }

  if (args.command === 'import-jevai-dev') {
    const profileValue = one(args, 'profile')!;
    if (!profiles.includes(profileValue as Profile)) {
      throw new Error(`--profile must be one of: ${profiles.join(', ')}.`);
    }
    const siteRoot = resolve(one(args, 'site-root')!);
    const output = resolve(one(args, 'output')!);
    const rawLimit = one(args, 'limit', false);
    const limit = rawLimit === undefined ? undefined : numberOption(args, 'limit', 0);
    const candidates = await loadJevAiDevCandidates(siteRoot, profileValue as Profile, {limit});
    await writeJson(output, candidates);
    outputMessage(output, candidates.length);
    return;
  }

  if (args.command === 'evaluate') {
    const input = resolve(one(args, 'input')!);
    const output = resolve(one(args, 'output')!);
    const file = assertClassificationFile(await readJson(input));
    const evaluation = evaluateBaseline(file);
    await writeJson(output, evaluation);
    outputMessage(output, evaluation.itemsWithTagBaseline);
    return;
  }

  if (args.command === 'rederive') {
    const input = resolve(one(args, 'input')!);
    const output = resolve(one(args, 'output')!);
    const file = assertClassificationFile(await readJson(input));
    const tagThreshold = probabilityOption(args, 'tag-threshold', 0.55);
    const updated = rederiveClassificationFile(file, tagThreshold);
    await writeJson(output, updated);
    outputMessage(output, updated.classifications.length);
    return;
  }

  throw new Error(`Unknown command: ${args.command}. Run “npm run cli -- help”.`);
};

main().catch(error => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Error: ${message}\n`);
  process.exitCode = 1;
});
