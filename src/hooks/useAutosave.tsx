import { useEffect, useRef, useState, useCallback } from 'react';

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutosaveOptions<T> {
  /** Current value to watch. Save fires when this changes. */
  value: T;
  /** Async save function. Receives the latest value. */
  onSave: (value: T) => Promise<void>;
  /** Debounce in ms for rapid changes (text inputs). Use 0 for instant (clicks/toggles). */
  debounceMs?: number;
  /** Skip autosave when false (e.g. while initial load is in progress). */
  enabled?: boolean;
  /** Equality fn — defaults to JSON compare so objects work out of the box. */
  isEqual?: (a: T, b: T) => boolean;
  /** Auto-retry once after this delay (ms) on failure. 0 disables retry. */
  retryMs?: number;
}

const defaultEqual = <T,>(a: T, b: T) => {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return a === b;
  }
};

/**
 * Generic autosave hook.
 * - Debounces rapid changes
 * - Cancels stale saves (race protection via request id)
 * - Auto-retries once on failure
 * - Surfaces a small status the UI can render
 *
 * Does NOT modify your data — purely a side-effect runner around `onSave`.
 */
export function useAutosave<T>({
  value,
  onSave,
  debounceMs = 700,
  enabled = true,
  isEqual = defaultEqual,
  retryMs = 4000,
}: UseAutosaveOptions<T>) {
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const lastSavedRef = useRef<T>(value);
  const lastValueRef = useRef<T>(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const initialisedRef = useRef(false);
  const savedFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the latest value in a ref so the timer always sees fresh data.
  lastValueRef.current = value;

  const runSave = useCallback(async () => {
    const myId = ++requestIdRef.current;
    const snapshot = lastValueRef.current;
    setStatus('saving');
    try {
      await onSave(snapshot);
      // If a newer save started after this one, ignore this completion.
      if (myId !== requestIdRef.current) return;
      lastSavedRef.current = snapshot;
      setStatus('saved');
      if (savedFlashTimerRef.current) clearTimeout(savedFlashTimerRef.current);
      savedFlashTimerRef.current = setTimeout(() => {
        // Only fade back to idle if no new save started.
        if (myId === requestIdRef.current) setStatus('idle');
      }, 1500);
    } catch {
      if (myId !== requestIdRef.current) return;
      setStatus('error');
      if (retryMs > 0) {
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(() => {
          // Retry only if value still differs from last successful save.
          if (!isEqual(lastValueRef.current, lastSavedRef.current)) runSave();
        }, retryMs);
      }
    }
  }, [onSave, retryMs, isEqual]);

  useEffect(() => {
    if (!enabled) return;
    // Skip the very first run — that's the initial render / load.
    if (!initialisedRef.current) {
      initialisedRef.current = true;
      lastSavedRef.current = value;
      return;
    }
    if (isEqual(value, lastSavedRef.current)) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(runSave, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, enabled, debounceMs, isEqual, runSave]);

  // Reset baseline when load completes (parent toggles enabled true).
  // Also exposes a manual reset for cases where the parent reloads from server.
  const resetBaseline = useCallback((next: T) => {
    lastSavedRef.current = next;
    initialisedRef.current = true;
    setStatus('idle');
  }, []);

  // Cleanup on unmount.
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    if (savedFlashTimerRef.current) clearTimeout(savedFlashTimerRef.current);
  }, []);

  /** Force an immediate save (e.g. on blur, before navigation). */
  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (isEqual(lastValueRef.current, lastSavedRef.current)) return;
    return runSave();
  }, [runSave, isEqual]);

  return { status, flush, resetBaseline };
}
