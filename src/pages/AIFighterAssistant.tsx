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
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

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

const NODE_COLORS: Record<NeuralNode['type'], string> = {
  trigger: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/40',
  defensive: 'bg-blue-500/15 text-blue-300 border-blue-500/40',
  opportunity: 'bg-purple-500/15 text-purple-300 border-purple-500/40',
  attack: 'bg-primary/15 text-primary border-primary/40',
  movement: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  exit: 'bg-orange-500/15 text-orange-300 border-orange-500/40',
};

export default function AIFighterAssistant() {
  const { user, loading: authLoading } = useAuth();
  const { isPro, loading: subLoading } = useSubscription();
  const navigate = useNavigate();

  const [input, setInput] = useState('');
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat, isThinking]);

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

  const callAI = async (mode: 'chat' | 'analyse', userText: string) => {
    const newMessages: ChatMessage[] = [
      ...chat,
      { role: 'user', content: userText },
    ];
    setChat(newMessages);
    setIsThinking(true);

    try {
      if (mode === 'analyse') {
        // Analyse uses tool-calling — keep non-streaming JSON path.
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

      // Chat mode — stream SSE token-by-token so words appear as they arrive.
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-fighter-assistant`;
      const session = (await supabase.auth.getSession()).data.session;
      const token =
        session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ messages: newMessages, mode }),
      });

      if (!resp.ok || !resp.body) {
        let msg = 'AI request failed';
        try {
          const j = await resp.json();
          if (j?.error) msg = j.error;
        } catch { /* noop */ }
        throw new Error(msg);
      }

      // Insert empty assistant bubble we'll fill as tokens arrive.
      setChat([...newMessages, { role: 'assistant', content: '' }]);
      // Hide the "Thinking…" row as soon as the stream opens.
      setIsThinking(false);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let acc = '';
      let done = false;

      while (!done) {
        const { value, done: rDone } = await reader.read();
        if (rDone) break;
        buffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line || line.startsWith(':')) continue;
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') {
            done = true;
            break;
          }
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content as
              | string
              | undefined;
            if (delta) {
              acc += delta;
              setChat((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role !== 'assistant') return prev;
                return prev.map((m, i) =>
                  i === prev.length - 1 ? { ...m, content: acc } : m,
                );
              });
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong';
      toast.error(msg);
      setChat((prev) => {
        const last = prev[prev.length - 1];
        // If we already inserted an empty assistant bubble, replace it.
        if (last?.role === 'assistant' && last.content === '') {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: `⚠️ ${msg}` } : m,
          );
        }
        return [...prev, { role: 'assistant', content: `⚠️ ${msg}` }];
      });
    } finally {
      setIsThinking(false);
    }
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || isThinking) return;
    setInput('');
    callAI('chat', text);
  };

  const handleAnalyse = () => {
    const text = input.trim();
    if (!text || isThinking) return;
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
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center shadow-lg shadow-primary/30">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Gladius</h1>
            <p className="text-xs text-muted-foreground">
              Your fighter AI support • Analyse notes, generate pathways
            </p>
          </div>
          <Badge variant="outline" className="ml-auto border-primary/40 text-primary">
            PRO
          </Badge>
        </div>

        {/* Chat */}
        <Card className="border-primary/20 bg-card/60 backdrop-blur">
          <CardContent className="p-3 space-y-3">
            <div className="max-h-[40vh] min-h-[120px] overflow-y-auto space-y-3 pr-1">
              {chat.length === 0 && (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  <Bot className="h-8 w-8 mx-auto mb-2 text-primary/60" />
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
              <Button onClick={handleSend} disabled={!input.trim() || isThinking} size="sm">
                <Send className="h-3.5 w-3.5" />
                Ask
              </Button>
              <Button
                onClick={handleAnalyse}
                disabled={!input.trim() || isThinking}
                size="sm"
                variant="secondary"
              >
                <Brain className="h-3.5 w-3.5" />
                Analyse
              </Button>
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

            {/* Card 1: Core Training */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-primary" /> Core Training
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Field
                  label="Discipline"
                  value={analysis.discipline}
                  editing={editing}
                  onChange={(v) => updateAnalysis('discipline', v)}
                />
                <Field
                  label="Tactic"
                  value={analysis.tactic}
                  editing={editing}
                  onChange={(v) => updateAnalysis('tactic', v)}
                />
                <Field
                  label="Technique"
                  value={analysis.technique}
                  editing={editing}
                  onChange={(v) => updateAnalysis('technique', v)}
                />
              </CardContent>
            </Card>

            {/* Card 2: Movement Breakdown */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Movement Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Field
                  label="1. How did I start?"
                  value={analysis.movement_1}
                  editing={editing}
                  multiline
                  onChange={(v) => updateAnalysis('movement_1', v)}
                />
                <Field
                  label="2. Opponent reaction"
                  value={analysis.movement_2}
                  editing={editing}
                  multiline
                  onChange={(v) => updateAnalysis('movement_2', v)}
                />
                <Field
                  label="3. What did I capitalize with?"
                  value={analysis.movement_3}
                  editing={editing}
                  multiline
                  onChange={(v) => updateAnalysis('movement_3', v)}
                />
              </CardContent>
            </Card>

            {/* Card 3: Neural Pathway Logic */}
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
                      <span className="opacity-60 uppercase text-[9px] tracking-wider">
                        {n.type}
                      </span>
                      {n.label}
                    </span>
                  ))}
                </div>
                {analysis.neural_connections.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Connections
                    </Label>
                    <ul className="text-xs space-y-1 text-muted-foreground">
                      {analysis.neural_connections.map((c, i) => {
                        const from = analysis.neural_nodes.find((n) => n.id === c.from);
                        const to = analysis.neural_nodes.find((n) => n.id === c.to);
                        return (
                          <li key={i} className="flex gap-2">
                            <span className="text-foreground">
                              {from?.label ?? c.from} → {to?.label ?? c.to}
                            </span>
                            <span className="opacity-60">· {c.rule}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card 4: Coach Explanation */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Coach Explanation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Field
                  label="Why this works / when to use"
                  value={analysis.coach_explanation}
                  editing={editing}
                  multiline
                  onChange={(v) => updateAnalysis('coach_explanation', v)}
                />
                <div className="space-y-1.5">
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Common mistakes
                  </Label>
                  {editing ? (
                    <Textarea
                      value={analysis.mistakes_to_avoid.join('\n')}
                      onChange={(e) =>
                        updateAnalysis(
                          'mistakes_to_avoid',
                          e.target.value.split('\n').filter(Boolean),
                        )
                      }
                      className="min-h-[72px] text-sm"
                    />
                  ) : (
                    <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                      {analysis.mistakes_to_avoid.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <Field
                  label="Advanced variation"
                  value={analysis.advanced_variation}
                  editing={editing}
                  multiline
                  onChange={(v) => updateAnalysis('advanced_variation', v)}
                />
              </CardContent>
            </Card>

            {/* Card 5: Save Options */}
            <Card className="border-primary/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Save className="h-4 w-4 text-primary" /> Save Options
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={saving}
                  onClick={() => saveNote('fighter_note')}
                >
                  <Save className="h-3.5 w-3.5" />
                  Save to Fighter Notes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={saving}
                  onClick={() => saveNote('session_log')}
                >
                  <ListPlus className="h-3.5 w-3.5" />
                  Add to Session Log
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={saving}
                  onClick={() => saveNote('neural_pathway')}
                >
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
          'h-7 w-7 rounded-full flex items-center justify-center shrink-0',
          isUser ? 'bg-primary/20 text-primary' : 'bg-secondary text-secondary-foreground',
        )}
      >
        {isUser ? <UserIcon className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
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
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {editing ? (
        multiline ? (
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="min-h-[64px] text-sm"
          />
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
