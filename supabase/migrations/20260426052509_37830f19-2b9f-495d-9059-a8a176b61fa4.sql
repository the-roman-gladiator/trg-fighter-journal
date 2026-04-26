-- Create beta_requests table
CREATE TABLE public.beta_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  gym_team TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.beta_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (anon + authenticated) can submit a request
CREATE POLICY "Anyone can submit beta request"
ON public.beta_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (
  char_length(name) BETWEEN 1 AND 100
  AND char_length(email) BETWEEN 3 AND 255
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND (gym_team IS NULL OR char_length(gym_team) <= 150)
);

-- Only admins can view
CREATE POLICY "Admins can view beta requests"
ON public.beta_requests
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update
CREATE POLICY "Admins can update beta requests"
ON public.beta_requests
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete
CREATE POLICY "Admins can delete beta requests"
ON public.beta_requests
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Updated_at trigger
CREATE TRIGGER update_beta_requests_updated_at
BEFORE UPDATE ON public.beta_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();