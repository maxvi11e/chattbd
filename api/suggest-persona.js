// /api/suggest-persona.js
// Generates a specific persona suggestion given an archetype category and personality slider values.
// Expected POST JSON body: { archetypeCategory: string, sliders: { seriousPlayful, succinctChatty, rationalIntuitive, conservativeLiberal }, userText?: string }
// Returns: { name: string, description: string, reasoning?: string }

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }
  try {
    const body = await req.json();
    const { archetypeCategory, sliders = {}, userText } = body || {};
    console.log('[suggest-persona] incoming', {
      archetypeCategory,
      sliders,
      userText: userText || null,
      timestamp: new Date().toISOString()
    });
    if (!archetypeCategory) {
      return new Response(JSON.stringify({ error: 'Missing archetypeCategory' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const clamp = (v) => Math.min(100, Math.max(0, Number.isFinite(+v) ? +v : 50));
    const s = {
      seriousPlayful: clamp(sliders.seriousPlayful),
      succinctChatty: clamp(sliders.succinctChatty),
      rationalIntuitive: clamp(sliders.rationalIntuitive),
      conservativeLiberal: clamp(sliders.conservativeLiberal)
    };

    // Lightweight descriptor phrases derived from sliders (not 1:1, just flavor hints)
    const flavor = [];
    if (s.seriousPlayful >= 65) flavor.push('highly playful'); else if (s.seriousPlayful <= 35) flavor.push('reserved');
    if (s.succinctChatty >= 65) flavor.push('very talkative'); else if (s.succinctChatty <= 35) flavor.push('succinct');
    if (s.rationalIntuitive >= 65) flavor.push('intuitive'); else if (s.rationalIntuitive <= 35) flavor.push('analytical');
    if (s.conservativeLiberal >= 65) flavor.push('progressive outlook'); else if (s.conservativeLiberal <= 35) flavor.push('tradition-minded');

    const system = `You generate a single concise persona concept (name + one-sentence broad description) for an avatar creation flow.
Output STRICT JSON with keys: name, description, reasoning.
Do NOT include any line breaks or backticks.
Rules:
- Stay ORIGINAL; no copyrighted characters, brands, franchises, or real people.
- Fit inside the provided archetype category: ${archetypeCategory}.
- Reflect slider flavor hints loosely (element of surprise is good) but keep it coherent.
- Name should be 1-3 words, Title Case.
- Description <= 140 characters, vivid, visually suggestive, third person fragment.
- No quotation marks inside values except normal punctuation.
If category is generic like 'Basic / Realistic', create a creative but grounded persona.
`;

    const user = `Category: ${archetypeCategory}\nSlider flavor: ${flavor.join(', ') || 'balanced'}${userText ? `\nUser extra: ${userText}` : ''}\nReturn JSON now.`;

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.9,
        max_tokens: 220,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      })
    });

    if (!r.ok) {
      const errTxt = await r.text();
      return new Response(JSON.stringify({ error: 'Upstream error', details: errTxt }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    const data = await r.json();
    const raw = data?.choices?.[0]?.message?.content?.trim();
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // attempt to salvage JSON substring
      const match = raw && raw.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch {/* ignore */}
      }
    }
    if (!parsed || !parsed.name || !parsed.description) {
      return new Response(JSON.stringify({ error: 'Malformed model response', raw }), { status: 502, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({
      name: parsed.name.slice(0, 60),
      description: parsed.description.slice(0, 280),
      reasoning: parsed.reasoning?.slice(0, 400) || null,
      sliders: s,
      archetypeCategory,
      flavor
    }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || 'Unexpected error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
