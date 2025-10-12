// Freemium utilities for handling subscription logic
// This file provides common functions used across the app

/**
 * Get user's current subscription information
 * @param {object} supabase - Supabase client instance
 * @returns {Promise<object>} Subscription info including plan, limits, and current usage
 */
async function getUserSubscriptionInfo(supabase) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase.rpc('get_user_subscription_info', {
      user_uuid: user.id
    });

    if (error) throw error;

    return data?.[0] || {
      plan_id: 'free',
      plan_name: 'Free Plan',
      bot_limit: 1,
      current_bot_count: 0,
      can_create_bot: true,
      subscription_status: 'free'
    };
  } catch (error) {
    console.error('Error getting subscription info:', error);
    // Return safe defaults
    return {
      plan_id: 'free',
      plan_name: 'Free Plan',
      bot_limit: 1,
      current_bot_count: 0,
      can_create_bot: false,
      subscription_status: 'free'
    };
  }
}

/**
 * Check if user can create a new bot
 * @param {object} supabase - Supabase client instance
 * @returns {Promise<{canCreate: boolean, reason?: string, subscriptionInfo: object}>}
 */
async function canUserCreateBot(supabase) {
  const subscriptionInfo = await getUserSubscriptionInfo(supabase);
  
  if (subscriptionInfo.can_create_bot) {
    return { canCreate: true, subscriptionInfo };
  }

  let reason;
  const limitValue = subscriptionInfo.bot_limit;
  const limitText = typeof limitValue === 'number'
    ? `${limitValue} ${limitValue === 1 ? 'agent' : 'agents'}`
    : 'your current agent allowance';

  if (subscriptionInfo.plan_id === 'free') {
    reason = `You've reached the limit of ${limitText} on the free plan. Upgrade to create more agents!`;
  } else {
    reason = `You've reached your plan limit of ${limitText}. Upgrade to create more agents!`;
  }

  return { canCreate: false, reason, subscriptionInfo };
}

/**
 * Get all available subscription plans
 * @param {object} supabase - Supabase client instance
 * @returns {Promise<Array>} Array of available subscription plans
 */
async function getSubscriptionPlans(supabase) {
  try {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price_cents', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting subscription plans:', error);
    return [];
  }
}

/**
 * Format price for display
 * @param {number} priceCents - Price in cents
 * @param {string} interval - Billing interval
 * @returns {string} Formatted price string
 */
function formatPrice(priceCents, interval = 'one_time') {
  if (priceCents === 0) return 'Free';
  
  const dollars = (priceCents / 100).toFixed(2);
  const intervalText = interval === 'monthly' ? '/month' : interval === 'yearly' ? '/year' : '';
  
  return `$${dollars}${intervalText}`;
}

/**
 * Show the upgrade modal with pricing options
 * @param {object} subscriptionInfo - Current subscription info
 * @param {Array} plans - Available subscription plans
 */
async function showUpgradeModal(subscriptionInfo, plans) {
  // Create modal if it doesn't exist
  let modal = document.getElementById('upgradeModal');
  if (!modal) {
    modal = createUpgradeModal();
    document.body.appendChild(modal);
  }

  // Update modal content
  updateUpgradeModalContent(modal, subscriptionInfo, plans);
  
  // Show modal
  modal.style.display = 'flex';
  
  // Add event listeners
  setupUpgradeModalEvents(modal, plans);
}

/**
 * Create the upgrade modal HTML structure
 * @returns {HTMLElement} Modal element
 */
function createUpgradeModal() {
  const modal = document.createElement('div');
  modal.id = 'upgradeModal';
  modal.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Upgrade Your Plan</h2>
          <button class="modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="current-usage">
            <p id="usageText">You've created <strong id="totalBotsCreated">0</strong> agents total. You currently have <strong id="botCount">0</strong> active agents out of <strong id="botLimit">1</strong> allowed.</p>
          </div>
          <div class="pricing-grid" id="pricingGrid">
            <!-- Plans will be inserted here -->
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    #upgradeModal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 10000;
    }
    
    .modal-overlay {
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    
    .modal-content {
      background: var(--bg, #000);
      border: 2px solid var(--stroke, #fff);
      border-radius: var(--radius-lg, 24px);
      max-width: 600px;
      width: 100%;
      max-height: 90dvh;
      overflow-y: auto;
    }
    
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px;
      border-bottom: 1px solid var(--stroke, #fff);
    }
    
    .modal-header h2 {
      margin: 0;
      color: var(--ink, #fff);
      font-size: 24px;
    }
    
    .modal-close {
      background: none;
      border: none;
      color: var(--ink, #fff);
      font-size: 32px;
      cursor: pointer;
      padding: 0;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    }
    
    .modal-close:hover {
      background: rgba(255, 255, 255, 0.1);
    }
    
    .modal-body {
      padding: 24px;
    }
    
    .current-usage {
      text-align: center;
      margin-bottom: 32px;
      padding: 16px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: var(--radius-md, 14px);
    }
    
    .current-usage p {
      margin: 0;
      color: var(--ink, #fff);
      font-size: 16px;
    }
    
    .pricing-grid {
      display: grid;
      gap: 16px;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    }
    
    .plan-card {
      border: 2px solid var(--stroke, #fff);
      border-radius: var(--radius-md, 14px);
      padding: 24px;
      text-align: center;
      position: relative;
      background: var(--bg, #000);
    }
    
    .plan-card.current {
      border-color: #4CAF50;
      background: rgba(76, 175, 80, 0.1);
    }
    
    .plan-card.recommended {
      border-color: #2196F3;
      background: rgba(33, 150, 243, 0.1);
    }
    
    .plan-card.recommended::before {
      content: "Most Popular";
      position: absolute;
      top: -12px;
      left: 50%;
      transform: translateX(-50%);
      background: #2196F3;
      color: white;
      padding: 4px 16px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
    }
    
    .plan-name {
      color: var(--ink, #fff);
      font-size: 20px;
      font-weight: bold;
      margin: 0 0 8px 0;
    }
    
    .plan-price {
      color: var(--ink, #fff);
      font-size: 32px;
      font-weight: bold;
      margin: 0 0 16px 0;
    }
    
    .plan-description {
      color: var(--muted, #999);
      font-size: 14px;
      margin: 0 0 16px 0;
    }
    
    .plan-features {
      list-style: none;
      padding: 0;
      margin: 0 0 24px 0;
    }
    
    .plan-features li {
      color: var(--ink, #fff);
      font-size: 14px;
      margin: 8px 0;
      padding-left: 20px;
      position: relative;
    }
    
    .plan-features li::before {
      content: "✓";
      color: #4CAF50;
      font-weight: bold;
      position: absolute;
      left: 0;
    }
    
    .plan-button {
      background: var(--ink, #fff);
      color: var(--bg, #000);
      border: none;
      padding: 12px 24px;
      border-radius: var(--radius-md, 14px);
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      width: 100%;
      transition: opacity 0.2s ease;
    }
    
    .plan-button:hover:not(:disabled) {
      opacity: 0.8;
    }
    
    .plan-button:disabled {
      background: var(--muted, #999);
      cursor: not-allowed;
    }
    
    .plan-button.current {
      background: #4CAF50;
      color: white;
    }
    
    @media (max-width: 768px) {
      .modal-content {
        margin: 20px;
        max-height: calc(100dvh - 40px);
      }
      
      .pricing-grid {
        grid-template-columns: 1fr;
      }
      
      .modal-header, .modal-body {
        padding: 16px;
      }
    }
  `;
  document.head.appendChild(style);
  
  return modal;
}

/**
 * Update the upgrade modal content with current subscription info and plans
 */
function updateUpgradeModalContent(modal, subscriptionInfo, plans) {
  // Update usage text
  const usageText = modal.querySelector('#usageText');
  const totalBotsCreated = modal.querySelector('#totalBotsCreated');
  const botCount = modal.querySelector('#botCount');
  const botLimit = modal.querySelector('#botLimit');
  
  if (totalBotsCreated) totalBotsCreated.textContent = subscriptionInfo.total_bots_created || 0;
  if (botCount) botCount.textContent = subscriptionInfo.current_bot_count;
  if (botLimit) {
    botLimit.textContent = subscriptionInfo.bot_limit || 'unlimited';
  }
  
  // Update pricing grid
  const pricingGrid = modal.querySelector('#pricingGrid');
  if (pricingGrid) {
    pricingGrid.innerHTML = plans.map(plan => {
      const isCurrent = plan.id === subscriptionInfo.plan_id;
      const isRecommended = plan.id === 'starter';
      
      return `
        <div class="plan-card ${isCurrent ? 'current' : ''} ${isRecommended ? 'recommended' : ''}">
          <h3 class="plan-name">${plan.name}</h3>
          <div class="plan-price">${formatPrice(plan.price_cents, plan.billing_interval)}</div>
          <p class="plan-description">${plan.description}</p>
          <ul class="plan-features">
            ${(plan.features || []).map(feature => `<li>${feature}</li>`).join('')}
          </ul>
          <button class="plan-button ${isCurrent ? 'current' : ''}" 
                  data-plan-id="${plan.id}" 
                  ${isCurrent ? 'disabled' : ''}>
            ${isCurrent ? 'Current Plan' : plan.price_cents === 0 ? 'Current Plan' : 'Upgrade'}
          </button>
        </div>
      `;
    }).join('');
  }
}

/**
 * Setup event listeners for the upgrade modal
 */
function setupUpgradeModalEvents(modal, plans) {
  // Close modal events
  const closeBtn = modal.querySelector('.modal-close');
  const overlay = modal.querySelector('.modal-overlay');
  
  const closeModal = () => {
    modal.style.display = 'none';
  };
  
  closeBtn?.addEventListener('click', closeModal);
  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
  
  // Escape key to close
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
  
  // Plan selection events
  const planButtons = modal.querySelectorAll('.plan-button:not(:disabled)');
  planButtons.forEach(button => {
    button.addEventListener('click', async () => {
      const planId = button.dataset.planId;
      const plan = plans.find(p => p.id === planId);
      
      if (plan && plan.price_cents > 0) {
        // Handle paid plan upgrade
        await handlePaidPlanUpgrade(plan);
      }
      
      closeModal();
    });
  });
}

/**
 * Handle upgrade to a paid plan with Stripe
 */
async function handlePaidPlanUpgrade(plan) {
  let button = null;
  let originalText = '';
  
  try {
    // Show loading state
    button = document.querySelector(`[data-plan-id="${plan.id}"]`);
    if (button) {
      originalText = button.textContent;
      button.textContent = 'Loading...';
      button.disabled = true;
    }

    // Get current user from the global supabase instance
    const supabase = window.supabase;
    if (!supabase) {
      throw new Error('Supabase client not available');
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Create checkout session
    const response = await fetch('/api/stripe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'create-checkout-session',
        planId: plan.id,
        userId: user.id
      })
    });

    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      // If response isn't JSON, get text instead
      const text = await response.text();
      console.error('Non-JSON response:', text);
      throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
    }

    if (!response.ok) {
      throw new Error(data.error || data.details || 'Failed to create checkout session');
    }

    if (data.url) {
      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } else {
      // Fallback message
      alert(`Stripe checkout session created! Redirecting to payment...`);
    }

  } catch (error) {
    console.error('Error upgrading plan:', error);
    alert('Failed to start upgrade process. Please try again.\n\nError: ' + error.message);
  } finally {
    // Reset button state
    if (button && originalText) {
      button.textContent = originalText;
      button.disabled = false;
    }
  }
}

/**
 * Check if user can use an edit credit
 * @param {object} supabase - Supabase client instance
 * @returns {Promise<{canUse: boolean, reason?: string, creditsRemaining?: number}>}
 */
async function canUserUseEditCredit(supabase) {
  const subscriptionInfo = await getUserSubscriptionInfo(supabase);
  
  if (subscriptionInfo.can_use_edit_credit) {
    const creditsRemaining = subscriptionInfo.edit_credits_limit - subscriptionInfo.edit_credits_used;
    return { canUse: true, creditsRemaining };
  }

  let reason;
  if (subscriptionInfo.edit_credits_limit === 0) {
    reason = 'Your current plan does not include edit credits. Upgrade to get edit credits!';
  } else {
    reason = `You've used all ${subscriptionInfo.edit_credits_limit} edit credits. Upgrade for more!`;
  }

  return { canUse: false, reason, subscriptionInfo };
}

/**
 * Use an edit credit
 * @param {object} supabase - Supabase client instance
 * @returns {Promise<{success: boolean, error?: string, creditsRemaining?: number}>}
 */
async function useEditCredit(supabase) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase.rpc('use_edit_credit', {
      user_uuid: user.id
    });

    if (error) throw error;

    if (!data.success) {
      return { success: false, error: data.error };
    }

    return {
      success: true,
      creditsUsed: data.credits_used,
      creditsLimit: data.credits_limit,
      creditsRemaining: data.credits_remaining
    };
  } catch (error) {
    console.error('Error using edit credit:', error);
    return { success: false, error: error.message };
  }
}

// Export functions for global use
window.FreemiumUtils = {
  getUserSubscriptionInfo,
  canUserCreateBot,
  canUserUseEditCredit,
  useEditCredit,
  getSubscriptionPlans,
  showUpgradeModal,
  handlePaidPlanUpgrade,
  formatPrice
};
