import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Screen } from './screen.js';

describe('Screen', () => {
  // jsdom has no layout and no insets, so the class is all that can be checked here.
  it.each(['top', 'right', 'bottom', 'left'])('keeps content out of the %s safe area', (side) => {
    render(<Screen title="Tytuł" />);

    expect(screen.getByRole('main').className).toContain(`env(safe-area-inset-${side})`);
  });
});
