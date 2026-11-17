import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root = new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
for (const route of ['generate-story','generate-title','generate-suggestion','generate-image','tts']) {
 test(route+' uses server-verified parent gate before processing',()=>{
  const text=read('src/app/api/'+route+'/route.js');
  assert.match(text,/await requireParent\(/);
  assert.ok(text.indexOf('await requireParent(')<text.indexOf('await request.json(') || route==='tts');
 });
}
for (const hook of ['useAIStoryGeneration','useImageGeneration','useTextToSpeech']) {
 test(hook+' uses an authenticated client request',()=>assert.match(read('src/hooks/'+hook+'.js'),/secureFetch\('/));
}
test('admin Firebase credentials never loaded into client helper',()=>{
 const helper=read('src/lib/client/secureFetch.js');
 assert.doesNotMatch(helper,/firebase-admin|FIREBASE_SERVICE_ACCOUNT_KEY/);
});
test('AI routes never log request bodies or story text', () => {
 for (const route of ['generate-story','generate-title','generate-suggestion','generate-image','tts']) {
  const text = read('src/app/api/'+route+'/route.js');
  assert.doesNotMatch(text, /console\.(log|info|debug)\(/, route);
  assert.doesNotMatch(text, /console\.\w+\([^)]*(body|storyText|prompt|content|text)\b/, route);
 }
});
