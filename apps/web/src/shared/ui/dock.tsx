import type { ReactNode } from 'react';

/**
 * Keeps the main actions at the bottom of the screen, also when the content above scrolls. The
 * negative margin cancels the bottom padding of the screen, so the dock reaches the edge.
 */
export function Dock({ children }: { readonly children: ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-6 mt-auto -mb-[max(1.5rem,env(safe-area-inset-bottom))] flex flex-col gap-3 bg-dock px-6 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      {children}
    </div>
  );
}
