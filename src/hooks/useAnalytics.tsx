import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useAppMode } from './useAppMode';

const SESSION_KEY = 'fj:analytics_session_id';
const QUEUE_KEY = 'fj:analytics_queue';
const FLUSH_MS = 5_000;
const MAX_BATCH = 25;

interface QueuedEvent {
  user_id: string | null;
  session_id: string;
  event_name: string;
  event_category: string | null;
  properties: Record<string, unknown>;
  route: string;
  app_mode: string | null;
  user_agent: string;
  // client timestamp for retry-safety; server `created_at` still wins on insert
  ts: number;
}

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2);
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return 'unknown';
  }
}

function readQueue(): QueuedEvent[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedEvent[]) : [];
  } catch {
    return [];
  }
}
function writeQueue(q: QueuedEvent[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch { /* ignore quota */ }
}

let pendingTimer: ReturnType<typeof setTimeout> | null = null;
let flushing = false;

async function flush() {
  if (flushing) return;
  const queue = readQueue();
  if (queue.length === 0) return;
  flushing = true;
  const batch = queue.slice(0, MAX_BATCH);
  try {
    const rows = batch.map((e) => ({
      user_id: e.user_id ?? undefined,
      session_id: e.session_id,
      event_name: e.event_name,
      event_category: e.event_category ?? undefined,
      properties: e.properties as never,
      route: e.route,
      app_mode: e.app_mode ?? undefined,
      user_agent: e.user_agent,
    }));
    const { error } = await supabase.from('analytics_events').insert(rows);
    if (error) {
      // keep events in the queue and retry next flush
      console.warn('[analytics] flush error', error.message);
    } else {
      writeQueue(queue.slice(batch.length));
    }
  } catch (e) {
    console.warn('[analytics] flush threw', e);
  } finally {
    flushing = false;
  }
}

function schedule() {
  if (pendingTimer) return;
  pendingTimer = setTimeout(() => {
    pendingTimer = null;
    flush();
  }, FLUSH_MS);
}

/**
 * Module-level logger so it can be called outside React (utils, error boundary).
 * Buffers to localStorage and batches inserts every few seconds.
 */
export function logEvent(
  name: string,
  properties: Record<string, unknown> = {},
  category?: string,
) {
  try {
    const queue = readQueue();
    queue.push({
      user_id: null, // hook fills this in if available; null is fine for anon
      session_id: getSessionId(),
      event_name: name.slice(0, 80),
      event_category: category ?? null,
      properties,
      route: typeof window !== 'undefined' ? window.location.pathname : '',
      app_mode: null,
      user_agent:
        typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : '',
      ts: Date.now(),
    });
    writeQueue(queue);
    schedule();
  } catch (e) {
    console.warn('[analytics] logEvent failed', e);
  }
}

/**
 * Hook that:
 * 1. Auto-logs `route_changed` on every navigation
 * 2. Stamps queued events with the current user_id + app_mode before flush
 * 3. Flushes on visibilitychange + beforeunload
 * 4. Returns a `track()` shortcut bound to the current user
 */
export function useAnalytics() {
  const { user } = useAuth();
  const { mode } = useAppMode();
  const location = useLocation();
  const lastRouteRef = useRef<string | null>(null);

  // Stamp queued events with latest user/mode before each flush.
  useEffect(() => {
    const queue = readQueue();
    if (queue.length === 0) return;
    const stamped = queue.map((e) => ({
      ...e,
      user_id: e.user_id ?? user?.id ?? null,
      app_mode: e.app_mode ?? mode ?? null,
    }));
    writeQueue(stamped);
  }, [user, mode]);

  // route_changed
  useEffect(() => {
    const path = location.pathname + location.search;
    if (lastRouteRef.current === path) return;
    lastRouteRef.current = path;
    logEvent('route_changed', { path });
  }, [location.pathname, location.search]);

  // periodic flush + flush on tab close
  useEffect(() => {
    const interval = setInterval(flush, FLUSH_MS);
    const onVis = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    const onUnload = () => flush();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('beforeunload', onUnload);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, []);

  return {
    track: (name: string, props: Record<string, unknown> = {}, category?: string) => {
      const queue = readQueue();
      queue.push({
        user_id: user?.id ?? null,
        session_id: getSessionId(),
        event_name: name.slice(0, 80),
        event_category: category ?? null,
        properties: props,
        route: location.pathname,
        app_mode: mode ?? null,
        user_agent: navigator.userAgent.slice(0, 500),
        ts: Date.now(),
      });
      writeQueue(queue);
      schedule();
    },
  };
}
