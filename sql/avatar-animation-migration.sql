-- Avatar Animation Migration
-- Adds video animation support to avatar_image_history
-- Run this in your Supabase SQL Editor

-- 1. Add video_url column to avatar_image_history table
ALTER TABLE public.avatar_image_history 
ADD COLUMN IF NOT EXISTS video_url text;

-- 2. Add animation metadata columns
ALTER TABLE public.avatar_image_history 
ADD COLUMN IF NOT EXISTS animation_status text DEFAULT 'pending'; -- 'pending', 'processing', 'completed', 'failed'

ALTER TABLE public.avatar_image_history 
ADD COLUMN IF NOT EXISTS animation_created_at timestamp with time zone;

-- 3. Create index for querying animations
CREATE INDEX IF NOT EXISTS idx_avatar_history_video_url 
  ON public.avatar_image_history(video_url) 
  WHERE video_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_avatar_history_animation_status 
  ON public.avatar_image_history(animation_status);

-- 4. Update the add_avatar_image_to_history function to include video_url
CREATE OR REPLACE FUNCTION add_avatar_image_to_history(
  p_avatar_id uuid,
  p_image_url text,
  p_created_from text DEFAULT 'initial',
  p_edit_prompt text DEFAULT NULL,
  p_traits_snapshot jsonb DEFAULT NULL,
  p_video_url text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_next_version integer;
  v_new_id uuid;
  v_animation_status text;
BEGIN
  -- Get the next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 
  INTO v_next_version
  FROM public.avatar_image_history
  WHERE avatar_id = p_avatar_id;
  
  -- Mark all existing versions as not current
  UPDATE public.avatar_image_history
  SET is_current = false
  WHERE avatar_id = p_avatar_id;
  
  -- Set animation status based on video_url presence
  v_animation_status := CASE 
    WHEN p_video_url IS NOT NULL THEN 'completed'
    ELSE 'pending'
  END;
  
  -- Insert new version
  INSERT INTO public.avatar_image_history (
    avatar_id,
    image_url,
    video_url,
    version_number,
    is_current,
    created_from,
    edit_prompt,
    traits_snapshot,
    animation_status,
    animation_created_at
  ) VALUES (
    p_avatar_id,
    p_image_url,
    p_video_url,
    v_next_version,
    true,
    p_created_from,
    p_edit_prompt,
    p_traits_snapshot,
    v_animation_status,
    CASE WHEN p_video_url IS NOT NULL THEN now() ELSE NULL END
  )
  RETURNING id INTO v_new_id;
  
  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create function to update animation status
CREATE OR REPLACE FUNCTION update_avatar_animation(
  p_history_id uuid,
  p_video_url text,
  p_animation_status text DEFAULT 'completed'
)
RETURNS boolean AS $$
BEGIN
  UPDATE public.avatar_image_history
  SET 
    video_url = p_video_url,
    animation_status = p_animation_status,
    animation_created_at = now()
  WHERE id = p_history_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Drop and recreate the get_avatar_image_history function to include video_url
DROP FUNCTION IF EXISTS get_avatar_image_history(uuid, integer);

CREATE OR REPLACE FUNCTION get_avatar_image_history(
  p_avatar_id uuid,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  image_url text,
  video_url text,
  version_number integer,
  is_current boolean,
  created_from text,
  edit_prompt text,
  animation_status text,
  created_at timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.id,
    h.image_url,
    h.video_url,
    h.version_number,
    h.is_current,
    h.created_from,
    h.edit_prompt,
    h.animation_status,
    h.created_at
  FROM public.avatar_image_history h
  WHERE h.avatar_id = p_avatar_id
  ORDER BY h.version_number DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migration complete
SELECT 'Avatar animation migration completed successfully!' as status;
