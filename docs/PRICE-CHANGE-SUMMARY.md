# Monthly Plan Price Change: $10 → $9

## Summary

Updated the monthly subscription price from **$10** to **$9** (900 cents) across all files.

## Files Updated

### 1. Database Migration (`edit-credits-migration.sql`)
- Updated monthly plan price from 1000 cents to **900 cents**

### 2. Stripe API (`api/stripe.js`)
- Updated `monthly` plan: 1000 → **900 cents**
- Updated `unlimited` plan: 1000 → **900 cents** (for backward compatibility)

### 3. Documentation Files
- `STRIPE-PRICE-UPDATE.md` - Updated all references
- `EDIT-CREDITS-README.md` - Updated plan description
- `PAYWALL-DELETED-BOTS-FIX.md` - Updated plan description

## Final Pricing

| Plan | Price | Billing | Bots | Edit Credits |
|------|-------|---------|------|--------------|
| Free | $0 | - | 1 | 0 |
| Starter | $4 | One-time | 3 lifetime | 5 lifetime |
| Monthly | **$9** | Monthly | 20/month | 20/month |

## Action Required

⚠️ **Update Stripe Dashboard:**
1. Go to Stripe Dashboard → Products
2. Update Monthly Plan price to **$9.00/month** (900 cents)
3. Test checkout flow

## Deployment

```bash
# Deploy to production
vercel --prod

# Or push to trigger automatic deployment
git add .
git commit -m "Update monthly plan: $9/month (was $10)"
git push origin main
```

---

**Note:** Both code and database now reflect the new $9/month pricing. Don't forget to update your Stripe Dashboard to match!
