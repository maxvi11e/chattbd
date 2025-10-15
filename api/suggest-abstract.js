// api/suggest-abstract.js
// Returns an abstract digital organism suggestion plus a predefined abstract agent codename.
// Expected POST JSON: { sliders: { seriousPlayful, succinctChatty, rationalIntuitive, practicalImaginative }, vibe?, detailLevel? }

import { pickAbstractName } from './_lib/abstract-names.js';

export default async function handler(req, res){
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { sliders = {}, vibe, detailLevel } = req.body || {};
    // Normalize values 0-100 (fallback 50)
    const norm = (v)=>{ const n=Number(v); return Number.isFinite(n)? Math.min(100,Math.max(0,n)) : 50; };
    const s = {
      sp: norm(sliders.seriousPlayful),
      sc: norm(sliders.succinctChatty),
      ri: norm(sliders.rationalIntuitive),
      pi: norm(sliders.practicalImaginative)
    };

    // Buckets
    const bucket = (n)=> n<=30? 'low' : n>=70? 'high':'mid';
    const b = { sp: bucket(s.sp), sc: bucket(s.sc), ri: bucket(s.ri), pi: bucket(s.pi) };

    const selectedAbstractName = pickAbstractName();
    const name = selectedAbstractName.label;

    // ---- Description (original logic) ----
    const palette = {
      low: 'cool white lines with gentle white glow',
      mid: 'deep cool chromatic spectrum with medium vibrancy accents',
      high: 'luminous high-chroma spectral gradients. use high saturation, high vibrancy colors'
    }[b.sp];

    const fill = {
      low: 'balanced interior with clear negative space between lines',
      mid: 'medium density grid with even spacing and some connective synapses',
      high: 'richer line work with intricate details and high density of connective synapses'
    }[b.sc];

    const logic = {
      low: 'geometric wireframe rings and grid',
      mid: 'mesh of arcs and short lattice segments',
      high: 'flowing energy strands and arcs'
    }[b.ri];

    const symmetry = {
      low: 'strong bilateral symmetry',
      mid: 'near-bilateral with small variations',
      high: 'flowing asymmetrical forms for dynamic movement'
    }[b.pi];

    const vibeLine = vibe ? `Mood: ${String(vibe).trim()}.` : '';

    const descriptionLines = [
      'Create an abstract digital AI assistant avatar using luminous neon lines.',
      'Depict a single stylized figure from chest up, facing forward, in an avatar portrait style.',
      'Draw using luminous glowing lines on a pure black background.',
      `Color palette: ${palette}.`,
      `Line structure pattern: ${logic}.`,
      `Line density and spacing: ${fill}.`,
      `Visual symmetry approach: ${symmetry}.`,
      'Eye design: friendly rounded almond shaped openings with bright inner glow; no detailed pupils.',
      'Art style: very bright neon lines with crisp edges; avoid any interface elements, HUD overlays, text, or logos.',
      'Apply extreme brightness and luminosity to all line elements for a glowing neon effect.',
      'Make approximately 20% of all line elements 10x thicker and brighter for visual emphasis.',
      'Professional digital art for AI assistant interface.',
      vibeLine,
    ].filter(Boolean);
    const description = descriptionLines.join('\n');

    return res.status(200).json({ 
      name,              // abstract organism name (predefined codename)
      description 
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Unexpected error' });
  }
}
