// api/generate-avatar.js - Simplified for abstract avatar generation
// Input (POST JSON): { prompt, botName?, archetype?, archetypeSpecific?, traits?, vibe? }

import { generateAvatarName } from './_lib/name-generator.js';

export default async function handler(req, res){
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const startTime = Date.now();
  try {
    const {
      prompt,
      botName,
      archetype,
      archetypeSpecific,
      traits,
      vibe,
      styleChoice
    } = req.body || {};

    // Get the prompt - this should be the full abstract description from create.html
    const finalPrompt = (prompt && String(prompt).trim()) || '';
    
    if (!finalPrompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    const isAbstract = (archetype || '').trim().toLowerCase() === 'abstract';
    // Call OpenAI Image API
    const bodyPayload = {
      model: 'gpt-image-1',
      prompt: finalPrompt,
      size: '1024x1024',
      n: 1,
      quality: 'medium'
    };

    console.log('📤 Generating avatar', {
      archetype: archetype || 'none',
      isAbstract,
      promptLength: finalPrompt.length,
      vibe: vibe || 'none'
    });

    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyPayload)
    });

    if (!r.ok) {
      const errTxt = await r.text();
      console.log('❌ Image generation failed', { error: errTxt, promptLength: finalPrompt.length });
      return res.status(500).json({ error: errTxt });
    }

    const data = await r.json();
    const item = data?.data?.[0];
    const b64 = item?.b64_json;
    const url = item?.url;

    const duration = Date.now() - startTime;
    console.log('✅ Image generated', {
      archetype: archetype || 'none',
      isAbstract,
      durationMs: duration
    });

    // Determine the image URL to use for naming
    const imageUrl = url || (b64 ? `data:image/png;base64,${b64}` : null);

    // Generate bot name if not provided
    const providedBotName = botName ? String(botName).trim() : '';
    let finalBotName = providedBotName;

    // If no name provided, generate one using AI
    if (!providedBotName && imageUrl) {
      try {
        console.log('🏷️ Generating AI-based name...');
        const nameData = await generateAvatarName(imageUrl, finalPrompt);
        if (nameData.name) {
          finalBotName = nameData.name;
          console.log('✅ AI-generated name:', nameData);
        }
      } catch (nameError) {
        console.error('❌ Error generating AI name:', nameError);
        finalBotName = archetypeSpecific || 'New Avatar';
      }
    } else if (!providedBotName) {
      // Fallback if no image URL available
      finalBotName = archetypeSpecific || 'New Avatar';
    }

    const responseData = {
      botName: finalBotName,
      promptUsed: finalPrompt,
      archetype: archetype || null,
      archetype_specific: archetypeSpecific || null,
      vibe: vibe || null,
      styleChoice: styleChoice || null,
      sliders_raw: traits || null
    };

    if (b64) return res.status(200).json({ dataUrl: `data:image/png;base64,${b64}`, ...responseData });
    if (url) return res.status(200).json({ dataUrl: url, ...responseData });
    return res.status(500).json({ error: 'No image returned' });
  } catch (e) {
    console.log('❌ Image generation error', { error: e.message });
    return res.status(500).json({ error: e.message || 'Unexpected error' });
  }
}
