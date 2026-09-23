# Validation note

## September 23, 2026 editorial pilot

Jev AI Dev tested version 0.1 against items already used by the live community site:

- 5 GitHub projects from the Projects collection
- 5 repositories from the System One collection
- 5 published User Cases

Repository candidates were refreshed from the GitHub API and classified from repository metadata and README evidence. User Cases were classified from their source URL and the evidence notes used by the live page. Existing scenario labels were stored under `metadata.humanBaseline` and excluded from the state sent to Jev.

The requests used OpenRouter's Decisions endpoint. OpenRouter reported model version `typesafe/jev-1.13-20260917`.

## Findings

- The primary category matched at least one current human scenario label in 10 of 10 Project and User Case records.
- Independent yes/no category questions produced too many secondary labels at the original threshold. Their combined F1 against the site's multi-label baseline was about 0.57.
- The output contract was changed after this result. A single Choice answer now supplies `primaryTag`; independent category probabilities are retained as `secondaryTagCandidates` for review.
- System One relationship and artifact-type answers separated independent models from compatible runtimes in the five-item sample.
- Review flags were conservative. Every sampled item required at least one source, claim, identity, or license check.

The 15 calls used 59,505 input tokens and 6,616 output tokens in total.

## Limits

- Ten comparable category records are too few to estimate general accuracy.
- Current human labels are an editorial baseline, not ground truth.
- The User Case test used editorial evidence notes rather than complete X or YouTube source content.
- Repository READMEs can be incomplete, outdated, or adversarial.
- Model versions and behavior can change.

The tool therefore keeps every result in `pending_human_review` and does not publish automatically.
