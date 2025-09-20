// Test script to simulate webhook processing
// This will help us identify if the issue is with the webhook logic or deployment

const testSession = {
  client_reference_id: 'test-user-id-12345', // Simulate a user ID
  metadata: {
    planId: 'starter'
  },
  customer: 'cus_test12345',
  subscription: 'sub_test12345'
};

console.log('Simulating webhook processing...');
console.log('Test session:', JSON.stringify(testSession, null, 2));

// Extract values like the webhook does
const userId = testSession.client_reference_id;
const planId = testSession.metadata.planId;
const customerId = testSession.customer;
const subscriptionId = testSession.subscription;

console.log('Extracted values:', {
  userId,
  planId,
  customerId,
  subscriptionId
});

// Simulate database insert data
const now = new Date();
const periodEnd = new Date('2099-12-31'); // One-time payment

const insertData = {
  user_id: userId,
  plan_id: planId,
  status: 'active',
  stripe_customer_id: customerId,
  stripe_subscription_id: subscriptionId,
  current_period_start: now.toISOString(),
  current_period_end: periodEnd.toISOString()
};

console.log('Database insert data:', JSON.stringify(insertData, null, 2));

// Check if all required fields are present
const requiredFields = ['user_id', 'plan_id', 'status', 'stripe_customer_id'];
const missingFields = requiredFields.filter(field => !insertData[field]);

if (missingFields.length > 0) {
  console.error('Missing required fields:', missingFields);
} else {
  console.log('All required fields present ✓');
}

console.log('\nTo debug further:');
console.log('1. Check if the webhook URL is configured in Stripe dashboard');
console.log('2. Verify environment variables are set in Vercel');
console.log('3. Check if the user ID format matches your auth system');
console.log('4. Verify the plan_id "starter" exists in subscription_plans table');
