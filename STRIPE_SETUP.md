# Stripe Integration Setup Guide

This guide will help you set up Stripe payment processing for the Build a Bot freemium model.

## 1. Create a Stripe Account

1. Go to [stripe.com](https://stripe.com) and create an account
2. Complete the account verification process
3. Navigate to the Stripe Dashboard

## 2. Get Your API Keys

1. In the Stripe Dashboard, go to **Developers** > **API keys**
2. Copy your **Publishable key** (starts with `pk_`)  
3. Copy your **Secret key** (starts with `sk_`)
4. Keep these secure - you'll need them for environment variables

## 3. Create Your Products in Stripe

### Starter Plan ($5 one-time)
1. Go to **Products** in Stripe Dashboard
2. Click **Add product**
3. Name: "Build a Bot Starter Plan"
4. Description: "Create up to 4 bots"
5. **Pricing**: One-time payment, $5.00 USD
6. Copy the **Price ID** (starts with `price_`)

### Unlimited Plan ($9/month)  
1. Click **Add product** again
2. Name: "Build a Bot Unlimited Plan"
3. Description: "Create unlimited bots"
4. **Pricing**: Recurring, $9.00 USD, Monthly
5. Copy the **Price ID** (starts with `price_`)

## 4. Update Database with Price IDs

Update your `subscription_plans` table with the Stripe Price IDs:

```sql
-- Update Starter plan with Stripe Price ID
UPDATE subscription_plans 
SET stripe_price_id = 'price_YOUR_STARTER_PRICE_ID_HERE'
WHERE id = 2;

-- Update Unlimited plan with Stripe Price ID  
UPDATE subscription_plans
SET stripe_price_id = 'price_YOUR_UNLIMITED_PRICE_ID_HERE'
WHERE id = 3;
```

## 5. Set Environment Variables

If deploying to Vercel:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** > **Environment Variables**
3. Add these variables:

```
STRIPE_SECRET_KEY=sk_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_your_publishable_key_here
STRIPE_WEBHOOK_SECRET=(will be set after step 6)
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## 6. Set Up Webhooks

1. In Stripe Dashboard, go to **Developers** > **Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `https://your-domain.vercel.app/api/stripe`
4. Select these events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)
7. Add it as `STRIPE_WEBHOOK_SECRET` environment variable

## 7. Test the Integration

### Test Mode
1. Use Stripe's test mode first
2. Use test card numbers like `4242424242424242`
3. Test the complete flow:
   - Create account → Hit bot limit → Upgrade → Payment → Success

### Going Live
1. Switch Stripe to Live mode
2. Update API keys to live keys (no `test_` prefix)
3. Update webhook endpoint URL to production
4. Test with real card (small amount first)

## 8. Verification Checklist

- [ ] Stripe account created and verified
- [ ] API keys obtained and stored securely
- [ ] Products created in Stripe
- [ ] Database updated with Price IDs
- [ ] Environment variables configured
- [ ] Webhooks set up and tested
- [ ] Full payment flow tested

## Troubleshooting

### Common Issues

1. **"Invalid API key"**: Check that you're using the correct secret key for your mode (test/live)

2. **"No such price"**: Verify the Price ID in your database matches Stripe

3. **"Webhook signature verification failed"**: Ensure `STRIPE_WEBHOOK_SECRET` matches your endpoint's signing secret

4. **"User subscription not updating"**: Check webhook delivery in Stripe Dashboard and server logs

### Testing Webhooks Locally

Use Stripe CLI for local development:
```bash
stripe listen --forward-to localhost:3000/api/stripe
stripe trigger checkout.session.completed
```

## Support

- Stripe Documentation: https://stripe.com/docs
- Stripe Support: https://support.stripe.com
- Test Cards: https://stripe.com/docs/testing#cards
