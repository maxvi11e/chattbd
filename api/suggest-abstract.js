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
      'Abstract humanoid silhouette (head, shoulders, upper torso) formed entirely from internal pattern energy — no realistic anatomy.',
      `Palette: ${palette}.`,
      `Internal structural logic: ${logic}.`,
      `Spatial / particulate density: ${density}.`,
      'Uniform density directive: maintain even filament distribution across the entire silhouette (head, neck, shoulders). Keep overall coverage ~88–92% with consistent gap width (±10% variance). Avoid hot spots and sparse patches; no center/edge falloff.',
      'Multi-scale layering: macro silhouette + mid-frequency rib lattice + fine filament / fractal micro-mesh cross-weave.',
      'Edge definition: thin luminous perimeter trace plus subtle inner echo line reinforcing silhouette; avoid diffuse fuzzy edge bleed.',
      'Silhouette anatomy cues: clear torso taper; defined shoulder curve; coherent neck transition.',
  'Visibility priority: strong internal luminosity; significantly reduce transparency; reinforce filled volumes; solid bright filament cores with controlled outer chromatic fringe (avoid overbloom).',
  'Opacity directive: minimize see-through background between primary strands; keep gap widths uniform (3–6px equivalent at 1024×1024) across all regions.',
  'Strand/point quantity: 18–24 primary axial/diagonal strands and 40–60 secondary cross-links, ≥120 micro nodes — distributed evenly across the silhouette.',
  'Strand directive: each primary filament has a bright opaque core, softer chromatic fringe, occasional braided merges indicating energy flow thickness variation; no wispy faint vapor.',
      `Macro form & symmetry: ${symmetry}.`,
      'Depth shaping via gentle internal occlusion gradients and alternating luminous/dim bands (avoid flat wash).',
      'Include minimal voids indicating eyes (small dark ovals) without realistic facial detail.',
      'Background: subdued low-noise gradient; prevent competing bright clusters to emphasize filled figure.',
      'Negative: no large hollow interior; avoid fog, haze, bloom spill, grain; avoid large voids, sparse speckle, photographic realism, text, logos, extra limbs, duplicated figures.',
      'add extereme brightness and luminosity to all elements',
      '10x thickness and brightness for 10% of all elements',
      vibeLine,
      detailLine
    ].filter(Boolean);
    const description = descriptionLines.join('\n');

    return res.status(200).json({ name, description });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Unexpected error' });
  }
}
