// api/regenerate-avatar.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const startTime = Date.now();
  
  try {
    const { 
      editPrompt, 
      originalPrompt, 
      artStyle, 
      personalityPrompt 
    } = req.body || {};
    
    if (!editPrompt) {
      return res.status(400).json({ error: "Missing edit prompt" });
    }

    // Build enhanced prompt exactly like generate-avatar.js but with modifications
    let enhancedPrompt = `Square portrait avatar, crisp line art, subtle texture, softly lit, centered, clean edge lighting.`;
    
    // Add art style if provided
    if (artStyle && artStyle.trim()) {
      enhancedPrompt += ` Art style: ${artStyle.trim()}.`;
    }
    
    // Add main persona description (original prompt)
    if (originalPrompt && originalPrompt.trim()) {
      enhancedPrompt += ` Persona: ${originalPrompt.trim()}`;
    }
    
    // Add additional personality details if provided
    if (personalityPrompt && personalityPrompt.trim()) {
      enhancedPrompt += ` Additional details: ${personalityPrompt.trim()}`;
    }
    
    // Add the modifications
    enhancedPrompt += ` MODIFICATIONS: ${editPrompt}`;

    const r = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: enhancedPrompt,
        size: "1024x1024",   // ✅ valid size
        n: 1,
        quality: "high"
      }),
    });

    if (!r.ok) {
      const errTxt = await r.text();
      console.log(`❌ Image regeneration failed:`, {
        error: errTxt,
        status: r.status,
        prompt: enhancedPrompt.substring(0, 200) + '...'
      });

      // Check for safety/content policy issues
      if (r.status === 400) {
        return res.status(400).json({ 
          error: "Content blocked by safety system. Please try a different description." 
        });
      }

      return res.status(500).json({ 
        error: "Image generation failed. Please try again." 
      });
    }

    const json = await r.json().catch(() => ({}));
    if (!json?.data?.[0]?.url) {
      console.error('Invalid OpenAI response:', json);
      return res.status(500).json({ 
        error: "No image generated",
        details: json
      });
    }

    const imageUrl = json.data[0].url;

    // Get the first item from response
    const item = json.data[0];
    const b64 = item?.b64_json;
    const url = item?.url;

    // Log successful regeneration
    const duration = Date.now() - startTime;
    console.log(`✅ Image regenerated successfully:`, {
      model: "gpt-image-1",
      duration_ms: duration,
      prompt_length: enhancedPrompt.length,
      timestamp: new Date().toISOString()
    });

    if (b64) {
      return res.status(200).json({ 
        dataUrl: `data:image/png;base64,${b64}`,
        editPrompt: editPrompt
      });
    }
    if (url) {
      return res.status(200).json({ 
        dataUrl: url,
        editPrompt: editPrompt
      });
    }

    return res.status(500).json({ error: "No image returned" });
  } catch (e) {
    console.log(`❌ Image regeneration error:`, {
      error: e.message,
      timestamp: new Date().toISOString()
    });
    return res.status(500).json({ error: e.message || "Unexpected error" });
  }
}
