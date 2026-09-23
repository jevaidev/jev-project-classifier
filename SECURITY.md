# Security policy

## Reporting a vulnerability

Please report security issues privately to `support@jevai.dev`. Do not include API keys, private repository contents, personal data, or exploit details in a public issue.

## Secrets

- Keep `OPENROUTER_API_KEY`, `TYPESAFE_API_KEY`, and `GITHUB_TOKEN` in a local `.env` or secret manager.
- Restrict a local key file with `chmod 600 .env` on Unix-like systems.
- Never place secrets in candidate JSON, README examples, logs, issues, or pull requests.
- Rotate a key immediately if it is exposed.

## Untrusted input

Repository READMEs, web content, transcripts, and submitted metadata are untrusted. The classifier marks them as evidence and instructs the model to ignore embedded instructions. Maintainers must still review model output, rendered Markdown, links, licenses, identity claims, and any downstream export.

The `classify` command sends candidate metadata and supplied evidence to the configured model API. Do not classify private or regulated content unless you are authorized to share it with that provider. The jevai.dev adapter parses literal data and does not execute modules from the supplied site checkout.

The CLI does not publish content, mutate repositories, or open pull requests.
