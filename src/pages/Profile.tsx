import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Settings, ChevronDown, User } from 'lucide-react';
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

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('free');
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>([]);
  const [martialLevel, setMartialLevel] = useState('Beginner');
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>('Beginner');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (profile) {
      setName(profile.name);
      setNickname(profile.nickname || '');
      setAccountType((profile.account_type as AccountType) || 'free');
      setSelectedDisciplines(profile.discipline ? profile.discipline.split(',').map(d => d.trim()).filter(Boolean) : []);
      // Map DB level to UI label
      const lvl = profile.level;
      setMartialLevel(lvl === 'Pro' ? 'Fighter' : lvl);
      setFitnessLevel((profile.fitness_level as FitnessLevel) || 'Beginner');
    }
  }, [user, profile, navigate]);

  const toggleDiscipline = (d: string) => {
    setSelectedDisciplines(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      // Map Fighter back to Pro for DB enum
      const dbLevel = martialLevel === 'Fighter' ? 'Pro' : martialLevel;
      const { error } = await supabase
        .from('profiles')
        .update({
          name,
          nickname,
          account_type: accountType,
          discipline: selectedDisciplines.join(', '),
          level: dbLevel as any,
          fitness_level: fitnessLevel,
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
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-primary">My Profile</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Default Profile Section */}
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
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAccountType(t)}
                      className={`px-4 py-2 rounded-md text-sm font-semibold uppercase transition-all border ${
                        accountType === t
                          ? accountBadgeColor[t] + ' border-primary ring-2 ring-primary/30'
                          : 'border-border text-muted-foreground hover:border-primary/40'
                      }`}
                    >
                      {t}
                    </button>
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
                  <Settings className="h-4 w-4" />
                  Advanced Settings
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Card className="mt-3">
                <CardContent className="pt-6 space-y-5">
                  {/* Disciplines multi-select */}
                  <div>
                    <Label>Disciplines</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {disciplines.map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => toggleDiscipline(d)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                            selectedDisciplines.includes(d)
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'border-border text-foreground hover:border-primary/50'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Martial Arts Level */}
                  <div>
                    <Label>Martial Arts Level</Label>
                    <Select value={martialLevel} onValueChange={setMartialLevel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {martialLevels.map(l => (
                          <SelectItem key={l} value={l}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Fitness Level */}
                  <div>
                    <Label>Fitness Level</Label>
                    <Select value={fitnessLevel} onValueChange={(v: any) => setFitnessLevel(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fitnessLevels.map(l => (
                          <SelectItem key={l} value={l}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
