import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sparkles,
  Brain,
  Save,
  Network,
  ListPlus,
  Lock,
  Bot,
  User as UserIcon,
  Send,
  Edit3,
  AlertTriangle,
  Trophy,
  Loader2,
  Square,
  History,
  FileDown,
  FileText,
  Plus,
  Trash2,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import gladiusIcon from '@/assets/gladius-icon.png';

interface NeuralNode {
  id: number;
  label: string;
  type: 'trigger' | 'defensive' | 'opportunity' | 'attack' | 'movement' | 'exit';
}
interface NeuralConnection {
  from: number;
  to: number;
  rule: string;
}
interface Analysis {
  discipline: string;
  tactic: string;
  technique: string;
  movement_1: string;
  movement_2: string;
  movement_3: string;
  neural_nodes: NeuralNode[];
  neural_connections: NeuralConnection[];
  coach_explanation: string;
  mistakes_to_avoid: string[];
  advanced_variation: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface SavedConversation {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
}

interface ImportableNote {
  id: string;
  title: string;
  date: string;
  discipline: string | null;
  notes: string | null;
}

const NODE_COLORS: Record<NeuralNode['type'], string> = {
  trigger: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/40',
  defensive: 'bg-blue-500/15 text-blue-300 border-blue-500/40',
  opportunity: 'bg-purple-500/15 text-purple-300 border-purple-500/40',
  attack: 'bg-primary/15 text-primary border-primary/40',
  movement: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  exit: 'bg-orange-500/15 text-orange-300 border-orange-500/40',
};

const STORAGE_KEY = 'gladius:conversations';
const MAX_SAVED = 30;

function loadConversations(userId: string): SavedConversation[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}:${userId}`);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
function saveConversations(userId: string, list: SavedConversation[]) {
  try {
    localStorage.setItem(
      `${STORAGE_KEY}:${userId}`,
      JSON.stringify(list.slice(0, MAX_SAVED)),
    );
  } catch { /* noop */ }
}

export default function AIFighterAssistant() {
  const { user, loading: authLoading } = useAuth();
  const { isPro, loading: subLoading } = useSubscription();
  const navigate = useNavigate();

  const [input, setInput] = useState('');
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [conversations, setConversations] = useState<SavedConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importable, setImportable] = useState<ImportableNote[]>([]);
  const [loadingImports, setLoadingImports] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const stopRequestedRef = useRef(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat, isThinking]);

  // Hydrate saved conversations
  useEffect(() => {
    if (user) setConversations(loadConversations(user.id));
  }, [user]);

  // Persist current chat as the active conversation
  useEffect(() => {
    if (!user || chat.length === 0 || isStreaming) return;
    const id = activeConvId ?? crypto.randomUUID();
    const title =
      chat.find((m) => m.role === 'user')?.content.slice(0, 60) ?? 'New chat';
    const next: SavedConversation = {
      id,
      title,
      updatedAt: Date.now(),
      messages: chat,
    };
    setConversations((prev) => {
      const without = prev.filter((c) => c.id !== id);
      const updated = [next, ...without].slice(0, MAX_SAVED);
      saveConversations(user.id, updated);
      return updated;
    });
    if (!activeConvId) setActiveConvId(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat, isStreaming, user]);

  if (authLoading || subLoading) {
    return (
      <div className="p-6 space-y-4 max-w-3xl mx-auto">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (!user) return null;
  if (!isPro) return <LockedScreen />;

  const handleStop = () => {
    stopRequestedRef.current = true;
    abortRef.current?.abort();
    setIsThinking(false);
    setIsStreaming(false);
    toast.message('Generation stopped');
  };

  const handleNewChat = () => {
    if (isStreaming) handleStop();
    setChat([]);
    setAnalysis(null);
    setActiveConvId(null);
    setInput('');
  };

  const handleLoadConversation = (c: SavedConversation) => {
    if (isStreaming) handleStop();
    setChat(c.messages);
    setActiveConvId(c.id);
    setAnalysis(null);
    setHistoryOpen(false);
  };

  const handleDeleteConversation = (id: string) => {
    if (!user) return;
    setConversations((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      saveConversations(user.id, updated);
      return updated;
    });
    if (activeConvId === id) handleNewChat();
  };

  const handleExportPDF = () => {
    if (!isPro) {
      toast.error('PDF export is available for Pro accounts only');
      return;
    }
    if (chat.length === 0) {
      toast.message('Nothing to export yet');
      return;
    }

    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 48;
      const maxWidth = pageWidth - margin * 2;
      let y = margin;

      const ensureSpace = (needed: number) => {
        if (y + needed > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
      };

      const writeLines = (
        text: string,
        opts: { size?: number; style?: 'normal' | 'bold' | 'italic'; color?: [number, number, number] } = {},
      ) => {
        const { size = 11, style = 'normal', color = [30, 30, 30] } = opts;
        doc.setFont('helvetica', style);
        doc.setFontSize(size);
        doc.setTextColor(color[0], color[1], color[2]);
        const lines = doc.splitTextToSize(text || '', maxWidth);
        const lineHeight = size * 1.35;
        for (const line of lines) {
          ensureSpace(lineHeight);
          doc.text(line, margin, y);
          y += lineHeight;
        }
      };

      // Header
      doc.setFillColor(177, 18, 38);
      doc.rect(0, 0, pageWidth, 64, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('Gladius — Conversation Export', margin, 38);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(new Date().toLocaleString(), margin, 54);
      y = 96;

      // Conversation
      writeLines('Conversation', { size: 14, style: 'bold' });
      y += 4;

      chat.forEach((m) => {
        const label = m.role === 'user' ? 'You' : 'Gladius';
        const color: [number, number, number] = m.role === 'user' ? [80, 80, 80] : [177, 18, 38];
        writeLines(label, { size: 11, style: 'bold', color });
        writeLines(m.content || '(empty)', { size: 11 });
        y += 8;
      });

      // Analysis
      if (analysis) {
        ensureSpace(40);
        y += 8;
        writeLines('Technical Analysis', { size: 14, style: 'bold' });
        y += 4;
        const fields: Array<[string, string | undefined]> = [
          ['Discipline', analysis.discipline],
          ['Tactic', analysis.tactic],
          ['Technique', analysis.technique],
          ['Movement 1', analysis.movement_1],
          ['Movement 2', analysis.movement_2],
          ['Movement 3', analysis.movement_3],
          ['Coach Explanation', analysis.coach_explanation],
          ['Advanced Variation', analysis.advanced_variation],
        ];
        for (const [k, v] of fields) {
          if (!v) continue;
          writeLines(k, { size: 11, style: 'bold', color: [177, 18, 38] });
          writeLines(v, { size: 11 });
          y += 4;
        }
        if (analysis.mistakes_to_avoid?.length) {
          writeLines('Mistakes to Avoid', { size: 11, style: 'bold', color: [177, 18, 38] });
          analysis.mistakes_to_avoid.forEach((m) => writeLines(`• ${m}`, { size: 11 }));
          y += 4;
        }
        if (analysis.neural_nodes?.length) {
          writeLines('Neural Pathway Nodes', { size: 11, style: 'bold', color: [177, 18, 38] });
          analysis.neural_nodes.forEach((n) =>
            writeLines(`${n.id}. [${n.type}] ${n.label}`, { size: 11 }),
          );
          y += 4;
        }
        if (analysis.neural_connections?.length) {
          writeLines('Neural Connections', { size: 11, style: 'bold', color: [177, 18, 38] });
          analysis.neural_connections.forEach((c) =>
            writeLines(`${c.from} → ${c.to}: ${c.rule}`, { size: 11 }),
          );
        }
      }

      // Footer page numbers
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(140, 140, 140);
        doc.text(
          `Gladius • Page ${i} of ${pageCount}`,
          pageWidth / 2,
          pageHeight - 20,
          { align: 'center' },
        );
      }

      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      doc.save(`gladius-chat-${stamp}.pdf`);
      toast.success('PDF exported');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to export PDF');
    }
  };

  const openImport = async () => {
    setImportOpen(true);
    if (!user) return;
    setLoadingImports(true);
    try {
      const { data, error } = await supabase
        .from('training_sessions')
        .select('id, title, date, discipline, notes')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(25);
      if (error) throw error;
      setImportable(
        (data ?? []).map((d) => ({
          id: d.id,
          title: d.title ?? 'Untitled session',
          date: d.date,
          discipline: d.discipline,
          notes: d.notes,
        })),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load notes');
    } finally {
      setLoadingImports(false);
    }
  };

  const handleImportNote = (n: ImportableNote) => {
    const header = `Training note — ${n.title}${n.discipline ? ` (${n.discipline})` : ''} — ${n.date}`;
    const body = n.notes?.trim() || '(no notes)';
    const text = input.trim()
      ? `${input.trim()}\n\n${header}\n${body}`
      : `${header}\n${body}`;
    setInput(text);
    setImportOpen(false);
    toast.success('Note imported into prompt');
  };

  const callAI = async (mode: 'chat' | 'analyse', userText: string) => {
    const newMessages: ChatMessage[] = [
      ...chat,
      { role: 'user', content: userText },
    ];
    setChat(newMessages);
    setIsThinking(true);
    stopRequestedRef.current = false;

    try {
      if (mode === 'analyse') {
        const { data, error } = await supabase.functions.invoke(
          'ai-fighter-assistant',
          { body: { messages: newMessages, mode } },
        );
        if (error) {
          const ctx = (error as any).context;
          let msg = error.message || 'AI request failed';
          try {
            const body = await ctx?.json?.();
            if (body?.error) msg = body.error;
          } catch { /* noop */ }
          throw new Error(msg);
        }
        if (data?.analysis) {
          setAnalysis(data.analysis as Analysis);
          setChat([
            ...newMessages,
            {
              role: 'assistant',
              content:
                '✅ Analysis complete — review the cards below. You can edit any field before saving.',
            },
          ]);
          toast.success('Note analysed');
        }
        return;
      }

      // Chat mode — SSE stream with server-side token cursor.
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-fighter-assistant`;
      const session = (await supabase.auth.getSession()).data.session;
      const token =
        session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      setChat([...newMessages, { role: 'assistant', content: '' }]);

      let acc = '';
      let lastTokenId = -1; // Server-side cursor; resume continues from here.
      let pendingFlush: number | null = null;

      const flushToUI = () => {
        pendingFlush = null;
        setChat((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role !== 'assistant') return prev;
          if (last.content === acc) return prev;
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: acc } : m,
          );
        });
      };
      const scheduleFlush = () => {
        if (pendingFlush != null) return;
        pendingFlush =
          typeof requestAnimationFrame !== 'undefined'
            ? requestAnimationFrame(flushToUI)
            : (setTimeout(flushToUI, 16) as unknown as number);
      };

      const IDLE_TIMEOUT_MS = 25_000;
      const MAX_RECONNECTS = 2;
      let reconnectsLeft = MAX_RECONNECTS;
      let streamCompleted = false;
      let firstByteSeen = false;

      const parseEventBlock = (block: string): string | null => {
        const dataLines: string[] = [];
        for (let raw of block.split('\n')) {
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (!raw || raw.startsWith(':')) continue;
          if (!raw.startsWith('data:')) continue;
          const v = raw.slice(5);
          dataLines.push(v.startsWith(' ') ? v.slice(1) : v);
        }
        return dataLines.length ? dataLines.join('\n') : null;
      };

      setIsStreaming(true);

      while (!streamCompleted && !stopRequestedRef.current) {
        const controller = new AbortController();
        abortRef.current = controller;
        let idleTimer: ReturnType<typeof setTimeout> | null = null;
        const armIdleTimer = () => {
          if (idleTimer) clearTimeout(idleTimer);
          idleTimer = setTimeout(() => controller.abort(), IDLE_TIMEOUT_MS);
        };

        try {
          const resp = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Accept: 'text/event-stream',
            },
            // Server-side cursor: send the *original* messages plus the
            // last token id we received. Server replays the upstream stream
            // and skips tokens we already have — no need to re-send acc.
            body: JSON.stringify({
              messages: newMessages,
              mode,
              lastTokenId,
            }),
            signal: controller.signal,
          });

          if (!resp.ok || !resp.body) {
            let msg = 'AI request failed';
            try {
              const j = await resp.json();
              if (j?.error) msg = j.error;
            } catch { /* noop */ }
            throw new Error(msg);
          }

          setIsThinking(false);

          const reader = resp.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          armIdleTimer();

          while (true) {
            const { value, done: rDone } = await reader.read();
            if (rDone) break;
            firstByteSeen = true;
            armIdleTimer();
            buffer += decoder.decode(value, { stream: true });

            let sepIdx: number;
            while (
              (sepIdx = (() => {
                const a = buffer.indexOf('\n\n');
                const b = buffer.indexOf('\r\n\r\n');
                if (a === -1) return b;
                if (b === -1) return a;
                return Math.min(a, b);
              })()) !== -1
            ) {
              const sepLen = buffer.startsWith('\r\n\r\n', sepIdx) ? 4 : 2;
              const block = buffer.slice(0, sepIdx);
              buffer = buffer.slice(sepIdx + sepLen);

              const payload = parseEventBlock(block);
              if (payload == null) continue;
              if (payload === '[DONE]') {
                streamCompleted = true;
                break;
              }
              try {
                const parsed = JSON.parse(payload);
                if (typeof parsed.tokenId === 'number') {
                  lastTokenId = parsed.tokenId;
                }
                const delta = parsed.choices?.[0]?.delta?.content as
                  | string
                  | undefined;
                if (delta) {
                  acc += delta;
                  scheduleFlush();
                }
                const finish = parsed.choices?.[0]?.finish_reason;
                if (finish && finish !== 'null') {
                  streamCompleted = true;
                  break;
                }
              } catch { /* malformed event — skip */ }
            }
            if (streamCompleted) break;
          }

          if (idleTimer) clearTimeout(idleTimer);
          streamCompleted = true;
        } catch (err) {
          if (idleTimer) clearTimeout(idleTimer);
          // User-initiated stop short-circuits all retries.
          if (stopRequestedRef.current) {
            streamCompleted = true;
            break;
          }
          const aborted = (err as any)?.name === 'AbortError';
          const networkish =
            aborted ||
            err instanceof TypeError ||
            /network|fetch|stream/i.test(
              err instanceof Error ? err.message : String(err),
            );
          if (networkish && reconnectsLeft > 0 && firstByteSeen) {
            reconnectsLeft -= 1;
            await new Promise((r) => setTimeout(r, 600));
            continue;
          }
          throw err;
        }
      }

      if (pendingFlush != null) {
        if (typeof cancelAnimationFrame !== 'undefined')
          cancelAnimationFrame(pendingFlush);
      }
      flushToUI();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong';
      toast.error(msg);
      setChat((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && last.content === '') {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: `⚠️ ${msg}` } : m,
          );
        }
        return [...prev, { role: 'assistant', content: `⚠️ ${msg}` }];
      });
    } finally {
      setIsThinking(false);
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || isThinking || isStreaming) return;
    setInput('');
    callAI('chat', text);
  };

  const handleAnalyse = () => {
    const text = input.trim();
    if (!text || isThinking || isStreaming) return;
    setInput('');
    callAI('analyse', text);
  };

  const updateAnalysis = <K extends keyof Analysis>(k: K, v: Analysis[K]) => {
    if (!analysis) return;
    setAnalysis({ ...analysis, [k]: v });
  };

  const saveNote = async (saveType: 'fighter_note' | 'session_log' | 'neural_pathway') => {
    if (!analysis || !user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('ai_fighter_notes').insert({
        user_id: user.id,
        original_input: chat.find((m) => m.role === 'user')?.content ?? '',
        discipline: analysis.discipline,
        tactic: analysis.tactic,
        technique: analysis.technique,
        movement_1: analysis.movement_1,
        movement_2: analysis.movement_2,
        movement_3: analysis.movement_3,
        neural_nodes: analysis.neural_nodes as any,
        neural_connections: analysis.neural_connections as any,
        coach_explanation: analysis.coach_explanation,
        mistakes_to_avoid: analysis.mistakes_to_avoid as any,
        advanced_variation: analysis.advanced_variation,
        save_type: saveType,
      });
      if (error) throw error;
      toast.success(
        saveType === 'fighter_note'
          ? 'Saved to Fighter Notes'
          : saveType === 'session_log'
            ? 'Added to Session Log'
            : 'Saved as Neural Pathway',
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-full bg-gradient-to-b from-background via-background to-primary/5">
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 pt-2">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-background to-primary/10 border border-primary/30 flex items-center justify-center shadow-lg shadow-primary/30 overflow-hidden">
            <img
              src={gladiusIcon}
              alt="Gladius AI"
              width={512}
              height={512}
              loading="lazy"
              className="h-9 w-9 object-contain"
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight">Gladius</h1>
            <p className="text-xs text-muted-foreground truncate">
              Your fighter AI support • Analyse notes, generate pathways
            </p>
          </div>
          <Badge variant="outline" className="ml-auto border-primary/40 text-primary">
            PRO
          </Badge>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleNewChat}>
            <Plus className="h-3.5 w-3.5" />
            New chat
          </Button>

          <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
            <SheetTrigger asChild>
              <Button size="sm" variant="outline">
                <History className="h-3.5 w-3.5" />
                Previous chats
                {conversations.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">
                    {conversations.length}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[88vw] sm:w-96">
              <SheetHeader>
                <SheetTitle>Previous chats</SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-100px)] mt-4 pr-2">
                {conversations.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    No saved chats yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {conversations.map((c) => (
                      <div
                        key={c.id}
                        className={cn(
                          'group flex items-start gap-2 rounded-md border p-2.5 hover:bg-accent transition',
                          activeConvId === c.id && 'border-primary/50 bg-primary/5',
                        )}
                      >
                        <button
                          className="flex-1 text-left min-w-0"
                          onClick={() => handleLoadConversation(c)}
                        >
                          <p className="text-sm font-medium truncate">{c.title}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {new Date(c.updatedAt).toLocaleString()} ·{' '}
                            {c.messages.length} msg
                          </p>
                        </button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100"
                          onClick={() => handleDeleteConversation(c.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </SheetContent>
          </Sheet>

          <Dialog open={importOpen} onOpenChange={(o) => (o ? openImport() : setImportOpen(false))}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <FileDown className="h-3.5 w-3.5" />
                Import note
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Import a session note</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh] pr-2">
                {loadingImports ? (
                  <div className="space-y-2 py-2">
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                  </div>
                ) : importable.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    No sessions found yet. Log a session first.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {importable.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => handleImportNote(n)}
                        className="w-full text-left rounded-md border p-3 hover:bg-accent hover:border-primary/40 transition"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium truncate">{n.title}</p>
                          <span className="text-[11px] text-muted-foreground shrink-0">
                            {n.date}
                          </span>
                        </div>
                        {n.discipline && (
                          <Badge variant="outline" className="mt-1 text-[10px]">
                            {n.discipline}
                          </Badge>
                        )}
                        {n.notes && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {n.notes}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </DialogContent>
          </Dialog>

          <Button
            size="sm"
            variant="outline"
            onClick={handleExportPDF}
            disabled={chat.length === 0 || !isPro}
            title={isPro ? 'Export conversation as PDF' : 'Pro accounts only'}
          >
            <FileText className="h-3.5 w-3.5" />
            Export PDF
            {!isPro && <Lock className="h-3 w-3 ml-1 opacity-70" />}
          </Button>
        </div>

        {/* Chat */}
        <Card className="border-primary/20 bg-card/60 backdrop-blur">
          <CardContent className="p-3 space-y-3">
            <div className="max-h-[40vh] min-h-[120px] overflow-y-auto space-y-3 pr-1">
              {chat.length === 0 && (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  <img
                    src={gladiusIcon}
                    alt="Gladius"
                    width={512}
                    height={512}
                    loading="lazy"
                    className="h-10 w-10 mx-auto mb-2 object-contain"
                  />
                  Hi, I'm <span className="text-primary font-semibold">Gladius</span> — your fighter AI support.
                  <br />
                  Drop a training note or ask me anything about combat sports.
                </div>
              )}
              {chat.map((m, i) => (
                <ChatBubble key={i} role={m.role} content={m.content} />
              ))}
              {isThinking && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Thinking…
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <Separator />

            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Write your training note or ask a question…"
              className="min-h-[88px] resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />

            <div className="flex flex-wrap gap-2">
              {isStreaming || isThinking ? (
                <Button onClick={handleStop} size="sm" variant="destructive">
                  <Square className="h-3.5 w-3.5 fill-current" />
                  Stop
                </Button>
              ) : (
                <>
                  <Button onClick={handleSend} disabled={!input.trim()} size="sm">
                    <Send className="h-3.5 w-3.5" />
                    Ask
                  </Button>
                  <Button
                    onClick={handleAnalyse}
                    disabled={!input.trim()}
                    size="sm"
                    variant="secondary"
                  >
                    <Brain className="h-3.5 w-3.5" />
                    Analyse
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Analysis cards */}
        {analysis && (
          <>
            <div className="flex items-center justify-between pt-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                AI Analysis
              </h2>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditing((e) => !e)}
              >
                <Edit3 className="h-3.5 w-3.5" />
                {editing ? 'Done editing' : 'Edit'}
              </Button>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-primary" /> Core Training
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Field label="Discipline" value={analysis.discipline} editing={editing} onChange={(v) => updateAnalysis('discipline', v)} />
                <Field label="Tactic" value={analysis.tactic} editing={editing} onChange={(v) => updateAnalysis('tactic', v)} />
                <Field label="Technique" value={analysis.technique} editing={editing} onChange={(v) => updateAnalysis('technique', v)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Movement Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Field label="1. How did I start?" value={analysis.movement_1} editing={editing} multiline onChange={(v) => updateAnalysis('movement_1', v)} />
                <Field label="2. Opponent reaction" value={analysis.movement_2} editing={editing} multiline onChange={(v) => updateAnalysis('movement_2', v)} />
                <Field label="3. What did I capitalize with?" value={analysis.movement_3} editing={editing} multiline onChange={(v) => updateAnalysis('movement_3', v)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Network className="h-4 w-4 text-primary" /> Neural Pathway Logic
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {analysis.neural_nodes.map((n) => (
                    <span
                      key={n.id}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium',
                        NODE_COLORS[n.type],
                      )}
                    >
                      <span className="opacity-60 uppercase text-[9px] tracking-wider">{n.type}</span>
                      {n.label}
                    </span>
                  ))}
                </div>
                {analysis.neural_connections.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Connections</Label>
                    <ul className="text-xs space-y-1 text-muted-foreground">
                      {analysis.neural_connections.map((c, i) => {
                        const from = analysis.neural_nodes.find((n) => n.id === c.from);
                        const to = analysis.neural_nodes.find((n) => n.id === c.to);
                        return (
                          <li key={i} className="flex gap-2">
                            <span className="text-foreground">{from?.label ?? c.from} → {to?.label ?? c.to}</span>
                            <span className="opacity-60">· {c.rule}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Coach Explanation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Field label="Why this works / when to use" value={analysis.coach_explanation} editing={editing} multiline onChange={(v) => updateAnalysis('coach_explanation', v)} />
                <div className="space-y-1.5">
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Common mistakes
                  </Label>
                  {editing ? (
                    <Textarea
                      value={analysis.mistakes_to_avoid.join('\n')}
                      onChange={(e) => updateAnalysis('mistakes_to_avoid', e.target.value.split('\n').filter(Boolean))}
                      className="min-h-[72px] text-sm"
                    />
                  ) : (
                    <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                      {analysis.mistakes_to_avoid.map((m, i) => <li key={i}>{m}</li>)}
                    </ul>
                  )}
                </div>
                <Field label="Advanced variation" value={analysis.advanced_variation} editing={editing} multiline onChange={(v) => updateAnalysis('advanced_variation', v)} />
              </CardContent>
            </Card>

            <Card className="border-primary/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Save className="h-4 w-4 text-primary" /> Save Options
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button variant="outline" size="sm" disabled={saving} onClick={() => saveNote('fighter_note')}>
                  <Save className="h-3.5 w-3.5" />
                  Save to Fighter Notes
                </Button>
                <Button variant="outline" size="sm" disabled={saving} onClick={() => saveNote('session_log')}>
                  <ListPlus className="h-3.5 w-3.5" />
                  Add to Session Log
                </Button>
                <Button variant="outline" size="sm" disabled={saving} onClick={() => saveNote('neural_pathway')}>
                  <Network className="h-3.5 w-3.5" />
                  Create Neural Pathway
                </Button>
              </CardContent>
            </Card>
          </>
        )}
        <div className="h-4" />
      </div>
    </div>
  );
}

function ChatBubble({ role, content }: { role: 'user' | 'assistant'; content: string }) {
  const isUser = role === 'user';
  return (
    <div className={cn('flex gap-2', isUser && 'flex-row-reverse')}>
      <div
        className={cn(
          'h-7 w-7 rounded-full flex items-center justify-center shrink-0 overflow-hidden',
          isUser
            ? 'bg-primary/20 text-primary'
            : 'bg-background border border-primary/30',
        )}
      >
        {isUser ? (
          <UserIcon className="h-3.5 w-3.5" />
        ) : (
          <img
            src={gladiusIcon}
            alt="Gladius"
            width={512}
            height={512}
            loading="lazy"
            className="h-6 w-6 object-contain"
          />
        )}
      </div>
      <div
        className={cn(
          'rounded-lg px-3 py-2 text-sm max-w-[85%] whitespace-pre-wrap',
          isUser
            ? 'bg-primary/10 text-foreground border border-primary/20'
            : 'bg-muted/50 text-foreground border border-border/50',
        )}
      >
        {isUser ? (
          content
        ) : (
          <div className="prose prose-sm prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  editing,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      {editing ? (
        multiline ? (
          <Textarea value={value} onChange={(e) => onChange(e.target.value)} className="min-h-[64px] text-sm" />
        ) : (
          <Input value={value} onChange={(e) => onChange(e.target.value)} className="text-sm" />
        )
      ) : (
        <p className="text-sm text-foreground">{value || '—'}</p>
      )}
    </div>
  );
}

function LockedScreen() {
  const navigate = useNavigate();
  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <Card className="max-w-md w-full border-primary/30 bg-card/60 backdrop-blur">
        <CardContent className="p-8 text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary/30 mx-auto flex items-center justify-center shadow-xl shadow-primary/30">
            <Lock className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <Badge variant="outline" className="border-primary/40 text-primary mb-3">
              PRO FEATURE
            </Badge>
            <h2 className="text-xl font-bold mb-2">Upgrade to Pro</h2>
            <p className="text-sm text-muted-foreground">
              The AI Fighter Assistant is a Pro feature. Upgrade to Pro to analyse
              training notes, generate neural pathway maps, and save AI-created
              fighter notes.
            </p>
          </div>
          <Button className="w-full" onClick={() => navigate('/profile')}>
            <Sparkles className="h-4 w-4" />
            Upgrade to Pro
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
