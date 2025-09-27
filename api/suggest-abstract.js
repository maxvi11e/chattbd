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

    // Description assembly
    // New explicit low tier inserted. Previous "low" descriptors become the mid tier.
    // Low tier (new): user-specified minimal monochrome form.
    // Mid tier: formerly low descriptors (restrained, lattice, open void, anchored axial).
    // High tier: unchanged.
    let palette, logic, density, symmetry;

    // Palette
    if (b.sp === 'low') {
      palette = 'black and white';
    } else if (b.sp === 'high') {
      palette = 'luminous high-chroma spectral gradients';
    } else { // mid
      palette = 'restrained deep cool spectrum with ember micro-accents';
    }

    // Logic / structural motif
    if (b.ri === 'low') {
      logic = 'simple geometric rings';
    } else if (b.ri === 'high') {
      logic = 'fluid filamentary energy plumes and diffuse plasma veils';
    } else { // mid
      logic = 'modular geometric lattice and concentric data rings';
    }

    // Density / internal spatial quality (tripled overall vs prior baseline)
    if (b.sc === 'low') {
      density = 'sparse minimalist pattern (≈3x prior point density while preserving broad negative space)';
    } else if (b.sc === 'high') {
      density = 'ultra-dense layered micro-node mesh (≈3x particles) with controlled, not noisy, particulate sparkle';
    } else { // mid
      density = 'heightened medium density (≈3x structural filaments) with retained open void channels and crisp negative space halos';
    }

    // Symmetry / macro form
    if (b.cl === 'low') {
      symmetry = 'defined symmetry on vertical and horizontal axis';
    } else if (b.cl === 'high') {
      symmetry = 'asymmetric growth vectors and directional thrust';
    } else { // mid
      symmetry = 'anchored axial symmetry with calm equilibrium';
    }

    const vibeLine = vibe ? ` Ambient mood hint: ${String(vibe).trim()}.` : '';
    const detailLine = Number.isFinite(Number(detailLevel)) ? ` Detail richness target: ${Math.min(10,Math.max(1,Number(detailLevel)))}/10.` : '';

    // Rewritten as an image generation style prompt forming a humanoid silhouette from the pattern components.
    const description = [
      'Abstract humanoid silhouette (head, shoulders, upper torso) formed entirely from internal pattern energy — no realistic anatomy.',
      `Palette: ${palette}.`,
      `Internal structural logic: ${logic}.`,
  `Spatial / particulate density: ${density}.`,
  'Apply ~3x internal pattern / particulate density across the silhouette. Define the form clearly but avoid chaotic noise.',
      `Macro form & symmetry: ${symmetry}.`,
      'Facial region implied and eyes defined by minimal voids',
      'Subtle pulsing core luminescence; gentle rim glow separating figure from a subdued low-noise background.',
      'Avoid photographic realism, text, logos, extra limbs, clutter, duplicated figures.' ,
      vibeLine.trim(),
      detailLine.trim()
    ].filter(Boolean).join(' ');

    return res.status(200).json({ name, description });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Unexpected error' });
  }
}
