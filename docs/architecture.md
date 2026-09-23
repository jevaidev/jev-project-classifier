# Architecture

## Purpose

This tool turns public source evidence into consistent classification suggestions for three editorial queues:

1. GitHub projects related to Jev.
2. Independent System One ecosystem work.
3. Real-world Jev use cases from repositories, websites, X, YouTube, or manual research.

Jev handles semantic classification. GitHub Star count remains a deterministic data field and is the only input to the optional Star ranking.

## Data flow

```text
GitHub API or editorial JSON
        |
        v
normalized Candidate records
        |
        +--> deterministic Star sort
        |
        v
official @typesafe-ai/sdk + versioned rubric
        |
        v
suggested tags, relationship, evidence score, review flags
        |
        v
pending_human_review JSON and Markdown checklist
```

## Publication boundary

The CLI ends at a local review file. It has no GitHub write token usage, repository mutation, commit, pull request, website publishing, or newsletter publishing command. A maintainer must inspect and transfer accepted records manually.

## Why classification and ranking are separate

Star ranking can be reproduced without a model and should not drift because of model output. Jev is used where semantic judgment adds value: relationship, artifact type, category, evidence quality, risk flags, and multiple useful tags.

## Security and provenance

- API keys come from environment variables and are never written to output.
- Source URLs and collection timestamps remain attached to every candidate.
- README content is truncated before it is sent for classification.
- Model output is treated as untrusted editorial input.
- All generated decisions use `pending_human_review`.
