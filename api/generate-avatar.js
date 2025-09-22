// api/generate-avatar.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const startTime = Date.now();
  
  try {
    const { 
      prompt, 
      // legacy fields (botName, artStyle, personalityPrompt) may still come from old clients
      botName, artStyle, personalityPrompt,
      // new quiz fields
      band, bookFilm, animal, styleChoice, artStyleCustom
    } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    // Map style choice to concrete style descriptor
    const defaultStyle = `Square portrait avatar, crisp line art, subtle texture, softly lit, centered, clean edge lighting.`;
    const styleMap = {
      default: defaultStyle,
      realistic: `Square portrait avatar, photorealistic, cinematic soft light, shallow depth of field, detailed skin and fabric, centered composition.`,
      vector: `Square portrait avatar, simplified vector illustration, flat colors, clean geometric shapes, minimal shading, centered composition.`,
      custom: (artStyleCustom || artStyle || '').trim()
    };
  const styleKey = (styleChoice || '').trim() || 'default';
  const resolvedStyle = (styleMap[styleKey] || '').trim() || defaultStyle;

    // Build enhanced prompt with quiz-driven vibe
    let enhancedPrompt = `${resolvedStyle}`;
    enhancedPrompt += ` Persona: ${prompt.trim()}`;
    
    const vibeParts = [];
    if (band && band.trim()) vibeParts.push(`inspired by the vibe of ${band.trim()}`);
    if (bookFilm && bookFilm.trim()) vibeParts.push(`echoes of ${bookFilm.trim()}`);
    if (animal && animal.trim()) vibeParts.push(`subtle traits of a ${animal.trim()}`);
    if (vibeParts.length) enhancedPrompt += `, with ${vibeParts.join(', ')}.`;

    // Legacy optional personality details
    if (personalityPrompt && personalityPrompt.trim()) {
      enhancedPrompt += ` Additional personality notes: ${personalityPrompt.trim()}.`;
    }

    const r = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
  body: JSON.stringify({
        model: "gpt-image-1",
        prompt: enhancedPrompt,
        size: "1024x1024",   // ✅ valid size
        n: 1,
        quality: "high"
      }),
    });

    if (!r.ok) {
      const errTxt = await r.text();
      console.log(`❌ Image generation failed:`, {
        error: errTxt,
        prompt_length: enhancedPrompt.length,
        timestamp: new Date().toISOString()
      });
      return res.status(500).json({ error: errTxt });
    }

    const data = await r.json();
    const item = data?.data?.[0];

    const b64 = item?.b64_json;
    const url = item?.url;

    // Log successful generation
    const duration = Date.now() - startTime;
    console.log(`✅ Image generated successfully:`, {
      model: "gpt-image-1",
      size: "1024x1024",
      quality: "high",
      cost_estimate: "TBD",
      duration_ms: duration,
      prompt_length: enhancedPrompt.length,
      has_quiz_band: !!(band && band.trim()),
      has_quiz_bookFilm: !!(bookFilm && bookFilm.trim()),
      has_quiz_animal: !!(animal && animal.trim()),
      style_choice: styleKey,
      style_resolved_custom: styleKey === 'custom' && !!((artStyleCustom || artStyle || '').trim()),
      has_personality_prompt: !!(personalityPrompt && personalityPrompt.trim()),
      timestamp: new Date().toISOString()
    });

    if (b64) {
      return res.status(200).json({ 
        dataUrl: `data:image/png;base64,${b64}`,
        botName: botName || null,
        // return back style information for persistence
        styleChoice: styleKey,
        artStyle: resolvedStyle,
        artStyleCustom: artStyleCustom || null,
        personalityPrompt: personalityPrompt || null,
        // echo quiz fields for traits persistence
        traits: { band: band || null, bookFilm: bookFilm || null, animal: animal || null }
      });
    }
    if (url) {
      return res.status(200).json({ 
        dataUrl: url,
        botName: botName || null,
        styleChoice: styleKey,
        artStyle: resolvedStyle,
        artStyleCustom: artStyleCustom || null,
        personalityPrompt: personalityPrompt || null,
        traits: { band: band || null, bookFilm: bookFilm || null, animal: animal || null }
      });
    }

    return res.status(500).json({ error: "No image returned" });
  } catch (e) {
    console.log(`❌ Image generation error:`, {
      error: e.message,
      timestamp: new Date().toISOString()
    });
    return res.status(500).json({ error: e.message || "Unexpected error" });
  }
}
