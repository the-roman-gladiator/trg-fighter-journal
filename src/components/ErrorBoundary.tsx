import { Component, type ErrorInfo, type ReactNode, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

async function persistError(payload: {
  level?: 'error' | 'warn' | 'info';
  source?: 'client' | 'edge' | 'db';
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
}) {
  try {
    const { data: u } = await supabase.auth.getUser();
    await supabase.from('error_logs').insert({
      user_id: u?.user?.id ?? undefined,
      level: payload.level ?? 'error',
      source: payload.source ?? 'client',
      route: typeof window !== 'undefined' ? window.location.pathname : undefined,
      message: payload.message.slice(0, 4000),
      stack: payload.stack?.slice(0, 8000),
      context: (payload.context ?? {}) as never,
      user_agent:
        typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : undefined,
    });
  } catch {
    // never throw from the error reporter
  }
}

/** Captures uncaught errors + unhandled promise rejections globally. */
export function GlobalErrorListener() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      persistError({
        message: event.message || 'Unknown window error',
        stack: event.error?.stack,
        context: { filename: event.filename, lineno: event.lineno, colno: event.colno },
      });
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === 'string'
            ? reason
            : JSON.stringify(reason)?.slice(0, 500) ?? 'Unhandled rejection';
      persistError({
        message,
        stack: reason instanceof Error ? reason.stack : undefined,
        context: { kind: 'unhandledrejection' },
      });
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);
  return null;
}

interface State {
  hasError: boolean;
  message: string;
}

/** React render-error boundary. Logs and shows a graceful fallback. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    persistError({
      message: error.message,
      stack: error.stack,
      context: { componentStack: info.componentStack ?? undefined },
    });
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">{this.state.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
