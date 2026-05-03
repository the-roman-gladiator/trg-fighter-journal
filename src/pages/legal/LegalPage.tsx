import { ReactNode } from "react";

export function LegalPage({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-display uppercase mb-6">{title}</h1>
      <div className="prose prose-invert text-muted-foreground space-y-4">
        {children ?? <p>Content coming soon.</p>}
      </div>
    </div>
  );
}
