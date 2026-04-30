import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFighterProfile } from '@/hooks/useFighterProfile';
import { useUserSettings, DEFAULT_DISCIPLINE_COLORS, INPUT_COLOR_PRESETS, DEFAULT_SETTINGS } from '@/hooks/useUserSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Settings, ChevronDown, User, Palette, RotateCcw, Swords, Quote, Library, Bell, LifeBuoy, Shield, Activity } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { AccountType, FitnessLevel } from '@/types/training';
import { disciplines } from '@/config/dropdownOptions';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CustomListManager } from '@/components/profile/CustomListManager';
import { NotificationsSection } from '@/components/profile/NotificationsSection';
import { SupportSection } from '@/components/profile/SupportSection';
import { DeleteMyDataSection } from '@/components/profile/DeleteMyDataSection';

import { useAutosave } from '@/hooks/useAutosave';
import { AutosaveStatus } from '@/components/AutosaveStatus';

const accountTypes: AccountType[] = ['free', 'basic', 'pro'];
const martialLevels = ['Beginner', 'Intermediate', 'Advanced', 'Fighter'] as const;
const fitnessLevels: FitnessLevel[] = ['Beginner', 'Moderate', 'Active', 'Very Active'];

const accountBadgeColor: Record<AccountType, string> = {
  free: 'bg-muted text-muted-foreground',
  basic: 'bg-primary/20 text-primary',
  pro: 'bg-accent text-accent-foreground',
};

const ALL_DISCIPLINES = ['MMA', 'Muay Thai', 'K1', 'Wrestling', 'Grappling', 'BJJ'];

const FIGHT_DISCIPLINES = ['MMA', 'Muay Thai', 'K1', 'Boxing', 'BJJ', 'Grappling', 'Wrestling'];

// Volume tier labels (separate from FitnessLevel enum which lacks "Poor")
export type VolumeTier = 'Poor' | 'Light' | 'Moderate' | 'Active' | 'Very Active';

// Map weekly training sessions → volume tier.
export function deriveVolumeTier(sessionsPerWeek: number): VolumeTier {
  if (sessionsPerWeek >= 6) return 'Very Active';
  if (sessionsPerWeek >= 4) return 'Active';
  if (sessionsPerWeek >= 2) return 'Moderate';
  if (sessionsPerWeek >= 1) return 'Light';
  return 'Poor';
}

// Map volume tier → FitnessLevel (Poor & Light → Beginner since enum has no "Poor")
function volumeTierToFitnessLevel(tier: VolumeTier): FitnessLevel {
  if (tier === 'Very Active') return 'Very Active';
  if (tier === 'Active') return 'Active';
  if (tier === 'Moderate') return 'Moderate';
  return 'Beginner';
}

const FITNESS_RANK: Record<FitnessLevel, number> = {
  'Beginner': 0, 'Moderate': 1, 'Active': 2, 'Very Active': 3,
};

// Derive fitness level from assessment fitness test inputs combined with weekly training volume.
function deriveFitnessLevel(
  pushups: number,
  situps: number,
  squats: number,
  plank: number,
  weeklyVolume: number,
): FitnessLevel | null {
  const total = (pushups || 0) + (situps || 0) + (squats || 0);
  const hasPhysical = total > 0 || plank > 0;
  const hasVolume = weeklyVolume > 0;
  if (!hasPhysical && !hasVolume) return null;

  let physical: FitnessLevel = 'Beginner';
  if (total >= 180 || plank >= 180) physical = 'Very Active';
  else if (total >= 120 || plank >= 120) physical = 'Active';
  else if (total >= 60 || plank >= 60) physical = 'Moderate';

  const fromVolume = volumeTierToFitnessLevel(deriveVolumeTier(weeklyVolume));
  // Take the higher of the two tiers
  return FITNESS_RANK[fromVolume] > FITNESS_RANK[physical] ? fromVolume : physical;
}

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth();
  const { isAdmin } = useSubscription();
  const { settings, updateSettings } = useUserSettings();
  const { fighterProfile, requestFighterAccess, refreshFighterProfile } = useFighterProfile();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [surname, setSurname] = useState('');
  const [nickname, setNickname] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('free');
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>([]);
  const [martialLevel, setMartialLevel] = useState('Beginner');
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>('Beginner');
  const [profileOpen, setProfileOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [librariesOpen, setLibrariesOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [deleteDataOpen, setDeleteDataOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // My Statement & Motivation
  const [myStatement, setMyStatement] = useState('');
  const [motivationMode, setMotivationMode] = useState<'random' | 'fixed_library' | 'custom'>('random');
  const [fixedMotivationId, setFixedMotivationId] = useState<string | null>(null);
  const [customMotivation, setCustomMotivation] = useState('');
  const [motivationsLibrary, setMotivationsLibrary] = useState<{ id: string; day_number: number; motivation_text: string }[]>([]);
  const [motivationOpen, setMotivationOpen] = useState(false);

  // Assessment data (from onboarding) — editable
  const [assessmentOpen, setAssessmentOpen] = useState(false);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [aHeight, setAHeight] = useState<number | ''>('');
  const [aWeight, setAWeight] = useState<number | ''>('');
  const [aAge, setAAge] = useState<number | ''>('');
  const [aSex, setASex] = useState<'male' | 'female'>('male');
  const [aBodyFat, setABodyFat] = useState<number | ''>('');
  const [aPushups, setAPushups] = useState<number | ''>('');
  const [aSitups, setASitups] = useState<number | ''>('');
  const [aSquats, setASquats] = useState<number | ''>('');
  const [aPlank, setAPlank] = useState<number | ''>('');
  const [aWalkingHr, setAWalkingHr] = useState<number | ''>('');
  const [aWeeklyVolume, setAWeeklyVolume] = useState<number | ''>('');
  const [aNotes, setANotes] = useState('');
  const [aDiscipline, setADiscipline] = useState('');
  const [savingAssessment, setSavingAssessment] = useState(false);

  // Local customization state
  const [themeMode, setThemeMode] = useState(settings.theme_mode);
  const [inputColor, setInputColor] = useState(settings.input_text_color);
  const [discColors, setDiscColors] = useState(settings.discipline_colors);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (profile) {
      setName(profile.name);
      setMiddleName(profile.middle_name || '');
      setSurname(profile.surname || '');
      setNickname(profile.nickname || '');
      setAccountType((profile.account_type as AccountType) || 'free');
      setSelectedDisciplines(profile.discipline ? profile.discipline.split(',').map(d => d.trim()).filter(Boolean) : []);
      const lvl = profile.level;
      setMartialLevel(lvl === 'Pro' ? 'Fighter' : lvl);
      setFitnessLevel((profile.fitness_level as FitnessLevel) || 'Beginner');
    }
  }, [user, profile, navigate]);

  // Load motivation fields from profile
  useEffect(() => {
    if (!user) return;
    const loadMotivationData = async () => {
      const { data: prof } = await supabase
        .from('profiles')
        .select('my_statement, daily_motivation_mode, fixed_motivation_id, custom_motivation_text')
        .eq('id', user.id)
        .maybeSingle();
      if (prof) {
        setMyStatement(prof.my_statement || '');
        setMotivationMode((prof.daily_motivation_mode as any) || 'random');
        setFixedMotivationId(prof.fixed_motivation_id || null);
        setCustomMotivation(prof.custom_motivation_text || '');
      }
      // Load motivations library
      const { data: motLib } = await supabase
        .from('motivations_library')
        .select('id, day_number, motivation_text')
        .eq('is_active', true)
        .order('day_number', { ascending: true });
      setMotivationsLibrary(motLib || []);
    };
    loadMotivationData();
  }, [user]);

  // Load latest assessment from onboarding
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('user_assessments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setAssessmentId(data.id);
        setAHeight(data.height_cm ?? '');
        setAWeight(data.weight_kg ?? '');
        setAAge(data.age ?? '');
        setASex((data.sex as 'male' | 'female') || 'male');
        setABodyFat(data.body_fat_percent ?? '');
        setAPushups(data.pushups_max ?? '');
        setASitups(data.situps_max ?? '');
        setASquats(data.squats_max ?? '');
        setAPlank(data.plank_seconds ?? '');
        setAWalkingHr(data.walking_hr_recovery ?? '');
        setAWeeklyVolume((data as any).weekly_training_volume ?? '');
        setANotes(data.notes ?? '');
        setADiscipline(data.discipline ?? '');
      }
    })();
  }, [user]);

  const saveAssessment = async () => {
    if (!user) return;
    setSavingAssessment(true);
    try {
      const payload: any = {
        user_id: user.id,
        discipline: aDiscipline || (selectedDisciplines[0] ?? 'MMA'),
        height_cm: aHeight === '' ? null : Number(aHeight),
        weight_kg: aWeight === '' ? null : Number(aWeight),
        age: aAge === '' ? null : Number(aAge),
        sex: aSex,
        body_fat_percent: aBodyFat === '' ? null : Number(aBodyFat),
        pushups_max: aPushups === '' ? 0 : Number(aPushups),
        situps_max: aSitups === '' ? 0 : Number(aSitups),
        squats_max: aSquats === '' ? 0 : Number(aSquats),
        plank_seconds: aPlank === '' ? null : Number(aPlank),
        walking_hr_recovery: aWalkingHr === '' ? null : Number(aWalkingHr),
        weekly_training_volume: aWeeklyVolume === '' ? null : Number(aWeeklyVolume),
        notes: aNotes || null,
      };
      if (assessmentId) {
        const { error } = await supabase.from('user_assessments').update(payload).eq('id', assessmentId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('user_assessments').insert(payload).select().single();
        if (error) throw error;
        if (data) setAssessmentId(data.id);
      }
      toast({ title: 'Assessment updated', description: 'Your assessment data was saved.' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSavingAssessment(false);
    }
  };


  useEffect(() => {
    setThemeMode(settings.theme_mode);
    setInputColor(settings.input_text_color);
    setDiscColors(settings.discipline_colors);
  }, [settings]);

  // Auto-derive fitness level from assessment fitness test inputs + weekly training volume
  useEffect(() => {
    const derived = deriveFitnessLevel(
      Number(aPushups) || 0,
      Number(aSitups) || 0,
      Number(aSquats) || 0,
      Number(aPlank) || 0,
      Number(aWeeklyVolume) || 0,
    );
    if (derived && derived !== fitnessLevel) {
      setFitnessLevel(derived);
    }
  }, [aPushups, aSitups, aSquats, aPlank, aWeeklyVolume]);


  const toggleDiscipline = (d: string) => {
    setSelectedDisciplines(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  // ---- Autosave for profile fields ----
  // Skip until profile is loaded so we don't overwrite with empty values.
  const profileLoaded = !!profile && !!user;
  const profileSnapshot = {
    name, middleName, surname, nickname, accountType,
    selectedDisciplines, martialLevel, fitnessLevel,
    myStatement, motivationMode, fixedMotivationId, customMotivation,
  };
  const { status: autosaveStatus } = useAutosave({
    value: profileSnapshot,
    enabled: profileLoaded,
    debounceMs: 800,
    onSave: async () => {
      if (!user) return;
      const dbLevel = martialLevel === 'Fighter' ? 'Pro' : martialLevel;
      const { error } = await supabase
        .from('profiles')
        .update({
          name,
          middle_name: middleName || null,
          surname: surname || null,
          nickname,
          account_type: accountType,
          discipline: selectedDisciplines.join(', '),
          level: dbLevel as any,
          fitness_level: fitnessLevel,
          my_statement: myStatement || null,
          daily_motivation_mode: motivationMode,
          fixed_motivation_id: motivationMode === 'fixed_library' ? fixedMotivationId : null,
          custom_motivation_text: motivationMode === 'custom' ? customMotivation : null,
        })
        .eq('id', user.id);
      if (error) throw error;
      // Refresh in the background so other screens see the update.
      refreshProfile();
    },
  });

  // Live apply theme
  const handleThemeChange = (mode: 'dark' | 'light') => {
    setThemeMode(mode);
    updateSettings({ theme_mode: mode });
  };

  const handleInputColorChange = (color: string) => {
    setInputColor(color);
    updateSettings({ input_text_color: color });
  };

  const handleDiscColorChange = (disc: string, color: string) => {
    const updated = { ...discColors, [disc]: color };
    setDiscColors(updated);
    updateSettings({ discipline_colors: updated });
  };

  const resetCustomization = () => {
    setThemeMode('dark');
    setInputColor('#FFFFFF');
    setDiscColors(DEFAULT_DISCIPLINE_COLORS);
    updateSettings(DEFAULT_SETTINGS);
    toast({ title: 'Reset', description: 'Customization reset to defaults.' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const dbLevel = martialLevel === 'Fighter' ? 'Pro' : martialLevel;
      const { error } = await supabase
        .from('profiles')
        .update({
          name, middle_name: middleName || null, surname: surname || null,
          nickname, account_type: accountType,
          discipline: selectedDisciplines.join(', '),
          level: dbLevel as any, fitness_level: fitnessLevel,
          my_statement: myStatement || null,
          daily_motivation_mode: motivationMode,
          fixed_motivation_id: motivationMode === 'fixed_library' ? fixedMotivationId : null,
          custom_motivation_text: motivationMode === 'custom' ? customMotivation : null,
        })
        .eq('id', user.id);
      if (error) throw error;
      toast({ title: 'Profile saved', description: 'Your profile has been updated.' });
      await refreshProfile();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fullName = [name, middleName, surname].filter(Boolean).join(' ').trim();
  const displayName = nickname || name || 'Fighter';
  const primaryDiscipline = (fighterProfile?.approved_fight_disciplines?.[0]) || selectedDisciplines[0] || '—';
  const fighterStatus = fighterProfile?.fighter_status;
  const levelBadgeClass =
    martialLevel === 'Fighter' ? 'bg-combat-danger/15 text-combat-danger border-combat-danger/40'
    : martialLevel === 'Advanced' ? 'bg-primary/15 text-primary border-primary/40'
    : martialLevel === 'Intermediate' ? 'bg-combat-warning/15 text-combat-warning border-combat-warning/40'
    : 'bg-muted text-muted-foreground border-border';
  const accountTierClass = accountBadgeColor[accountType];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/')} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-display font-bold text-primary">My Profile</h1>
            <AutosaveStatus status={autosaveStatus} />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-lg pb-28">
        {/* Fight-card hero */}
        <Card className="mb-6 overflow-hidden border-primary/20 shadow-card-premium relative">
          <div
            className="absolute inset-0 opacity-60 pointer-events-none"
            style={{ background: 'var(--gradient-hero)' }}
          />
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
          <CardContent className="relative pt-6 pb-5">
            {/* Top row: tier + status */}
            <div className="flex items-center justify-between mb-4">
              <span className={`px-2.5 py-1 rounded text-[10px] font-display font-bold tracking-widest border ${accountTierClass}`}>
                {accountType.toUpperCase()} TIER
              </span>
              {fighterStatus === 'approved' && (
                <span className="px-2.5 py-1 rounded text-[10px] font-display font-bold tracking-widest border bg-combat-success/15 text-combat-success border-combat-success/40">
                  ★ FIGHTER
                </span>
              )}
              {fighterStatus === 'pending' && (
                <span className="px-2.5 py-1 rounded text-[10px] font-display font-bold tracking-widest border bg-combat-warning/15 text-combat-warning border-combat-warning/40">
                  PENDING
                </span>
              )}
            </div>

            {/* Identity */}
            <div className="text-center space-y-1 mb-5">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-display">
                {primaryDiscipline}
              </p>
              <h2 className="font-headline text-4xl leading-none text-foreground">
                {displayName.toUpperCase()}
              </h2>
              {fullName && fullName.toLowerCase() !== displayName.toLowerCase() && (
                <p className="text-xs text-muted-foreground">{fullName}</p>
              )}
            </div>

            {/* Stat strip */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-card-elevated/60 border border-border/60 p-3 text-center">
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-display mb-1">Level</p>
                <span className={`inline-block px-2.5 py-1 rounded text-xs font-display font-bold tracking-wide border ${levelBadgeClass}`}>
                  {martialLevel.toUpperCase()}
                </span>
              </div>
              <div className="rounded-lg bg-card-elevated/60 border border-border/60 p-3 text-center">
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-display mb-1">Fitness</p>
                <span className="inline-block px-2.5 py-1 rounded text-xs font-display font-bold tracking-wide border bg-primary/10 text-primary border-primary/30">
                  {fitnessLevel.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Disciplines chips */}
            {selectedDisciplines.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5 justify-center">
                {selectedDisciplines.map(d => (
                  <span key={d} className="px-2 py-0.5 text-[10px] font-display tracking-wider rounded border border-border/60 bg-secondary/60 text-secondary-foreground">
                    {d.toUpperCase()}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile (collapsible) */}
          <Collapsible open={profileOpen} onOpenChange={setProfileOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between" type="button">
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4" /> Profile
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Card className="mt-3">
                <CardContent className="space-y-4 pt-6">
              <div>
                <Label htmlFor="name">First Name</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="middleName">Middle Name</Label>
                <Input id="middleName" value={middleName} onChange={e => setMiddleName(e.target.value)} placeholder="Optional" />
              </div>
              <div>
                <Label htmlFor="surname">Surname</Label>
                <Input id="surname" value={surname} onChange={e => setSurname(e.target.value)} placeholder="Required for fighter/coach requests" />
              </div>
              <div>
                <Label htmlFor="nickname">Nickname (App Name)</Label>
                <Input id="nickname" value={nickname} onChange={e => setNickname(e.target.value)} placeholder="e.g. Dominus" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={profile?.email || ''} disabled className="bg-muted/30" />
              </div>
              <div>
                <Label>Account Type</Label>
                <div className="flex gap-2 mt-1">
                  {accountTypes.map(t => (
                    <button key={t} type="button" onClick={() => setAccountType(t)}
                      className={`px-4 py-2 rounded-md text-sm font-semibold uppercase transition-all border ${
                        accountType === t
                          ? accountBadgeColor[t] + ' border-primary ring-2 ring-primary/30'
                          : 'border-border text-muted-foreground hover:border-primary/40'
                      }`}
                    >{t}</button>
                  ))}
                </div>
              </div>

              {/* Fighter Access (inside Profile menu) */}
              <div className="pt-4 border-t border-border/50 space-y-3">
                <Label className="flex items-center gap-2 font-semibold">
                  <Swords className="h-4 w-4 text-primary" /> Fighter Access
                </Label>
                {fighterProfile?.fighter_status === 'approved' ? (
                  <div>
                    <Badge className="bg-emerald-500/20 text-emerald-400">✅ Approved Fighter</Badge>
                    <p className="text-xs text-muted-foreground mt-2">Your fighter access has been approved by the Head Coach.</p>
                    <div className="flex gap-1 flex-wrap mt-2">
                      {(fighterProfile.approved_fight_disciplines || []).map(d => (
                        <Badge key={d} variant="default" className="text-xs">{d}</Badge>
                      ))}
                    </div>
                  </div>
                ) : fighterProfile?.fighter_status === 'rejected' ? (
                  <div>
                    <Badge variant="destructive">❌ Request Rejected</Badge>
                    <p className="text-xs text-muted-foreground mt-2">
                      Your fighter access request has been rejected by the Head Coach. You can update your details and re-submit.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Previously requested: {(fighterProfile.requested_fight_disciplines || []).join(', ')}
                    </p>
                    <div className="mt-3">
                      <FighterRequestForm onSubmit={requestFighterAccess} />
                    </div>
                  </div>
                ) : fighterProfile?.fighter_status === 'pending' ? (
                  <div>
                    <Badge variant="outline" className="text-amber-500 border-amber-500/30">⏳ Request Pending</Badge>
                    <p className="text-xs text-muted-foreground mt-2">
                      Your request is awaiting Head Coach approval.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Requested: {(fighterProfile.requested_fight_disciplines || []).join(', ')}
                    </p>
                  </div>
                ) : (
                  <FighterRequestForm onSubmit={requestFighterAccess} />
                )}
              </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={motivationOpen} onOpenChange={setMotivationOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between" type="button">
                <span className="flex items-center gap-2">
                  <Quote className="h-4 w-4" /> My Statement & Motivation
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${motivationOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Card className="mt-3">
                <CardContent className="space-y-5 pt-6">
              {/* My Statement */}
              <div>
                <Label htmlFor="myStatement">Who I Want To Be</Label>
                <Textarea
                  id="myStatement"
                  value={myStatement}
                  onChange={e => setMyStatement(e.target.value)}
                  placeholder="Write your personal statement..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              {/* Daily Motivation Mode */}
              <div>
                <Label className="mb-2 block">Daily Motivation Mode</Label>
                <RadioGroup value={motivationMode} onValueChange={(v: any) => setMotivationMode(v)} className="space-y-2">
                  <div className="flex items-start gap-2">
                    <RadioGroupItem value="random" id="mot-random" className="mt-0.5" />
                    <div>
                      <Label htmlFor="mot-random" className="font-medium cursor-pointer">Random Daily</Label>
                      <p className="text-[11px] text-muted-foreground">A new motivation every day from the library of 365</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <RadioGroupItem value="fixed_library" id="mot-fixed" className="mt-0.5" />
                    <div>
                      <Label htmlFor="mot-fixed" className="font-medium cursor-pointer">Fixed from Library</Label>
                      <p className="text-[11px] text-muted-foreground">Choose one motivation to keep every day</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <RadioGroupItem value="custom" id="mot-custom" className="mt-0.5" />
                    <div>
                      <Label htmlFor="mot-custom" className="font-medium cursor-pointer">Custom Motivation</Label>
                      <p className="text-[11px] text-muted-foreground">Write your own personal motivation</p>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {/* Fixed from library picker */}
              {motivationMode === 'fixed_library' && (
                <div>
                  <Label className="mb-1 block">Select Motivation</Label>
                  <Select value={fixedMotivationId || ''} onValueChange={v => setFixedMotivationId(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a motivation..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {motivationsLibrary.map(m => (
                        <SelectItem key={m.id} value={m.id}>
                          <span className="text-xs">#{m.day_number} — {m.motivation_text}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Custom motivation */}
              {motivationMode === 'custom' && (
                <div>
                  <Label htmlFor="customMotivation">Your Custom Motivation</Label>
                  <Input
                    id="customMotivation"
                    value={customMotivation}
                    onChange={e => setCustomMotivation(e.target.value)}
                    placeholder="Write your personal motivation..."
                    className="mt-1"
                  />
                </div>
              )}
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>

          {/* Advanced Setting (parent) */}
          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between" type="button">
                <span className="flex items-center gap-2">
                  <Settings className="h-4 w-4" /> Advanced Setting
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-3 space-y-3">
                {/* Activity Setting */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Swords className="h-4 w-4 text-primary" /> Activity Setting
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div>
                      <Label>Disciplines</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {disciplines.map(d => (
                          <button key={d} type="button" onClick={() => toggleDiscipline(d)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                              selectedDisciplines.includes(d)
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'border-border text-foreground hover:border-primary/50'
                            }`}
                          >{d}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>Martial Arts Level</Label>
                      <Select value={martialLevel} onValueChange={setMartialLevel}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {martialLevels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Fitness Level</Label>
                      <Select value={fitnessLevel} disabled>
                        <SelectTrigger className="opacity-70 cursor-not-allowed">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {fitnessLevels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Auto-calculated from your fitness assessment below.
                      </p>
                    </div>

                    {/* Assessment Fitness — dropdown */}
                    <Collapsible open={assessmentOpen} onOpenChange={setAssessmentOpen}>
                      <CollapsibleTrigger asChild>
                        <Button variant="outline" className="w-full justify-between" type="button">
                          <span className="flex items-center gap-2">
                            <Activity className="h-4 w-4" /> Assessment Fitness Data
                          </span>
                          <ChevronDown className={`h-4 w-4 transition-transform ${assessmentOpen ? 'rotate-180' : ''}`} />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <Card className="mt-3">
                          <CardContent className="space-y-4 pt-6">
                            <p className="text-xs text-muted-foreground">
                              The information you entered during onboarding. Editing the fitness test will update your Fitness Level automatically.
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label>Height (cm)</Label>
                                <Input type="number" value={aHeight} onChange={e => setAHeight(e.target.value === '' ? '' : Number(e.target.value))} />
                              </div>
                              <div>
                                <Label>Weight (kg)</Label>
                                <Input type="number" value={aWeight} onChange={e => setAWeight(e.target.value === '' ? '' : Number(e.target.value))} />
                              </div>
                              <div>
                                <Label>Age</Label>
                                <Input type="number" value={aAge} onChange={e => setAAge(e.target.value === '' ? '' : Number(e.target.value))} />
                              </div>
                              <div>
                                <Label>Sex</Label>
                                <Select value={aSex} onValueChange={v => setASex(v as 'male' | 'female')}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="male">Male</SelectItem>
                                    <SelectItem value="female">Female</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>Body Fat %</Label>
                                <Input type="number" value={aBodyFat} onChange={e => setABodyFat(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Optional" />
                              </div>
                            </div>

                            <div className="pt-2">
                              <p className="text-sm font-medium text-foreground mb-2">Fitness Test</p>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label>Push-ups (max)</Label>
                                  <Input type="number" value={aPushups} onChange={e => setAPushups(e.target.value === '' ? '' : Number(e.target.value))} />
                                </div>
                                <div>
                                  <Label>Sit-ups (max)</Label>
                                  <Input type="number" value={aSitups} onChange={e => setASitups(e.target.value === '' ? '' : Number(e.target.value))} />
                                </div>
                                <div>
                                  <Label>Squats (max)</Label>
                                  <Input type="number" value={aSquats} onChange={e => setASquats(e.target.value === '' ? '' : Number(e.target.value))} />
                                </div>
                                <div>
                                  <Label>Plank (sec)</Label>
                                  <Input type="number" value={aPlank} onChange={e => setAPlank(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Optional" />
                                </div>
                                <div className="col-span-2">
                                  <Label>Walking HR recovery (bpm)</Label>
                                  <Input type="number" value={aWalkingHr} onChange={e => setAWalkingHr(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Optional" />
                                </div>
                                <div className="col-span-2">
                                  <Label>Weekly Training Volume (sessions/week)</Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={21}
                                    value={aWeeklyVolume}
                                    onChange={e => setAWeeklyVolume(e.target.value === '' ? '' : Number(e.target.value))}
                                    placeholder="e.g. 3"
                                  />
                                  {aWeeklyVolume !== '' && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Tier: <span className="text-foreground font-medium">{deriveVolumeTier(Number(aWeeklyVolume))}</span>
                                      {' '}— Poor (0) · Light (1) · Moderate (2–3) · Active (4–5) · Very Active (6+)
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div>
                              <Label>Notes</Label>
                              <Textarea value={aNotes} onChange={e => setANotes(e.target.value)} placeholder="Injuries, conditions, notes for your coach..." />
                            </div>

                            <Button type="button" onClick={saveAssessment} disabled={savingAssessment} className="w-full">
                              {savingAssessment ? 'Saving...' : 'Save Assessment'}
                            </Button>
                          </CardContent>
                        </Card>
                      </CollapsibleContent>
                    </Collapsible>
                  </CardContent>
                </Card>

                {/* Personalised Setting */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Library className="h-4 w-4 text-primary" /> Personalised Setting
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Manage the items that appear in your training session selectors. Changes only affect your account.
                    </p>
                    <CustomListManager type="technique" title="Techniques" scoped />
                    <CustomListManager type="class_type" title="Class Type" />
                    <CustomListManager type="emotion" title="Emotions" />
                    <CustomListManager type="mindset" title="Mindset" />
                  </CardContent>
                </Card>
              </div>
            </CollapsibleContent>
          </Collapsible>


          {/* Notifications (collapsible) */}
          <Collapsible open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between" type="button">
                <span className="flex items-center gap-2">
                  <Bell className="h-4 w-4" /> Notifications
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${notificationsOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-3">
                <NotificationsSection />
              </div>
            </CollapsibleContent>
          </Collapsible>


          {/* Customization */}
          <Collapsible open={customOpen} onOpenChange={setCustomOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between" type="button">
                <span className="flex items-center gap-2">
                  <Palette className="h-4 w-4" /> Customization
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${customOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Card className="mt-3">
                <CardContent className="pt-6 space-y-6">
                  {/* Theme Mode */}
                  <div>
                    <Label className="mb-2 block">Theme Mode</Label>
                    <div className="flex gap-2">
                      {(['dark', 'light'] as const).map(mode => (
                        <button key={mode} type="button" onClick={() => handleThemeChange(mode)}
                          className={`flex-1 px-4 py-3 rounded-lg text-sm font-semibold uppercase transition-all border ${
                            themeMode === mode
                              ? 'bg-primary text-primary-foreground border-primary ring-2 ring-primary/30'
                              : 'border-border text-muted-foreground hover:border-primary/40'
                          }`}
                        >{mode}</button>
                      ))}
                    </div>
                  </div>

                  {/* Input Text Color */}
                  <div>
                    <Label className="mb-2 block">Input Font Color</Label>
                    <div className="flex gap-2 flex-wrap">
                      {INPUT_COLOR_PRESETS.map(p => (
                        <button key={p.value} type="button" onClick={() => handleInputColorChange(p.value)}
                          className={`w-10 h-10 rounded-lg border-2 transition-all flex items-center justify-center ${
                            inputColor === p.value ? 'border-primary ring-2 ring-primary/30' : 'border-border'
                          }`}
                          title={p.label}
                        >
                          <div className="w-6 h-6 rounded" style={{ backgroundColor: p.value }} />
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">Applied to session titles, techniques, and movements</p>
                  </div>

                  {/* Discipline Colors */}
                  <div>
                    <Label className="mb-2 block">Discipline Colors</Label>
                    <div className="space-y-2">
                      {ALL_DISCIPLINES.map(disc => (
                        <div key={disc} className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-foreground">{disc}</span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={discColors[disc] || DEFAULT_DISCIPLINE_COLORS[disc]}
                              onChange={e => handleDiscColorChange(disc, e.target.value)}
                              className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                            />
                            <div
                              className="w-6 h-6 rounded"
                              style={{ backgroundColor: discColors[disc] || DEFAULT_DISCIPLINE_COLORS[disc] }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">Applied to session cards, pathway views, and tags</p>
                  </div>

                  {/* Live Preview */}
                  <div>
                    <Label className="mb-2 block">Preview</Label>
                    <div className="rounded-lg border border-border p-3 bg-card">
                      <p className="text-xs text-muted-foreground mb-1">Session card preview</p>
                      <p className="text-sm font-bold" style={{ color: inputColor }}>Jab Entry Study</p>
                      <div className="flex gap-1.5 mt-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: discColors['MMA'] + '33', color: discColors['MMA'] }}>MMA</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Attacking</span>
                      </div>
                      <p className="text-[11px] mt-1 font-mono" style={{ color: inputColor + 'aa' }}>Jab → Step Back → Low Kick</p>
                    </div>
                  </div>

                  {/* Reset */}
                  <Button type="button" variant="outline" size="sm" onClick={resetCustomization} className="w-full">
                    <RotateCcw className="h-3.5 w-3.5 mr-2" /> Reset to Default
                  </Button>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>

          {/* Support (collapsible) — must be the last section */}
          <Collapsible open={supportOpen} onOpenChange={setSupportOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between" type="button">
                <span className="flex items-center gap-2">
                  <LifeBuoy className="h-4 w-4" /> Support
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${supportOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-3 space-y-3">
                <SupportSection />
                {/* Privacy: delete personal AI + analytics data — nested pull-down for less exposure */}
                <Collapsible open={deleteDataOpen} onOpenChange={setDeleteDataOpen}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between border-destructive/40 text-destructive hover:text-destructive"
                      type="button"
                    >
                      <span className="flex items-center gap-2">
                        <Shield className="h-4 w-4" /> Delete my AI &amp; analytics data
                      </span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${deleteDataOpen ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-3">
                      <DeleteMyDataSection />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {isAdmin && (
            <Card className="border-primary/40">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold text-sm">Admin Dashboard</p>
                    <p className="text-xs text-muted-foreground">Manage users, approvals & issues</p>
                  </div>
                </div>
                <Button size="sm" onClick={() => navigate('/admin')}>Open</Button>
              </CardContent>
            </Card>
          )}

          <p className="text-[10px] text-center text-muted-foreground">
            Changes save automatically as you type.
          </p>
        </form>
      </main>
    </div>
  );
}

function FighterRequestForm({ onSubmit }: { onSubmit: (discs: string[]) => Promise<void> }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const toggle = (d: string) => setSelected(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const handleRequest = async () => {
    if (selected.length === 0) {
      toast({ title: 'Select at least one discipline', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    await onSubmit(selected);
    toast({ title: 'Request Sent', description: 'Your fighter request has been submitted for Head Coach approval.' });
    setSubmitting(false);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Select the disciplines you want to compete in:</p>
      <div className="flex gap-2 flex-wrap">
        {FIGHT_DISCIPLINES.map(d => (
          <label key={d} className="flex items-center gap-1.5 text-xs cursor-pointer">
            <Checkbox checked={selected.includes(d)} onCheckedChange={() => toggle(d)} />
            {d}
          </label>
        ))}
      </div>
      <Button size="sm" onClick={handleRequest} disabled={submitting || selected.length === 0}>
        {submitting ? 'Submitting...' : 'Request Fighter Access'}
      </Button>
    </div>
  );
}
