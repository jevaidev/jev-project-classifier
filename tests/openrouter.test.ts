import assert from 'node:assert/strict';
import test from 'node:test';
import {noul} from '@typesafe-ai/sdk';
import {createOpenRouterRunner} from '../src/jev.js';

test('OpenRouter runner uses the Jev decisions endpoint and typed request shape', async () => {
  let requestUrl = '';
  let requestInit: RequestInit | undefined;
  const fetchImpl: typeof fetch = async (input, init) => {
    requestUrl = String(input);
    requestInit = init;
    return Response.json({
      model: 'typesafe/jev-1.13',
      answers: {relevant: {type: 'noul', noul: 0.87}},
      usage: {input_tokens: 12, output_tokens: 3}
    });
  };
  const runner = createOpenRouterRunner({apiKey: 'test-key', fetchImpl});
  const result = await runner({
    state: {summary: 'A real project candidate'},
    questions: {relevant: noul('Is it relevant?')}
  });
  assert.equal(requestUrl, 'https://openrouter.ai/api/alpha/decisions');
  assert.equal((requestInit?.headers as Record<string, string>).Authorization, 'Bearer test-key');
  const body = JSON.parse(String(requestInit?.body)) as Record<string, unknown>;
  assert.equal(body.model, 'typesafe/jev-1.13');
  assert.ok(body.state);
  assert.ok(body.questions);
  assert.equal(result.answers.relevant.type, 'noul');
  assert.equal(result.usage.input_tokens, 12);
});

test('OpenRouter errors do not echo provider response bodies', async () => {
  const runner = createOpenRouterRunner({
    apiKey: 'test-key',
    fetchImpl: async () => new Response('private candidate content', {status: 400})
  });
  await assert.rejects(
    runner({state: {summary: 'private'}, questions: {relevant: noul('Is it relevant?')}}),
    error => error instanceof Error
      && error.message === 'OpenRouter decision failed with HTTP 400.'
      && !error.message.includes('private candidate content')
  );
});
