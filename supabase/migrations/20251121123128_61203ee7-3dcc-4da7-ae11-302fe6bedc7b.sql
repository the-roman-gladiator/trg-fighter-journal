-- Create enum types for the app
CREATE TYPE public.user_level AS ENUM ('Beginner', 'Intermediate', 'Advanced', 'Pro');
CREATE TYPE public.session_type AS ENUM ('Planned', 'Completed');
CREATE TYPE public.discipline AS ENUM ('MMA', 'Muay Thai', 'K1', 'Wrestling', 'Grappling', 'BJJ');
CREATE TYPE public.feeling AS ENUM ('Fresh', 'Normal', 'Tired', 'Injured', 'On Fire');
CREATE TYPE public.tactical_goal AS ENUM ('Attacking', 'Defending', 'Countering', 'Intercepting');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  level user_level NOT NULL DEFAULT 'Beginner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create training_sessions table
CREATE TABLE public.training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  time TIME,
  session_type session_type NOT NULL,
  discipline discipline NOT NULL,
  title TEXT,
  intensity INTEGER CHECK (intensity >= 1 AND intensity <= 10),
  feeling feeling,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on training_sessions
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;

-- Training sessions policies
CREATE POLICY "Users can view their own sessions"
  ON public.training_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
  ON public.training_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON public.training_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON public.training_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Create technique_chains table
CREATE TABLE public.technique_chains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_session_id UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  discipline discipline NOT NULL,
  sub_type TEXT NOT NULL,
  tactical_goal tactical_goal NOT NULL,
  starting_action TEXT NOT NULL,
  defender_reaction TEXT NOT NULL,
  continuation_finish TEXT NOT NULL,
  custom_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on technique_chains
ALTER TABLE public.technique_chains ENABLE ROW LEVEL SECURITY;

-- Technique chains policies (users can manage chains for their own sessions)
CREATE POLICY "Users can view technique chains for their sessions"
  ON public.technique_chains FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.training_sessions
    WHERE training_sessions.id = technique_chains.training_session_id
    AND training_sessions.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert technique chains for their sessions"
  ON public.technique_chains FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.training_sessions
    WHERE training_sessions.id = technique_chains.training_session_id
    AND training_sessions.user_id = auth.uid()
  ));

CREATE POLICY "Users can update technique chains for their sessions"
  ON public.technique_chains FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.training_sessions
    WHERE training_sessions.id = technique_chains.training_session_id
    AND training_sessions.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete technique chains for their sessions"
  ON public.technique_chains FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.training_sessions
    WHERE training_sessions.id = technique_chains.training_session_id
    AND training_sessions.user_id = auth.uid()
  ));

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_training_sessions_updated_at
  BEFORE UPDATE ON public.training_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_technique_chains_updated_at
  BEFORE UPDATE ON public.technique_chains
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, level)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Fighter'),
    NEW.email,
    'Beginner'
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();