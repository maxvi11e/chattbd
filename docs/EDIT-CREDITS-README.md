# Edit Credits System

## Overview
The edit credits system allows users to regenerate AI avatars on the edit page. Each regeneration consumes one edit credit.

## Subscription Plans

### Free Plan ($0)
- Create 1 AI
- **0 edit credits** (no regenerations allowed)
- Basic customization
- Community support

### Starter Plan ($4 one-time)
- Create up to 3 AIs
- **5 edit credits** (5 regenerations total)
- Advanced customization
- Email support

### Monthly Plan ($9/month)
- Create up to 20 AIs per month
- **20 edit credits per month** (20 regenerations per month)
- Priority support
- Advanced features

## How It Works

### For Users

1. **On edit.html**: Users see their remaining edit credits displayed when the edit form is shown
2. **Visual Indicators**:
   - Green/normal: Plenty of credits remaining
   - Orange/warning: 2 or fewer credits remaining
   - Red/depleted: No credits remaining
3. **When Regenerating**: 
   - System checks if user has credits
   - If yes: Uses one credit and regenerates image
   - If no: Shows upgrade modal
4. **On billing.html**: Users can see their total edit credits used/limit

### Database Schema

#### New Columns in `subscription_plans`:
```sql
edit_credits_limit integer DEFAULT 0
```

#### New Columns in `user_subscriptions`:
```sql
edit_credits_used integer DEFAULT 0
edit_credits_limit integer DEFAULT 0
monthly_bots_created integer DEFAULT 0
monthly_bot_limit integer DEFAULT NULL
```

### Database Functions

#### `get_user_subscription_info(user_uuid)`
Returns subscription info including:
- `edit_credits_used`: Number of credits used
- `edit_credits_limit`: Total credits available
- `can_use_edit_credit`: Boolean if user can use a credit

#### `use_edit_credit(user_uuid)`
Consumes one edit credit and returns:
```json
{
  "success": true,
  "credits_used": 3,
  "credits_limit": 5,
  "credits_remaining": 2
}
```

## Implementation Files

### SQL Migration
- `/sql/edit-credits-migration.sql` - Run this in Supabase SQL Editor

### Frontend Files
- `/billing.html` - Updated to show edit credits usage
- `/edit.html` - Updated to check and use edit credits
- `/freemium-utils.js` - Added `canUserUseEditCredit()` and `useEditCredit()` functions

## Migration Steps

1. **Run SQL Migration**:
   ```sql
   -- In Supabase SQL Editor
   -- Run the contents of sql/edit-credits-migration.sql
   ```

2. **Update Existing Subscriptions** (if needed):
   ```sql
   -- Give existing users their edit credits
   UPDATE user_subscriptions
   SET edit_credits_limit = (
     SELECT edit_credits_limit 
     FROM subscription_plans 
     WHERE subscription_plans.id = user_subscriptions.plan_id
   ),
   edit_credits_used = 0
   WHERE status = 'active';
   ```

3. **Test the System**:
   - Create a test user
   - Subscribe to Starter plan
   - Go to edit.html and verify 5 credits show
   - Regenerate an image and verify credits decrement
   - Try to regenerate with 0 credits and verify upgrade modal shows

## Testing Checklist

- [ ] Free plan shows "0 edit credits" or hides indicator
- [ ] Starter plan shows "5 / 5" credits initially
- [ ] Monthly plan shows "20 / 20" credits initially
- [ ] Credits decrement after successful regeneration
- [ ] Credit counter updates in real-time on edit.html
- [ ] Upgrade modal shows when out of credits
- [ ] billing.html displays credit usage correctly
- [ ] Credits reset monthly for Monthly plan (requires cron job - see below)

## Monthly Credit Reset (TODO)

For the Monthly plan, you'll need to set up a scheduled function to reset credits:

```sql
-- Create a function to reset monthly credits
CREATE OR REPLACE FUNCTION reset_monthly_credits()
RETURNS void AS $$
BEGIN
  UPDATE user_subscriptions
  SET 
    edit_credits_used = 0,
    monthly_bots_created = 0
  WHERE plan_id = 'monthly'
  AND status = 'active'
  AND current_period_start < NOW() - INTERVAL '1 month';
END;
$$ LANGUAGE plpgsql;

-- Schedule this to run daily via Supabase Edge Functions or pg_cron
```

## Future Enhancements

1. **Credit Packs**: Allow users to buy additional credits
2. **Credit History**: Track when/how credits were used
3. **Credit Expiration**: Add expiration dates for one-time purchase credits
4. **Rollover Credits**: Allow unused monthly credits to rollover (limited)
5. **Notifications**: Warn users when running low on credits
