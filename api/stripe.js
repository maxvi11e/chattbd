// Stripe Integration for Build a Bot
// This handles payment processing and webhook events

export default async function handler(req, res) {
  // Handle different Stripe operations based on the request
  const { method } = req;

  switch (method) {
    case 'POST':
      if (req.url?.includes('/create-checkout-session')) {
        return await createCheckoutSession(req, res);
      } else if (req.url?.includes('/webhook')) {
        return await handleWebhook(req, res);
      } else if (req.url?.includes('/create-portal-session')) {
        return await createPortalSession(req, res);
      }
      break;
    case 'GET':
      if (req.url?.includes('/subscription-status')) {
        return await getSubscriptionStatus(req, res);
      }
      break;
    default:
      res.setHeader('Allow', ['POST', 'GET']);
      return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.status(404).json({ error: 'Not found' });
}

// Create a Stripe Checkout session for subscription upgrade
async function createCheckoutSession(req, res) {
  try {
    const { planId, userId } = await req.json();

    if (!planId || !userId) {
      return res.status(400).json({ error: 'Missing planId or userId' });
    }

    // Initialize Stripe
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    // Get plan details from database
    const planDetails = getPlanDetails(planId);
    if (!planDetails) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: planDetails.name,
            description: planDetails.description,
          },
          unit_amount: planDetails.price_cents,
          recurring: planDetails.billing_interval === 'monthly' ? {
            interval: 'month',
          } : undefined,
        },
        quantity: 1,
      }],
      mode: planDetails.billing_interval === 'monthly' ? 'subscription' : 'payment',
      success_url: `${process.env.FRONTEND_URL || 'https://www.buildabot.chat'}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'https://www.buildabot.chat'}/billing?canceled=true`,
      client_reference_id: userId,
      metadata: {
        planId: planId,
        userId: userId,
      }
    });

    return res.status(200).json({ url: session.url });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
}

// Create a Stripe Customer Portal session for subscription management
async function createPortalSession(req, res) {
  try {
    const { customerId } = await req.json();

    if (!customerId) {
      return res.status(400).json({ error: 'Missing customerId' });
    }

    // TODO: Add Stripe portal session creation
    /*
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.FRONTEND_URL}/billing`,
    });

    return res.status(200).json({ url: portalSession.url });
    */

    // Temporary response for development
    return res.status(200).json({ 
      message: 'Stripe portal not yet implemented',
      customerId
    });

  } catch (error) {
    console.error('Error creating portal session:', error);
    return res.status(500).json({ error: 'Failed to create portal session' });
  }
}

// Handle Stripe webhooks
async function handleWebhook(req, res) {
  try {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // Initialize Stripe and verify webhook
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return res.status(200).json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Webhook handling failed' });
  }
}

// Get subscription status for a user
async function getSubscriptionStatus(req, res) {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    // TODO: Get subscription from database
    // This would query the user_subscriptions table
    const subscriptionStatus = {
      planId: 'free',
      status: 'active',
      currentPeriodEnd: null
    };

    return res.status(200).json(subscriptionStatus);

  } catch (error) {
    console.error('Error getting subscription status:', error);
    return res.status(500).json({ error: 'Failed to get subscription status' });
  }
}

// Webhook event handlers
async function handleCheckoutCompleted(session) {
  try {
    const userId = session.client_reference_id;
    const planId = session.metadata.planId;
    const customerId = session.customer;
    const subscriptionId = session.subscription;

    console.log('Checkout completed:', {
      userId,
      planId,
      customerId,
      subscriptionId
    });

    // Initialize Supabase with service role key for database updates
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Calculate period dates
    const now = new Date();
    const planDetails = getPlanDetails(planId);
    let periodEnd = now;
    
    if (planDetails.billing_interval === 'monthly') {
      periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    } else if (planDetails.billing_interval === 'yearly') {
      periodEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 365 days
    } else {
      // One-time payment, set a far future date
      periodEnd = new Date('2099-12-31');
    }

    // Update user_subscriptions table
    const { error } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        plan_id: planId,
        status: 'active',
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString()
      });

    if (error) {
      console.error('Error updating subscription in database:', error);
      throw error;
    }

    console.log('Subscription successfully activated in database');

  } catch (error) {
    console.error('Error handling checkout completion:', error);
  }
}

async function handlePaymentSucceeded(invoice) {
  try {
    const subscriptionId = invoice.subscription;
    const customerId = invoice.customer;

    // TODO: Update subscription status
    console.log('Payment succeeded:', {
      subscriptionId,
      customerId
    });

  } catch (error) {
    console.error('Error handling payment success:', error);
  }
}

async function handlePaymentFailed(invoice) {
  try {
    const subscriptionId = invoice.subscription;
    const customerId = invoice.customer;

    // TODO: Update subscription status to past_due
    console.log('Payment failed:', {
      subscriptionId,
      customerId
    });

  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

async function handleSubscriptionUpdated(subscription) {
  try {
    const customerId = subscription.customer;
    const status = subscription.status;

    // TODO: Update subscription in database
    console.log('Subscription updated:', {
      customerId,
      status
    });

  } catch (error) {
    console.error('Error handling subscription update:', error);
  }
}

async function handleSubscriptionDeleted(subscription) {
  try {
    const customerId = subscription.customer;

    // TODO: Update subscription status to cancelled
    console.log('Subscription deleted:', {
      customerId
    });

  } catch (error) {
    console.error('Error handling subscription deletion:', error);
  }
}

// Helper function to get plan details
function getPlanDetails(planId) {
  const plans = {
    'free': {
      name: 'Free Plan',
      description: 'Create 1 bot for free',
      price_cents: 0,
      billing_interval: 'one_time',
      bot_limit: 1
    },
    'starter': {
      name: 'Starter Plan',
      description: 'Create up to 4 bots',
      price_cents: 500,
      billing_interval: 'one_time',
      bot_limit: 4
    },
    'unlimited': {
      name: 'Unlimited Plan',
      description: 'Create unlimited bots',
      price_cents: 900,
      billing_interval: 'monthly',
      bot_limit: null
    }
  };

  return plans[planId] || null;
}
