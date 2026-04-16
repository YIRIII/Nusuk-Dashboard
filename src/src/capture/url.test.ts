import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyUrl } from './url.js';

test('classifies twitter.com tweet URL', () => {
  const r = classifyUrl('https://twitter.com/nusuk_official/status/1234567890');
  assert.equal(r.kind, 'tweet');
  if (r.kind !== 'tweet') return;
  assert.equal(r.id, '1234567890');
  assert.equal(r.username, 'nusuk_official');
  assert.equal(r.canonicalUrl, 'https://twitter.com/nusuk_official/status/1234567890');
});

test('classifies x.com tweet URL', () => {
  const r = classifyUrl('https://x.com/user/status/42');
  assert.equal(r.kind, 'tweet');
  if (r.kind !== 'tweet') return;
  assert.equal(r.id, '42');
});

test('classifies mobile.twitter.com tweet URL', () => {
  const r = classifyUrl('https://mobile.twitter.com/user/status/7');
  assert.equal(r.kind, 'tweet');
});

test('strips query and fragment from tweet URL', () => {
  const r = classifyUrl('https://x.com/user/status/99?s=20&t=abc#frag');
  assert.equal(r.kind, 'tweet');
  if (r.kind !== 'tweet') return;
  assert.equal(r.canonicalUrl, 'https://twitter.com/user/status/99');
});

test('classifies article URL', () => {
  const r = classifyUrl('https://arabnews.com/node/1234');
  assert.equal(r.kind, 'article');
});

test('classifies twitter.com non-status URL as article', () => {
  const r = classifyUrl('https://twitter.com/nusuk_official');
  assert.equal(r.kind, 'article');
});

test('handles malformed URL gracefully', () => {
  const r = classifyUrl('not a url');
  assert.equal(r.kind, 'article');
});
