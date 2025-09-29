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
  const t4 = sliderWord(traits.practicalImaginative,'practical','imaginative');
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
      // Abstract path: single cohesive "digital organism" emblem derived from sliders (now simplified / less busy)
      const raw = {
        sp: Number(traits?.seriousPlayful),
        sc: Number(traits?.succinctChatty),
        ri: Number(traits?.rationalIntuitive),
        cl: Number(traits?.practicalImaginative)
      };
      const band = (n)=>{ if(!Number.isFinite(n)) return 'mid'; if(n<=30) return 'low'; if(n>=70) return 'high'; return 'mid'; };
      const b = { sp: band(raw.sp), sc: band(raw.sc), ri: band(raw.ri), cl: band(raw.cl) };

      // Simplified slider-driven descriptors (match suggest-abstract.js)
      const chroma = b.sp==='low'
        ? 'cool white/blue lines with gentle cyan glow'
        : b.sp==='high'
          ? 'bright neon cyan with warm amber highlights'
          : 'clean cyan with subtle amber accents';

      const structureCore = b.ri==='low'
        ? 'geometric wireframe rings and grid'
        : b.ri==='high'
          ? 'flowing energy strands and arcs'
          : 'mesh of arcs and short lattice segments';

      const fillLine = b.sc==='low'
        ? 'balanced interior with clear negative space between lines'
        : b.sc==='high'
          ? 'richer line work with tight spacing, but keep background visible outside the figure'
          : 'medium density with even spacing';

      const symmetry = b.cl==='low'
        ? 'strong bilateral symmetry'
        : b.cl==='high'
          ? 'slight asymmetry for energy direction'
          : 'near-bilateral with small variations';

      const vibePhrase = vibe ? `Ambient mood field: ${String(vibe).trim()}.` : '';
      const concept = (prompt && String(prompt).trim()) || (archetypeSpecificDesc && String(archetypeSpecificDesc).trim()) || '';

      const organismDescriptor = 'Centered abstract humanoid bust (head, neck, shoulders, upper chest and upper arms) drawn as luminous lines on a pure black background';
      const containment = 'clear outer contour, gentle inner volumetric glow, shallow depth layering';

      const framing = 'Framing: medium-distance bust portrait with visible shoulder line and slight breathing room around silhouette (avoid extreme close-up).';

      const eyesDescriptor = 'Eyes: friendly rounded almond openings with soft glow; no pupils; minimal tilt.';

      const featureIntegration = 'No realistic anatomy; features remain abstract energy lines that fuse into the lattice.';
      const exclusions = 'no HUD/interface, no text, no logos, no photographic realism, no extra bodies';
      const detailLine = dl ? `Detail level ${dl}/10.` : '';
      const conceptLine = concept ? `Theme: ${concept}.` : '';

      const traitEnergy = traitWords.length ? `Traits: ${traitWords.join(', ')}.` : '';

      finalPrompt = [
        organismDescriptor + '.',
        `Color: ${chroma}.`,
        `Structure: ${structureCore}.`,
        `Fill: ${fillLine}.`,
        `Symmetry: ${symmetry}.`,
        eyesDescriptor,
        featureIntegration,
        'Contrast: very bright lines with crisp edges; protect blacks; background stays pure black.',
        'Composition: medium distance with breathing room; keep all particles inside the silhouette; avoid stray noise.',
        traitEnergy,
        conceptLine,
        vibePhrase,
        detailLine,
        `Constraints: ${exclusions}.`
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

    const providedBotName = botName ? String(botName).trim() : '';
    const autoAbstractName = isAbstract && !providedBotName ? pickAbstractName() : null;
    const derivedAbstractName = autoAbstractName?.label || null;
    const finalBotName = providedBotName || (isAbstract ? derivedAbstractName : '') || (archetypeSpecific || '').trim();

    const responseBase = {
      botName: finalBotName || null,
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
