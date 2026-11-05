import type { ComponentProps } from 'react';

const base = 'min-h-12 rounded-xl px-4 py-3 text-lg font-semibold disabled:opacity-50';

export const buttonClasses = {
  primary: `${base} block w-full bg-neutral-50 text-center text-neutral-950`,
  secondary: `${base} block w-full border border-neutral-600 text-center text-neutral-50`,
} as const;

/** Text action. Stays a full tap target although it looks like plain text. */
export const textActionClasses = 'flex min-h-12 items-center justify-center underline';

interface ButtonProps extends ComponentProps<'button'> {
  readonly variant?: keyof typeof buttonClasses;
}

export function Button({ variant = 'primary', type = 'button', ...props }: ButtonProps) {
  return <button {...props} type={type} className={buttonClasses[variant]} />;
}
