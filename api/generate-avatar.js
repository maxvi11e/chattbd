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
      // legacy animal still accepted for backwards compat
      animal, styleChoice, artStyleCustom,
  // final simplified quiz fields
  archetype, archetypeSpecific, archetypeSpecificDesc, traits, vibe, detailLevel
    } = req.body || {};
  // Persona prompt is optional (options mode may omit it)

    // Map style choice to concrete style descriptor
    const defaultStyle = `Square portrait avatar, crisp line art, subtle texture, softly lit, centered, clean edge lighting.`;
    const styleMap = {
      default: defaultStyle,
      realistic: `Square portrait avatar, photorealistic, cinematic soft light, shallow depth of field, detailed skin and fabric, centered composition.`,
      vector: `Square portrait avatar, simplified vector illustration, flat colors, clean geometric shapes, minimal shading, centered composition.`,
      impressionistic: `Square portrait avatar, impressionistic brush strokes, luminous color blending, soft atmospheric edges, painterly texture, centered composition.`,
      'fantasy concept art': `Square portrait avatar, high-fantasy concept art, painterly detail, dramatic rim light, volumetric fog, epic mood, centered composition.`,
      'anime illustration': `Square portrait avatar, anime character illustration, clean line art, cel shading, expressive eyes, vibrant palette, centered composition.`,
      'pixel art': `Square portrait avatar, crisp pixel-art aesthetic, limited palette, blocky shapes, retro game style, centered composition.`,
      "children's book": `Square portrait avatar, children's book illustration, soft textures, friendly shapes, warm inviting colors, centered composition.`,
      custom: (artStyleCustom || artStyle || '').trim()
    };
  const styleKey = (styleChoice || '').trim() || 'default';
  const resolvedStyle = (styleMap[styleKey] || '').trim() || defaultStyle;

  // Colors removed in simplified schema

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
      const t2 = sliderToWord(traits.succinctChatty, 'succinct', 'chatty');
      const t3 = sliderToWord(traits.rationalIntuitive, 'rational', 'intuitive');
      const t4 = sliderToWord(traits.conservativeLiberal, 'conservative', 'progressive');
      [t1, t2, t3, t4].forEach(w => { if (w && w !== 'balanced') traitWords.push(w); });
    }

    // Build enhanced prompt with quiz-driven vibe, generalized from references
    let enhancedPrompt = `${resolvedStyle}`;
    // Primary subject selection hierarchy:
    // 1. animal (legacy)
    // 2. archetypeSpecific (model-suggested specific persona)
    // 3. archetype (broad category)
    // 4. fallback abstract form
    const subjectAnimal = animal && animal.trim();
    const subjectSpecific = archetypeSpecific && String(archetypeSpecific).trim();
    const subjectBroad = archetype && String(archetype).trim();
    let subjectLine;
    if (subjectAnimal) {
      subjectLine = `Primary subject and silhouette: ${subjectAnimal}-inspired character; posture and presence reflect a ${subjectAnimal} archetype.`;
    } else if (subjectSpecific && subjectBroad) {
      subjectLine = `Primary subject and silhouette: ${subjectSpecific} concept within the ${subjectBroad} archetype category; posture and presence reflect ${subjectSpecific} motifs.`;
    } else if (subjectSpecific) {
      subjectLine = `Primary subject and silhouette: ${subjectSpecific} persona concept; posture and presence emphasize its defining motifs.`;
    } else if (subjectBroad) {
      subjectLine = `Primary subject and silhouette: ${subjectBroad}-inspired character; posture and presence reflect a ${subjectBroad} archetype.`;
    } else {
      subjectLine = `Primary subject and silhouette: abstract humanoid silhouette emphasizing iconic readable shape.`;
    }
    enhancedPrompt += ` ${subjectLine}`;
    
    if (prompt && String(prompt).trim()) {
      enhancedPrompt += ` Persona/theme: ${String(prompt).trim()}.`;
    } else {
      enhancedPrompt += ` Persona/theme: original, distinctive character.`;
    }
  // primary use removed
    if (archetypeSpecificDesc && String(archetypeSpecificDesc).trim()) {
      enhancedPrompt += ` Persona detail hint: ${String(archetypeSpecificDesc).trim()}.`;
    }
    if (vibe && String(vibe).trim()) {
      enhancedPrompt += ` Overall vibe/mood: ${String(vibe).trim()}.`;
    }
    if (Number.isFinite(Number(detailLevel))) {
      const dl = Math.min(10, Math.max(1, Number(detailLevel)));
      enhancedPrompt += ` Detail level: ${dl}/10.`;
    }
    if (traitWords.length) {
      enhancedPrompt += ` Persona traits: ${traitWords.join(', ')}.`;
    }

    // Generalization guidelines to avoid specific IP
    enhancedPrompt += ` Guidelines: Translate any named bands, books, films, or brands into generic themes, moods, genres, and eras. Do not depict or name specific copyrighted characters, actors, logos, titles, or text. Create an original, novel character that only captures the abstract vibe of the references. Combine influences subtly.`;

    // Provide references as inputs for abstraction (quoted but to be generalized)
  // references removed (band/book)

    // Additional details
    if (personalityPrompt && String(personalityPrompt).trim()) {
      enhancedPrompt += ` Additional details: ${String(personalityPrompt).trim()}.`;
    }

    // Output restrictions to reinforce safety
    enhancedPrompt += ` Output restrictions: no text overlays, no brand logos, no direct likenesses of real people or copyrighted characters.`;

    // Normalize image quality to match provider options
    const qRaw = (process.env.IMAGE_QUALITY || 'medium').toLowerCase().trim();
    const qMap = { standard: 'medium', hd: 'high' };
    const qualitySetting = qMap[qRaw] || (['low','medium','high'].includes(qRaw) ? qRaw : 'medium');

    const r = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
  body: JSON.stringify({
        model: "gpt-image-1",
        prompt: enhancedPrompt,
        size: "512x512",   // ✅ valid size
        n: 1,
  quality: qualitySetting
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
      size: "512x512",
      quality: qualitySetting,
      cost_estimate: "TBD",
      duration_ms: duration,
      prompt_length: enhancedPrompt.length,
      has_quiz_animal: !!(animal && animal.trim()),
  has_archetype: !!(archetype && String(archetype).trim()),
  has_archetype_specific: !!(archetypeSpecific && String(archetypeSpecific).trim()),
  has_primary_use: false,
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
          archetype_specific: archetypeSpecific || null,
          primary_use: null,
          vibe: vibe || null,
          personality_words: traitWords,
          detail_level: Number.isFinite(Number(detailLevel)) ? Math.min(10, Math.max(1, Number(detailLevel))) : null,
          sliders_raw: traits || null
        },
        promptUsed: enhancedPrompt
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
          archetype_specific: archetypeSpecific || null,
          primary_use: null,
          vibe: vibe || null,
          personality_words: traitWords,
          detail_level: Number.isFinite(Number(detailLevel)) ? Math.min(10, Math.max(1, Number(detailLevel))) : null,
          sliders_raw: traits || null
        },
        promptUsed: enhancedPrompt
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
