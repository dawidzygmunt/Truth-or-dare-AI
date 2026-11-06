import { pl } from '../../i18n/pl.js';
import { BackLink } from '../../shared/ui/back-link.js';
import { Screen } from '../../shared/ui/screen.js';

export function InstallScreen() {
  return (
    <Screen title={pl.install.title} topBar={<BackLink />} centered>
      <ol
        data-testid="install-steps"
        className="flex flex-col gap-2.5 text-left [counter-reset:step]"
      >
        {pl.install.steps.map((step) => (
          <li
            key={step}
            className="flex items-center gap-3 rounded-field bg-glass px-3 py-2.5 font-semibold [counter-increment:step] before:grid before:size-9 before:shrink-0 before:place-items-center before:rounded-full before:bg-cyan before:font-display before:text-sm before:font-bold before:text-on-cyan before:content-[counter(step)]"
          >
            {step}
          </li>
        ))}
      </ol>
    </Screen>
  );
}
