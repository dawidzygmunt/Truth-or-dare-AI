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
 * Asks before a destructive action. The text above the buttons pushes them away from whatever
 * opened the panel, and cancel comes first and takes focus, so a stray tap only cancels.
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
    <section
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className="flex flex-col gap-3 rounded-xl border border-neutral-600 p-4"
    >
      <h2 id={titleId} className="text-xl font-semibold">
        {title}
      </h2>
      <p id={descriptionId} className="text-neutral-400">
        {description}
      </p>
      <Button ref={cancelRef} data-testid={cancelTestId} onClick={onCancel}>
        {cancelLabel}
      </Button>
      <Button data-testid={confirmTestId} variant="secondary" onClick={onConfirm}>
        {confirmLabel}
      </Button>
    </section>
  );
}
