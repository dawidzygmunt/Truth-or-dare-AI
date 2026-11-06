import type { ComponentProps } from 'react';

const base =
  'block min-h-12 w-full min-w-0 rounded-button px-4 py-3.5 text-center font-display text-base font-bold disabled:opacity-50';

export const buttonClasses = {
  primary: `${base} bg-cta text-ink shadow-glow-cta disabled:shadow-none`,
  secondary: `${base} border border-line-strong bg-glass-strong text-ink`,
  success: `${base} bg-done text-on-success`,
} as const;

/** Text action. Stays a full tap target although it looks like plain text. */
export const textActionClasses =
  'flex min-h-12 items-center justify-center text-sm font-semibold text-ink-muted underline';

/** Back or exit control of the top row. */
export const topActionClasses =
  'flex min-h-12 min-w-12 items-center gap-2.5 text-sm font-semibold text-ink-soft';

interface ButtonProps extends ComponentProps<'button'> {
  readonly variant?: keyof typeof buttonClasses;
}

export function Button({ variant = 'primary', type = 'button', ...props }: ButtonProps) {
  return <button {...props} type={type} className={buttonClasses[variant]} />;
}
