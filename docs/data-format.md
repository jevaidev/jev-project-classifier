# Data format

## Candidate input

Commands that classify or rank candidates accept a JSON array. Each item requires:

```json
{
  "id": "github:owner/repository",
  "sourceType": "github_repository",
  "title": "owner/repository",
  "sourceUrl": "https://github.com/owner/repository",
  "collectedAt": "2026-09-23T00:00:00Z"
}
```

Optional fields:

- `summary`: short source description
- `content`: README, transcript excerpt, or editorial evidence notes
- `github`: normalized repository metadata produced by `collect` or `discover`
- `metadata`: caller-owned provenance or evaluation data

Supported `sourceType` values are `github_repository`, `x_post`, `youtube_video`, `web_page`, and `manual`.

## Optional human baseline

The generic `evaluate` command reads scenario labels from this optional shape:

```json
{
  "metadata": {
    "humanBaseline": {
      "scenarios": ["agents", "engineering"]
    }
  }
}
```

This field is excluded from the state sent to Jev. It exists only for post-classification comparison.

## Classification output

Each classification contains:

- the complete original candidate
- raw normalized Jev answers
- `primaryTag`
- `secondaryTagCandidates` with probabilities
- `suggestedTags`
- `reviewFlags`
- `recommendation`
- `reviewStatus`, always `pending_human_review`
- model, rubric version, token usage, and timestamps
- `starRank` when GitHub metadata is present

The output is a review artifact. It is not a publication manifest.
