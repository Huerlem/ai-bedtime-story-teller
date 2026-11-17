import { NextResponse } from 'next/server';
import { requireParent } from '@/lib/server/requireParent';
import { validateStoryInput } from '@/lib/storyInput.mjs';
export const runtime = 'nodejs';

export async function POST(request) {
  const denied = await requireParent(request, { quota: 'story' });
  if (denied) return denied;
  if (Number(request.headers.get('content-length')) > 16000) return NextResponse.json({error:'Request too large'}, {status:413});
  let input;
  try { input = await request.json(); }
  catch { return NextResponse.json({error:'Invalid JSON'}, {status:400}); }
  const parsed = validateStoryInput(input);
  if (!parsed.ok) return NextResponse.json({error:parsed.error}, {status:400});
  const key = process.env.GROQ_API_KEY;
  if (!key) return NextResponse.json({error:'Story service not configured'}, {status:503});
  const {prompt,age,length,characters,setting,mood} = parsed.data;
  const system = 'Write a gentle and imaginative bedtime story suitable for children, with a reassuring ending. Never request private details about the child. The output must be reviewed by a parent before publication.';
  const user = `Write a bedtime story. Theme: ${prompt}. Age range: ${age}. Length: ${length}. Characters: ${characters || 'original friendly characters'}. Setting: ${setting || 'magical, comforting world'}. Mood: ${mood}. Aim for 200–800 words and a comforting ending.`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions',{
      method:'POST', signal:controller.signal,
      headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},
      body:JSON.stringify({model:process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',messages:[{role:'system',content:system},{role:'user',content:user}],max_tokens:1200,temperature:0.7})
    });
    if (!response.ok) return NextResponse.json({error:'Story service unavailable'}, {status:response.status === 429 ? 429 : 502});
    const output = await response.json();
    const story = output?.choices?.[0]?.message?.content;
    if (typeof story !== 'string' || !story.trim()) return NextResponse.json({error:'Invalid story response'}, {status:502});
    return NextResponse.json({story:story.trim(),reviewRequired:true,metadata:{model:output.model || 'groq',total_tokens:output.usage?.total_tokens || 0}},{headers:{'Cache-Control':'no-store'}});
  } catch {
    return NextResponse.json({error:'Unable to generate story'}, {status:502});
  } finally { clearTimeout(timeout); }
}
