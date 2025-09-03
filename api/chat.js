// /api/chat.js
export const config = { runtime: 'edge' };

export default async function handler(req) {
  try {
    const { persona, message, history } = await req.json();

    if (!message || !persona) {
      return new Response(JSON.stringify({ error: 'Missing persona or message' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const sys = `You are the persona described by the user: "${persona}". 
Respond concisely and stay in character. Never break persona.`;

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        messages: [
          { role: 'system', content: sys },
          ...(Array.isArray(history) ? history : []),
          { role: 'user', content: message }
        ]
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
    const text = data?.choices?.[0]?.message?.content ?? '';
    return new Response(JSON.stringify({ text }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || 'Unexpected error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
