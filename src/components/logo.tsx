import { PlaySquare } from 'lucide-react';

export function Logo() {
  return (
    <div className="flex items-center gap-2" aria-label="ViewSync logo">
      <PlaySquare className="h-8 w-8 text-primary" />
      <h1 className="text-2xl font-bold text-primary">ViewSync</h1>
    </div>
  );
}
