# Paywall Fix: Track Deleted Bots

## Problem
Users could delete bots and create new ones to bypass the paywall. The avatars are **permanently deleted** from the database (not soft-deleted), so we can't count them after deletion.

## Solution
Created a permanent counter table (`user_bot_counters`) that tracks total bots created and NEVER decrements, even when bots are deleted.

### Plan-Specific Logic

#### Free Plan ($0)
- **Limit**: 1 bot total (ever)
- **Counts**: Permanent counter in `user_bot_counters` table
- **Rationale**: Prevents users from deleting and recreating to bypass free limit

#### Starter Plan ($4 one-time)
- **Limit**: 3 bots total (ever)
- **Counts**: `total_bots_created` in `user_subscriptions` table
- **Rationale**: One-time purchase means lifetime limit, can't game by deleting

#### Monthly Plan ($9/month)
- **Limit**: 20 bots per month
- **Counts**: Only active bots
- **Rationale**: Recurring payment means users can delete/recreate within their monthly allowance

## Database Changes

### New Table: `user_bot_counters`
```sql
CREATE TABLE public.user_bot_counters (
  user_id uuid PRIMARY KEY,
  total_bots_created integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

This table:
- Tracks bot creation for ALL users (including free users with no subscription)
- Counter ONLY increments, never decrements
- Persists even if bot is deleted from `avatars` table

### New Column in `user_subscriptions`
```sql
total_bots_created integer DEFAULT 0
```
Used for tracking Starter plan users.

### Updated Function: `get_user_subscription_info()`
Now uses the permanent counter:
- **Free users**: Reads from `user_bot_counters` table
- **Starter plan**: Uses `total_bots_created` in `user_subscriptions`
- **Monthly plan**: Counts only active bots (existing behavior)

### Updated Trigger: `increment_total_bots_created()`
Now updates BOTH:
1. `user_subscriptions.total_bots_created` (if user has subscription)
2. `user_bot_counters.total_bots_created` (ALWAYS, for all users)

## Migration Steps

### Run the Complete Migration
Execute the updated `edit-credits-migration.sql` in Supabase SQL Editor. Key steps:

1. **Step 2a-2b**: Create `user_bot_counters` table and initialize
2. **Step 7**: Update `get_user_subscription_info()` function
3. **Step 10**: Update `increment_total_bots_created()` trigger

### Verify Tables Created
```sql
-- Check if table exists
SELECT * FROM user_bot_counters LIMIT 5;

-- Check counters are initialized
SELECT 
  ubc.user_id,
  ubc.total_bots_created,
  (SELECT COUNT(*) FROM avatars WHERE user_id = ubc.user_id) as current_avatars
FROM user_bot_counters ubc;
```

## Testing

### Test Free Users
1. Create 1 bot as free user ✅
2. Try to create 2nd bot → Should block ✅
3. Delete first bot
4. Try to create new bot → Should still block ✅ (this is the fix!)

### Test Starter Plan Users
1. Create 3 bots with Starter plan ✅
2. Try to create 4th bot → Should block ✅
3. Delete one bot
4. Try to create new bot → Should still block ✅ (counts deleted bots)
5. Check `total_bots_created` = 3 ✅

### Test Monthly Plan Users
1. Create 5 bots with Monthly plan ✅
2. Delete 2 bots
3. Should be able to create 2 more (7 total created, 5 active) ✅
4. Monthly users can delete/recreate within their limit ✅

## Verification Queries

### Check a specific user's counter:
```sql
SELECT 
  ubc.user_id,
  ubc.total_bots_created as permanent_counter,
  us.total_bots_created as subscription_counter,
  us.plan_id,
  (SELECT COUNT(*) FROM avatars WHERE user_id = ubc.user_id) as current_avatars
FROM user_bot_counters ubc
LEFT JOIN user_subscriptions us ON ubc.user_id = us.user_id AND us.status = 'active'
WHERE ubc.user_id = 'YOUR_USER_ID_HERE';
```

### Check all users and their limits:
```sql
SELECT 
  ubc.user_id,
  ubc.total_bots_created,
  COALESCE(us.plan_id, 'free') as plan,
  sp.billing_interval,
  (SELECT COUNT(*) FROM avatars WHERE user_id = ubc.user_id AND is_active = true) as active_bots
FROM user_bot_counters ubc
LEFT JOIN user_subscriptions us ON ubc.user_id = us.user_id AND us.status = 'active'
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
ORDER BY ubc.total_bots_created DESC;
```

### Manually reset a user's counter (for testing):
```sql
UPDATE user_bot_counters
SET total_bots_created = 0
WHERE user_id = 'YOUR_USER_ID_HERE';
```

### Test the function for a specific user:
```sql
SELECT * FROM get_user_subscription_info('YOUR_USER_ID_HERE');
```

## Edge Cases Handled

1. **User deletes all bots**: 
   - Free/Starter: Still can't create more (total tracked)
   - Monthly: Can create up to their limit again

2. **User upgrades from Free to Starter**:
   - New subscription gets fresh `total_bots_created` counter
   - But trigger will increment from current total

3. **Trigger doesn't fire** (if bot created before migration):
   - Initial UPDATE in step 2a catches all existing bots

4. **User has no subscription** (free tier):
   - Function counts all bots in database (both active and inactive)

## Rollback (if needed)

```sql
-- Remove trigger
DROP TRIGGER IF EXISTS increment_bots_trigger ON public.avatars;
DROP FUNCTION IF EXISTS increment_total_bots_created();

-- Remove column
ALTER TABLE user_subscriptions DROP COLUMN IF EXISTS total_bots_created;

-- Revert to old function (counts only active bots for all plans)
-- Run the original get_user_subscription_info from freemium-migration.sql
```
