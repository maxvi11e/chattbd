// api/generate-avatar.js (refactored for new paradigm: humanoid vs abstract)
// Input (POST JSON): { archetype, archetypeSpecific?, archetypeSpecificDesc?, traits?, vibe?, detailLevel?, styleChoice?, prompt? }
// Archetypes: "Human", "Sci-Fi / Fantasy" => humanoid path; "Abstract" => abstract path; "custom" treated like humanoid unless equals Abstract.

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
      const band = (n)=>{ if(!Number.isFinite(n)) return 'mid'; if(n<=3) return 'low'; if(n>=8) return 'high'; return 'mid'; };
      const b = { sp: band(raw.sp), sc: band(raw.sc), ri: band(raw.ri), cl: band(raw.cl) };

      // Palette: restrict to 2-3 harmonics for recognizability
      const chroma = b.sp==='low'
        ? 'two-tone deep indigo + ember accent palette'
        : b.sp==='high'
          ? 'tight triad luminous cyan, amber, magenta'
          : 'balanced dual cyan–amber glow';

      // Core structure simplified (macro forms not many permutations)
      const structureCore = b.ri==='low'
        ? 'macro concentric ring core with sparse lattice spokes'
        : b.ri==='high'
          ? 'macro swirling vortex core with soft plasma veil'
          : 'macro hybrid ring + spiral core';

      // Density: only escalate fine detail when chatty is high; else keep minimal/medium
      const density = b.sc==='low'
        ? 'minimal internal micro-detail; large negative space cavities'
        : b.sc==='high'
          ? 'moderate (not dense) micro-filaments around core, avoid clutter'
          : 'controlled medium layering';

      const symmetry = b.cl==='low'
        ? 'stable near-bilateral balance'
        : b.cl==='high'
          ? 'slight asymmetry with directional energy bias (avoid chaotic scatter)'
          : 'soft quasi-radial equilibrium';

      const vibePhrase = vibe ? `Ambient mood field: ${String(vibe).trim()}.` : '';
      const concept = (prompt && String(prompt).trim()) || (archetypeSpecificDesc && String(archetypeSpecificDesc).trim()) || '';

      const organismDescriptor = 'single luminous abstract humanoid bust (head + shoulders) constructed from energized pattern filaments';
      const containment = 'centered macro form, clear outer contour, gentle inner volumetric glow, shallow depth layering';

      const framing = 'Framing: medium-distance bust portrait with visible shoulder line and slight breathing room around silhouette (avoid extreme close-up).';

      const facePlane = b.cl === 'low'
        ? 'Face plane: shield-like geometry with disciplined bilateral symmetry and softly squared jaw taper.'
        : b.cl === 'high'
          ? 'Face plane: flowing off-axis geometry with elongated jaw taper and directional sweep; maintain readable silhouette.'
          : 'Face plane: balanced oval geometry with subtle asymmetry and tapered jaw contour.';

      const eyesDescriptor = b.sp === 'low'
        ? 'Eyes indicated as narrow horizontal negative-space slits with precise edges and minimal upward tilt; emphasize focused calm gaze.'
        : b.sp === 'high'
          ? 'Eyes indicated as luminous curved apertures with upbeat upward tilt, layered halos, and animated spark accents.'
          : 'Eyes indicated as almond luminous cutouts with controlled inner glow, subtle upward taper, and articulated eyelid arcs.';

      const featureIntegration = 'Facial feature cues must remain abstract energy constructs — no realistic skin, teeth, or pupils; features merge seamlessly into the surrounding lattice.';
      const brightnessDirective = 'Brightness amplification: mimic a 100% brightness mask pass — drive filament cores to near-pure white with additive glow while preserving crisp silhouette edges and deep-black background.';
      const glowLayering = 'Glow layering: dual-stage halo (tight inner bloom + slim outer rim light), avoid wide haze or fog.';
      const exclusions = 'exclude photographic realism, literal skin texture, text, logos, letters, recognizable symbols, additional full bodies, extra heads, overt creature anatomy';
      const detailLine = dl ? `Micro-detail ceiling: ${dl}/10 (respect minimalism).` : '';
      const conceptLine = concept ? `Concept hint (abstracted): ${concept}; reinterpret as symbolic energy motifs embedded within the facial lattice (no literal objects).` : '';

      const traitEnergy = traitWords.length ? `Translate traits into modulation of glow rhythm, ocular energy arcs, and filament curvature: ${traitWords.join(', ')}.` : '';

      finalPrompt = [
        'Square dark neutral backdrop for contrast.',
        organismDescriptor + ',',
        chroma + ',',
        structureCore + ',',
        density + ',',
        symmetry + ',',
        containment + '.',
        framing,
        facePlane,
        eyesDescriptor,
        'Facial feature spacing: maintain clear forehead, cheek, and chin zones with softly implied cheekbones; shoulders suggested via gentle downward sweep of filaments (no hands).',
        'Nose and mouth remain implied only as smooth energy gradients — do not draw explicit structures.',
        featureIntegration,
        brightnessDirective,
        glowLayering,
        'Macro emphasis: large continuous forms > tiny fragments; avoid busy repetition; no visual noise.',
        'Focus on 1 coherent central entity; avoid multiple competing motifs.',
        traitEnergy,
        'Luminosity directive: push filaments toward near-white intensity with controlled bloom, preserving crisp edges; background stays deep black for maximum contrast.',
        'Facial cues must stay loose and suggestive; avoid literal pupils, nostrils, lips, or teeth.',
        conceptLine,
        vibePhrase,
        detailLine,
        'Surface: high-intensity smooth energy membranes with additive white cores, sparse node sparks (<= 12), subtle particle halo, razor-sharp contour readability.',
        'Behavior suggestion (implied only): faint pulse + slow rotational parallax; no extra UI widgets.',
        `Hard constraints: ${exclusions}. Keep fully stylized abstract energy aesthetic (non-photorealistic).`,
        'Original – avoid resemblance to known movie HUDs (e.g. famous AI interfaces).'
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
      botName: botName ? String(botName).trim() : (archetypeSpecific || null),
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
