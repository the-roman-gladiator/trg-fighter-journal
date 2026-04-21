import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const STORAGE_KEY = 'trg_notif_last_sent'; // map of "kind|YYYY-MM-DD" => true

interface NotificationSettings {
  daily_motivation_enabled: boolean;
  daily_motivation_days: string[];
  daily_motivation_time: string;
  my_statement_enabled: boolean;
  my_statement_days: string[];
  my_statement_time: string;
  enter_session_enabled: boolean;
  enter_session_days: string[];
  enter_session_time: string;
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getSentMap(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}
function markSent(kind: string) {
  const map = getSentMap();
  map[`${kind}|${todayKey()}`] = true;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}
function alreadySent(kind: string): boolean {
  return !!getSentMap()[`${kind}|${todayKey()}`];
}

function shouldFire(enabled: boolean, days: string[], time: string): boolean {
  if (!enabled) return false;
  const now = new Date();
  const dayKey = DAY_KEYS[now.getDay()];
  if (!days.includes(dayKey)) return false;
  const [h, m] = time.split(':').map(Number);
  const target = h * 60 + (m || 0);
  const current = now.getHours() * 60 + now.getMinutes();
  return current >= target && current - target < 60; // window: target time → +59 min
}

/**
 * In-app browser notifications scheduler.
 * Polls every 60s while the app is open. Uses Notification API if granted,
 * falls back to a silent localStorage marker (no UI toast spam).
 */
export function useBrowserNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user) return;
    let settings: NotificationSettings | null = null;

    const load = async () => {
      const { data } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) settings = data as any;
    };

    const fire = (title: string, body: string, kind: string, deepLink?: string) => {
      if (alreadySent(kind)) return;
      if (typeof Notification === 'undefined') return;
      if (Notification.permission !== 'granted') return;
      const n = new Notification(title, { body, icon: '/favicon.ico', tag: kind });
      if (deepLink) {
        n.onclick = () => {
          window.focus();
          navigate(deepLink);
          n.close();
        };
      }
      markSent(kind);
    };

    const check = () => {
      if (!settings) return;
      if (shouldFire(settings.daily_motivation_enabled, settings.daily_motivation_days, settings.daily_motivation_time)) {
        fire('Daily Motivation', 'Your motivation for today is ready.', 'motivation', '/');
      }
      if (shouldFire(settings.my_statement_enabled, settings.my_statement_days, settings.my_statement_time)) {
        fire('My Statement', 'Remember who you want to be.', 'statement', '/');
      }
      if (shouldFire(settings.enter_session_enabled, settings.enter_session_days, settings.enter_session_time)) {
        fire('Enter Your Session Now', 'Tap to log today\'s training.', 'session', '/session/new');
      }
    };

    load().then(check);
    intervalRef.current = window.setInterval(check, 60_000);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [user, navigate]);
}
