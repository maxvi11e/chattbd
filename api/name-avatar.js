// api/name-avatar.js
// Generates a descriptive tech/AI backronym name for an avatar based on the image
// Input (POST JSON): { imageUrl, prompt? }
// Output: { name: "WORD", expansion: "Tech/AI Related Backronym..." }

import { generateAvatarName } from './_lib/name-generator.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    const { imageUrl, prompt } = req.body || {};
    
    if (!imageUrl) {
      return res.status(400).json({ error: 'Missing imageUrl' });
    }

    const nameData = await generateAvatarName(imageUrl, prompt);
    return res.status(200).json(nameData);

  } catch (error) {
    console.error('❌ Error generating avatar name:', error);
    return res.status(500).json({ error: error.message || 'Unexpected error' });
  }
}
