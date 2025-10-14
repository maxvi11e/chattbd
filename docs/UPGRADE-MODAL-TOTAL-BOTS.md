# Upgrade Modal: Show Total Bots Created

## What Changed

Updated the upgrade plan dialogue to display the **total number of bots created** (including deleted ones) alongside the current active bot count.

## Changes Made

### 1. SQL Function Update (`edit-credits-migration.sql`)

**Added `total_bots_created` to return values:**

```sql
CREATE OR REPLACE FUNCTION get_user_subscription_info(user_uuid uuid)
RETURNS TABLE (
    plan_id text,
    plan_name text,
    bot_limit integer,
    current_bot_count bigint,
    can_create_bot boolean,
    subscription_status text,
    edit_credits_used integer,
    edit_credits_limit integer,
    can_use_edit_credit boolean,
    total_bots_created integer  -- NEW FIELD
) AS $$
```

**Updated SELECT to return the value:**

```sql
-- Returns bot_counter.count for free users, total_bots_created for subscribed users
CASE
    WHEN user_sub.plan_id IS NULL THEN COALESCE(bot_counter.count, 0)
    ELSE COALESCE(user_sub.total_bots_created, 0)
END as total_bots_created
```

### 2. Frontend Update (`freemium-utils.js`)

**Updated modal HTML to show both counts:**

```html
<p id="usageText">
  You've created <strong id="totalBotsCreated">0</strong> agents total. 
  You currently have <strong id="botCount">0</strong> active agents out of 
  <strong id="botLimit">1</strong> allowed.
</p>
```

**Updated JavaScript to populate the new field:**

```javascript
if (totalBotsCreated) totalBotsCreated.textContent = subscriptionInfo.total_bots_created || 0;
if (botCount) botCount.textContent = subscriptionInfo.current_bot_count;
if (botLimit) botLimit.textContent = subscriptionInfo.bot_limit || 'unlimited';
```

## How It Works

### For Free Users:
- **Total Bots Created**: From `user_bot_counters` table (permanent counter)
- **Active Bots**: Current count from `avatars` table where `is_active = true`

### For Starter Plan Users (One-Time):
- **Total Bots Created**: From `user_subscriptions.total_bots_created`
- **Active Bots**: Current count from `avatars` table where `is_active = true`
- **Limit**: Based on total created (e.g., 3 lifetime)

### For Monthly Plan Users:
- **Total Bots Created**: From `user_subscriptions.total_bots_created`
- **Active Bots**: Current count from `avatars` table where `is_active = true`
- **Limit**: Based on active bots (e.g., 20/month, can delete and recreate)

## Example Display

**Free User (deleted 1 bot):**
> You've created **1** agent total. You currently have **0** active agents out of **1** allowed.

**Starter Plan (created 2, deleted 1):**
> You've created **2** agents total. You currently have **1** active agent out of **3** allowed.

**Monthly Plan (created 25, has 15 active):**
> You've created **25** agents total. You currently have **15** active agents out of **20** allowed.

## Testing

After running the updated migration:

1. **Test the function:**
```sql
SELECT * FROM get_user_subscription_info('YOUR_USER_ID');
```

2. **Verify the field is returned:**
- Should see `total_bots_created` in the result

3. **Test the modal:**
- Try to create a bot when at limit
- Check that the modal shows both total created and active count

## Why This Matters

This change helps users understand:
- **Why they're blocked**: "I only have 0 active bots, why can't I create more?"
- **Their usage history**: "I've created 5 bots total on this starter plan"
- **Plan differences**: Helps clarify that starter is lifetime limit, monthly is active limit
