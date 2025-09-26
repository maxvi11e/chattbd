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
    const isAbstractMode = subjectBroad && subjectBroad.toLowerCase() === 'abstract' && !subjectSpecific && !subjectAnimal;
    if (isAbstractMode) {
      // Replace the resolved style with a non-figurative abstract framing to avoid humanoid bias.
      enhancedPrompt = `Square abstract generative composition, non-figurative, no faces, no characters, rich texture subtle depth, clean negative space balance.`;
    }
    let subjectLine;
    if (subjectAnimal) {
      subjectLine = `Primary subject and silhouette: ${subjectAnimal}-inspired character; posture and presence reflect a ${subjectAnimal} archetype.`;
    } else if (subjectBroad && subjectBroad.toLowerCase() === 'abstract' && !subjectSpecific) {
      // Abstract mode: produce a purely non-figurative description derived from sliders
      const s1 = Number(traits?.seriousPlayful);
      const s2 = Number(traits?.succinctChatty);
      const s3 = Number(traits?.rationalIntuitive);
      const s4 = Number(traits?.conservativeLiberal);

      // Helper to map a 1-10 scale into low/mid/high buckets
      const bucket = (v) => {
        if (!Number.isFinite(v)) return 'mid';
        if (v <= 3) return 'low';
        if (v >= 8) return 'high';
        return 'mid';
      };
      const b1 = bucket(s1); // serious vs playful
      const b2 = bucket(s2); // succinct vs chatty (density)
      const b3 = bucket(s3); // rational vs intuitive (geometry vs organic)
      const b4 = bucket(s4); // conservative vs liberal (order vs dynamic)

      // Color palette influenced mostly by serious/playful + vibe
      let palette;
      if (b1 === 'low') palette = 'muted deep blues and slate grays';
      else if (b1 === 'high') palette = 'vibrant oranges, pinks, and electric yellows';
      else palette = 'balanced teal and soft amber accents';
      if (vibe) {
        const vLower = String(vibe).toLowerCase();
        if (vLower.includes('calm') || vLower.includes('serene')) palette = 'hushed cool pastels (soft aqua, lavender, misty white)';
        else if (vLower.includes('myster')) palette = 'deep indigos, violets, and subtle iridescent glows';
        else if (vLower.includes('energetic') || vLower.includes('radiant')) palette = 'high-contrast neons over dark charcoal field';
        else if (vLower.includes('dream')) palette = 'diffused pearlescent gradients with opalescent transitions';
        else if (vLower.includes('dramatic')) palette = 'bold chiaroscuro contrasts: obsidian blacks, molten gold highlights';
      }

      // Shape language (geometry vs organic)
      let shapes;
      if (b3 === 'low') shapes = 'precise layered geometric planes and concentric arcs';
      else if (b3 === 'high') shapes = 'flowing organic wisps and amorphous gradient clouds';
      else shapes = 'hybrid semi-geometric looping ribbons';

      // Pattern density (succinct/chatty)
      let density;
      if (b2 === 'low') density = 'minimal open negative space';
      else if (b2 === 'high') density = 'intricate interlaced micro-pattern filaments';
      else density = 'moderate layered translucent strata';

      // Structural order (conservative/liberal)
      let structure;
      if (b4 === 'low') structure = 'subtle axial symmetry anchoring the composition';
      else if (b4 === 'high') structure = 'dynamic asymmetry with directional motion cues';
      else structure = 'soft radial balance without strict symmetry';

      subjectLine = `Primary subject: purely abstract color-field and pattern composition; ${palette}; ${shapes}; ${density}; ${structure}; no figurative, humanoid, animal, or character elements.`;
    } else if (subjectSpecific && subjectBroad) {
      subjectLine = `Primary subject and silhouette: ${subjectSpecific} concept within the ${subjectBroad} archetype category; posture and presence reflect ${subjectSpecific} motifs.`;
    } else if (subjectSpecific) {
      subjectLine = `Primary subject and silhouette: ${subjectSpecific} persona concept; posture and presence emphasize its defining motifs.`;
    } else if (subjectBroad) {
      subjectLine = `Primary subject and silhouette: ${subjectBroad}-inspired character; posture and presence reflect a ${subjectBroad} archetype.`;
    } else {
      subjectLine = `Primary subject: minimal abstract composition with balanced negative space; no figurative or humanoid elements.`;
    }
  enhancedPrompt += ` ${subjectLine}`;
    
    if (!isAbstractMode) {
      if (prompt && String(prompt).trim()) {
        enhancedPrompt += ` Persona/theme: ${String(prompt).trim()}.`;
      } else {
        enhancedPrompt += ` Persona/theme: original, distinctive character.`;
      }
    } else if (prompt && String(prompt).trim()) {
      enhancedPrompt += ` Conceptual prompt influence (abstract reinterpretation): ${String(prompt).trim()}; reinterpret purely as color, light, pattern, motion; no figurative depiction.`;
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
      if (isAbstractMode) {
    enhancedPrompt += ` Composition qualities derived from personality sliders: ${traitWords.join(', ')} (mapped to palette contrast, rhythm, geometric vs fluid balance, pattern complexity).`;
      } else {
        enhancedPrompt += ` Persona traits: ${traitWords.join(', ')}.`;
      }
    }

    // Generalization guidelines to avoid specific IP
  enhancedPrompt += ` Guidelines: Translate any named bands, books, films, or brands into generic themes, moods, genres, and eras. Do not depict or name specific copyrighted characters, actors, logos, titles, or text.${isAbstractMode ? ' Absolutely no faces, heads, bodies, limbs, eyes, hands, creatures, characters, silhouettes, anatomy, portrait framing, or figurative suggestion; keep strictly non-figurative and non-iconic.' : ' Create an original, novel character that only captures the abstract vibe of the references.'} Combine influences subtly.`;

    if (isAbstractMode) {
      enhancedPrompt += ` Negative constraints: exclude (face, head, body, limb, hand, eye, mouth, creature, animal, person, human, character, silhouette). Focus on interplay of color fields, gradients, evolving shapes, spatial tension, emergent pattern, subtle texture layering. Emphasize non-representational modern abstract design.`;
      // Last-pass sanitation: soften any leftover 'character' tokens inadvertently inserted earlier
      enhancedPrompt = enhancedPrompt.replace(/character/gi, 'composition');
    }

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
  size: "1024x1024",   // square avatar; supported values: 1024x1024, 1024x1536, 1536x1024, auto
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
  size: "1024x1024",
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
