import { useState, type ReactNode } from 'react';
import { pl } from '../i18n/pl.js';
import { isAgeConfirmed, rememberAgeConfirmed } from '../shared/storage/age-gate-storage.js';
import { Button } from '../shared/ui/button.js';
import { Screen } from '../shared/ui/screen.js';

type GateStatus = 'unknown' | 'confirmed' | 'declined';

export function AgeGate({ children }: { readonly children: ReactNode }) {
  const [status, setStatus] = useState<GateStatus>(() =>
    isAgeConfirmed() ? 'confirmed' : 'unknown',
  );

  if (status === 'confirmed') {
    return children;
  }
  if (status === 'declined') {
    return <Screen title={pl.ageGate.declined} />;
  }
  return (
    <Screen title={pl.ageGate.title}>
      <p className="text-neutral-400">{pl.ageGate.description}</p>
      <Button
        data-testid="age-gate-confirm"
        onClick={() => {
          rememberAgeConfirmed();
          setStatus('confirmed');
        }}
      >
        {pl.ageGate.confirm}
      </Button>
      <Button
        data-testid="age-gate-decline"
        variant="secondary"
        onClick={() => {
          setStatus('declined');
        }}
      >
        {pl.ageGate.decline}
      </Button>
    </Screen>
  );
}
