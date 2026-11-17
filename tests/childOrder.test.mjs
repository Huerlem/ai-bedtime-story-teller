import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sortChildren } from '../src/lib/childOrder.mjs';

const ts = (ms) => ({ toMillis: () => ms });

test('children are ordered by when they were added, regardless of query order', () => {
  const emma = { id: 'zz9', name: 'Emma', createdAt: ts(1000) };
  const lucas = { id: 'aa1', name: 'Lucas', createdAt: ts(2000) };
  assert.deepEqual(sortChildren([lucas, emma]).map((c) => c.name), ['Emma', 'Lucas']);
  assert.deepEqual(sortChildren([emma, lucas]).map((c) => c.name), ['Emma', 'Lucas']);
});

test('mixed timestamp shapes, missing dates and ties are deterministic', () => {
  const list = [
    { id: 'c', name: 'Zoe' },
    { id: 'b', displayName: 'amy', createdAt: { seconds: 5, nanoseconds: 0 } },
    { id: 'a', name: 'Ben', createdAt: new Date(5000) },
    { id: 'd', name: 'Ava', createdAt: 1 },
  ];
  assert.deepEqual(sortChildren(list).map((c) => c.id), ['d', 'b', 'a', 'c']);
  assert.notEqual(sortChildren(list), list, 'does not mutate the input');
});

test('getChildAccounts applies the stable order', () => {
  const src = readFileSync('src/firebase/firestore.js', 'utf8');
  assert.match(src, /return sortChildren\(querySnapshot\.docs\.map/);
});
