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
      cl: norm(sliders.practicalImaginative)
    };

    // Buckets
    const bucket = (n)=> n<=30? 'low' : n>=70? 'high':'mid';
    const b = { sp: bucket(s.sp), sc: bucket(s.sc), ri: bucket(s.ri), cl: bucket(s.cl) };

    const selectedAbstractName = pickAbstractName();
    const name = selectedAbstractName.label;

    // ---- Description (original logic) ----
    const palettes = {
      low: 'cool white lines with gentle white glow',
      mid: 'deep cool chromatic spectrum with medium vibrancy accents',
      high: 'luminous high-chroma spectral gradients. use high saturation, high vibrancy colors'
    };
    const palette = palettes[b.sp];

    const logics = {
      low: 'geometric wireframe rings and grid',
      mid: 'mesh of arcs and short lattice segments',
      high: 'flowing energy strands and arcs'
    };
    const logic = logics[b.ri];

    const fills = {
      low: 'balanced interior with clear negative space between lines',
      mid: 'medium density with even spacing',
      high: 'richer line work with tight spacing, but keep background visible within figure'
    };
    const fill = fills[b.sc];

    const symmetries = {
      low: 'strong bilateral symmetry',
      mid: 'near-bilateral with small variations',
      high: 'flowing asymmetrical forms for dynamic movement'
    };
    const symmetry = symmetries[b.cl];

    const vibeLine = vibe ? `Mood: ${String(vibe).trim()}.` : '';

    const descriptionLines = [
      'Create an abstract digital avatar artwork in the style of neon line art.',
      'Depict a single stylized figure from chest up in a dynamic pose, facing forward or in slight profile.',
      'Draw using luminous glowing lines on a pure black background.',
      `Color palette: ${palette}.`,
      `Line structure pattern: ${logic}.`,
      `Line density and spacing: ${fill}.`,
      `Visual symmetry approach: ${symmetry}.`,
      'Eye design: friendly rounded openings with bright inner glow; no detailed pupils.',
      'Art style: very bright neon lines with crisp edges; avoid any interface elements, HUD overlays, text, or logos.',
      'Apply extreme brightness and luminosity to all line elements for a glowing neon effect.',
      'Make approximately 20% of all line elements 10x thicker and brighter for visual emphasis.',
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
