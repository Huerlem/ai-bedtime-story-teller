export const MAX_PROMPT_LENGTH = 1200;
const bounded = (value, max, fallback = '') => typeof value === 'string' ? value.trim().slice(0, max) : fallback;
export function validateStoryInput(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {ok:false,error:'Invalid request body'};
  const prompt = bounded(value.prompt, MAX_PROMPT_LENGTH);
  if (!prompt) return {ok:false,error:'A story prompt is required'};
  if (typeof value.prompt !== 'string' || value.prompt.length > MAX_PROMPT_LENGTH) return {ok:false,error:'The story prompt is too long'};
  const age = bounded(value.age, 40, '4-6 years');
  const length = bounded(value.length, 40, 'medium');
  const setting = bounded(value.setting, 160);
  const mood = bounded(value.mood, 60, 'gentle');
  const characters = Array.isArray(value.characters)
    ? value.characters.filter(x => typeof x === 'string').slice(0, 8).map(x => bounded(x, 60)).filter(Boolean).join(', ')
    : bounded(value.characters, 240);
  return {ok:true,data:{prompt,age,length,setting,mood,characters}};
}
