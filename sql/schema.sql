-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.avatars (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  image_url text,
  traits jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  personality_prompt text,
  is_active boolean DEFAULT true,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT avatars_pkey PRIMARY KEY (id),
  CONSTRAINT avatars_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  avatar_id uuid NOT NULL,
  title text DEFAULT 'Conversation'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT conversations_pkey PRIMARY KEY (id),
  CONSTRAINT conversations_avatar_id_fkey FOREIGN KEY (avatar_id) REFERENCES public.avatars(id)
);
CREATE TABLE public.messages (
  id bigint NOT NULL DEFAULT nextval('messages_id_seq'::regclass),
  conversation_id uuid NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text])),
  text text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  display_name text,
  avatar_url text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);