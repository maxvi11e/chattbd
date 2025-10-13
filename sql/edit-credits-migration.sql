-- Edit Credits Feature Migration
-- Run these commands in your Supabase SQL Editor

-- 1. Add edit_credits columns to subscription_plans table
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS edit_credits_limit integer DEFAULT 0;

-- 2. Add edit_credits tracking to user_subscriptions table
ALTER TABLE public.user_subscriptions 
ADD COLUMN IF NOT EXISTS edit_credits_used integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS edit_credits_limit integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_bots_created integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_bot_limit integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS total_bots_created integer DEFAULT 0;

-- 2a. Initialize total_bots_created for existing users
UPDATE user_subscriptions us
SET total_bots_created = (
  SELECT COUNT(*) 
  FROM avatars 
  WHERE user_id = us.user_id
)
WHERE status = 'active';

-- 2b. Create a separate table to track bot creation count for ALL users (including free)
CREATE TABLE IF NOT EXISTS public.user_bot_counters (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_bots_created integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Initialize counters for existing users
INSERT INTO user_bot_counters (user_id, total_bots_created)
SELECT 
  id as user_id,
  (SELECT COUNT(*) FROM avatars WHERE user_id = id) as total_bots_created
FROM auth.users
ON CONFLICT (user_id) DO UPDATE 
SET total_bots_created = EXCLUDED.total_bots_created;

-- 3. Create the 'monthly' plan first (before updating user_subscriptions)
INSERT INTO subscription_plans (id, name, description, price_cents, billing_interval, bot_limit, edit_credits_limit, features, is_active)
VALUES ('monthly', 'Monthly Plan', 'Perfect for active creators', 900, 'monthly', NULL, 20, 
  '["Create up to 20 AIs/month", "20 edit credits/month", "Priority support", "Advanced features"]'::jsonb, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_cents = EXCLUDED.price_cents,
  billing_interval = EXCLUDED.billing_interval,
  bot_limit = EXCLUDED.bot_limit,
  edit_credits_limit = EXCLUDED.edit_credits_limit,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active;

-- 4. Now safe to update user_subscriptions to rename 'unlimited' to 'monthly'
UPDATE user_subscriptions SET plan_id = 'monthly' WHERE plan_id = 'unlimited';

-- 5. Now safe to delete the old 'unlimited' plan
DELETE FROM subscription_plans WHERE id = 'unlimited';

-- 6. Update other subscription plans with new pricing and limits
UPDATE subscription_plans SET
  name = 'Free Plan',
  description = 'Try out our AI builder',
  price_cents = 0,
  billing_interval = NULL,
  bot_limit = 1,
  edit_credits_limit = 0,
  features = '["Create 1 AI", "Basic customization", "Community support"]'::jsonb
WHERE id = 'free';

UPDATE subscription_plans SET
  name = 'Starter Plan',
  description = 'Great for personal projects',
  price_cents = 400,
  billing_interval = 'one_time',
  bot_limit = 3,
  edit_credits_limit = 5,
  features = '["Create 3 AIs", "5 edit credits", "Advanced customization", "Email support"]'::jsonb
WHERE id = 'starter';

-- 6a. Initialize edit credits for existing active subscriptions
UPDATE user_subscriptions us
SET 
  edit_credits_limit = sp.edit_credits_limit,
  edit_credits_used = COALESCE(us.edit_credits_used, 0)
FROM subscription_plans sp
WHERE us.plan_id = sp.id
AND us.status = 'active';

-- 7. Drop and recreate the get_user_subscription_info function to include edit credits
DROP FUNCTION IF EXISTS get_user_subscription_info(uuid);

CREATE OR REPLACE FUNCTION get_user_subscription_info(user_uuid uuid)
RETURNS TABLE (
    plan_id text,
    plan_name text,
    bot_limit integer,
    current_bot_count bigint,
    can_create_bot boolean,
    subscription_status text,
    edit_credits_used integer,
    edit_credits_limit integer,
    can_use_edit_credit boolean,
    total_bots_created integer
) AS $$
BEGIN
    RETURN QUERY
    WITH user_sub AS (
        SELECT 
            us.plan_id,
            us.status,
            us.edit_credits_used,
            us.edit_credits_limit,
            us.total_bots_created,
            sp.name as plan_name,
            sp.bot_limit,
            sp.billing_interval
        FROM public.user_subscriptions us
        JOIN public.subscription_plans sp ON us.plan_id = sp.id
        WHERE us.user_id = user_uuid 
        AND us.status = 'active'
        ORDER BY us.created_at DESC
        LIMIT 1
    ),
    bot_count AS (
        SELECT COUNT(*) as count
        FROM public.avatars 
        WHERE user_id = user_uuid 
        AND is_active = true
    ),
    bot_counter AS (
        SELECT COALESCE(ubc.total_bots_created, 0) as count
        FROM public.user_bot_counters ubc
        WHERE ubc.user_id = user_uuid
    )
    SELECT 
        COALESCE(user_sub.plan_id, 'free') as plan_id,
        COALESCE(user_sub.plan_name, 'Free Plan') as plan_name,
        CASE 
            WHEN user_sub.plan_id IS NULL THEN 1
            ELSE COALESCE(user_sub.bot_limit, 1)
        END as bot_limit,
        COALESCE(bot_count.count, 0) as current_bot_count,
        CASE 
            -- Check if user has no subscription (free user) - use permanent counter
            WHEN user_sub.plan_id IS NULL THEN 
                CASE WHEN COALESCE(bot_counter.count, 0) < 1 THEN true ELSE false END
            -- Check if user has one-time plan (starter) - use permanent counter from subscription
            WHEN user_sub.billing_interval = 'one_time' THEN
                CASE 
                    WHEN user_sub.bot_limit IS NULL THEN true
                    WHEN COALESCE(user_sub.total_bots_created, 0) < user_sub.bot_limit THEN true
                    ELSE false
                END
            -- Check if user has monthly plan - only count active bots
            WHEN user_sub.billing_interval = 'monthly' THEN
                CASE 
                    WHEN user_sub.bot_limit IS NULL THEN true
                    WHEN COALESCE(bot_count.count, 0) < user_sub.bot_limit THEN true
                    ELSE false
                END
            -- Default check for unlimited or other plans
            WHEN user_sub.bot_limit IS NULL THEN true
            WHEN COALESCE(bot_count.count, 0) < user_sub.bot_limit THEN true
            ELSE false
        END as can_create_bot,
        COALESCE(user_sub.status, 'free') as subscription_status,
        COALESCE(user_sub.edit_credits_used, 0) as edit_credits_used,
        COALESCE(user_sub.edit_credits_limit, 0) as edit_credits_limit,
        CASE
            WHEN COALESCE(user_sub.edit_credits_limit, 0) = 0 THEN false
            WHEN COALESCE(user_sub.edit_credits_used, 0) < COALESCE(user_sub.edit_credits_limit, 0) THEN true
            ELSE false
        END as can_use_edit_credit,
        CASE
            WHEN user_sub.plan_id IS NULL THEN COALESCE(bot_counter.count, 0)
            ELSE COALESCE(user_sub.total_bots_created, 0)
        END as total_bots_created
    FROM bot_count
    LEFT JOIN user_sub ON true
    LEFT JOIN bot_counter ON true;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 8. Create a function to use an edit credit
CREATE OR REPLACE FUNCTION use_edit_credit(user_uuid uuid)
RETURNS jsonb AS $$
DECLARE
    sub_record RECORD;
    result jsonb;
BEGIN
    -- Get the user's active subscription
    SELECT * INTO sub_record
    FROM public.user_subscriptions
    WHERE user_id = user_uuid 
    AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- If no subscription, return error
    IF sub_record IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No active subscription found'
        );
    END IF;
    
    -- Check if user has edit credits
    IF sub_record.edit_credits_limit = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Your plan does not include edit credits. Please upgrade!'
        );
    END IF;
    
    -- Check if user has credits remaining
    IF sub_record.edit_credits_used >= sub_record.edit_credits_limit THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'You have used all your edit credits. Please upgrade for more!'
        );
    END IF;
    
    -- Increment the edit credits used
    UPDATE public.user_subscriptions
    SET edit_credits_used = edit_credits_used + 1
    WHERE id = sub_record.id;
    
    RETURN jsonb_build_object(
        'success', true,
        'credits_used', sub_record.edit_credits_used + 1,
        'credits_limit', sub_record.edit_credits_limit,
        'credits_remaining', sub_record.edit_credits_limit - (sub_record.edit_credits_used + 1)
    );
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 9. Create trigger to initialize edit credits when user subscribes
CREATE OR REPLACE FUNCTION initialize_subscription_limits()
RETURNS TRIGGER AS $$
DECLARE
    plan_record RECORD;
BEGIN
    -- Get the plan details
    SELECT * INTO plan_record
    FROM public.subscription_plans
    WHERE id = NEW.plan_id;
    
    -- Set the limits from the plan
    NEW.edit_credits_limit := COALESCE(plan_record.edit_credits_limit, 0);
    NEW.edit_credits_used := 0;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS initialize_subscription_limits_trigger ON public.user_subscriptions;
CREATE TRIGGER initialize_subscription_limits_trigger
    BEFORE INSERT ON public.user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION initialize_subscription_limits();

-- 10. Create trigger to increment bot counters when a bot is created
CREATE OR REPLACE FUNCTION increment_total_bots_created()
RETURNS TRIGGER AS $$
BEGIN
    -- Increment total_bots_created for the user's active subscription (if they have one)
    UPDATE public.user_subscriptions
    SET total_bots_created = total_bots_created + 1
    WHERE user_id = NEW.user_id
    AND status = 'active';
    
    -- ALWAYS increment the permanent counter (for all users, including free)
    INSERT INTO public.user_bot_counters (user_id, total_bots_created)
    VALUES (NEW.user_id, 1)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        total_bots_created = user_bot_counters.total_bots_created + 1,
        updated_at = now();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS increment_bots_trigger ON public.avatars;
CREATE TRIGGER increment_bots_trigger
    AFTER INSERT ON public.avatars
    FOR EACH ROW
    EXECUTE FUNCTION increment_total_bots_created();

-- Migration complete
SELECT 'Edit credits migration completed successfully!' as status;
