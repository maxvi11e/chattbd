// api/generate-avatar.js (refactored for new paradigm: humanoid vs abstract)
// Input (POST JSON): { archetype, archetypeSpecific?, archetypeSpecificDesc?, traits?, vibe?, detailLevel?, styleChoice?, prompt?, botName? }
// Archetypes: "Human", "Sci-Fi / Fantasy" => humanoid path; "Abstract" => abstract path; "custom" treated like humanoid unless equals Abstract.

import { pickAbstractName } from './_lib/abstract-names.js';

export default async function handler(req, res){
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const startTime = Date.now();
  try {
    const {
      botName,
      archetype, archetypeSpecific, archetypeSpecificDesc,
  traits, // { seriousPlayful, succinctChatty, rationalIntuitive, practicalImaginative }
      vibe, detailLevel, styleChoice, prompt,
      // legacy tolerated but ignored
      artStyleCustom,
      classicPrompt,
      classicArtStyle,
      classicPersonalityPrompt,
      personalityPrompt
    } = req.body || {};

    const trimmedClassicPrompt = (classicPrompt && String(classicPrompt).trim()) || '';
    const useClassicFlow = trimmedClassicPrompt.length > 0;

    const explicitPersonaType = [req.body?.personaType, req.body?.animalType]
      .map((value) => (value && String(value).trim()) || '')
      .find((value) => value.length > 0) || '';
    const normalizedPrompt = (prompt && String(prompt).trim()) || '';
    const broad = (archetype || '').trim();
    const isAbstract = broad.toLowerCase() === 'abstract';

    const basePrompt = 'Square portrait avatar, crisp line art, subtle texture, softly lit, centered, clean edge lighting.';
    const personaSeed = explicitPersonaType || normalizedPrompt;
    const personaText = useClassicFlow
      ? trimmedClassicPrompt
      : personaSeed || (archetypeSpecificDesc && String(archetypeSpecificDesc).trim()) || (archetypeSpecific && String(archetypeSpecific).trim()) || '';

    if (!personaText) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    const styleChoiceLabels = {
      default: '',
      realistic: 'Photo realistic portrait',
      vector: 'Simplified vector art',
      anime: 'Anime illustration',
      impressionistic: 'Impressionistic painting',
      pixel: 'Pixel art',
      custom: null
    };

    let resolvedStyle = '';
    if (artStyleCustom && String(artStyleCustom).trim()) {
      resolvedStyle = String(artStyleCustom).trim();
    } else if (styleChoice && String(styleChoice).trim()) {
      const key = String(styleChoice).trim().toLowerCase();
      resolvedStyle = styleChoiceLabels[key] || key;
    }

    const resolvedVibe = (vibe && String(vibe).trim()) || '';

    let finalPrompt = basePrompt;
    if (resolvedStyle) finalPrompt += ` Art style: ${resolvedStyle}.`;
    if (resolvedVibe) finalPrompt += ` Atmosphere: ${resolvedVibe}.`;
    finalPrompt += ` Persona: ${personaText}`;
    const qualitySetting = 'medium';

    const bodyPayload = {
      model: 'gpt-image-1',
      prompt: finalPrompt,
      size: '1024x1024',
      n: 1,
      quality: qualitySetting
    };

    console.log('📤 Avatar generation payload', {
      archetype: broad || null,
      mode: useClassicFlow ? 'classic' : 'structured',
      art_style: resolvedStyle || null,
      vibe: resolvedVibe || null,
      body: bodyPayload
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
      console.log('❌ Image generation failed', { error: errTxt, prompt_length: finalPrompt.length });
      return res.status(500).json({ error: errTxt });
    }
    const data = await r.json();
    const item = data?.data?.[0];
    const b64 = item?.b64_json;
    const url = item?.url;

    const duration = Date.now() - startTime;
    console.log('✅ Image generated', {
      archetype: broad || null,
      mode: useClassicFlow ? 'classic' : 'structured',
      art_style: resolvedStyle || null,
      vibe: resolvedVibe || null,
      quality: qualitySetting,
      duration_ms: duration,
      prompt_length: finalPrompt.length
    });

    const providedBotName = botName ? String(botName).trim() : '';
    const autoAbstractName = isAbstract && !providedBotName ? pickAbstractName() : null;
    const derivedAbstractName = autoAbstractName?.label || null;
    const finalBotName = providedBotName || (isAbstract ? derivedAbstractName : '') || (archetypeSpecific || '').trim();

    const responseBase = {
      botName: finalBotName || null,
      styleChoice: styleChoice || null,
      archetype: broad,
      archetype_specific: archetypeSpecific || null,
      vibe: vibe || null,
      personality_words: null,
      detail_level: Number(detailLevel) || null,
      sliders_raw: traits || null,
      promptUsed: finalPrompt,
      mode: useClassicFlow ? 'classic' : 'structured',
      classic_prompt: useClassicFlow ? trimmedClassicPrompt : null,
      classic_art_style: resolvedStyle || (classicArtStyle ? String(classicArtStyle).trim() : null),
      classic_personality_prompt: (classicPersonalityPrompt && String(classicPersonalityPrompt).trim()) || (personalityPrompt && String(personalityPrompt).trim()) || null
    };

    if (b64) return res.status(200).json({ dataUrl: `data:image/png;base64,${b64}`, ...responseBase });
    if (url) return res.status(200).json({ dataUrl: url, ...responseBase });
    return res.status(500).json({ error: 'No image returned' });
  } catch (e) {
    console.log('❌ Image generation error', { error: e.message });
    return res.status(500).json({ error: e.message || 'Unexpected error' });
  }
}
