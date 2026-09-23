import {choice, noul, score, type Questions} from '@typesafe-ai/sdk';
import type {Profile} from './types.js';

const categoryCriteria = {
  agents: 'Agent orchestration, automation, tool selection, or autonomous workflows.',
  communication: 'Messaging, email, social content, moderation, or communication assistance.',
  search: 'Search, retrieval, filtering, recommendation, or ranking.',
  support: 'Customer support, ticket routing, or service operations.',
  safety: 'Safety checks, guardrails, policy enforcement, or risk review.',
  games: 'Games, simulations, or interactive characters.',
  personal: 'Personal productivity, home automation, or end-user utilities.',
  engineering: 'Software engineering, code review, developer infrastructure, or computer use.',
  evaluation: 'Evaluation, calibration, benchmarking, datasets, or testing.',
  sdk: 'SDKs, examples, API clients, integrations, or developer education.'
} as const;

const categoryTagQuestions = Object.fromEntries(Object.entries(categoryCriteria).map(([key, description]) => [
  `tag_${key}`,
  noul(`Does this item materially belong to the “${key}” category?`, {
    false: `The ${description.toLowerCase()} category is not a meaningful part of this item.`,
    true: `The item has meaningful functionality or evidence in this category: ${description}`
  })
])) as Questions;

const projectQuestions = {
  relationship: choice('What is this repository’s strongest relationship to Jev?', {
    official_jev: 'An official TypeSafe AI repository that implements or supports Jev.',
    uses_jev: 'Working code that calls the official Jev API or SDK.',
    jev_inspired_model: 'An independent decision model explicitly inspired by Jev or System One.',
    jev_compatible_interface: 'An interface or runtime that offers Jev-compatible decisions without calling official Jev.',
    ecosystem_resource: 'A benchmark, tutorial, directory, dataset, or other resource about the Jev ecosystem.',
    unrelated: 'No substantive Jev relationship is supported by the supplied evidence.'
  }),
  artifact_type: choice('Which artifact type best describes the repository?', {
    application: 'An end-user or business application.',
    tool: 'A command-line, desktop, browser, or developer tool.',
    sdk: 'An SDK, API client, package, or integration library.',
    model: 'Published model weights or a trained decision model.',
    interface: 'A compatible server, adapter, runtime, or model wrapper.',
    benchmark: 'An evaluation, benchmark, calibration, or testing suite.',
    examples: 'Runnable examples, recipes, skills, or teaching material.',
    directory: 'Primarily a list of links or a content directory.'
  }),
  primary_category: choice('Which single category best represents the repository’s primary developer use case?', categoryCriteria),
  evidence_quality: score('How strong is the supplied evidence for the classification?', [
    'The text is too thin, ambiguous, or keyword-only.',
    'The relationship is claimed but implementation details are limited.',
    'The README or metadata describes a concrete implementation and workflow.',
    'The implementation, examples, limitations, and source evidence are explicit.'
  ]),
  code_available: noul('Does the repository contain or clearly link to substantive code, model weights, tests, or runnable artifacts?', {
    false: 'It is primarily an announcement, empty scaffold, or link list.',
    true: 'Substantive implementation artifacts are available.'
  }),
  runnable: noul('Does the supplied evidence describe a concrete way to install, run, call, or reproduce the project?', {
    false: 'No concrete execution or reproduction path is described.',
    true: 'A concrete execution, API, installation, or reproduction path is described.'
  }),
  needs_license_review: noul('Should a human specifically review the licensing before listing or reusing this project?', {
    false: 'Licensing is clear enough for directory listing.',
    true: 'The license is missing, conflicting, custom, or otherwise unclear.'
  }),
  needs_identity_review: noul('Could this project be mistaken for an official TypeSafe or Jev release?', {
    false: 'Ownership and community status are sufficiently clear.',
    true: 'Naming, organization, or wording could create official-identity confusion.'
  }),
  needs_claim_review: noul('Does the project make performance, accuracy, cost, or safety claims that should be checked before repeating them?', {
    false: 'No material claim needs special editorial review.',
    true: 'At least one material claim should be attributed, qualified, or independently checked.'
  }),
  ...categoryTagQuestions
} as const satisfies Questions;

const systemOneQuestions = {
  relationship: choice('How does this item relate to the Jev or System One ecosystem?', {
    independent_model: 'Publishes an independently trained decision model inspired by Jev or System One.',
    compatible_runtime: 'Adapts an existing model or runtime to a Jev-compatible typed-decision interface.',
    training_or_eval: 'Provides training, calibration, evaluation, or benchmarking infrastructure for this model class.',
    official_jev: 'An official TypeSafe AI Jev release or official supporting repository.',
    uses_official_jev: 'An application that calls official Jev rather than implementing an independent System One model.',
    unrelated: 'No substantive System One or Jev-model relationship is supported.'
  }),
  artifact_type: choice('Which artifact type best describes this System One candidate?', {
    model: 'Published model weights or a trained decision model.',
    runtime: 'A local server, inference runtime, adapter, or compatible interface.',
    training: 'Training code, data preparation, or model-building workflow.',
    evaluation: 'Benchmark, calibration, or evaluation tooling.',
    application: 'An application that consumes a decision model.',
    content: 'Documentation, commentary, or a directory without a model implementation.'
  }),
  evidence_quality: score('How strong is the evidence for placing this item in a community System One collection?', [
    'Only naming or vague claims connect it to the model class.',
    'The approach is described, but artifacts or compatibility evidence are limited.',
    'The repository provides concrete implementation details or runnable artifacts.',
    'Weights, code, interface behavior, limitations, and reproducible evidence are clearly documented.'
  ]),
  tag_model_weights: noul('Are downloadable model weights clearly published?', {false: 'No published weights are evidenced.', true: 'Published weights are clearly linked or included.'}),
  tag_training_code: noul('Is training or fine-tuning code clearly published?', {false: 'Training code is not evidenced.', true: 'Training or fine-tuning code is clearly available.'}),
  tag_compatible_api: noul('Does it expose or document a Jev-compatible typed-decision API?', {false: 'Compatibility is not evidenced.', true: 'A compatible request and response contract is documented.'}),
  tag_local_runtime: noul('Can the model or interface run locally according to the supplied evidence?', {false: 'Local operation is not evidenced.', true: 'A local runtime or installation path is documented.'}),
  tag_multilingual: noul('Is the model or interface explicitly designed or evaluated for more than one language?', {false: 'Multilingual support is not evidenced.', true: 'Multiple languages are explicitly supported or evaluated.'}),
  tag_multimodal: noul('Does it accept more than text, such as images?', {false: 'Only text is evidenced.', true: 'A non-text modality is explicitly supported.'}),
  needs_license_review: noul('Should a human specifically review the code or model license?', {false: 'Licensing is clear enough for directory listing.', true: 'Code, weights, or dataset licensing is missing, conflicting, or restricted.'}),
  needs_identity_review: noul('Could this community project be mistaken for an official TypeSafe release?', {false: 'Community or official status is sufficiently clear.', true: 'Naming or ownership could create confusion.'}),
  needs_claim_review: noul('Do benchmark, speed, cost, or accuracy claims need editorial qualification?', {false: 'No material claim needs special review.', true: 'Material claims should be attributed or checked.'})
} as const satisfies Questions;

const useCaseQuestions = {
  relationship: choice('What role does Jev play in this use case?', {
    core_decision: 'Jev makes a central product or workflow decision.',
    supporting_component: 'Jev performs a meaningful but supporting classification, score, or gate.',
    comparison: 'Jev is evaluated or compared with another model or method.',
    mentioned_only: 'Jev is mentioned but no material use is demonstrated.',
    unrelated: 'The content does not show a substantive Jev use case.'
  }),
  evidence_type: choice('What kind of evidence does the source provide?', {
    live_product: 'A usable product or deployed workflow.',
    working_demo: 'A working prototype, video, trace, or reproducible demonstration.',
    tutorial: 'A tutorial or walkthrough with implementation detail.',
    benchmark: 'A test or comparison with observable methodology or results.',
    commentary: 'An opinion, announcement, or concept without implementation evidence.',
    unverifiable: 'The supplied material is too thin or inaccessible to verify.'
  }),
  primary_category: choice('Which single category best represents the use case?', categoryCriteria),
  practical_value: score('How useful is this source to a developer looking for a concrete Jev pattern?', [
    'No concrete pattern can be recovered.',
    'The idea is understandable but lacks implementation detail.',
    'The workflow and Jev decision role are concrete enough to adapt.',
    'The source includes implementation details, evidence, and limitations that support reproduction.'
  ]),
  real_demo: noul('Does the source show a real product, trace, code path, or working demonstration?', {false: 'It is mainly a claim or concept.', true: 'A real implementation or working demonstration is shown.'}),
  reproducible: noul('Does the source provide enough detail, code, or linked material for a developer to reproduce the core pattern?', {false: 'The pattern is not reproducible from the supplied evidence.', true: 'The core pattern can reasonably be reproduced.'}),
  needs_source_review: noul('Should a human verify the original source, media, or author attribution before publication?', {false: 'Source attribution is sufficiently clear.', true: 'The source, author, media, or original context needs checking.'}),
  needs_claim_review: noul('Does the source contain performance, cost, accuracy, or safety claims requiring qualification?', {false: 'No material claim needs special review.', true: 'At least one material claim needs attribution or checking.'}),
  ...categoryTagQuestions
} as const satisfies Questions;

export const rubrics: Record<Profile, {version: string; questions: Questions}> = {
  project: {version: 'project-2026-09-23.1', questions: projectQuestions},
  'system-one': {version: 'system-one-2026-09-23.1', questions: systemOneQuestions},
  'use-case': {version: 'use-case-2026-09-23.1', questions: useCaseQuestions}
};
