import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Avatar, avatarTone } from './avatar.js';

describe('avatarTone', () => {
  it('goes through the four tones in the design order, then starts over', () => {
    expect([0, 1, 2, 3, 4, 5].map(avatarTone)).toEqual([
      'pink',
      'cyan',
      'violet',
      'orange',
      'pink',
      'cyan',
    ]);
  });
});

describe('Avatar', () => {
  const avatar = () => screen.getByTestId('player-avatar');

  it('shows the capitalised first letter of the name', () => {
    render(<Avatar name=" ola" index={0} />);

    expect(avatar()).toHaveTextContent(/^O$/);
  });

  it('keeps a character outside the basic plane whole', () => {
    render(<Avatar name="😀 Ola" index={0} />);

    expect(avatar()).toHaveTextContent(/^😀$/u);
  });

  it('takes its tone from the index', () => {
    render(<Avatar name="Ola" index={6} />);

    expect(avatar()).toHaveAttribute('data-tone', 'violet');
  });

  it('is decoration: the name is always written next to it', () => {
    render(<Avatar name="Ola" index={0} />);

    expect(avatar()).toHaveAttribute('aria-hidden', 'true');
  });
});
