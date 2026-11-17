import { NextResponse } from 'next/server';
import { requireParent } from '@/lib/server/requireParent';
export const runtime = 'nodejs';

export async function POST(req) {
  const denied = await requireParent(req, { quota: 'tts' });
  if (denied) return denied;
  if (Number(req.headers.get('content-length')) > 16000) return NextResponse.json({error:'Request too large'}, {status:413});
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({error:'Invalid JSON'}, {status:400}); }
  const {text,voice,languageCode} = body || {};
  if (typeof text !== 'string' || !text.trim() || text.length > 4500) return NextResponse.json({error:'Invalid narration text'}, {status:400});
  const name = voice || 'en-US-Wavenet-D';
  if (typeof name !== 'string' || !/^(en-US|en-GB)-(Wavenet|Neural2)-[A-Z]$/.test(name)) return NextResponse.json({error:'Unsupported narration voice'}, {status:400});
  const locale = name.slice(0,5);
  if (languageCode && languageCode !== locale) return NextResponse.json({error:'Voice language mismatch'}, {status:400});
  const key = process.env.GOOGLE_TTS_API_KEY;
  if (!key) return NextResponse.json({error:'Narration service not configured'}, {status:503});
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize',{
      method:'POST', signal:controller.signal,
      headers:{'Content-Type':'application/json','X-Goog-Api-Key':key},
      body:JSON.stringify({input:{text:text.trim()},voice:{languageCode:locale,name},audioConfig:{audioEncoding:'MP3',speakingRate:1,pitch:0}})
    });
    if (!response.ok) return NextResponse.json({error:'Narration service unavailable'}, {status:502});
    const output = await response.json();
    if (typeof output?.audioContent !== 'string') return NextResponse.json({error:'Invalid narration response'}, {status:502});
    return NextResponse.json({audioContent:output.audioContent},{headers:{'Cache-Control':'no-store'}});
  } catch {
    return NextResponse.json({error:'Narration service unavailable'}, {status:502});
  } finally {clearTimeout(timeout);}
}
