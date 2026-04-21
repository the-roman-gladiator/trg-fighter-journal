import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Bell, BellOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const DAYS = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];

interface Settings {
  daily_motivation_enabled: boolean;
  daily_motivation_days: string[];
  daily_motivation_time: string;
  my_statement_enabled: boolean;
  my_statement_days: string[];
  my_statement_time: string;
  enter_session_enabled: boolean;
  enter_session_days: string[];
  enter_session_time: string;
  timezone: string;
}

const DEFAULTS: Settings = {
  daily_motivation_enabled: false,
  daily_motivation_days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
  daily_motivation_time: '08:00',
  my_statement_enabled: false,
  my_statement_days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
  my_statement_time: '07:00',
  enter_session_enabled: false,
  enter_session_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
  enter_session_time: '21:00',
  timezone: 'Australia/Sydney',
};

export function NotificationsSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof Notification !== 'undefined') setPermission(Notification.permission);
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setSettings({
          daily_motivation_enabled: data.daily_motivation_enabled,
          daily_motivation_days: data.daily_motivation_days,
          daily_motivation_time: (data.daily_motivation_time as string).slice(0, 5),
          my_statement_enabled: data.my_statement_enabled,
          my_statement_days: data.my_statement_days,
          my_statement_time: (data.my_statement_time as string).slice(0, 5),
          enter_session_enabled: data.enter_session_enabled,
          enter_session_days: data.enter_session_days,
          enter_session_time: (data.enter_session_time as string).slice(0, 5),
          timezone: data.timezone,
        });
      }
    })();
  }, [user]);

  const requestPermission = async () => {
    if (typeof Notification === 'undefined') {
      toast({ title: 'Not supported', description: 'Browser notifications are not available on this device.', variant: 'destructive' });
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') toast({ title: 'Notifications enabled' });
  };

  const toggleDay = (field: 'daily_motivation_days' | 'my_statement_days' | 'enter_session_days', day: string) => {
    setSettings(s => ({
      ...s,
      [field]: s[field].includes(day) ? s[field].filter(d => d !== day) : [...s[field], day],
    }));
  };

  const save = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase
      .from('notification_settings')
      .upsert({ user_id: user.id, ...settings, daily_motivation_time: settings.daily_motivation_time + ':00', my_statement_time: settings.my_statement_time + ':00', enter_session_time: settings.enter_session_time + ':00' }, { onConflict: 'user_id' });
    setLoading(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Notifications saved' });
    }
  };

  const renderToggle = (
    title: string,
    description: string,
    enabledKey: 'daily_motivation_enabled' | 'my_statement_enabled' | 'enter_session_enabled',
    daysKey: 'daily_motivation_days' | 'my_statement_days' | 'enter_session_days',
    timeKey: 'daily_motivation_time' | 'my_statement_time' | 'enter_session_time',
  ) => (
    <div className="space-y-3 pb-4 border-b border-border/50 last:border-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <Label className="font-semibold">{title}</Label>
          <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
        </div>
        <Switch
          checked={settings[enabledKey]}
          onCheckedChange={v => setSettings(s => ({ ...s, [enabledKey]: v }))}
        />
      </div>
      {settings[enabledKey] && (
        <div className="space-y-2 pl-1">
          <div>
            <Label className="text-xs text-muted-foreground">Days</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {DAYS.map(d => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => toggleDay(daysKey, d.key)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                    settings[daysKey].includes(d.key)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40'
                  }`}
                >{d.label}</button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Time</Label>
            <Input
              type="time"
              value={settings[timeKey]}
              onChange={e => setSettings(s => ({ ...s, [timeKey]: e.target.value }))}
              className="mt-1 max-w-[140px]"
            />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4 text-primary" /> Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {permission !== 'granted' && (
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 flex items-start gap-2">
            <BellOff className="h-4 w-4 text-primary mt-0.5" />
            <div className="flex-1 text-xs">
              <p className="font-medium text-foreground">Browser notifications are off</p>
              <p className="text-muted-foreground mt-0.5">Enable browser notifications to receive reminders while the app is open.</p>
              <Button size="sm" variant="outline" className="mt-2 h-7 text-[11px]" onClick={requestPermission}>
                Enable Notifications
              </Button>
            </div>
          </div>
        )}

        {renderToggle(
          'Daily Motivation',
          'Get a daily nudge with your motivation message.',
          'daily_motivation_enabled', 'daily_motivation_days', 'daily_motivation_time',
        )}
        {renderToggle(
          'My Statement',
          'Reminder of who you want to be.',
          'my_statement_enabled', 'my_statement_days', 'my_statement_time',
        )}
        {renderToggle(
          'Enter Your Session Now',
          'Reminder to log today\'s session. Tap notification to open the log form.',
          'enter_session_enabled', 'enter_session_days', 'enter_session_time',
        )}

        <p className="text-[10px] text-muted-foreground">Timezone: {settings.timezone}</p>

        <Button type="button" onClick={save} disabled={loading} className="w-full">
          {loading ? 'Saving...' : 'Save Notification Settings'}
        </Button>
      </CardContent>
    </Card>
  );
}
