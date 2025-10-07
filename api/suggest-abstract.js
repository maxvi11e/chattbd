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
      'Abstract digital avatar artwork:',
      'Single abstract figure (head, torso) drawn as luminous lines on a pure black background.',
      `Color palette: ${palette}.`,
      `Line structure: ${logic}.`,
      `Line density: ${fill}.`,
      `Visual symmetry: ${symmetry}.`,
      'Eye design: friendly rounded almond openings with soft glow; no pupils.',
      'Visual style: very bright lines with crisp edges; protect blacks; no interface/HUD, no text, no logos.',
      'Extreme brightness and luminosity to all line elements',
      '10x thickness and brightness for 10% of all line elements',
      vibeLine,
      detailLine
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
