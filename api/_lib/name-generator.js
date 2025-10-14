// api/_lib/name-generator.js
// Shared function for generating AI-based avatar names

/**
 * Generates a descriptive tech/AI backronym name for an avatar based on the image
 * @param {string} imageUrl - The URL or base64 data URL of the avatar image
 * @param {string} prompt - Optional prompt used to generate the avatar
 * @returns {Promise<{name: string, expansion: string}>}
 */
export async function generateAvatarName(imageUrl, prompt = '') {
  if (!imageUrl) {
    throw new Error('Missing imageUrl');
  }

  console.log('🏷️ Generating AI name for avatar', { 
    hasPrompt: !!prompt,
    imageUrlLength: imageUrl.length 
  });

  // Call OpenAI GPT-4 Vision to analyze the image and create a backronym
  const messages = [
    {
      role: 'system',
      content: 'You are a creative naming assistant. Your job is to: 1) Look at an AI avatar image and select a single descriptive word (3-7 letters) that loosely describes it. 2) Create a technology/AI related backronym for that word. Be creative and loose with associations - filler words are fine. Respond ONLY with valid JSON in this exact format: {"name": "WORD", "expansion": "Technology Related Backronym For The Word"}'
    },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: prompt 
            ? `Analyze this avatar image and its description to create a name. Description: "${prompt}"\n\nProvide a single word (3-7 letters) that somewhat describes the avatar, then create a tech/AI backronym for it. The association can be loose - prioritize creativity over perfect accuracy.`
            : 'Analyze this avatar image. Provide a single word (3-7 letters) that somewhat describes the avatar, then create a tech/AI related backronym for it. The association can be loose - prioritize creativity over perfect accuracy.'
        },
        {
          type: 'image_url',
          image_url: {
            url: imageUrl,
            detail: 'low' // Use low detail to save tokens
          }
        }
      ]
    }
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 150,
      temperature: 0.9 // Higher temperature for more creative names
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ OpenAI API error:', errorText);
    throw new Error('Failed to generate name');
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  
  if (!content) {
    console.error('❌ No content in OpenAI response');
    throw new Error('No response from AI');
  }

  // Parse the JSON response
  let nameData;
  try {
    // Try to extract JSON from the response (in case there's extra text)
    const jsonMatch = content.match(/\{[^}]+\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : content;
    nameData = JSON.parse(jsonStr);
  } catch (parseError) {
    console.error('❌ Failed to parse AI response:', content);
    throw new Error('Invalid AI response format');
  }

  // Validate the response format
  if (!nameData.name || !nameData.expansion) {
    console.error('❌ Invalid name format:', nameData);
    throw new Error('Invalid name format from AI');
  }

  // Ensure name is uppercase and reasonable length
  nameData.name = nameData.name.toUpperCase().substring(0, 20);
  nameData.expansion = nameData.expansion.substring(0, 200);

  console.log('✅ Generated avatar name:', nameData);

  return nameData;
}
