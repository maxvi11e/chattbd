// api/generate-avatar.js (refactored for new paradigm: humanoid vs abstract)
// Input (POST JSON): { archetype, archetypeSpecific?, archetypeSpecificDesc?, traits?, vibe?, detailLevel?, styleChoice?, prompt? }
// Archetypes: "Human", "Sci-Fi / Fantasy" => humanoid path; "Abstract" => abstract path; "custom" treated like humanoid unless equals Abstract.

export default async function handler(req, res){
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const startTime = Date.now();
  try {
    const {
      archetype, archetypeSpecific, archetypeSpecificDesc,
      traits, // { seriousPlayful, succinctChatty, rationalIntuitive, conservativeLiberal }
      vibe, detailLevel, styleChoice, prompt,
      // legacy tolerated but ignored
      artStyleCustom
    } = req.body || {};

    const broad = (archetype || '').trim();
    if (!broad) return res.status(400).json({ error: 'Missing archetype' });
    const isAbstract = broad.toLowerCase() === 'abstract';

    // --- Traits mapping (simple, neutral) ---
    const sliderWord = (v,left,right)=>{ const n=Number(v); if(!Number.isFinite(n)) return null; if(n<=3) return left; if(n>=8) return right; return 'balanced';};
    let traitWords = [];
    if (traits && typeof traits === 'object') {
      const t1 = sliderWord(traits.seriousPlayful,'serious','playful');
      const t2 = sliderWord(traits.succinctChatty,'succinct','chatty');
      const t3 = sliderWord(traits.rationalIntuitive,'rational','intuitive');
      const t4 = sliderWord(traits.conservativeLiberal,'conservative','progressive');
      ;[t1,t2,t3,t4].forEach(w=>{ if(w && w!=='balanced') traitWords.push(w); });
    }

    // --- Style selection (humanoid oriented styles only applied to humanoid path) ---
    const portraitBase = 'Square portrait, clean lighting, clear readability, subtle depth, crisp edges.';
    const styleMapHumanoid = {
      default: portraitBase,
      realistic: 'Square portrait, semi-photoreal, cinematic soft key light, natural materials, subtle depth of field.',
      vector: 'Square portrait, flat vector shapes, minimal shading, geometric clarity, high readability.',
      impressionistic: 'Square portrait, painterly strokes, soft diffusion, luminous blended color, artistic texture.',
      anime: 'Square portrait, stylized line art, cel shading, expressive eyes, vibrant controlled palette.',
      pixel: 'Square portrait, pixel art, limited palette, crisp clusters, retro aesthetic.',
      custom: (artStyleCustom || '').trim()
    };
    const styleKeyRaw = (styleChoice || '').trim().toLowerCase();
    const styleKey = styleMapHumanoid[styleKeyRaw] ? styleKeyRaw : 'default';
    const humanoidStyle = styleMapHumanoid[styleKey] || styleMapHumanoid.default;

    // --- Detail Level ---
    const dl = Number.isFinite(Number(detailLevel)) ? Math.min(10, Math.max(1, Number(detailLevel))) : null;

    // --- Build Prompt ---
    let finalPrompt;

    if (isAbstract) {
      // Abstract path: interpret sliders into composition attributes
      const s = {
        tone: traitWords.includes('serious') ? 'muted restrained tone' : traitWords.includes('playful') ? 'vivid energetic chroma' : 'balanced chroma',
        density: traitWords.includes('succinct') ? 'spacious negative space' : traitWords.includes('chatty') ? 'intricate layered micro-patterns' : 'moderate layered forms',
        logic: traitWords.includes('rational') ? 'structured geometric segmentation' : traitWords.includes('intuitive') ? 'fluid organic gradients' : 'hybrid semi-geometric flow',
        social: traitWords.includes('conservative') ? 'symmetry and calm axial balance' : traitWords.includes('progressive') ? 'dynamic asymmetry and motion cues' : 'soft radial balance'
      };
      const vibePhrase = vibe ? `Ambient mood: ${String(vibe).trim()}.` : '';
      const concept = (prompt && String(prompt).trim()) || (archetypeSpecificDesc && String(archetypeSpecificDesc).trim()) || '';
      finalPrompt = [
        'Square abstract non-figurative composition, no faces, no bodies, no characters, no creatures, no silhouettes.',
        s.tone + ';', s.density + ';', s.logic + ';', s.social + ';',
        concept ? `Concept influence (purely abstracted): ${concept}; reinterpret only as color, pattern, motion.` : '',
        vibePhrase,
        dl ? `Detail richness: ${dl}/10.` : '',
        'Focus on interplay of color fields, gradients, emergent shapes, subtle layered texture. Absolutely exclude any figurative, anatomical, or icon-like suggestions.'
      ].filter(Boolean).join(' ');
    } else { // Humanoid path
      const nameOrSpecific = (archetypeSpecific && String(archetypeSpecific).trim()) || null;
      const broadLower = broad.toLowerCase();
      const categoryFlavor = broadLower.includes('sci-fi') ? 'futuristic imaginative' : 'human realistic';
      const concept = (prompt && String(prompt).trim()) || (archetypeSpecificDesc && String(archetypeSpecificDesc).trim()) || '';
      const traitLine = traitWords.length ? `Notable traits: ${traitWords.join(', ')}.` : '';
      finalPrompt = [
        humanoidStyle,
        `Single ${categoryFlavor} persona portrait, centered, shoulders-up, clean readable silhouette.`,
        nameOrSpecific ? `Identity seed: ${nameOrSpecific}.` : '',
        concept ? `Concept/theme: ${concept}.` : 'Original distinctive persona.',
        vibe ? `Overall mood: ${String(vibe).trim()}.` : '',
        dl ? `Detail level target: ${dl}/10.` : '',
        traitLine,
        'Safety: do not reference real people, trademarks, logos, or copyrighted characters. Keep fully original.'
      ].filter(Boolean).join(' ');
    }

    // --- Quality Setting ---
    const qRaw = (process.env.IMAGE_QUALITY || 'medium').toLowerCase().trim();
    const qMap = { standard: 'medium', hd: 'high' };
    const qualitySetting = qMap[qRaw] || (['low','medium','high'].includes(qRaw) ? qRaw : 'medium');

    const bodyPayload = {
      model: 'gpt-image-1',
      prompt: finalPrompt,
      size: '1024x1024',
      n: 1,
      quality: qualitySetting
    };

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
      archetype: broad,
      isAbstract,
      hasSpecific: !!archetypeSpecific,
      traits_present: !!traits,
      style_choice: isAbstract ? 'abstract_override' : styleKey,
      quality: qualitySetting,
      duration_ms: duration,
      prompt_length: finalPrompt.length
    });

    const responseBase = {
      styleChoice: isAbstract ? null : styleKey,
      archetype: broad,
      archetype_specific: archetypeSpecific || null,
      vibe: vibe || null,
      personality_words: traitWords,
      detail_level: dl,
      sliders_raw: traits || null,
      promptUsed: finalPrompt,
      mode: isAbstract ? 'abstract' : 'humanoid'
    };

    if (b64) return res.status(200).json({ dataUrl: `data:image/png;base64,${b64}`, ...responseBase });
    if (url) return res.status(200).json({ dataUrl: url, ...responseBase });
    return res.status(500).json({ error: 'No image returned' });
  } catch (e) {
    console.log('❌ Image generation error', { error: e.message });
    return res.status(500).json({ error: e.message || 'Unexpected error' });
  }
}
