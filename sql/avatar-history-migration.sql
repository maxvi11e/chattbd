-- Avatar Image History Migration
-- Run this in your Supabase SQL Editor

-- 1. Create avatar_image_history table
CREATE TABLE IF NOT EXISTS public.avatar_image_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  avatar_id uuid NOT NULL,
  image_url text NOT NULL,
  version_number integer NOT NULL,
  is_current boolean DEFAULT false,
  
  -- Metadata about this version
  created_from text, -- 'initial', 'regenerate', 'edit', 'restore'
  edit_prompt text, -- The prompt used if this was from regeneration/edit
  traits_snapshot jsonb, -- Snapshot of traits at time of creation
  
  created_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT avatar_image_history_pkey PRIMARY KEY (id),
  CONSTRAINT avatar_image_history_avatar_id_fkey 
    FOREIGN KEY (avatar_id) 
    REFERENCES public.avatars(id) 
    ON DELETE CASCADE
);

-- Create unique partial index to ensure only one current image per avatar
CREATE UNIQUE INDEX IF NOT EXISTS idx_avatar_history_unique_current
  ON public.avatar_image_history(avatar_id)
  WHERE is_current = true;

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_avatar_history_avatar_id 
  ON public.avatar_image_history(avatar_id);

CREATE INDEX IF NOT EXISTS idx_avatar_history_created_at 
  ON public.avatar_image_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_avatar_history_current 
  ON public.avatar_image_history(avatar_id, is_current) 
  WHERE is_current = true;

-- 3. Create function to add image to history
CREATE OR REPLACE FUNCTION add_avatar_image_to_history(
  p_avatar_id uuid,
  p_image_url text,
  p_created_from text DEFAULT 'initial',
  p_edit_prompt text DEFAULT NULL,
  p_traits_snapshot jsonb DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_next_version integer;
  v_new_id uuid;
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
  
  -- Insert new version
  INSERT INTO public.avatar_image_history (
    avatar_id,
    image_url,
    version_number,
    is_current,
    created_from,
    edit_prompt,
    traits_snapshot
  ) VALUES (
    p_avatar_id,
    p_image_url,
    v_next_version,
    true,
    p_created_from,
    p_edit_prompt,
    p_traits_snapshot
  )
  RETURNING id INTO v_new_id;
  
  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create function to restore an image version
CREATE OR REPLACE FUNCTION restore_avatar_image_version(
  p_avatar_id uuid,
  p_history_id uuid
)
RETURNS boolean AS $$
DECLARE
  v_image_url text;
  v_traits_snapshot jsonb;
BEGIN
  -- Get the image URL and traits from history
  SELECT image_url, traits_snapshot
  INTO v_image_url, v_traits_snapshot
  FROM public.avatar_image_history
  WHERE id = p_history_id AND avatar_id = p_avatar_id;
  
  IF v_image_url IS NULL THEN
    RETURN false;
  END IF;
  
  -- Mark all versions as not current
  UPDATE public.avatar_image_history
  SET is_current = false
  WHERE avatar_id = p_avatar_id;
  
  -- Mark the selected version as current
  UPDATE public.avatar_image_history
  SET is_current = true
  WHERE id = p_history_id;
  
  -- Update the avatar's main image_url
  UPDATE public.avatars
  SET 
    image_url = v_image_url,
    traits = COALESCE(v_traits_snapshot, traits),
    updated_at = now()
  WHERE id = p_avatar_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create function to get image history for an avatar
CREATE OR REPLACE FUNCTION get_avatar_image_history(
  p_avatar_id uuid,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  image_url text,
  version_number integer,
  is_current boolean,
  created_from text,
  edit_prompt text,
  created_at timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.id,
    h.image_url,
    h.version_number,
    h.is_current,
    h.created_from,
    h.edit_prompt,
    h.created_at
  FROM public.avatar_image_history h
  WHERE h.avatar_id = p_avatar_id
  ORDER BY h.version_number DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Enable RLS
ALTER TABLE public.avatar_image_history ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies
-- Users can only view history for their own avatars
CREATE POLICY "Users can view own avatar history" 
ON public.avatar_image_history
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.avatars 
    WHERE avatars.id = avatar_image_history.avatar_id 
    AND avatars.user_id = auth.uid()
  )
);

-- Users can insert history for their own avatars
CREATE POLICY "Users can insert own avatar history" 
ON public.avatar_image_history
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.avatars 
    WHERE avatars.id = avatar_image_history.avatar_id 
    AND avatars.user_id = auth.uid()
  )
);

-- Users can update history for their own avatars
CREATE POLICY "Users can update own avatar history" 
ON public.avatar_image_history
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.avatars 
    WHERE avatars.id = avatar_image_history.avatar_id 
    AND avatars.user_id = auth.uid()
  )
);

-- 8. Migrate existing avatars to history (optional - run if you want to preserve current images)
-- This creates a history entry for each existing avatar
INSERT INTO public.avatar_image_history (
  avatar_id,
  image_url,
  version_number,
  is_current,
  created_from,
  traits_snapshot
)
SELECT 
  id as avatar_id,
  image_url,
  1 as version_number,
  true as is_current,
  'initial' as created_from,
  traits as traits_snapshot
FROM public.avatars
WHERE image_url IS NOT NULL
ON CONFLICT DO NOTHING;

-- Migration complete
SELECT 'Avatar image history migration completed successfully!' as status;
