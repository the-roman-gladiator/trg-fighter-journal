import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Eye, EyeOff, Check } from 'lucide-react';
import {
  TermsOfServiceContent,
  PrivacyPolicyContent,
  CookiePolicyContent,
} from '@/pages/legal/content';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Turnstile } from '@/components/Turnstile';
import { logEvent } from '@/hooks/useAnalytics';
import { cn } from '@/lib/utils';

const TURNSTILE_SITE_KEY = '0x4AAAAAADEiFrPq6HzDSJ78';

const TERMS_VERSION = '1.0';
const PRIVACY_VERSION = '1.0';
const COOKIES_VERSION = '1.0';

const LEGAL_DOC_URL = 'https://thefighterjournal.com/';

const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

type LegalKey = 'terms' | 'privacy' | 'cookies';

const LEGAL_DOCS: Record<LegalKey, { title: string; summary: string }> = {
  terms: {
    title: 'Terms of Service',
    summary:
      'By using Fighter Journal you agree to use the app for personal, lawful training tracking, to keep your account credentials secure, and to accept that the app is provided as-is during private testing.',
  },
  privacy: {
    title: 'Privacy Policy',
    summary:
      'We store the data you enter (training sessions, profile, motivation notes) so the app can function. Your data is private to you and only shared with coaches you explicitly approve. We never sell personal data.',
  },
  cookies: {
    title: 'Cookie Policy',
    summary:
      'We use essential cookies and local storage to keep you signed in and remember your preferences. We do not use advertising cookies.',
  },
};

interface Props {
  onSwitchToLogin: () => void;
  signupsOpen: boolean | null;
}

type Step = 1 | 2 | 3;

export function SignUpWizard({ onSwitchToLogin, signupsOpen }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeCookies, setAgreeCookies] = useState(false);
  const [acceptedAt, setAcceptedAt] = useState<{
    terms?: string;
    privacy?: string;
    cookies?: string;
  }>({});
  const [openDoc, setOpenDoc] = useState<LegalKey | null>(null);

  // Step 2
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState(''); // yyyy-mm-dd
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step2Errors, setStep2Errors] = useState<Record<string, string>>({});

  // Step 3 (parent consent)
  const [parentFirst, setParentFirst] = useState('');
  const [parentLast, setParentLast] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentConsent, setParentConsent] = useState(false);
  const [step3Errors, setStep3Errors] = useState<Record<string, string>>({});

  // Captcha (used when calling supabase.auth.signUp at the final step)
  const [captchaToken, setCaptchaToken] = useState('');
  const turnstileResetRef = useRef<(() => void) | null>(null);
  const handleVerify = useCallback((token: string) => setCaptchaToken(token), []);
  const handleResetReady = useCallback((reset: () => void) => {
    turnstileResetRef.current = reset;
  }, []);
  const resetCaptcha = useCallback(() => {
    setCaptchaToken('');
    turnstileResetRef.current?.();
  }, []);

  const computedAge = useMemo(() => {
    if (!dob) return null;
    const d = new Date(dob);
    if (isNaN(d.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
    return age;
  }, [dob]);

  const isMinor = computedAge !== null && computedAge >= 13 && computedAge <= 17;
  const isUnder13 = computedAge !== null && computedAge < 13;

  // Total steps shown in stepper depend on whether the user is (or might be) a minor.
  const totalSteps = isMinor ? 3 : 2;
  const stepsLabel = isMinor
    ? ['Agreements', 'Profile', 'Parent consent']
    : ['Agreements', 'Profile'];

  const allAgreed = agreeTerms && agreePrivacy && agreeCookies;

  // Stamp acceptance times when checkboxes are ticked.
  useEffect(() => {
    if (agreeTerms && !acceptedAt.terms) {
      setAcceptedAt((s) => ({ ...s, terms: new Date().toISOString() }));
    }
  }, [agreeTerms, acceptedAt.terms]);
  useEffect(() => {
    if (agreePrivacy && !acceptedAt.privacy) {
      setAcceptedAt((s) => ({ ...s, privacy: new Date().toISOString() }));
    }
  }, [agreePrivacy, acceptedAt.privacy]);
  useEffect(() => {
    if (agreeCookies && !acceptedAt.cookies) {
      setAcceptedAt((s) => ({ ...s, cookies: new Date().toISOString() }));
    }
  }, [agreeCookies, acceptedAt.cookies]);

  const validateStep2 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!firstName.trim()) errs.firstName = 'First name is required.';
    if (!lastName.trim()) errs.lastName = 'Last name is required.';
    if (!dob) errs.dob = 'Date of birth is required.';
    else if (computedAge === null || computedAge < 0 || computedAge > 120) {
      errs.dob = 'Please enter a valid date of birth.';
    }
    if (!email.trim()) errs.email = 'Email is required.';
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errs.email = 'Enter a valid email address.';
    if (!password) errs.password = 'Password is required.';
    else if (!STRONG_PASSWORD.test(password)) {
      errs.password = 'Min 8 characters, with uppercase, lowercase, and a number.';
    }
    setStep2Errors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep3 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!parentFirst.trim()) errs.parentFirst = 'Parent first name is required.';
    if (!parentLast.trim()) errs.parentLast = 'Parent last name is required.';
    if (!parentEmail.trim()) errs.parentEmail = 'Parent email is required.';
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(parentEmail)) {
      errs.parentEmail = 'Enter a valid email address.';
    }
    if (!parentConsent) errs.parentConsent = 'Consent is required.';
    setStep3Errors(errs);
    return Object.keys(errs).length === 0;
  };

  const goFromStep1 = () => {
    if (!allAgreed) return;
    setStep(2);
  };

  const goFromStep2 = () => {
    if (!validateStep2()) return;
    if (isUnder13) {
      // Block — do not create account.
      logEvent('signup_blocked_underage', { age: computedAge }, 'auth');
      return; // UI shows blocked message
    }
    if (isMinor) {
      setStep(3);
      return;
    }
    // 18+: create account immediately
    void createAccount();
  };

  const createAccount = async () => {
    if (signupsOpen === false) {
      toast({
        title: 'Signups closed',
        description: 'Private access only. New registrations are closed.',
        variant: 'destructive',
      });
      return;
    }
    if (!captchaToken) {
      toast({
        title: 'Security check required',
        description: 'Please complete the security check.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Capture device IP (best-effort) for parent consent record.
      let consentIp: string | null = null;
      if (isMinor) {
        try {
          const r = await fetch('https://api.ipify.org?format=json');
          const j = await r.json();
          consentIp = j.ip ?? null;
        } catch {
          consentIp = null;
        }
      }

      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          captchaToken,
          emailRedirectTo: `${window.location.origin}/`,
          data: { name: fullName, first_name: firstName.trim(), last_name: lastName.trim() },
        },
      });
      if (error) {
        resetCaptcha();
        throw error;
      }

      const userId = data.user?.id;
      if (userId) {
        // Update the auto-created profile row with wizard data.
        const profileUpdate: Record<string, unknown> = {
          first_name: firstName.trim(),
          surname: lastName.trim(),
          name: fullName,
          terms_accepted_at: acceptedAt.terms ?? new Date().toISOString(),
          terms_version: TERMS_VERSION,
          privacy_accepted_at: acceptedAt.privacy ?? new Date().toISOString(),
          privacy_version: PRIVACY_VERSION,
          cookies_accepted_at: acceptedAt.cookies ?? new Date().toISOString(),
          cookies_version: COOKIES_VERSION,
          date_of_birth: dob,
          age_at_signup: computedAge,
          account_status: 'active',
        };
        if (isMinor) {
          profileUpdate.parent_first_name = parentFirst.trim();
          profileUpdate.parent_last_name = parentLast.trim();
          profileUpdate.parent_email = parentEmail.trim();
          profileUpdate.parent_consent_at = new Date().toISOString();
          profileUpdate.parent_consent_ip = consentIp;
        }
        // Best-effort — handle_new_user trigger creates the row on signup.
        await supabase.from('profiles').update(profileUpdate).eq('id', userId);
      }

      logEvent('auth_signup', { method: 'wizard', minor: isMinor }, 'auth');
      toast({
        title: 'Welcome!',
        description: 'Your account has been created.',
      });

      // If session not yet active (email confirmation required), send to login.
      if (!data.session) {
        toast({
          title: 'Check your email',
          description: 'Confirm your email address, then sign in.',
        });
        onSwitchToLogin();
      }
      // Otherwise the AuthProvider listener will route the user.
    } catch (err: any) {
      toast({
        title: 'Sign-up failed',
        description: err.message || 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const submitStep3 = () => {
    if (!validateStep3()) return;
    void createAccount();
  };

  // ------- UI -------

  if (signupsOpen === false) {
    return (
      <div className="text-center space-y-4">
        <p className="text-sm font-medium text-primary">
          Private access only. New registrations are closed.
        </p>
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-sm text-primary hover:underline"
        >
          Back to Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress stepper */}
      <ol className="flex items-center justify-between gap-2" aria-label="Sign-up progress">
        {stepsLabel.map((label, i) => {
          const n = (i + 1) as Step;
          const active = step === n;
          const done = step > n;
          return (
            <li key={label} className="flex-1 flex items-center gap-2">
              <span
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold shrink-0',
                  done && 'bg-primary text-primary-foreground border-primary',
                  active && 'border-primary text-primary',
                  !done && !active && 'border-border text-muted-foreground',
                )}
                aria-current={active ? 'step' : undefined}
              >
                {done ? <Check className="h-4 w-4" /> : n}
              </span>
              <span
                className={cn(
                  'text-xs font-medium truncate',
                  active ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {label}
              </span>
              {i < totalSteps - 1 && <span className="flex-1 h-px bg-border" aria-hidden />}
            </li>
          );
        })}
      </ol>

      {/* Step 1 */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-xl font-semibold">Before you continue</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Please review and accept the following to create an account.
            </p>
          </div>

          <div className="space-y-3">
            {(['terms', 'privacy', 'cookies'] as const).map((key) => {
              const checked =
                key === 'terms' ? agreeTerms : key === 'privacy' ? agreePrivacy : agreeCookies;
              const setter =
                key === 'terms'
                  ? setAgreeTerms
                  : key === 'privacy'
                    ? setAgreePrivacy
                    : setAgreeCookies;
              return (
                <label
                  key={key}
                  className="flex items-start gap-3 rounded-md border border-border bg-card/50 p-3 cursor-pointer"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) => setter(Boolean(v))}
                    className="mt-0.5"
                  />
                  <span className="text-sm">
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setOpenDoc(key);
                      }}
                      className="text-primary underline underline-offset-2"
                    >
                      {LEGAL_DOCS[key].title}
                    </button>
                  </span>
                </label>
              );
            })}
          </div>

          <Button onClick={goFromStep1} disabled={!allAgreed} className="w-full">
            Continue
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-sm text-primary hover:underline"
            >
              Already have an account? Sign in
            </button>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            goFromStep2();
          }}
          className="space-y-4"
          noValidate
        >
          <div>
            <h2 className="text-xl font-semibold">Set up your profile</h2>
            <p className="mt-1 text-sm text-muted-foreground">Tell us a bit about you.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                aria-invalid={!!step2Errors.firstName}
                className="mt-1"
              />
              {step2Errors.firstName && (
                <p className="mt-1 text-xs text-destructive">{step2Errors.firstName}</p>
              )}
            </div>
            <div>
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                aria-invalid={!!step2Errors.lastName}
                className="mt-1"
              />
              {step2Errors.lastName && (
                <p className="mt-1 text-xs text-destructive">{step2Errors.lastName}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="dob">Date of birth</Label>
            <Input
              id="dob"
              type="date"
              value={dob}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDob(e.target.value)}
              aria-invalid={!!step2Errors.dob}
              className="mt-1"
            />
            {step2Errors.dob && (
              <p className="mt-1 text-xs text-destructive">{step2Errors.dob}</p>
            )}
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!step2Errors.email}
              className="mt-1"
            />
            {step2Errors.email && (
              <p className="mt-1 text-xs text-destructive">{step2Errors.email}</p>
            )}
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative mt-1">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!step2Errors.password}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {step2Errors.password ? (
              <p className="mt-1 text-xs text-destructive">{step2Errors.password}</p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                Min 8 characters, with uppercase, lowercase, and a number.
              </p>
            )}
          </div>

          {/* Captcha required for the final supabase.auth.signUp call.
              For 18+ adults the next click submits — show captcha here. */}
          {!isMinor && (
            <Turnstile
              siteKey={TURNSTILE_SITE_KEY}
              onVerify={handleVerify}
              onResetReady={handleResetReady}
              onExpire={() => setCaptchaToken('')}
              onError={() => setCaptchaToken('')}
            />
          )}

          {isUnder13 && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              Sorry, you must be at least 13 to use this app.
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              className="flex-1"
              disabled={loading}
            >
              Back
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={loading || isUnder13}
            >
              {loading ? 'Please wait…' : isMinor ? 'Continue' : 'Create account'}
            </Button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-sm text-primary hover:underline"
            >
              Already have an account? Sign in
            </button>
          </div>
        </form>
      )}

      {/* Step 3 — minors only */}
      {step === 3 && isMinor && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitStep3();
          }}
          className="space-y-4"
          noValidate
        >
          <div>
            <h2 className="text-xl font-semibold">Parent or guardian details</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Because you're under 18, a parent or guardian must give consent.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="parentFirst">Parent first name</Label>
              <Input
                id="parentFirst"
                value={parentFirst}
                onChange={(e) => setParentFirst(e.target.value)}
                aria-invalid={!!step3Errors.parentFirst}
                className="mt-1"
              />
              {step3Errors.parentFirst && (
                <p className="mt-1 text-xs text-destructive">{step3Errors.parentFirst}</p>
              )}
            </div>
            <div>
              <Label htmlFor="parentLast">Parent last name</Label>
              <Input
                id="parentLast"
                value={parentLast}
                onChange={(e) => setParentLast(e.target.value)}
                aria-invalid={!!step3Errors.parentLast}
                className="mt-1"
              />
              {step3Errors.parentLast && (
                <p className="mt-1 text-xs text-destructive">{step3Errors.parentLast}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="parentEmail">Parent email address</Label>
            <Input
              id="parentEmail"
              type="email"
              value={parentEmail}
              onChange={(e) => setParentEmail(e.target.value)}
              aria-invalid={!!step3Errors.parentEmail}
              className="mt-1"
            />
            {step3Errors.parentEmail && (
              <p className="mt-1 text-xs text-destructive">{step3Errors.parentEmail}</p>
            )}
          </div>

          <label className="flex items-start gap-3 rounded-md border border-border bg-card/50 p-3 cursor-pointer">
            <Checkbox
              checked={parentConsent}
              onCheckedChange={(v) => setParentConsent(Boolean(v))}
              className="mt-0.5"
            />
            <span className="text-sm">
              I am the parent or legal guardian of this user and I consent to them using this app.
            </span>
          </label>
          {step3Errors.parentConsent && (
            <p className="-mt-2 text-xs text-destructive">{step3Errors.parentConsent}</p>
          )}

          <Turnstile
            siteKey={TURNSTILE_SITE_KEY}
            onVerify={handleVerify}
            onResetReady={handleResetReady}
            onExpire={() => setCaptchaToken('')}
            onError={() => setCaptchaToken('')}
          />

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(2)}
              className="flex-1"
              disabled={loading}
            >
              Back
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Please wait…' : 'Agree and create account'}
            </Button>
          </div>
        </form>
      )}

      {/* Legal modals */}
      <Dialog open={openDoc !== null} onOpenChange={(o) => !o && setOpenDoc(null)}>
        <DialogContent className="max-w-2xl">
          {openDoc && (
            <>
              <DialogHeader>
                <DialogTitle>{LEGAL_DOCS[openDoc].title}</DialogTitle>
                <DialogDescription>
                  Version{' '}
                  {openDoc === 'terms'
                    ? TERMS_VERSION
                    : openDoc === 'privacy'
                      ? PRIVACY_VERSION
                      : COOKIES_VERSION}
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh] pr-4">
                <div className="text-sm text-muted-foreground space-y-3">
                  {openDoc === 'terms' && <TermsOfServiceContent />}
                  {openDoc === 'privacy' && <PrivacyPolicyContent />}
                  {openDoc === 'cookies' && <CookiePolicyContent />}
                </div>
              </ScrollArea>
              <DialogFooter>
                <Button type="button" onClick={() => setOpenDoc(null)} className="w-full sm:w-auto">
                  Back to sign-up
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
