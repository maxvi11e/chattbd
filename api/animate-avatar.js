// api/animate-avatar.js
// Generates a short animated video from a static avatar image using fal.ai LivePortrait

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();

  try {
    const { imageUrl, avatarId, historyId } = req.body || {};

    if (!imageUrl) {
      console.error('❌ Missing imageUrl in request');
      return res.status(400).json({ error: 'Missing imageUrl' });
    }

    // Check if FAL_KEY is configured
    if (!process.env.FAL_KEY) {
      console.error('❌ FAL_KEY environment variable not set!');
      return res.status(500).json({ 
        error: 'Animation service not configured. Please set FAL_KEY environment variable.' 
      });
    }

    console.log('📹 Starting avatar animation', {
      avatarId: avatarId || 'unknown',
      historyId: historyId || 'unknown',
      imageUrl: imageUrl.slice(0, 80) + '...',
      hasFalKey: !!process.env.FAL_KEY
    });

    // Call fal.ai - Try AnimateDiff for better portrait animation
    // AnimateDiff is better at creating realistic subtle movements
    console.log('📤 Calling fal.ai AnimateDiff API...');
    const falResponse = await fetch('https://fal.run/fal-ai/fast-animatediff/text-to-video', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${process.env.FAL_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: "portrait photo, subtle breathing, gentle eye blink, minimal movement, high quality, stable",
        negative_prompt: "blurry, distorted, warped, morphing, ugly, deformed, bad quality, artifacts",
        image_url: imageUrl,
        num_inference_steps: 8,     // More steps = better quality
        num_frames: 16,              // Frame count for 1 second at 16fps
        fps: 16,                     // Frames per second
        motion_module: "mm_sd15_v2", // Motion module version
        guidance_scale: 7.5          // How closely to follow the prompt
      })
    });

    console.log('📥 fal.ai response status:', falResponse.status, falResponse.statusText);

    if (!falResponse.ok) {
      const errorText = await falResponse.text();
      console.error('❌ fal.ai animation failed:', {
        status: falResponse.status,
        statusText: falResponse.statusText,
        error: errorText.slice(0, 1000),
        fullError: errorText
      });

      // Return detailed error for debugging
      return res.status(500).json({
        error: 'Animation generation failed',
        debug: {
          status: falResponse.status,
          statusText: falResponse.statusText,
          message: errorText.slice(0, 500),
          endpoint: 'fal.ai/fast-svd/image-to-video',
          imageUrl: imageUrl.slice(0, 100) + '...'
        }
      });
    }

    const result = await falResponse.json();
    const duration = Date.now() - startTime;

    console.log('✅ Animation generated successfully:', {
      duration_ms: duration,
      videoUrl: result.video?.url || 'no url',
      hasVideo: !!result.video,
      timestamp: new Date().toISOString()
    });

    // Extract video URL from fal.ai response
    const videoUrl = result.video?.url || result.video_url || result.url;

    if (!videoUrl) {
      console.error('❌ No video URL in fal.ai response:', result);
      return res.status(500).json({
        error: 'No video URL returned',
        debug: { hasVideo: !!result.video, resultKeys: Object.keys(result) }
      });
    }

    return res.status(200).json({
      videoUrl,
      duration_ms: duration,
      success: true
    });

  } catch (e) {
    console.error('❌ Animation error:', {
      error: e.message,
      stack: e?.stack?.split('\n').slice(0, 3).join(' | '),
      timestamp: new Date().toISOString()
    });

    return res.status(500).json({
      error: e.message || 'Unexpected animation error',
      debug: { type: e.constructor.name }
    });
  }
}
