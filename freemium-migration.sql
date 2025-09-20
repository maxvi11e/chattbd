-- Freemium Model Database Migration
-- Run these commands in your Supabase SQL Editor

-- 1. Create subscription plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL DEFAULT 0,
  billing_interval text CHECK (billing_interval IN ('one_time', 'monthly', 'yearly')) DEFAULT 'one_time',
  bot_limit integer, -- NULL means unlimited
  features jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- 2. Create user subscriptions table
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'cancelled', 'expired', 'past_due')),
  stripe_subscription_id text,
  stripe_customer_id text,
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT user_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT user_subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id)
);

-- 3. Insert default subscription plans
INSERT INTO public.subscription_plans (id, name, description, price_cents, billing_interval, bot_limit, features) VALUES
('free', 'Free Plan', 'Create 1 bot for free', 0, 'one_time', 1, '["Basic bot creation", "Chat with your bot"]'::jsonb),
('starter', 'Starter Plan', 'Create up to 4 bots', 500, 'one_time', 4, '["Create up to 4 bots", "Chat with all your bots", "Priority support"]'::jsonb),
('unlimited', 'Unlimited Plan', 'Create unlimited bots', 999, 'monthly', NULL, '["Unlimited bot creation", "Priority support", "Advanced customization", "Export conversations"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_cents = EXCLUDED.price_cents,
  billing_interval = EXCLUDED.billing_interval,
  bot_limit = EXCLUDED.bot_limit,
  features = EXCLUDED.features;

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer ON public.user_subscriptions(stripe_customer_id);

-- 5. Create updated_at trigger for user_subscriptions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON public.user_subscriptions;
CREATE TRIGGER update_user_subscriptions_updated_at 
    BEFORE UPDATE ON public.user_subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Create a function to get user's current subscription and bot count
CREATE OR REPLACE FUNCTION get_user_subscription_info(user_uuid uuid)
RETURNS TABLE (
    plan_id text,
    plan_name text,
    bot_limit integer,
    current_bot_count bigint,
    can_create_bot boolean,
    subscription_status text
) AS $$
BEGIN
    RETURN QUERY
    WITH user_sub AS (
        SELECT 
            us.plan_id,
            us.status,
            sp.name as plan_name,
            sp.bot_limit
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
    )
    SELECT 
        COALESCE(user_sub.plan_id, 'free') as plan_id,
        COALESCE(user_sub.plan_name, 'Free Plan') as plan_name,
        COALESCE(user_sub.bot_limit, 1) as bot_limit,
        bot_count.count as current_bot_count,
        CASE 
            WHEN user_sub.bot_limit IS NULL THEN true -- unlimited
            WHEN bot_count.count < COALESCE(user_sub.bot_limit, 1) THEN true
            ELSE false
        END as can_create_bot,
        COALESCE(user_sub.status, 'free') as subscription_status
    FROM bot_count
    LEFT JOIN user_sub ON true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Enable RLS (Row Level Security)
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies
-- Allow everyone to read subscription plans
CREATE POLICY "Allow read access to subscription plans" ON public.subscription_plans
    FOR SELECT USING (true);

-- Allow users to read only their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON public.user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Allow service role to manage all subscriptions (for webhooks)
CREATE POLICY "Service role can manage subscriptions" ON public.user_subscriptions
    FOR ALL USING (auth.role() = 'service_role');

-- Migration complete
SELECT 'Freemium database schema created successfully!' as status;
