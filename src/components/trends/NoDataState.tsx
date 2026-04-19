import { Inbox } from 'lucide-react';

export function NoDataState({ message = 'No records for this period' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Inbox className="h-8 w-8 text-muted-foreground/50 mb-2" />
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}
