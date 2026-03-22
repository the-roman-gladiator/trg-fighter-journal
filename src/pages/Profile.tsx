import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserSettings, DEFAULT_DISCIPLINE_COLORS, INPUT_COLOR_PRESETS, DEFAULT_SETTINGS } from '@/hooks/useUserSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Settings, ChevronDown, User, Palette, RotateCcw } from 'lucide-react';
import { AccountType, FitnessLevel } from '@/types/training';
import { disciplines } from '@/config/dropdownOptions';

const accountTypes: AccountType[] = ['free', 'basic', 'pro'];
const martialLevels = ['Beginner', 'Intermediate', 'Advanced', 'Fighter'] as const;
const fitnessLevels: FitnessLevel[] = ['Beginner', 'Moderate', 'Active', 'Very Active'];

const accountBadgeColor: Record<AccountType, string> = {
  free: 'bg-muted text-muted-foreground',
  basic: 'bg-primary/20 text-primary',
  pro: 'bg-accent text-accent-foreground',
};

const ALL_DISCIPLINES = ['MMA', 'Muay Thai', 'K1', 'Wrestling', 'Grappling', 'BJJ'];

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth();
  const { settings, updateSettings } = useUserSettings();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('free');
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>([]);
  const [martialLevel, setMartialLevel] = useState('Beginner');
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>('Beginner');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Local customization state
  const [themeMode, setThemeMode] = useState(settings.theme_mode);
  const [inputColor, setInputColor] = useState(settings.input_text_color);
  const [discColors, setDiscColors] = useState(settings.discipline_colors);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (profile) {
      setName(profile.name);
      setNickname(profile.nickname || '');
      setAccountType((profile.account_type as AccountType) || 'free');
      setSelectedDisciplines(profile.discipline ? profile.discipline.split(',').map(d => d.trim()).filter(Boolean) : []);
      const lvl = profile.level;
      setMartialLevel(lvl === 'Pro' ? 'Fighter' : lvl);
      setFitnessLevel((profile.fitness_level as FitnessLevel) || 'Beginner');
    }
  }, [user, profile, navigate]);

  useEffect(() => {
    setThemeMode(settings.theme_mode);
    setInputColor(settings.input_text_color);
    setDiscColors(settings.discipline_colors);
  }, [settings]);

  const toggleDiscipline = (d: string) => {
    setSelectedDisciplines(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

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
          name, nickname, account_type: accountType,
          discipline: selectedDisciplines.join(', '),
          level: dbLevel as any, fitness_level: fitnessLevel,
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
          <h1 className="text-2xl font-display font-bold text-primary">My Profile</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Card */}
          <Card>
            <CardHeader className="items-center pb-2">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <User className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-lg">Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} required />
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
            </CardContent>
          </Card>

          {/* Advanced Settings */}
          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between" type="button">
                <span className="flex items-center gap-2">
                  <Settings className="h-4 w-4" /> Advanced Settings
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Card className="mt-3">
                <CardContent className="pt-6 space-y-5">
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

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>
      </main>
    </div>
  );
}
