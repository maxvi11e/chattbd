// Stripe Integration for Build a Bot
// This handles payment processing and webhook events

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Force fresh deployment for API route recognition

// Disable body parsing for webhooks to get raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('API called with method:', req.method);
  console.log('Request body:', req.body);

  // Handle different Stripe operations based on the request
  const { method } = req;

  try {
    switch (method) {
      case 'POST':
        // Check if this is a webhook (raw body)
        if (req.headers['stripe-signature']) {
          return await handleWebhook(req, res);
        }
        
        // Otherwise, parse body and check action
        const rawBody = await getRawBody(req);
        const body = JSON.parse(rawBody);
        const { action } = body;
        
        if (action === 'create-checkout-session') {
          return await createCheckoutSession(req, res);
        } else if (action === 'create-portal-session') {
          return await createPortalSession(req, res);
        }
        break;
      case 'GET':
        const { action: getAction } = req.query;
        if (getAction === 'subscription-status') {
          return await getSubscriptionStatus(req, res);
        }
        break;
      default:
        res.setHeader('Allow', ['POST', 'GET']);
        return res.status(405).json({ error: 'Method not allowed' });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('API handler error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

// Create a Stripe Checkout session for subscription upgrade
async function createCheckoutSession(req, res) {
  try {
    // Parse request body
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { planId, userId } = body;

    console.log('Received request:', { planId, userId });
    console.log('Environment check:', {
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    });

    if (!planId || !userId) {
      console.log('Missing required fields:', { planId: !!planId, userId: !!userId });
      return res.status(400).json({ error: 'Missing planId or userId' });
    }

    // Check for required environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY not found in environment variables');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    console.log('Stripe initialized successfully');

    // Get plan details from database
    const planDetails = getPlanDetails(planId);
    console.log('Plan details retrieved:', { planId, planDetails });
    
    if (!planDetails) {
      return res.status(400).json({ error: `Invalid plan: ${planId}` });
    }

    // Create Stripe checkout session
    console.log('Creating Stripe session with config:', {
      mode: planDetails.billing_interval === 'monthly' ? 'subscription' : 'payment',
      price_cents: planDetails.price_cents,
      billing_interval: planDetails.billing_interval
    });

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
      success_url: `${process.env.FRONTEND_URL || 'https://www.buildabot.chat'}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'https://www.buildabot.chat'}/cancel.html`,
      client_reference_id: userId,
      metadata: {
        planId: planId,
        userId: userId,
      }
    });

    console.log('Stripe session created successfully:', session.id);

    return res.status(200).json({ url: session.url });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    console.error('Error details:', error.message);
    return res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: error.message 
    });
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

// Helper function to get raw body from request
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      resolve(body);
    });
    req.on('error', reject);
  });
}

// Handle Stripe webhooks
async function handleWebhook(req, res) {
  try {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // Get raw body for signature verification
    const rawBody = await getRawBody(req);
    console.log('Raw body length:', rawBody.length);

    // Initialize Stripe and verify webhook
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    
    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
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
    console.error('Webhook error details:', error.message);
    console.error('Webhook error stack:', error.stack);
    return res.status(500).json({ error: 'Webhook handling failed', details: error.message });
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

    console.log('=== CHECKOUT COMPLETED DEBUG ===');
    console.log('Checkout completed:', {
      userId,
      planId,
      customerId,
      subscriptionId
    });
    console.log('Environment check:', {
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseUrl: process.env.SUPABASE_URL?.substring(0, 30) + '...'
    });

    // Initialize Supabase with service role key for database updates
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    console.log('Supabase client created successfully');

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
    console.log('Attempting database insert with data:', {
      user_id: userId,
      plan_id: planId,
      status: 'active',
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString()
    });

    const { data, error } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        plan_id: planId,
        status: 'active',
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString()
      })
      .select();

    if (error) {
      console.error('Database error details:', JSON.stringify(error, null, 2));
      throw error;
    }

    console.log('Database insert successful:', data);
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
      description: 'Great for small projects and personal use',
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
