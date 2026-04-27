import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LifeBuoy, FileText, BookOpen, Send, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { logEvent } from '@/hooks/useAnalytics';

const TERMS_URL = 'https://theromangladiators.com.au/trgapptncstrg#trgapptcs';
const TUTORIAL_URL = 'https://theromangladiators.com.au/trgapptncstrg#trg-app-tutorial';

export function SupportSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [category, setCategory] = useState('general');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!user) return;
    if (!subject.trim() || !message.trim()) {
      toast({ title: 'Subject and message required', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('support_tickets').insert({
      user_id: user.id, category, subject: subject.trim(), message: message.trim(),
    });
    setSubmitting(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      logEvent('support_ticket_submitted', { category });
      toast({ title: 'Ticket submitted', description: 'We\'ll review it shortly.' });
      setSubject(''); setMessage(''); setCategory('general');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <LifeBuoy className="h-4 w-4 text-primary" /> Support
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <a href={TERMS_URL} target="_blank" rel="noopener noreferrer" className="block">
          <Button type="button" variant="outline" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> App Terms & Conditions
            </span>
            <ExternalLink className="h-3.5 w-3.5 opacity-60" />
          </Button>
        </a>

        <a href={TUTORIAL_URL} target="_blank" rel="noopener noreferrer" className="block">
          <Button type="button" variant="outline" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> Tutorial
            </span>
            <ExternalLink className="h-3.5 w-3.5 opacity-60" />
          </Button>
        </a>

        <div className="pt-2 border-t border-border/50 space-y-3">
          <Label className="font-semibold">Open a Support Ticket</Label>
          <div>
            <Label className="text-xs text-muted-foreground">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bug">Bug</SelectItem>
                <SelectItem value="improvement">Improvement</SelectItem>
                <SelectItem value="general">General Support</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Subject</Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Brief summary" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Message</Label>
            <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Describe the issue or idea..." rows={4} className="mt-1" />
          </div>
          <Button type="button" onClick={submit} disabled={submitting} className="w-full">
            <Send className="h-3.5 w-3.5 mr-1.5" />
            {submitting ? 'Sending...' : 'Submit Ticket'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
