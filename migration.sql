-- Migration Script for Build a Bot Database Improvements
-- Run these commands in your Supabase SQL Editor

-- 1. Add Performance Indexes
CREATE INDEX IF NOT EXISTS idx_avatars_user_id ON public.avatars(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_avatar_id ON public.conversations(avatar_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

-- 2. Add Cascade Deletes for Data Integrity
-- Drop existing constraints
ALTER TABLE public.conversations 
DROP CONSTRAINT IF EXISTS conversations_avatar_id_fkey;

ALTER TABLE public.messages 
DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey;

-- Add new constraints with cascade deletes
ALTER TABLE public.conversations 
ADD CONSTRAINT conversations_avatar_id_fkey 
FOREIGN KEY (avatar_id) REFERENCES public.avatars(id) ON DELETE CASCADE;

ALTER TABLE public.messages 
ADD CONSTRAINT messages_conversation_id_fkey 
FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;

-- 3. Enhanced Avatar Table (Optional - can be added later)
-- Add these columns for richer avatar functionality
ALTER TABLE public.avatars 
ADD COLUMN IF NOT EXISTS personality_prompt text,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- 4. Add updated_at trigger for avatar table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS update_avatars_updated_at ON public.avatars;
CREATE TRIGGER update_avatars_updated_at 
    BEFORE UPDATE ON public.avatars 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Migration complete
SELECT 'Database migration completed successfully!' as status;
