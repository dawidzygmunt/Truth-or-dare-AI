import { Link } from 'react-router';
import { pl } from '../../i18n/pl.js';
import { textActionClasses } from '../../shared/ui/button.js';
import { Screen } from '../../shared/ui/screen.js';

export function InstallScreen() {
  return (
    <Screen title={pl.install.title}>
      <ol data-testid="install-steps" className="flex list-decimal flex-col gap-3 pl-6 text-lg">
        {pl.install.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <Link data-testid="back-link" className={textActionClasses} to="/">
        {pl.common.back}
      </Link>
    </Screen>
  );
}
