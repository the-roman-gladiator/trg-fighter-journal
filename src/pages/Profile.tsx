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
import { ArrowLeft, Settings, ChevronDown, User, Palette, RotateCcw, Swords, Quote, Library, BookMarked, Bell, LifeBuoy } from 'lucide-react';
import { AccountType, FitnessLevel } from '@/types/training';
import { disciplines } from '@/config/dropdownOptions';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CustomListManager } from '@/components/profile/CustomListManager';
import { NotificationsSection } from '@/components/profile/NotificationsSection';
import { SupportSection } from '@/components/profile/SupportSection';
import { RedeemCoachCode } from '@/components/coach/RedeemCoachCode';
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

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth();
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
  const [loading, setLoading] = useState(false);

  // My Statement & Motivation
  const [myStatement, setMyStatement] = useState('');
  const [motivationMode, setMotivationMode] = useState<'random' | 'fixed_library' | 'custom'>('random');
  const [fixedMotivationId, setFixedMotivationId] = useState<string | null>(null);
  const [customMotivation, setCustomMotivation] = useState('');
  const [motivationsLibrary, setMotivationsLibrary] = useState<{ id: string; day_number: number; motivation_text: string }[]>([]);
  const [motivationOpen, setMotivationOpen] = useState(false);

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

  useEffect(() => {
    setThemeMode(settings.theme_mode);
    setInputColor(settings.input_text_color);
    setDiscColors(settings.discipline_colors);
  }, [settings]);

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

          {/* My Statement & Motivation (collapsible) */}
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
                      <Select value={fitnessLevel} onValueChange={(v: any) => setFitnessLevel(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {fitnessLevels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
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

          {/* Technique Archive shortcut */}
          <Button type="button" variant="outline" className="w-full justify-between" onClick={() => navigate('/archive')}>
            <span className="flex items-center gap-2">
              <BookMarked className="h-4 w-4" /> My Technique Archive
            </span>
            <ChevronDown className="h-4 w-4 -rotate-90" />
          </Button>

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

          {/* Redeem coach invite code */}
          <RedeemCoachCode />

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
              <div className="mt-3">
                <SupportSection />
              </div>
            </CollapsibleContent>
          </Collapsible>

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
