-- Fix for the get_user_subscription_info function
-- Run this in your Supabase SQL Editor to fix the bot limit bug

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
            -- If user has an active subscription with unlimited bots (bot_limit IS NULL)
            WHEN user_sub.plan_id IS NOT NULL AND user_sub.bot_limit IS NULL THEN true
            -- If user has any bot limit (either from subscription or default free plan)
            WHEN bot_count.count < COALESCE(user_sub.bot_limit, 1) THEN true
            ELSE false
        END as can_create_bot,
        COALESCE(user_sub.status, 'free') as subscription_status
    FROM bot_count
    LEFT JOIN user_sub ON true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the function with your user ID
SELECT 'Function updated successfully! Test it with your user ID.' as status;
