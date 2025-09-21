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
      personalityPrompt,
      originalImage
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

    // If we have an original image, attempt an image edit to preserve identity
    if (originalImage) {
      const fetchUrl = originalImage.split('?')[0]; // strip transforms for best fidelity
      console.log('🖼️ Using original image for edit:', fetchUrl);

      const src = await fetch(fetchUrl);
      if (!src.ok) {
        const t = await src.text().catch(() => src.statusText);
        console.log('❌ Failed to fetch original image:', { status: src.status, text: t?.slice(0, 300) });
        return res.status(400).json({ error: 'Could not fetch original image for edit' });
      }
      const buf = await src.arrayBuffer();

      const form = new FormData();
      form.append('model', 'gpt-image-1');
      form.append('prompt', enhancedPrompt);
      form.append('size', '1024x1024');
      form.append('n', '1');
      // Prefer b64 to avoid extra network hop
      form.append('response_format', 'b64_json');
      form.append('image', new Blob([buf], { type: 'image/png' }), 'source.png');

      console.log('➡️ Calling OpenAI Images Edits with original image');
      const r = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: form
      });

      if (!r.ok) {
        const errTxt = await r.text();
        console.log('❌ Image edit failed:', { status: r.status, statusText: r.statusText, errorTextPreview: errTxt?.slice(0, 500) });
        return res.status(500).json({ error: 'Image edit failed', debug: { status: r.status, errorPreview: errTxt?.slice(0, 400) } });
      }

      const json = await r.json().catch((e) => ({ __parseError: e?.message }));
      console.log('⬅️ OpenAI edit response meta:', {
        hasData: !!json?.data, items: json?.data?.length || 0, hasB64: !!json?.data?.[0]?.b64_json, hasUrl: !!json?.data?.[0]?.url, parseError: json?.__parseError
      });

      const item = json?.data?.[0] || {};
      const b64 = item?.b64_json;
      const url = item?.url;

      if (b64) return res.status(200).json({ dataUrl: `data:image/png;base64,${b64}`, editPrompt });
      if (url) return res.status(200).json({ dataUrl: url, editPrompt });

      console.error('No image returned from OpenAI (edit):', json);
      return res.status(500).json({ error: 'No image returned from edit', debug: { items: json?.data?.length || 0 } });
    }

    // Otherwise: text-to-image generation (no base image)
    console.log('➡️ Calling OpenAI Images Generations with:', {
      model: 'gpt-image-1', size: '1024x1024', quality: 'high',
      promptPreview: enhancedPrompt.slice(0, 180) + (enhancedPrompt.length > 180 ? '…' : '')
    });

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
        status: r.status,
        statusText: r.statusText,
        errorTextPreview: errTxt?.slice(0, 500),
        promptLength: enhancedPrompt.length
      });

      // Check for safety/content policy issues
      if (r.status === 400) {
        return res.status(400).json({ 
          error: "Content blocked by safety system. Please try a different description." 
        });
      }

      return res.status(500).json({ 
        error: "Image generation failed. Please try again.",
        debug: { status: r.status, statusText: r.statusText, errorPreview: errTxt?.slice(0, 500) }
      });
    }

    const json = await r.json().catch((e) => ({ __parseError: e?.message }));
    console.log('⬅️ OpenAI response meta:', {
      hasData: !!json?.data,
      items: json?.data?.length || 0,
      hasB64: !!json?.data?.[0]?.b64_json,
      hasUrl: !!json?.data?.[0]?.url,
      parseError: json?.__parseError
    });
  // Get the first item from response (can include b64_json and/or url)
  const item = json?.data?.[0] || {};
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

    console.error('No image returned from OpenAI:', json);
    return res.status(500).json({ error: "No image returned", debug: { openaiMeta: { items: json?.data?.length || 0, hasB64: !!b64, hasUrl: !!url } } });
  } catch (e) {
    console.log(`❌ Image regeneration error:`, {
      error: e.message,
      stackPreview: e?.stack?.split('\n').slice(0, 3).join(' | '),
      timestamp: new Date().toISOString()
    });
    return res.status(500).json({ error: e.message || "Unexpected error", debug: { stack: e?.stack?.split('\n').slice(0, 3).join(' | ') } });
  }
}
