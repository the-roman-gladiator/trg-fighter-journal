
CREATE TABLE public.technique_library (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  discipline text NOT NULL,
  category text NOT NULL,
  name_en text NOT NULL,
  name_original text,
  image_url text,
  youtube_search_query text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.technique_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view techniques"
ON public.technique_library
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage techniques"
ON public.technique_library
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_technique_library_updated_at
BEFORE UPDATE ON public.technique_library
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_technique_library_discipline ON public.technique_library (discipline);
CREATE INDEX idx_technique_library_category ON public.technique_library (category);
