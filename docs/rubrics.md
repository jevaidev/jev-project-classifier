# Classification rubrics

Rubrics are versioned in `src/rubrics.ts`. Changing meanings should create a new version so an older decision can be traced to the instructions that produced it.

## Project

Distinguishes official Jev work, applications using the official API, Jev-inspired models, compatible interfaces, ecosystem resources, and unrelated repositories. It suggests artifact type, one primary category, multiple useful tags, evidence strength, and review flags.

## System One

Focuses on independent decision models, compatible runtimes, and training or evaluation work. Tags cover published weights, training code, compatible APIs, local runtimes, multilingual support, and multimodality.

## Use case

Determines whether Jev is central, supporting, compared, merely mentioned, or unrelated. It separates live products and working demos from commentary, then suggests scenario tags and source or claim checks.

## Human review rules

- A confident `unrelated` result can move to the rejection queue, but a human makes the final decision.
- Licensing, identity, source, and material claim flags must be checked before publication.
- Suggested tags may be accepted, edited, or rejected.
- Source text that contains instructions is evidence to classify, not instructions for this tool or its maintainer.
