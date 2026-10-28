-- Desert Front community alpha (unverified scores, no prizes).
-- Firebase Auth remains the sole source of user identity.
-- Tables are not directly writable/readable using public Supabase keys.
CREATE TABLE IF NOT EXISTS public.desert_front_profiles (
    firebase_uid text PRIMARY KEY
      CHECK (length(firebase_uid) BETWEEN 6 AND 128),
    nickname text NOT NULL DEFAULT '지휘관'
      CHECK (char_length(nickname) BETWEEN 1 AND 16),
    faction smallint NOT NULL DEFAULT 0
      CHECK (faction BETWEEN 0 AND 9),
    skin text NOT NULL DEFAULT 'default'
      CHECK (skin IN ('default','moe','twilight','aurora','gold')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.desert_front_community_scores (
    firebase_uid text PRIMARY KEY REFERENCES public.desert_front_profiles(firebase_uid) ON DELETE CASCADE,
    rating integer NOT NULL DEFAULT 1000 CHECK (rating BETWEEN 100 AND 3000),
    level integer NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 100),
    wins integer NOT NULL DEFAULT 0 CHECK (wins BETWEEN 0 AND 1000000),
    losses integer NOT NULL DEFAULT 0 CHECK (losses BETWEEN 0 AND 1000000),
    verified boolean NOT NULL DEFAULT false CHECK (verified = false),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS desert_front_community_score_rank
  ON public.desert_front_community_scores (rating DESC, wins DESC, updated_at DESC);

ALTER TABLE public.desert_front_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.desert_front_community_scores ENABLE ROW LEVEL SECURITY;
-- Deliberate default-deny RLS. Access only through an Edge Function that checks
-- the Google-signed Firebase ID token, never by trusting client-supplied UID.
REVOKE ALL ON public.desert_front_profiles FROM anon, authenticated;
REVOKE ALL ON public.desert_front_community_scores FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.desert_front_profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.desert_front_community_scores TO service_role;
