// api/regenerate-avatar.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const startTime = Date.now();
  
  try {
    const { avatarId, editPrompt, originalImage } = req.body || {};
    
    if (!avatarId || !editPrompt) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    console.log('🔄 Regenerating avatar:', { avatarId, editPrompt: editPrompt.substring(0, 50) + '...' });

    // Get the original avatar data from the database
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: originalAvatar, error: fetchError } = await supabase
      .from('avatars')
      .select('*')
      .eq('id', avatarId)
      .single();

    if (fetchError || !originalAvatar) {
      console.error('Error fetching original avatar:', fetchError);
      return res.status(404).json({ error: "Avatar not found" });
    }

    // Build enhanced prompt that combines original traits with edit request
    let enhancedPrompt = `Square portrait avatar, crisp line art, subtle texture, softly lit, centered, clean edge lighting.`;
    
    // Add original style information if available
    if (originalAvatar.traits?.art_style) {
      enhancedPrompt += ` Art style: ${originalAvatar.traits.art_style}.`;
    }
    
    // Add original persona as base
    if (originalAvatar.traits?.original_prompt) {
      enhancedPrompt += ` Base persona: ${originalAvatar.traits.original_prompt}.`;
    }
    
    // Add personality prompt if available
    if (originalAvatar.traits?.personality_prompt) {
      enhancedPrompt += ` Personality: ${originalAvatar.traits.personality_prompt}.`;
    }
    
    // Add the edit request
    enhancedPrompt += ` MODIFICATIONS: ${editPrompt}`;

    console.log('🎨 Enhanced prompt for regeneration:', enhancedPrompt.substring(0, 200) + '...');

    // Call OpenAI API to regenerate the image
    const openaiResponse = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: enhancedPrompt,
        size: "1024x1024",
        n: 1,
        quality: "high"
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error(`❌ Image regeneration failed:`, {
        status: openaiResponse.status,
        error: errorText,
        prompt: enhancedPrompt.substring(0, 100) + '...'
      });
      
      // Check for content policy violations
      if (openaiResponse.status === 400 && errorText.includes('content_policy_violation')) {
        return res.status(400).json({ 
          error: "Content blocked by safety system. Please try a different description." 
        });
      }
      
      return res.status(500).json({ 
        error: "Image generation failed. Please try again." 
      });
    }

    const imageData = await openaiResponse.json();
    const imageUrl = imageData?.data?.[0]?.url;

    if (!imageUrl) {
      console.error('❌ No image URL in response:', imageData);
      return res.status(500).json({ error: "No image generated" });
    }

    // Download the image and convert to base64
    console.log('📥 Downloading generated image...');
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      console.error('❌ Failed to download image:', imageResponse.status);
      return res.status(500).json({ error: "Failed to download generated image" });
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const dataUrl = `data:image/png;base64,${base64Image}`;

    const processingTime = Date.now() - startTime;
    console.log(`✅ Avatar regenerated successfully in ${processingTime}ms`);

    // Return the regenerated image data
    res.status(200).json({
      success: true,
      dataUrl: dataUrl,
      originalPrompt: originalAvatar.traits?.original_prompt,
      editPrompt: editPrompt,
      processingTime: processingTime
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ Avatar regeneration error after ${processingTime}ms:`, error);
    
    res.status(500).json({ 
      error: "Internal server error during regeneration",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
