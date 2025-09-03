// /api/generate-avatar.js
export const config = { runtime: 'edge' };

export default async function handler(req) {
  try {
    const { prompt } = await req.json();
    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Missing prompt' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: `Square portrait avatar, crisp line art, subtle texture, softly lit, centered, clean edge lighting, graphic-novel panel. Persona: ${prompt}`,
        size: '512x512',
        quality: 'high',
        n: 1
      })
    });

    if (!r.ok) {
      const err = await r.text();
      return new Response(JSON.stringify({ error: err }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await r.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) {
      return new Response(JSON.stringify({ error: 'No image returned' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ dataUrl: `data:image/png;base64,${b64}` }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || 'Unexpected error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
