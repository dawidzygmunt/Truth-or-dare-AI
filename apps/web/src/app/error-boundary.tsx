import { Component, type ReactNode } from 'react';
import { pl } from '../i18n/pl.js';
import { Button } from '../shared/ui/button.js';
import { Screen } from '../shared/ui/screen.js';

interface ErrorBoundaryProps {
  readonly children: ReactNode;
  /** Clears whatever caused the crash, so rendering again does not hit it a second time. */
  readonly onRestart: () => void;
}

interface ErrorBoundaryState {
  readonly failed: boolean;
}

/** Last line of defence for render errors: a way out instead of a blank page. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  override render() {
    if (!this.state.failed) {
      return this.props.children;
    }
    return (
      <Screen title={pl.fatalError.title}>
        <p className="text-neutral-400">{pl.fatalError.description}</p>
        <Button
          data-testid="fatal-error-restart"
          onClick={() => {
            this.props.onRestart();
            this.setState({ failed: false });
          }}
        >
          {pl.fatalError.restart}
        </Button>
      </Screen>
    );
  }
}
