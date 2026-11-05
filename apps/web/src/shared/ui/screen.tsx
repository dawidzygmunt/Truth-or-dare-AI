import type { ReactNode } from 'react';

interface ScreenProps {
  readonly title: string;
  readonly children?: ReactNode;
  readonly titleTestId?: string;
}

/** Page frame: every screen has one `main` and one `h1`. */
export function Screen({ title, children, titleTestId }: ScreenProps) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 p-6">
      <h1 className="text-3xl font-bold" data-testid={titleTestId}>
        {title}
      </h1>
      {children}
    </main>
  );
}
