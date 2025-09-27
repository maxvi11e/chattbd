// api/suggest-abstract.js
// Returns an abstract digital organism suggestion derived from slider inputs.
// Expected POST JSON: { sliders: { seriousPlayful, succinctChatty, rationalIntuitive, practicalImaginative }, vibe?, detailLevel? }

export default async function handler(req, res){
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { sliders = {}, vibe, detailLevel } = await req.body || {};
    // Normalize values 0-100 (fallback 50)
    const norm = (v)=>{ const n=Number(v); return Number.isFinite(n)? Math.min(100,Math.max(0,n)) : 50; };
    const s = {
      sp: norm(sliders.seriousPlayful),
      sc: norm(sliders.succinctChatty),
      ri: norm(sliders.rationalIntuitive),
    cl: norm(sliders.practicalImaginative)
    };

    // Buckets
    const bucket = (n)=> n<=30? 'low' : n>=70? 'high':'mid';
    const b = { sp: bucket(s.sp), sc: bucket(s.sc), ri: bucket(s.ri), cl: bucket(s.cl) };

    // Name construction heuristics
    function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

    const cores = {
      sp: b.sp==='low'? ['Axiom','Obsidian','Stillwave'] : b.sp==='high'? ['Luma','Flare','Prism'] : ['Echo','Intermediate','Median'],
      ri: b.ri==='low'? ['Grid','Vector','Circuit'] : b.ri==='high'? ['Flux','Drift','Bloom'] : ['Loop','Weave','Nexus']
    };
    const mod = b.sc==='high'? ['Array','Cluster','Swarm'] : b.sc==='low'? ['Core','Node','Singularity'] : ['Matrix','Shell','Layer'];
    const dyn = b.cl==='high'? ['Evolving','Adaptive','Emergent'] : b.cl==='low'? ['Stable','Centered','Harmonic'] : ['Balanced','Equatorial','Contained'];

    const name = `${pick(dyn)} ${pick(cores.sp)}-${pick(cores.ri)} ${pick(mod)}`.replace(/\s+/g,' ').trim();

    // Simple slider-driven prompt (AI head, chest, and upper arms on pure black)
    const palette = b.sp === 'low'
      ? 'cool white/blue lines with gentle deep blue glow'
      : b.sp === 'high'
        ? 'luminous high-chroma spectral gradients. use high saturation, high vibrancy colors'
        : 'deep cool spectrum with high vibrancy accents';

    const logic = b.ri === 'low'
      ? 'geometric wireframe rings and grid'
      : b.ri === 'high'
        ? 'flowing energy strands and arcs'
        : 'mesh of arcs and short lattice segments';

    const fill = b.sc === 'low'
      ? 'balanced interior with clear negative space between lines'
      : b.sc === 'high'
        ? 'richer line work with tight spacing, but keep background visible outside the figure'
        : 'medium density with even spacing';

    const symmetry = b.cl === 'low'
      ? 'strong bilateral symmetry'
      : b.cl === 'high'
        ? 'slight asymmetry for energy direction'
        : 'near-bilateral with small variations';

    const vibeLine = vibe ? `Mood: ${String(vibe).trim()}.` : '';
    const detailLine = Number.isFinite(Number(detailLevel)) ? `Detail level ${Math.min(10,Math.max(1,Number(detailLevel)))}/10.` : '';

    const descriptionLines = [
      'Centered abstract humanoid bust (head, neck, shoulders, upper chest and upper arms) drawn as luminous lines on a pure black background.',
      `Color: ${palette}.`,
      `Structure: ${logic}.`,
      `Fill: ${fill}.`,
      `Symmetry: ${symmetry}.`,
      'Eyes: friendly rounded almond openings with soft glow; no pupils.',
      'Contrast: very bright lines with crisp edges; protect blacks; no interface/HUD, no text, no logos.',
      'Composition: medium distance with breathing room around the figure; keep all particles inside the silhouette.',
      'add extreme brightness and luminosity to all elements',
      vibeLine,
      detailLine
    ].filter(Boolean);
    const description = descriptionLines.join('\n');

    return res.status(200).json({ name, description });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Unexpected error' });
  }
}
