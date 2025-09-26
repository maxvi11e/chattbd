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
      // Abstract path: single cohesive "digital organism" emblem derived from sliders
      const raw = {
        sp: Number(traits?.seriousPlayful),
        sc: Number(traits?.succinctChatty),
        ri: Number(traits?.rationalIntuitive),
        cl: Number(traits?.conservativeLiberal)
      };
      const band = (n)=>{ if(!Number.isFinite(n)) return 'mid'; if(n<=3) return 'low'; if(n>=8) return 'high'; return 'mid'; };
      const b = { sp: band(raw.sp), sc: band(raw.sc), ri: band(raw.ri), cl: band(raw.cl) };

      const chroma = b.sp==='low' ? 'subtle desaturated deep cool palette with ember accents' : b.sp==='high' ? 'vivid luminous spectral palette (teals, ambers, magentas)' : 'balanced luminous cyan–amber bi-tone palette';
      const structureCore = b.ri==='low' ? 'precise concentric rings, modular lattice nodes' : b.ri==='high' ? 'fluid swirling energy filaments, diffused plasma shells' : 'hybrid semi-geometric arcs interwoven with soft flux ribbons';
      const density = b.sc==='low' ? 'minimal interior voids and clean negative space corridors' : b.sc==='high' ? 'dense mesh of micro-connective spark lines and particulate clusters' : 'layered medium complexity strata';
      const symmetry = b.cl==='low' ? 'stable bilateral symmetry with quiet axial equilibrium' : b.cl==='high' ? 'dynamic off-center growth asymmetry and motion vector bias' : 'gentle quasi-radial balance';

      const vibePhrase = vibe ? `Ambient mood field: ${String(vibe).trim()}.` : '';
      const concept = (prompt && String(prompt).trim()) || (archetypeSpecificDesc && String(archetypeSpecificDesc).trim()) || '';

      const organismDescriptor = 'single self-contained luminous abstract digital organism core, perceived as an emergent intelligence node';
      const containment = 'centered, crisp silhouettable perimeter (no figurative anatomy), soft volumetric inner glow, subtle depth parallax';
      const exclusions = 'exclude faces, eyes, heads, bodies, limbs, creatures, icons, logos, text, letters, recognizable symbols';
      const detailLine = dl ? `Micro-detail intensity target: ${dl}/10.` : '';
      const conceptLine = concept ? `Concept influence (fully abstracted): ${concept}; translate into energy topology only.` : '';

      // Map traitWords into organism metaphors
      const traitEnergy = traitWords.length ? `Express traits as modulation of energy flow and topology: ${traitWords.join(', ')}.` : '';

      finalPrompt = [
        'Square dark backdrop for contrast.',
        organismDescriptor + ',',
        chroma + ',',
        structureCore + ',',
        density + ',',
        symmetry + ',',
        containment + '.',
        traitEnergy,
        conceptLine,
        vibePhrase,
        detailLine,
        'Surface qualities: layered translucent plasma membranes, procedural node clusters, subtle particle drift, coherent core nucleus.',
        'Behavior suggestion (visual only): faint pulsing, rotational micro-parallax, data-like flicker strands.',
        `Hard constraints: ${exclusions}. No humanoid suggestion.`,
        'Do not resemble any specific cinematic interface; keep original and novel.'
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
