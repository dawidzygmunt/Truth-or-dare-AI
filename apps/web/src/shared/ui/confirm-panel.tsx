import { useEffect, useId, useRef } from 'react';
import { Button } from './button.js';

interface ConfirmPanelProps {
  readonly title: string;
  readonly description: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly confirmTestId: string;
  readonly cancelTestId: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

/**
 * Asks before a destructive action. It sits in the middle of the screen, away from the actions at
 * the top and bottom edges that open it, and the backdrop takes a second tap. Cancel comes first
 * and takes focus, so a stray tap only cancels.
 */
export function ConfirmPanel({
  title,
  description,
  confirmLabel,
  cancelLabel,
  confirmTestId,
  cancelTestId,
  onConfirm,
  onCancel,
}: ConfirmPanelProps) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-10 grid place-items-center bg-scrim p-6">
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="flex w-full max-w-sm flex-col gap-3 rounded-card border border-line-strong bg-panel p-6 text-center"
      >
        <h2 id={titleId} className="font-display text-card font-bold tracking-display">
          {title}
        </h2>
        <p id={descriptionId} className="mb-3 text-sm text-ink-muted">
          {description}
        </p>
        <Button ref={cancelRef} data-testid={cancelTestId} onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button data-testid={confirmTestId} variant="secondary" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </section>
    </div>
  );
}
