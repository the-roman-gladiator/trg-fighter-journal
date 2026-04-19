CREATE TABLE IF NOT EXISTS public.user_custom_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  list_type text NOT NULL CHECK (list_type IN ('technique','class_type','emotion','mindset')),
  discipline_key text,
  item_name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_custom_lists_user_type ON public.user_custom_lists(user_id, list_type, is_active);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_custom_lists_active
  ON public.user_custom_lists(user_id, list_type, COALESCE(discipline_key, ''), lower(item_name))
  WHERE is_active = true;

ALTER TABLE public.user_custom_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own custom list items"
  ON public.user_custom_lists FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own custom list items"
  ON public.user_custom_lists FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own custom list items"
  ON public.user_custom_lists FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own custom list items"
  ON public.user_custom_lists FOR DELETE
  USING (user_id = auth.uid());

CREATE TRIGGER update_user_custom_lists_updated_at
  BEFORE UPDATE ON public.user_custom_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();