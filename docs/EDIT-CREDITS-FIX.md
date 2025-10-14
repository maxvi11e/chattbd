# Edit Credits Display Fix

## Issue
After using an edit credit to regenerate an image, the credit counter wasn't updating in the UI.

## Fixes Applied

### 1. SQL Migration Update
**File:** `/sql/edit-credits-migration.sql`

Added step 6a to initialize edit credits for existing subscriptions:
```sql
UPDATE user_subscriptions us
SET 
  edit_credits_limit = sp.edit_credits_limit,
  edit_credits_used = COALESCE(us.edit_credits_used, 0)
FROM subscription_plans sp
WHERE us.plan_id = sp.id
AND us.status = 'active';
```

### 2. JavaScript Updates
**File:** `/edit.html`

#### Changes Made:
1. **Immediate credit update after consumption:**
   - Added `await loadEditCreditsInfo()` right after `useEditCredit()` succeeds
   - This updates the UI immediately when credit is consumed

2. **Reset loading state on early returns:**
   - Added `setLoadingState(false)` and `isRegenerating = false` before early returns
   - Prevents UI from staying in loading state if credit check fails

3. **Reload credits on API error:**
   - Added `await loadEditCreditsInfo()` in the error handling for API failures
   - Ensures credits are updated even if image generation fails

4. **Reload credits on catch:**
   - Added `await loadEditCreditsInfo()` in the catch block
   - Ensures credits are updated if any unexpected error occurs

## How to Test

### Step 1: Run the Updated Migration
If you've already run the migration, run just the new step:

```sql
-- Initialize edit credits for existing active subscriptions
UPDATE user_subscriptions us
SET 
  edit_credits_limit = sp.edit_credits_limit,
  edit_credits_used = COALESCE(us.edit_credits_used, 0)
FROM subscription_plans sp
WHERE us.plan_id = sp.id
AND us.status = 'active';
```

Or re-run the entire migration if needed.

### Step 2: Clear Browser Cache
- Hard refresh the page (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
- Or clear browser cache for the site

### Step 3: Test the Flow
1. Go to edit.html with a bot
2. Check your current edit credits (should show at top of edit form)
3. Click "Edit Appearance" button
4. Enter a prompt and click "Regenerate Image"
5. **Immediately** after clicking, the credit counter should decrement
6. Wait for regeneration to complete
7. Verify credit counter still shows the reduced number

### Step 4: Test Error Cases
1. Try to regenerate when you have 0 credits
   - Should show upgrade modal
   - Credits should stay at 0
2. Test with a very short/invalid prompt
   - Even if it errors, credits should update

## Verification Checklist

- [ ] Edit credits display shows correct initial count
- [ ] Credits decrement immediately when "Regenerate" is clicked
- [ ] Credits stay updated even if regeneration fails
- [ ] Credits display updates after successful regeneration
- [ ] Credits display shows 0 when depleted
- [ ] Upgrade modal appears when no credits remain
- [ ] billing.html shows matching credit counts

## Debugging

If credits still don't update, check browser console for:

```javascript
// After clicking regenerate, you should see:
✅ Edit credit used. X credits remaining.

// Then immediately:
// The loadEditCreditsInfo() function should execute
```

To manually check your credits in browser console:
```javascript
const info = await window.FreemiumUtils.getUserSubscriptionInfo(supabase);
console.log('Credits:', info.edit_credits_used, '/', info.edit_credits_limit);
```

## Rollback (if needed)

If something goes wrong, you can manually reset credits:

```sql
-- Reset all credits to 0 used for a specific user
UPDATE user_subscriptions
SET edit_credits_used = 0
WHERE user_id = 'YOUR_USER_ID';

-- Or reset for all users
UPDATE user_subscriptions
SET edit_credits_used = 0
WHERE status = 'active';
```
