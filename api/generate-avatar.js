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
  // previous quiz fields (band/book removed)
  animal, styleChoice, artStyleCustom,
      // new refined quiz fields
      archetype, vibe, setting, colors, traits
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
      // new styles
      'fantasy concept art': `Square portrait avatar, high-fantasy concept art, painterly detail, dramatic rim light, volumetric fog, epic mood, centered composition.`,
      'anime illustration': `Square portrait avatar, anime character illustration, clean line art, cel shading, expressive eyes, vibrant palette, centered composition.`,
      'pixel art': `Square portrait avatar, crisp pixel-art aesthetic, limited palette, blocky shapes, retro game style, centered composition.`,
      "children's book": `Square portrait avatar, children's book illustration, soft textures, friendly shapes, warm inviting colors, centered composition.`,
      custom: (artStyleCustom || artStyle || '').trim()
    };
  const styleKey = (styleChoice || '').trim() || 'default';
  const resolvedStyle = (styleMap[styleKey] || '').trim() || defaultStyle;

    // Normalize colors: accept array or comma-separated string; cap at 3
    let colorList = [];
    if (Array.isArray(colors)) {
      colorList = colors.map(c => String(c).trim()).filter(Boolean);
    } else if (typeof colors === 'string') {
      colorList = colors.split(',').map(c => c.trim()).filter(Boolean);
    }
    colorList = [...new Set(colorList)].slice(0, 3);

    // Map traits sliders to adjectives
    const sliderToWord = (val, left, right) => {
      const n = Number(val);
      if (!Number.isFinite(n)) return null;
      if (n <= 40) return left;
      if (n >= 60) return right;
      return 'balanced';
    };
    const traitWords = [];
    if (traits && typeof traits === 'object') {
      const t1 = sliderToWord(traits.seriousPlayful, 'serious', 'playful');
      const t2 = sliderToWord(traits.introExtro, 'introverted', 'extroverted');
      const t3 = sliderToWord(traits.gentleFierce, 'gentle', 'fierce');
      [t1, t2, t3].forEach(w => { if (w && w !== 'balanced') traitWords.push(w); });
    }

    // Build enhanced prompt with quiz-driven vibe, generalized from references
    let enhancedPrompt = `${resolvedStyle}`;
    // Primary subject: animal takes precedence for backwards compatibility, else archetype, else default
    const subject = (animal && animal.trim()) || (archetype && archetype.trim()) || 'abstract humanoid silhouette';
    enhancedPrompt += ` Primary subject and silhouette: ${subject}-inspired character; posture and presence reflect a ${subject} archetype.`;
    
    enhancedPrompt += ` Persona/theme: ${prompt.trim()}.`;
    if (vibe && String(vibe).trim()) {
      enhancedPrompt += ` Overall atmosphere and emotional tone: ${String(vibe).trim()}.`;
    }
    if (setting && String(setting).trim()) {
      enhancedPrompt += ` Era and setting influences: ${String(setting).trim()}.`;
    }
    if (colorList.length) {
      enhancedPrompt += ` Color scheme emphasis: ${colorList.join(', ')}.`;
    } else {
      enhancedPrompt += ` Color scheme emphasis: neutral tones.`;
    }
    if (traitWords.length) {
      enhancedPrompt += ` Persona traits: ${traitWords.join(', ')}.`;
    }

    // Generalization guidelines to avoid specific IP
    enhancedPrompt += ` Guidelines: Translate any named bands, books, films, or brands into generic themes, moods, genres, and eras. Do not depict or name specific copyrighted characters, actors, logos, titles, or text. Create an original, novel character that only captures the abstract vibe of the references. Combine influences subtly.`;

    // Provide references as inputs for abstraction (quoted but to be generalized)
  // references removed (band/book)

    // Legacy optional personality details
    if (personalityPrompt && personalityPrompt.trim()) {
      enhancedPrompt += ` Additional personality notes: ${personalityPrompt.trim()}.`;
    }

    // Output restrictions to reinforce safety
    enhancedPrompt += ` Output restrictions: no text overlays, no brand logos, no direct likenesses of real people or copyrighted characters.`;

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
      has_quiz_animal: !!(animal && animal.trim()),
  // band/book removed
      has_archetype: !!(archetype && String(archetype).trim()),
      has_vibe: !!(vibe && String(vibe).trim()),
      has_setting: !!(setting && String(setting).trim()),
      colors_count: colorList.length,
      has_traits: !!(traits && typeof traits === 'object'),
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
        traits: { 
          animal: animal || null,
          archetype: archetype || null,
          vibe: vibe || null,
          setting: setting || null,
          colors: colorList,
          sliders: traits || null
        }
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
        traits: { 
          animal: animal || null,
          archetype: archetype || null,
          vibe: vibe || null,
          setting: setting || null,
          colors: colorList,
          sliders: traits || null
        }
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
