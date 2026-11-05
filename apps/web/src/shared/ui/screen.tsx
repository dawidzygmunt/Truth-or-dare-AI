import type { ReactNode } from 'react';

type ScreenTone = 'default' | 'game';

interface ScreenFrameProps {
  readonly children: ReactNode;
  readonly tone?: ScreenTone;
}

const safeAreaPadding = [
  'pt-[max(1.5rem,env(safe-area-inset-top))]',
  'pr-[max(1.5rem,env(safe-area-inset-right))]',
  'pb-[max(1.5rem,env(safe-area-inset-bottom))]',
  'pl-[max(1.5rem,env(safe-area-inset-left))]',
].join(' ');

const frameClasses = `relative mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 ${safeAreaPadding}`;

const backdropClasses: Readonly<Record<ScreenTone, string>> = {
  default: 'bg-screen',
  game: 'bg-screen-game',
};

const blobClasses: Readonly<Record<ScreenTone, string>> = {
  default: '-top-15 -right-15 bg-blob-violet',
  game: '-top-10 left-1/2 -translate-x-1/2 bg-blob-pink',
};

/** Page background and the one `main`. Screens that build their own heading start here. */
export function ScreenFrame({ children, tone = 'default' }: ScreenFrameProps) {
  return (
    <div className={`relative min-h-dvh overflow-x-clip ${backdropClasses[tone]}`}>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute size-60 rounded-full ${blobClasses[tone]}`}
      />
      <main className={frameClasses}>{children}</main>
    </div>
  );
}

interface ScreenProps {
  readonly title: string;
  readonly children?: ReactNode;
  /** Small line above the title. */
  readonly overline?: ReactNode;
  readonly subtitle?: string;
  /** Back control, above everything else. */
  readonly topBar?: ReactNode;
  /** For short states with nothing to scroll: age gate, errors, instructions. */
  readonly centered?: boolean;
}

/** Page frame: every screen has one `main` and one `h1`. */
export function Screen({ title, children, overline, subtitle, topBar, centered }: ScreenProps) {
  return (
    <ScreenFrame>
      {topBar}
      <div className={centered === true ? 'my-auto flex flex-col gap-6 text-center' : 'contents'}>
        <header className="flex flex-col gap-1.5">
          {overline}
          <h1 className="font-display text-title font-bold tracking-display wrap-anywhere">
            {title}
          </h1>
          {subtitle !== undefined && <p className="text-sm text-ink-muted">{subtitle}</p>}
        </header>
        {children}
      </div>
    </ScreenFrame>
  );
}
