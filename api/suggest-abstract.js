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

    const extremeMinimal = b.sc==='low' && b.ri==='low' && b.cl==='low';

    let name;
    if (extremeMinimal) {
      // Provide very reductive naming to signal simplicity
      const baseA = ['Axis','Core','Mono','Prime','Singular'];
      const baseB = ['Line','Ring','Dot','Bar','Form'];
      name = `${pick(baseA)} ${pick(baseB)}`;
    } else {
      const cores = {
        sp: b.sp==='low'? ['Axiom','Obsidian','Stillwave'] : b.sp==='high'? ['Luma','Flare','Prism'] : ['Echo','Intermediate','Median'],
        ri: b.ri==='low'? ['Grid','Vector','Circuit'] : b.ri==='high'? ['Flux','Drift','Bloom'] : ['Loop','Weave','Nexus']
      };
      const mod = b.sc==='high'? ['Array','Cluster','Swarm'] : b.sc==='low'? ['Core','Node','Singularity'] : ['Matrix','Shell','Layer'];
      const dyn = b.cl==='high'? ['Evolving','Adaptive','Emergent'] : b.cl==='low'? ['Stable','Centered','Harmonic'] : ['Balanced','Equatorial','Contained'];
      name = `${pick(dyn)} ${pick(cores.sp)}-${pick(cores.ri)} ${pick(mod)}`.replace(/\s+/g,' ').trim();
    }

    // Description assembly
    let palette, logic, density, symmetry;
    if (extremeMinimal) {
      palette = 'ultra-minimal two-tone (charcoal + single accent)';
      logic = 'two primitive geometric shapes (e.g., circle + bar) with no ornament';
      density = 'vast negative space (>70%) no micro-detail';
      symmetry = 'calm axial or perfect radial symmetry';
    } else {
      palette = b.sp==='low'? 'restrained deep cool spectrum with ember micro-accents' : b.sp==='high'? 'luminous high-chroma spectral gradients' : 'balanced cyan–amber dual-tone glow';
      logic = b.ri==='low'? 'modular geometric lattice and concentric data rings' : b.ri==='high'? 'fluid filamentary energy plumes and diffuse plasma veils' : 'semi-geometric interwoven arc structures';
      density = b.sc==='low'? 'open internal void channels and crisp negative space halos' : b.sc==='high'? 'dense micro-node mesh with particulate sparkle' : 'layered medium-density strata';
      symmetry = b.cl==='low'? 'anchored axial symmetry with calm equilibrium' : b.cl==='high'? 'asymmetric growth vectors and directional thrust' : 'soft quasi-radial balance';
    }

    const vibeLine = vibe ? ` Ambient mood hint: ${String(vibe).trim()}.` : '';
    const detailLine = Number.isFinite(Number(detailLevel)) ? ` Detail richness target: ${Math.min(10,Math.max(1,Number(detailLevel)))}/10.` : '';

    const description = extremeMinimal
      ? `Ultra-minimal abstract emblem; no figurative anatomy. ${palette}; ${logic}; ${density}; ${symmetry}; avoid gradients (optional faint inner glow), no particles, no texture.${vibeLine}${detailLine}`
      : `Self-contained abstract digital entity; no figurative anatomy. ${palette}; ${logic}; ${density}; ${symmetry}; emits subtle pulsing core luminescence; ${vibeLine}${detailLine}`;

    return res.status(200).json({ name, description });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Unexpected error' });
  }
}
