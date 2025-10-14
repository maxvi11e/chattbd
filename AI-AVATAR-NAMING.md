# AI-Generated Avatar Naming System

## Overview

The avatar naming system has been updated to use AI-generated descriptive backronyms instead of selecting from a predefined list in `abstract-names.js`.

## How It Works

1. **Avatar Generation**: When an avatar is generated via `/api/generate-avatar`, the image is created using OpenAI's image generation API.

2. **Name Generation**: After the image is generated, GPT-4o-mini with vision capabilities analyzes the avatar image and:
   - Selects a single descriptive word (3-7 letters) that loosely describes the avatar
   - Creates a technology/AI-related backronym for that word
   - Returns both the word and its expansion

3. **Flexibility**: The associations are intentionally loose - it's okay if:
   - The name only loosely describes the avatar
   - The backronym includes filler words
   - The connection is creative rather than literal

## Implementation

### Core Files

- **`/api/_lib/name-generator.js`**: Shared utility function that generates names using GPT-4o-mini vision
- **`/api/generate-avatar.js`**: Calls the name generator after creating an avatar image
- **`/api/name-avatar.js`**: Standalone endpoint for generating names (can be called independently)

### API Usage

The naming happens automatically when an avatar is generated without a provided `botName`:

```javascript
// If botName is not provided, AI will generate one
const response = await fetch('/api/generate-avatar', {
  method: 'POST',
  body: JSON.stringify({
    prompt: 'Create an abstract digital assistant...',
    // botName: undefined - AI will generate this
  })
});

const data = await response.json();
console.log(data.botName); // e.g., "NEXUS" - Neural EXploration and Understanding System
```

You can also call the naming endpoint independently:

```javascript
const response = await fetch('/api/name-avatar', {
  method: 'POST',
  body: JSON.stringify({
    imageUrl: 'https://example.com/avatar.png',
    prompt: 'Optional: description of the avatar'
  })
});

const data = await response.json();
// Returns: { name: "NEXUS", expansion: "Neural EXploration and Understanding System" }
```

## Examples

Here are some example names the AI might generate:

- **FLUX** - "Framework for Learning and User eXperience"
- **PRISM** - "Predictive Reasoning and Intelligent System Model"
- **ECHO** - "Enhanced Cognitive Humanoid Operator"
- **VIBE** - "Virtual Intelligence and Behavioral Engine"
- **SPARK** - "Synthesis and Processing Adaptive Reasoning Kernel"

## Fallback Behavior

If the AI naming fails for any reason, the system falls back to:
1. The `archetypeSpecific` value (e.g., "humanoid form")
2. Or "New Avatar" as a last resort

This ensures avatars always have a name, even if the AI naming service is temporarily unavailable.

## Notes

- The system uses `gpt-4o-mini` for cost efficiency
- Image analysis uses "low detail" mode to save tokens
- Temperature is set to 0.9 for creative, varied names
- Names are automatically converted to uppercase
- Backronyms are limited to 200 characters
- The prompt context is included when available to help guide naming
