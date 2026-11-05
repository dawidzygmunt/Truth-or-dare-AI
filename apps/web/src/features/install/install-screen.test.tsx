import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { pl } from '../../i18n/pl.js';
import { renderApp } from '../../test/render-app.js';

describe('InstallScreen', () => {
  it('lists the iOS installation steps in order', () => {
    renderApp({ route: '/install' });

    expect(screen.getByRole('heading', { level: 1, name: pl.install.title })).toBeVisible();
    const steps = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(steps.map((step) => step.textContent)).toEqual(pl.install.steps);
  });

  it('links back to the catalog', () => {
    renderApp({ route: '/install' });

    expect(screen.getByRole('link', { name: pl.common.back })).toHaveAttribute('href', '/');
  });
});
