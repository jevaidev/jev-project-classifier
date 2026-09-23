# Jev Project Classifier

**Jev classifies. GitHub Stars rank. Humans decide what gets published.**

This is an independent community tool for classifying Jev-related GitHub projects, System One ecosystem work, and real-world use cases. It supports the OpenRouter Jev Decisions API used by [Jev AI Dev](https://jevai.dev/) and TypeSafe's official [`@typesafe-ai/sdk`](https://github.com/typesafe-ai/typesafe-sdk-js).

GitHub Star ranking is deliberately simple and reproducible: current Star count in descending order. Jev does not score project popularity or decide the final list order.

This project is not an official TypeSafe AI release. Official Jev information is available at [typesafe.ai](https://typesafe.ai/).

## What the first version does

- Collects named repositories or GitHub search results, README text, metadata, current Stars, and latest commit time.
- Applies one of three versioned Jev rubrics: `project`, `system-one`, or `use-case`.
- Produces structured JSON with suggested tags and explicit review flags.
- Produces a Markdown checklist for maintainers.
- Marks every result `pending_human_review`.

The CLI does not publish, commit, push, open pull requests, edit Jev AI Radar, or update a website.

## Validated on a real editorial workflow

On September 23, 2026, Jev AI Dev ran this tool against 15 items from its live Projects, System One, and User Cases collections. Across the 10 Project and User Case items with scenario baselines, Jev's primary category matched one of the existing human labels in 10 of 10 cases. The sample is small and does not establish general accuracy. See [the validation note](docs/validation.md) for the method, findings, and limitations.

The repository includes a maintainer adapter for a local checkout of the jevai.dev source. Other users can provide the same optional `metadata.humanBaseline.scenarios` field in their own candidate JSON and run the generic `evaluate` command.

```bash
npm run cli -- import-jevai-dev \
  --site-root ../jevai \
  --profile project \
  --limit 5 \
  --output data/pilot-projects.json
```

For `project` and `system-one`, the pilot fetches current repository evidence from GitHub. For `use-case`, it imports the source URL and the evidence notes currently used by the live page. After classification, compare suggested scenario tags with the current human labels:

```bash
npm run cli -- evaluate \
  --input data/pilot-decisions.json \
  --output data/pilot-evaluation.json
```

The evaluation reports primary-category agreement, precision, recall, exact matches, missing tags, and extra tags. Agreement is a workflow signal rather than proof that either label set is correct; a maintainer reviews every disagreement.

## Setup

Requires Node.js 20 or newer.

```bash
npm install
cp .env.example .env
```

The default local configuration uses the same OpenRouter route as jevai.dev: `OPENROUTER_API_KEY` with model `typesafe/jev-1.13`. Set `JEV_PROVIDER=typesafe` and `TYPESAFE_API_KEY` only when using TypeSafe's direct API. `GITHUB_TOKEN` is optional but raises GitHub API rate limits. The tool never writes any key to its output.

The CLI loads a local `.env` automatically. That file is excluded by `.gitignore`.

## Workflow

### 1. Collect known repositories

```bash
npm run cli -- collect \
  --repo typesafe-ai/typesafe-sdk-js \
  --output data/candidates.json
```

Or discover candidates from a GitHub query:

```bash
npm run cli -- discover \
  --query "jev in:name,description,readme" \
  --limit 20 \
  --output data/candidates.json
```

Discovery is candidate generation, not inclusion. Search results still require Jev classification and human review.

### 2. Create a deterministic Star ranking

```bash
npm run cli -- rank-stars \
  --input data/candidates.json \
  --output data/ranked.json
```

### 3. Classify and tag with Jev

```bash
npm run cli -- classify \
  --profile project \
  --input data/candidates.json \
  --output data/decisions.json
```

For community models or use cases, choose `--profile system-one` or `--profile use-case`. Use-case candidates can begin with [`examples/use-cases.json`](examples/use-cases.json).

### 4. Review before any publication

```bash
npm run cli -- review \
  --input data/decisions.json \
  --output data/review.md
```

The review queue asks a maintainer to verify source attribution, relationship, licensing, identity, claims, and tags. Accepted records can later be transferred to Jev AI Radar through a separate, deliberate editorial process.

## Output contract

Each classification preserves the complete candidate and adds:

- `profile` and `rubricVersion`
- `starRank`, calculated independently from model output
- raw normalized Jev `answers`
- `suggestedTags`
- `primaryTag`, taken from the single-choice category question
- `secondaryTagCandidates`, kept with probabilities for human review
- `reviewFlags`
- `recommendation`
- `reviewStatus: "pending_human_review"`
- model name, token usage, and classification time

Read [the architecture](docs/architecture.md) and [rubric definitions](docs/rubrics.md) for the publication boundary and interpretation rules.

Candidate and result fields are documented in [the data format](docs/data-format.md).

## Development

```bash
npm run check
```

The example records use placeholder URLs and are not real directory recommendations.
