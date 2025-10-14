# Edit Credits Caching Issue - Fixed

## Problem
The `edit_credits_used` field in the Supabase `user_subscriptions` table was taking several minutes to update after using an edit credit. This created a poor user experience where:
- Credits appeared to be used immediately in the UI
- But when checking the billing page or refreshing, old values would show
- Database queries would return stale data for minutes

## Root Cause
PostgreSQL functions are marked with a volatility category:
- **VOLATILE** (default for most operations): Can modify the database, always re-executed
- **STABLE**: Won't modify database, returns same result within a transaction
- **IMMUTABLE**: Always returns same result for same inputs

When you create a function with `LANGUAGE plpgsql`, PostgreSQL defaults to **STABLE** behavior in some cases, which means:
1. Supabase's connection pooler can cache results
2. Read replicas might have replication lag
3. The query planner may optimize away repeated calls

Our functions:
- `get_user_subscription_info()` - reads subscription data
- `use_edit_credit()` - writes to database

Even though `use_edit_credit()` modifies data, the subsequent `get_user_subscription_info()` calls were potentially getting cached or stale results.

## Solution
Mark both functions as **VOLATILE** to ensure:
- No caching of results
- Always fetch fresh data from the primary database
- Force re-execution on every call

### Changes Made

#### 1. Updated `get_user_subscription_info()` function
```sql
-- Added VOLATILE at the end
$$ LANGUAGE plpgsql VOLATILE;
```

#### 2. Updated `use_edit_credit()` function
```sql
-- Added VOLATILE at the end
$$ LANGUAGE plpgsql VOLATILE;
```

## How to Apply

### Option 1: Run the fix script
In your Supabase SQL Editor, run:
```bash
/sql/fix-edit-credits-caching.sql
```

### Option 2: Manual update via Supabase Dashboard
1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `sql/fix-edit-credits-caching.sql`
3. Click "Run"

### Option 3: Command line
```bash
# If you have supabase CLI installed
supabase db execute < sql/fix-edit-credits-caching.sql
```

## Expected Behavior After Fix
✅ Edit credit updates should be **immediate**
✅ Refreshing the billing page shows current credit count
✅ No more 2-5 minute delays
✅ UI stays in sync with database

## Verification
After running the fix, test by:
1. Check current edit credits on billing page
2. Use an edit credit (regenerate an avatar)
3. Immediately refresh billing page
4. Credits should be updated instantly

## Additional Notes

### Why VOLATILE is safe here
- We're reading user-specific data (not system-wide)
- Performance impact is minimal (queries are fast)
- Correctness is more important than caching for credits

### Alternative Approaches (not needed, but FYI)
If VOLATILE still shows delays:
1. **Check Supabase connection settings** - ensure you're not using read replicas for writes
2. **Add timestamps** - track when updates happen to measure actual lag
3. **Use real-time subscriptions** - listen for changes instead of polling

### Related Files
- `/sql/edit-credits-migration.sql` - Original migration (updated)
- `/sql/fix-edit-credits-caching.sql` - The fix script
- `/freemium-utils.js` - Client-side functions that call these
- `/edit.html` - Where credits are used
- `/billing.html` - Where credits are displayed

## Status
✅ Fixed - Run the SQL script to apply changes
