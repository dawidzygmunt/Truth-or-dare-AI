import type { ReactNode, Ref } from 'react';

interface ScreenProps {
  readonly title: string;
  readonly children?: ReactNode;
  readonly titleTestId?: string;
  /** Makes the title focusable from code, for screens that move focus to it. */
  readonly titleRef?: Ref<HTMLHeadingElement>;
  /** Secondary action beside the title, far from what the screen's content puts under a thumb. */
  readonly action?: ReactNode;
}

/** Page frame: every screen has one `main` and one `h1`. */
export function Screen({ title, children, titleTestId, titleRef, action }: ScreenProps) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 p-6">
      <header className="flex items-start justify-between gap-4">
        <h1
          ref={titleRef}
          tabIndex={titleRef === undefined ? undefined : -1}
          className="min-w-0 text-3xl font-bold break-words outline-none"
          data-testid={titleTestId}
        >
          {title}
        </h1>
        {action}
      </header>
      {children}
    </main>
  );
}
