import { useState } from 'react';
import { z } from 'zod';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be under 100 characters'),
  email: z.string().trim().email('Enter a valid email').max(255),
  gym_team: z.string().trim().max(150, 'Must be under 150 characters').optional(),
});

export default function BetaRequestForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [gymTeam, setGymTeam] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; gym_team?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const parsed = schema.safeParse({
      name,
      email,
      gym_team: gymTeam || undefined,
    });

    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      parsed.error.errors.forEach((err) => {
        const key = err.path[0] as keyof typeof errors;
        if (key) fieldErrors[key] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('beta_requests').insert({
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        gym_team: parsed.data.gym_team ?? null,
      });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Already requested',
            description: 'This email has already been submitted for the private beta.',
          });
          setSubmitted(true);
          return;
        }
        throw error;
      }

      setSubmitted(true);
      toast({
        title: 'Request received',
        description: 'Thanks — we will be in touch soon.',
      });
    } catch (err) {
      toast({
        title: 'Something went wrong',
        description: 'Please try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold">You're on the list</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Thanks for requesting access to the Fighter Journal Private Beta. We will reach out via email when your spot opens.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="beta-name">Name</Label>
        <Input
          id="beta-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your full name"
          maxLength={100}
          autoComplete="name"
          disabled={submitting}
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="beta-email">Email</Label>
        <Input
          id="beta-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          maxLength={255}
          autoComplete="email"
          disabled={submitting}
        />
        {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="beta-gym">
          Gym / Team <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="beta-gym"
          value={gymTeam}
          onChange={(e) => setGymTeam(e.target.value)}
          placeholder="e.g. The Roman Gladiators"
          maxLength={150}
          autoComplete="organization"
          disabled={submitting}
        />
        {errors.gym_team && <p className="text-xs text-destructive">{errors.gym_team}</p>}
      </div>

      <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
        {submitting ? (
          <>
            <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Submitting…
          </>
        ) : (
          <>
            <Send className="mr-1 h-4 w-4" /> Request Access
          </>
        )}
      </Button>
    </form>
  );
}
