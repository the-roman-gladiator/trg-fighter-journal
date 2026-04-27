-- Add new value to existing enum
ALTER TYPE public.strategy ADD VALUE IF NOT EXISTS 'Transiction';

-- Note: cannot rename enum values in same transaction as ADD VALUE, so we do data migration in a follow-up step via insert tool.