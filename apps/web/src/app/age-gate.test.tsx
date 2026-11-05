import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { pl } from '../i18n/pl.js';
import { AgeGate } from './age-gate.js';

const renderGate = () =>
  render(
    <AgeGate>
      <p>app content</p>
    </AgeGate>,
  );

describe('AgeGate', () => {
  it('hides the app on first launch', () => {
    renderGate();

    expect(screen.getByRole('heading', { level: 1, name: pl.ageGate.title })).toBeVisible();
    expect(screen.queryByText('app content')).not.toBeInTheDocument();
  });

  it('shows the app after confirming', async () => {
    renderGate();

    await userEvent.click(screen.getByRole('button', { name: pl.ageGate.confirm }));

    expect(screen.getByText('app content')).toBeVisible();
  });

  it('remembers the confirmation on the next launch', async () => {
    const { unmount } = renderGate();
    await userEvent.click(screen.getByRole('button', { name: pl.ageGate.confirm }));
    unmount();

    renderGate();

    expect(screen.getByText('app content')).toBeVisible();
  });

  it('keeps the app hidden after declining and does not remember the answer', async () => {
    const { unmount } = renderGate();

    await userEvent.click(screen.getByRole('button', { name: pl.ageGate.decline }));

    expect(screen.getByRole('heading', { level: 1, name: pl.ageGate.declined })).toBeVisible();
    expect(screen.queryByText('app content')).not.toBeInTheDocument();
    unmount();

    renderGate();
    expect(screen.getByRole('button', { name: pl.ageGate.confirm })).toBeVisible();
  });

  it('still works when localStorage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    renderGate();

    await userEvent.click(screen.getByRole('button', { name: pl.ageGate.confirm }));

    expect(screen.getByText('app content')).toBeVisible();
  });
});
