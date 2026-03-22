import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecoverySession, setIsRecoverySession] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check URL params for mode=reset (from recovery link redirect)
    const urlMode = searchParams.get('mode');
    if (urlMode === 'reset') {
      setMode('reset');
    }

    // Detect recovery token in URL hash
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      setMode('reset');
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('reset');
        setIsRecoverySession(true);
      }
    });
    return () => subscription.unsubscribe();
  }, [searchParams]);

  // Also check if user has a valid session (recovery sessions auto-login the user)
  useEffect(() => {
    if (mode === 'reset') {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setIsRecoverySession(true);
        }
      });
    }
  }, [mode]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'reset') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }

        // If user arrived via recovery link, they have a session — update password directly
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('No active recovery session. Please request a new password reset link.');
        }

        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        toast({
          title: 'Password updated!',
          description: 'You can now log in with your new password.',
        });
        // Sign out so user logs in fresh with new password
        await supabase.auth.signOut();
        setMode('login');
        setPassword('');
        setConfirmPassword('');
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth?mode=reset`,
        });
        if (error) throw error;
        toast({
          title: 'Check your email',
          description: 'A password reset link has been sent to your email.',
        });
        setMode('login');
      } else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: 'Welcome back!', description: 'Successfully logged in.' });
        navigate('/');
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        toast({ title: 'Account created!', description: 'You can now log in.' });
        setMode('login');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const headings: Record<string, string> = {
    login: 'Welcome back',
    signup: 'Create your account',
    forgot: 'Reset your password',
    reset: 'Set a new password',
  };

  const descriptions: Record<string, string> = {
    login: 'Sign in to your account',
    signup: 'Start tracking your training',
    forgot: 'Enter your email and we\'ll send you a reset link',
    reset: 'Enter your new password below',
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary">Fighter Training Journal</h1>
          <p className="mt-2 text-muted-foreground">{headings[mode]}</p>
          <p className="mt-1 text-sm text-muted-foreground">{descriptions[mode]}</p>
        </div>

        <form onSubmit={handleAuth} className="mt-8 space-y-6 bg-card p-8 rounded-lg border border-border">
          {mode === 'signup' && (
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1" />
            </div>
          )}

          {mode !== 'reset' && (
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1" />
            </div>
          )}

          {(mode === 'login' || mode === 'signup') && (
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1">
                <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {mode === 'reset' && (
            <>
              <div>
                <Label htmlFor="password">New Password</Label>
                <div className="relative mt-1">
                  <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="At least 6 characters" className="pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative mt-1">
                  <Input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} placeholder="Re-enter your new password" className="pr-10" />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? 'Please wait...'
              : mode === 'forgot'
              ? 'Send Reset Link'
              : mode === 'reset'
              ? 'Update Password'
              : mode === 'login'
              ? 'Sign In'
              : 'Sign Up'}
          </Button>

          {mode !== 'reset' && (
            <div className="text-center space-y-2">
              {mode === 'login' && (
                <button type="button" onClick={() => setMode('forgot')} className="block w-full text-sm text-muted-foreground hover:underline">
                  Forgot your password?
                </button>
              )}
              <button
                type="button"
                onClick={() => setMode(mode === 'signup' ? 'login' : mode === 'login' ? 'signup' : 'login')}
                className="text-sm text-primary hover:underline"
              >
                {mode === 'signup' ? 'Already have an account? Sign in' : mode === 'login' ? "Don't have an account? Sign up" : 'Back to Sign in'}
              </button>
            </div>
          )}

          {mode === 'reset' && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setPassword('');
                  setConfirmPassword('');
                }}
                className="text-sm text-primary hover:underline"
              >
                Back to Sign in
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}