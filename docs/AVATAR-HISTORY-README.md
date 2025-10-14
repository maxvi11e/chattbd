# Avatar Image History - Implementation Strategy

## Overview
This document outlines the optimal strategy for implementing avatar image history, allowing users to view and restore previous versions of their avatar images.

## Chosen Approach: Dedicated History Table ✅

After analyzing the current schema, I recommend creating a separate `avatar_image_history` table. This is the most scalable and maintainable approach.

## Why This Approach?

### Advantages
1. **Clean Data Structure** - Normalized, relational design
2. **Efficient Querying** - Indexed by avatar_id and version
3. **Rich Metadata** - Store prompts, timestamps, and traits per version
4. **Cascade Deletes** - Automatic cleanup when avatar is deleted
5. **Scalable** - Can handle hundreds of versions per avatar
6. **Version Control** - Track "current" version explicitly
7. **Easy Restoration** - One function call to restore any version
8. **Pruning Support** - Built-in function to limit history size

### Table Schema
```sql
avatar_image_history:
  - id (uuid, primary key)
  - avatar_id (uuid, foreign key to avatars)
  - image_url (text)
  - version_number (integer, auto-incrementing per avatar)
  - is_current (boolean, only one per avatar)
  - created_from ('initial' | 'regenerate' | 'edit' | 'restore')
  - edit_prompt (text, nullable)
  - traits_snapshot (jsonb, nullable)
  - created_at (timestamp)
```

## Implementation Files Created

### 1. `/sql/avatar-history-migration.sql`
Complete database migration including:
- Table creation with proper constraints
- Indexes for performance
- Helper functions (add, restore, get history)
- RLS policies for security
- Migration of existing avatars (optional)

### 2. `/avatar-history-utils.js`
JavaScript utility module with methods:
- `addToHistory()` - Add new version
- `getHistory()` - Fetch version list
- `restoreVersion()` - Restore previous version
- `getCurrentVersion()` - Get current version
- `pruneHistory()` - Clean up old versions

### 3. `/avatar-history-integration-guide.js`
Complete integration examples showing:
- How to update edit.html
- How to update create.html
- UI components for history viewer
- CSS styling examples
- Event handlers and workflows

## Implementation Steps

### Step 1: Database Setup
1. Open Supabase SQL Editor
2. Run `avatar-history-migration.sql`
3. Verify tables and functions are created

### Step 2: Add Utility Module
1. Include `avatar-history-utils.js` in your HTML:
   ```html
   <script src="avatar-history-utils.js"></script>
   ```

### Step 3: Update Avatar Generation
Modify these locations to save to history:

#### In `edit.html` - After regenerating:
```javascript
// After uploading new image
await AvatarHistory.addToHistory(
  supabase,
  currentBot.id,
  newImageUrl,
  'regenerate',
  editPrompt,
  currentBot.traits
);
```

#### In `create.html` - After creating:
```javascript
// After saving new avatar
await AvatarHistory.addToHistory(
  supabase,
  avatarData.id,
  avatarData.image_url,
  'initial',
  creationPrompt,
  avatarData.traits
);
```

### Step 4: Add History UI (Optional)
Add the history viewer panel to `edit.html`:
- Panel with grid of thumbnail images
- Click to restore previous version
- Show version number, date, prompt
- Highlight current version

### Step 5: Test
1. Create a new avatar (should add version 1)
2. Regenerate the avatar (should add version 2)
3. View history (should show both versions)
4. Restore version 1 (should update main avatar)
5. Delete avatar (should cascade delete all history)

## Usage Examples

### Add to History
```javascript
const { success, historyId } = await AvatarHistory.addToHistory(
  supabase,
  'avatar-uuid',
  'https://storage.url/image.png',
  'regenerate',
  'make the background blue',
  { style: 'anime', mood: 'happy' }
);
```

### Get History
```javascript
const { success, history } = await AvatarHistory.getHistory(
  supabase,
  'avatar-uuid',
  20 // limit
);

// history = [
//   { id, image_url, version_number, is_current, created_from, edit_prompt, created_at },
//   ...
// ]
```

### Restore Version
```javascript
const { success } = await AvatarHistory.restoreVersion(
  supabase,
  'avatar-uuid',
  'history-entry-uuid'
);

if (success) {
  // Reload avatar to show restored version
  await loadBot(avatarId);
}
```

### Prune Old Versions
```javascript
// Keep only last 20 versions
const { deletedCount } = await AvatarHistory.pruneHistory(
  supabase,
  'avatar-uuid',
  20
);
```

## Database Functions

### `add_avatar_image_to_history()`
Adds a new image version to history and marks it as current.

### `restore_avatar_image_version()`
Restores a previous version by:
1. Updating the main avatars.image_url
2. Marking the selected history entry as current
3. Optionally restoring the traits snapshot

### `get_avatar_image_history()`
Returns ordered list of image versions for an avatar.

## Security

- **RLS Enabled**: Users can only access their own avatar history
- **Cascade Deletes**: History is automatically deleted when avatar is deleted
- **SECURITY DEFINER**: Functions run with elevated privileges but validate ownership

## Performance Considerations

- **Indexes**: 
  - `avatar_id` for fast lookups
  - `created_at DESC` for chronological queries
  - Partial index on `is_current = true`

- **Pruning**: 
  - Recommend keeping 20-50 versions max
  - Call `pruneHistory()` after each new version

- **Storage**: 
  - Each version stores only the URL (small)
  - Actual images are in Supabase Storage
  - Old image files should be cleaned up separately if needed

## Future Enhancements

1. **Automatic Pruning**: Trigger to auto-prune after insert
2. **Diff Visualization**: Show what changed between versions
3. **Bulk Operations**: Restore multiple avatars at once
4. **Export History**: Download all versions as ZIP
5. **Storage Cleanup**: Automatically delete orphaned image files
6. **Compare View**: Side-by-side comparison of versions

## Migration Notes

- The migration includes an optional step to migrate existing avatars
- Each existing avatar gets a version 1 entry marked as current
- This is backwards compatible - existing code continues to work

## Rollback

If you need to rollback this feature:
```sql
DROP TABLE IF EXISTS public.avatar_image_history CASCADE;
DROP FUNCTION IF EXISTS add_avatar_image_to_history CASCADE;
DROP FUNCTION IF EXISTS restore_avatar_image_version CASCADE;
DROP FUNCTION IF EXISTS get_avatar_image_history CASCADE;
```

## Support & Maintenance

- All functions are SECURITY DEFINER and validate ownership
- RLS policies prevent unauthorized access
- Cascade deletes ensure no orphaned records
- Indexes ensure fast performance even with thousands of versions

---

## Quick Start Checklist

- [ ] Run `avatar-history-migration.sql` in Supabase
- [ ] Add `avatar-history-utils.js` to your project
- [ ] Update `edit.html` regenerate function
- [ ] Update `create.html` creation function
- [ ] Add history viewer UI (optional)
- [ ] Test create → regenerate → restore workflow
- [ ] Set up automatic pruning
- [ ] Done! 🎉
