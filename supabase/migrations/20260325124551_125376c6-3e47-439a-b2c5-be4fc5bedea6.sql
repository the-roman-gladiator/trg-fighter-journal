
-- Pathway nodes table
CREATE TABLE public.pathway_nodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  node_type TEXT NOT NULL DEFAULT 'concept',
  status TEXT NOT NULL DEFAULT 'active',
  color_tag TEXT,
  icon TEXT,
  position_x NUMERIC NOT NULL DEFAULT 0,
  position_y NUMERIC NOT NULL DEFAULT 0,
  is_root BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Pathway edges table
CREATE TABLE public.pathway_edges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  source_node_id UUID NOT NULL REFERENCES public.pathway_nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES public.pathway_nodes(id) ON DELETE CASCADE,
  connection_type TEXT NOT NULL DEFAULT 'default',
  visual_strength NUMERIC NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pathway_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pathway_edges ENABLE ROW LEVEL SECURITY;

-- RLS policies for pathway_nodes
CREATE POLICY "Users can view own nodes" ON public.pathway_nodes FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own nodes" ON public.pathway_nodes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own nodes" ON public.pathway_nodes FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own nodes" ON public.pathway_nodes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- RLS policies for pathway_edges
CREATE POLICY "Users can view own edges" ON public.pathway_edges FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own edges" ON public.pathway_edges FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own edges" ON public.pathway_edges FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own edges" ON public.pathway_edges FOR DELETE TO authenticated USING (user_id = auth.uid());
