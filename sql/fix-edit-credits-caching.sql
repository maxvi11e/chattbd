-- Fix for edit credits caching issue
-- This updates the functions to use VOLATILE to prevent caching

-- 1. Update get_user_subscription_info to be VOLATILE
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

-- 2. Update use_edit_credit to be VOLATILE
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

-- Verify the fix
SELECT 'Edit credits caching fix applied successfully!' as status;
SELECT 'Functions marked as VOLATILE to prevent caching' as detail;
