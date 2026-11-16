
import { NextResponse } from 'next/server';
import { requireParent } from '@/lib/server/requireParent';
export const runtime = 'nodejs';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function POST(request) {
  const denied = await requireParent(request);
  if (denied) return denied;
  const size = Number(request.headers.get('content-length'));
  if (Number.isFinite(size) && size > 16000) return NextResponse.json({error:'Request too large'}, {status:413});
  try {
    if (!GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'API key não configurada' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { storyContent } = body || {};
    if (typeof storyContent !== 'string' || storyContent.length > 10000) return NextResponse.json({error:'Invalid story content'}, {status:400});

    if (!storyContent?.trim()) {
      return NextResponse.json(
        { error: 'Story content is required' },
        { status: 400 }
      );
    }

    const systemPrompt = `You are an expert in creating captivating titles for children's stories. 
Analyze the provided story and create an engaging title, appropriate for children and that captures the essence of the story.`;

    const userPrompt = `
Based on the following children's story, create a captivating and appropriate title:

${storyContent.slice(0, 1000)} ${storyContent.length > 1000 ? '...' : ''}

The title should:
1. Be engaging and appropriate for children
2. Capture the essence of the story
3. Be between 3-8 words
4. Be easily pronounceable by children
5. Spark curiosity

Respond only with the title, without quotes or additional explanations.`;

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile', // ←updated model
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 50,
        temperature: 0.8,
        top_p: 1,
        stream: false
      })
    });

    if (!response.ok) {
      console.error('Error API Groq:', response.status);
      return NextResponse.json(
        { error: 'Error API external' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    if (!data.choices?.[0]?.message?.content) {
      return NextResponse.json(
        { error: 'Invalid API response' },
        { status: 500 }
      );
    }

    const title = data.choices[0].message.content.trim();
    
    return NextResponse.json({ title });

  } catch (error) {
    console.error('Internal error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}