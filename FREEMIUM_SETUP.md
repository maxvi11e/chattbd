# Freemium Model Implementation Guide

This guide explains how to implement the freemium model that has been built for your Aeaea application.

## 🎯 What's Implemented

### Pricing Tiers
- **Free Plan**: 1 bot (always free)
- **Starter Plan**: Up to 4 bots for $5 one-time  
- **Unlimited Plan**: Unlimited bots for $9/month

### Features Added
1. ✅ Database schema for subscriptions and plans
2. ✅ Bot creation limits and validation
3. ✅ Upgrade modal with pricing tiers
4. ✅ Subscription status in navigation
5. ✅ Usage tracking and progress bars
6. ✅ Billing management page
7. ✅ Stripe integration infrastructure
8. ✅ Bot count enforcement

## 🗄️ Database Setup

### 1. Run the Migration
Execute the SQL script in your Supabase dashboard:

```bash
# Run this in Supabase SQL Editor
cat freemium-migration.sql
```

This creates:
- `subscription_plans` table with the 3 pricing tiers
- `user_subscriptions` table to track user plans
- Helper functions for subscription management
- Row Level Security policies

### 2. Verify Database Function
The migration creates a function `get_user_subscription_info()` that returns:
- Current plan details
- Bot count and limits
- Subscription status
- Whether user can create more bots

## 🎨 Frontend Integration

### Files Added/Modified:
- `freemium-utils.js` - Core subscription logic
- `billing.html` - Subscription management page
- `freemium-migration.sql` - Database schema
- Updated `index.html` - Dashboard with usage stats
- Updated `create.html` - Bot creation limits

### How It Works:
1. **Bot Creation**: Before creating a bot, the system checks user's current bot count against their plan limit
2. **Upgrade Prompts**: When limits are reached, users see a modal with upgrade options
3. **Usage Display**: Dashboard shows current usage (e.g., "2 of 4 bots created")
4. **Navigation**: Subscription status visible in top navigation

## 💳 Payment Integration (Stripe)

### Current Status: Infrastructure Ready
The Stripe integration infrastructure is set up but needs configuration:

### 1. Environment Variables Needed:
```bash
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=https://yourdomain.com
```

### 2. Stripe Setup Steps:
1. Create a Stripe account
2. Add your API keys to environment variables
3. Set up webhook endpoints in Stripe dashboard:
   - `https://yourdomain.com/api/stripe/webhook`
4. Configure webhook events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

### 3. Test the Integration:
```javascript
// The payment flow will:
// 1. Create Stripe Checkout session
// 2. Redirect user to Stripe
// 3. Handle webhooks to update subscription
// 4. Update user permissions
```

## 🔧 Configuration

### Customize Pricing:
Edit the plans in `freemium-migration.sql`:

```sql
INSERT INTO public.subscription_plans (id, name, description, price_cents, billing_interval, bot_limit) VALUES
('starter', 'Starter Plan', 'Create up to 4 bots', 500, 'one_time', 4),  -- $5 one-time
('unlimited', 'Unlimited Plan', 'Unlimited bots', 900, 'monthly', NULL); -- $9.00/month
```

### Customize Features:
- Change bot limits in the database
- Modify pricing display in `freemium-utils.js`
- Update plan descriptions and features

## 🚀 Testing the Implementation

### 1. Test Free Plan Limits:
1. Create a new account
2. Create 1 bot (should work)
3. Try to create a 2nd bot (should show upgrade modal)

### 2. Test Upgrade Flow:
1. Click "Upgrade" button
2. Should show pricing modal
3. Payment integration will redirect to Stripe (when configured)

### 3. Test Subscription Management:
1. Visit `/billing.html`
2. View current plan and usage
3. Access upgrade options

## 📊 Analytics & Monitoring

Consider adding:
- User conversion tracking (free → paid)
- Bot creation metrics by plan
- Revenue tracking
- Plan usage analytics

## 🔒 Security Considerations

1. **Row Level Security**: Enabled on subscription tables
2. **Webhook Verification**: Stripe webhook signatures verified
3. **User Isolation**: Users can only see their own subscriptions
4. **Bot Limits**: Server-side validation of creation limits

## 📱 User Experience

### What Users See:
1. **Dashboard**: Current plan status and bot count
2. **Creation**: Blocked when limit reached with upgrade prompt
3. **Billing Page**: Full subscription management
4. **Navigation**: Always visible plan status

### Upgrade Flow:
1. User hits bot limit
2. Modal shows pricing options
3. Click upgrade → Stripe Checkout
4. Payment success → Plan updated
5. User can create more bots

## 🐛 Troubleshooting

### Common Issues:
1. **Database function not found**: Re-run migration
2. **Bot limits not enforcing**: Check RLS policies
3. **Upgrade modal not showing**: Verify freemium-utils.js is loaded
4. **Payment not working**: Check Stripe configuration

### Debug Steps:
1. Check browser console for JavaScript errors
2. Verify database function exists and returns data
3. Test subscription info API calls
4. Confirm Stripe webhook is receiving events

## 🔄 Next Steps

### Immediate:
1. Configure Stripe account and API keys
2. Test the payment flow end-to-end
3. Set up webhook monitoring

### Future Enhancements:
- Annual billing discounts
- More plan tiers
- Bot export/backup features
- Team/organization accounts
- Usage analytics dashboard

---

## 📞 Support

The freemium model is now fully integrated into your app! Users will be automatically limited to 1 free bot, with clear upgrade paths to paid plans. The infrastructure supports immediate Stripe integration when you're ready to process payments.

Test thoroughly with the free plan limits first, then add your Stripe configuration to enable payments.
