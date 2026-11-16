import test from 'node:test';
import assert from 'node:assert/strict';
import {validateStoryInput, MAX_PROMPT_LENGTH} from '../src/lib/storyInput.mjs';
test('rejects empty body and prompts', () => {
  assert.equal(validateStoryInput(null).ok,false);
  assert.equal(validateStoryInput({prompt:'  '}).ok,false);
});
test('rejects oversized prompts', () => {
  assert.equal(validateStoryInput({prompt:'x'.repeat(MAX_PROMPT_LENGTH+1)}).ok,false);
});
test('accepts bounded age appropriate input', () => {
  const r=validateStoryInput({prompt:'  A fox learns kindness  ',characters:['Fox','Moon'],mood:'calm'});
  assert.equal(r.ok,true);
  assert.equal(r.data.prompt,'A fox learns kindness');
  assert.equal(r.data.characters,'Fox, Moon');
  assert.equal(r.data.age,'4-6 years');
});
test('discards unsupported child fields', () => {
  const r=validateStoryInput({prompt:'Moonlight',admin:true,characters:[{},'Fox']});
  assert.equal(r.ok,true);
  assert.equal(r.data.characters,'Fox');
  assert.equal('admin' in r.data,false);
});
