# Avatar Animation Setup Guide

This guide walks you through setting up avatar animation using fal.ai's Stable Video Diffusion (Fast SVD).

## Overview

The system generates 1-second animated videos of avatar images with subtle movements. Animations are created when users confirm an avatar in the edit screen.

**Note:** We use Stable Video Diffusion instead of LivePortrait because it doesn't require a driving video and works great for subtle avatar animations.

## Setup Steps

### 1. Run Database Migration

Execute the SQL migration in your Supabase SQL Editor:

```bash
sql/avatar-animation-migration.sql
```

This adds:
- `video_url` column to `avatar_image_history` table
- `animation_status` and `animation_created_at` columns
- Updated functions to handle video URLs

### 2. Get fal.ai API Key

1. Sign up at [fal.ai](https://fal.ai)
2. Go to your dashboard
3. Create a new API key
4. Copy the key

### 3. Add Environment Variable

Add your fal.ai API key to your environment (e.g., Vercel):

```bash
FAL_KEY=your_fal_api_key_here
```

For local development, add to your `.env` file:
```
FAL_KEY=your_fal_api_key_here
```

### 4. Test the Setup

1. Go to `edit.html` with an avatar
2. Click "Confirm & Create Animation"
3. The button will show "Creating Animation..." while processing
4. After 2-5 seconds, the animation will be saved to the database
5. Navigate to chat to see the avatar

## How It Works

### User Flow

1. User creates or edits an avatar in `edit.html`
2. User clicks "Confirm & Create Animation"
3. System calls `/api/animate-avatar.js` with the avatar's image URL
4. fal.ai processes the image (2-5 seconds)
5. Video is uploaded to Supabase Storage
6. Database is updated with `video_url`
7. User is redirected to chat

### Technical Flow

```
edit.html
  ↓
generateAnimation()
  ↓
/api/animate-avatar.js
  ↓
fal.ai LivePortrait API
  ↓
uploadVideoToSupabase()
  ↓
Update avatar_image_history table
  ↓
Navigate to chat.html
```

### Database Schema

```sql
avatar_image_history:
  - id (uuid)
  - avatar_id (uuid)
  - image_url (text)
  - video_url (text) ← NEW
  - animation_status (text) ← NEW: 'pending', 'processing', 'completed', 'failed'
  - animation_created_at (timestamp) ← NEW
  - version_number (int)
  - is_current (boolean)
  - created_from (text)
  - edit_prompt (text)
  - traits_snapshot (jsonb)
  - created_at (timestamp)
```

## API Costs

### fal.ai Pricing
- Stable Video Diffusion (Fast): ~$0.005-0.01 per 1-second video
- Processing time: 3-8 seconds

### Cost Comparison
- Static avatar image: $0.01-0.02 (DALL-E)
- Animated avatar: $0.015-0.03 total (DALL-E + fal.ai)
- **Increase: ~25-50% per avatar**

## File Changes

### New Files
- `api/animate-avatar.js` - Animation API endpoint
- `sql/avatar-animation-migration.sql` - Database schema changes
- `AVATAR-ANIMATION-SETUP.md` - This file

### Modified Files
- `edit.html` - Updated confirm button, added animation logic
- `avatar-history-utils.js` - Added video_url parameter support

## Configuration Options

### Animation Settings (in api/animate-avatar.js)

```javascript
{
  image_url: imageUrl,
  motion_bucket_id: 40,  // Motion intensity (1-255, lower = less motion)
  fps: 6,                // Frames per second
  steps: 4               // Quality steps (fewer = faster)
}
```

### Customization

To adjust animation intensity, edit `api/animate-avatar.js`:

```javascript
// Subtle animation (current setting)
motion_bucket_id: 40

// More dramatic animation
motion_bucket_id: 100

// Very subtle animation
motion_bucket_id: 20
```

## Troubleshooting

### Animation not working?

1. **Check API key**: Verify `FAL_KEY` is set in environment
2. **Check logs**: Look for errors in browser console and server logs
3. **Check network**: Ensure fal.ai is accessible
4. **Check storage**: Verify Supabase storage bucket "avatars" exists

### Slow animation generation?

- fal.ai Stable Video typically takes 3-8 seconds
- If taking longer, check your fal.ai account status
- Network issues can cause delays

### Alternative Models (if you want to try others)

If you want to try different animation approaches, edit `api/animate-avatar.js`:

**Option 1: Standard Stable Video Diffusion** (higher quality, slower)
```javascript
const falResponse = await fetch('https://fal.run/fal-ai/stable-video-diffusion', {
  method: 'POST',
  headers: {
    'Authorization': `Key ${process.env.FAL_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    image_url: imageUrl,
    motion_bucket_id: 127,
    cond_aug: 0.02
  })
});
```

**Option 2: AnimateDiff** (more stylized)
```javascript
const falResponse = await fetch('https://fal.run/fal-ai/fast-animatediff/image-to-video', {
  method: 'POST',
  headers: {
    'Authorization': `Key ${process.env.FAL_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    image_url: imageUrl,
    prompt: "subtle breathing, gentle movement",
    num_frames: 8
  })
});
```

### Videos not displaying?

1. Check that `video_url` is saved in database
2. Verify video uploaded to Supabase Storage
3. Check video URL is publicly accessible
4. Ensure CORS is configured correctly

## Future Enhancements

### Planned Features
- Multiple animation types (reactions, expressions)
- Animation preview before confirming
- Batch animation generation
- Animation caching/reuse

### Alternative Models
- **AnimateDiff**: More stylized animations (~$0.005/video)
- **Stable Video Diffusion**: Higher quality (~$0.015/video)

## Support

For issues or questions:
1. Check console logs in browser (F12)
2. Check server logs in Vercel/hosting platform
3. Verify database changes were applied
4. Test API endpoint directly with curl/Postman

## Performance Notes

- Animations are generated asynchronously
- Users can proceed to chat immediately after generation starts
- Failed animations don't block the user flow
- Videos are cached in Supabase Storage for fast loading
