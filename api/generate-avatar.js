// api/generate-avatar.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const startTime = Date.now();
  
  try {
    const { prompt, botName, artStyle, personalityPrompt } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    // Build enhanced prompt with additional fields
    let enhancedPrompt = `Square portrait avatar, crisp line art, subtle texture, softly lit, centered, clean edge lighting.`;
    
    // Add art style if provided
    if (artStyle && artStyle.trim()) {
      enhancedPrompt += ` Art style: ${artStyle.trim()}.`;
    }
    
    // Add main persona description
    enhancedPrompt += ` Persona: ${prompt}`;
    
    // Add additional personality details if provided
    if (personalityPrompt && personalityPrompt.trim()) {
      enhancedPrompt += ` Additional details: ${personalityPrompt.trim()}`;
    }

    const r = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: enhancedPrompt,
        size: "1024x1024",   // ✅ valid size
        n: 1,
        quality: "hd"
      }),
    });

    if (!r.ok) {
      const errTxt = await r.text();
      console.log(`❌ Image generation failed:`, {
        error: errTxt,
        prompt_length: enhancedPrompt.length,
        timestamp: new Date().toISOString()
      });
      return res.status(500).json({ error: errTxt });
    }

    const data = await r.json();
    const item = data?.data?.[0];

    const b64 = item?.b64_json;
    const url = item?.url;

    // Log successful generation
    const duration = Date.now() - startTime;
    console.log(`✅ Image generated successfully:`, {
      model: "dall-e-3",
      size: "1024x1024",
      quality: "hd",
      cost_estimate: "$0.040",
      duration_ms: duration,
      prompt_length: enhancedPrompt.length,
      has_bot_name: !!(botName && botName.trim()),
      has_art_style: !!(artStyle && artStyle.trim()),
      has_personality_prompt: !!(personalityPrompt && personalityPrompt.trim()),
      timestamp: new Date().toISOString()
    });

    if (b64) {
      return res.status(200).json({ 
        dataUrl: `data:image/png;base64,${b64}`,
        botName: botName || null,
        artStyle: artStyle || null,
        personalityPrompt: personalityPrompt || null
      });
    }
    if (url) {
      return res.status(200).json({ 
        dataUrl: url,
        botName: botName || null,
        artStyle: artStyle || null,
        personalityPrompt: personalityPrompt || null
      });
    }

    return res.status(500).json({ error: "No image returned" });
  } catch (e) {
    console.log(`❌ Image generation error:`, {
      error: e.message,
      timestamp: new Date().toISOString()
    });
    return res.status(500).json({ error: e.message || "Unexpected error" });
  }
}
