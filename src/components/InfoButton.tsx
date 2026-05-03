import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { sessionInfoTooltips } from '@/config/sessionInfoTooltips';
import { cn } from '@/lib/utils';

interface InfoButtonProps {
  boxId: string;
  className?: string;
}

export function InfoButton({ boxId, className }: InfoButtonProps) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const entry = sessionInfoTooltips[boxId];

  if (!entry) return null;

  return (
    <>
      <button
        type="button"
        aria-label="More information"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
          setExpanded(false);
        }}
        className={cn(
          'absolute top-2 right-2 z-10 h-5 w-5 rounded-full border border-muted-foreground/50 text-muted-foreground text-[11px] leading-none flex items-center justify-center font-serif italic transition-colors hover:border-[var(--fj-red)] hover:text-[var(--fj-red)]',
          className,
        )}
      >
        i
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="bg-[var(--fj-red)] text-white border-0 rounded-xl mx-4 max-w-md p-6 [&>button]:text-white [&>button]:opacity-100 [&>button:hover]:opacity-80"
        >
          <DialogTitle className="sr-only">Information</DialogTitle>
          <div className="space-y-3">
            <p className="text-base font-medium leading-snug pr-6">{entry.shortAnswer}</p>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-sm underline underline-offset-2 text-white/90 hover:text-white"
            >
              {expanded ? 'Show less' : 'Read more'}
            </button>
            {expanded && (
              <p className="text-sm leading-relaxed text-white/95 whitespace-pre-wrap">
                {entry.detailedExplanation}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
