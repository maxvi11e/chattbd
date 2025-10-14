# Stripe Price Update

## Changes Made

Updated Stripe pricing in `/api/stripe.js` to match the new subscription plans:

### Price Changes

1. **Starter Plan**: 
   - Old: 50 cents ($0.50)
   - New: **400 cents ($4.00)**
   - Billing: One-time payment
   - Bot Limit: 3 AIs
   - Edit Credits: 5

2. **Monthly Plan** (formerly "Unlimited"):
   - Old: 50 cents ($0.50/month)
   - New: **900 cents ($9.00/month)**
   - Billing: Monthly subscription
   - Bot Limit: 20 AIs/month
   - Edit Credits: 20/month

### Updated Code

```javascript
function getPlanDetails(planId) {
  const plans = {
    'free': {
      name: 'Free Plan',
      description: 'Create 1 agent for free',
      price_cents: 0,
      billing_interval: 'one_time',
      bot_limit: 1
    },
    'starter': {
      name: 'Starter Plan',
      description: 'Great for personal projects',
      price_cents: 400, // $4.00 one-time
      billing_interval: 'one_time',
      bot_limit: 3
    },
    'monthly': {
      name: 'Monthly Plan',
      description: 'Perfect for active creators',
      price_cents: 900, // $9.00 per month
      billing_interval: 'monthly',
      bot_limit: 20
    },
    'unlimited': {
      name: 'Unlimited Plan',
      description: 'Create unlimited agents',
      price_cents: 900,
      billing_interval: 'monthly',
      bot_limit: null
    }
  };

  return plans[planId] || null;
}
```

## Important Notes

### Stripe Dashboard Configuration Required

⚠️ **You must also update your Stripe Products/Prices in the Stripe Dashboard:**

1. **Log into Stripe Dashboard** → Products
2. **Update Starter Plan Price**:
   - Create new price: $4.00 USD (one-time)
   - Or update existing price to 400 cents
3. **Update Monthly Plan Price**:
   - Create new price: $9.00 USD (recurring monthly)
   - Or update existing price to 900 cents

### Plan ID Mapping

The code now supports both `'monthly'` and `'unlimited'` plan IDs for backward compatibility:
- **New checkouts**: Use `'monthly'` plan ID
- **Existing subscriptions**: `'unlimited'` still works and maps to $9/month

### Testing Checklist

After deployment:

1. ✅ Test Starter Plan checkout ($4.00)
2. ✅ Test Monthly Plan checkout ($9.00)
3. ✅ Verify Stripe webhook handles price changes
4. ✅ Check subscription status displays correct prices
5. ✅ Test upgrade flow from Free → Starter
6. ✅ Test upgrade flow from Starter → Monthly

### Deployment

```bash
# Deploy to Vercel
vercel --prod

# Or push to trigger automatic deployment
git add .
git commit -m "Update Stripe pricing: Starter $4, Monthly $9"
git push origin main
```

## Alignment with Database

These prices now match the `subscription_plans` table after running `edit-credits-migration.sql`:

| Plan | Price | Billing | Bots | Edits |
|------|-------|---------|------|-------|
| Free | $0 | - | 1 | 0 |
| Starter | $4 | One-time | 3 | 5 |
| Monthly | $9 | Monthly | 20 | 20 |
