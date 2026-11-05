import { describe, expect, it } from 'vitest';
import { createSeededRandom } from './random.js';
import { resolveTemplate } from './template.js';

const players = ['Ola', 'Kuba', 'Ania', 'Tomek'];
const random = () => createSeededRandom(7);

describe('resolveTemplate', () => {
  it('substitutes the current player', () => {
    expect(resolveTemplate('{player}, zaśpiewaj', { players, player: 'Kuba' }, random())).toBe(
      'Kuba, zaśpiewaj',
    );
  });

  it('substitutes neighbours according to the player order', () => {
    expect(
      resolveTemplate('{playerLeft} i {playerRight}', { players, player: 'Ola' }, random()),
    ).toBe('Tomek i Kuba');
  });

  it('substitutes every occurrence of a placeholder', () => {
    expect(resolveTemplate('{player} {player}', { players, player: 'Ola' }, random())).toBe(
      'Ola Ola',
    );
  });

  it('leaves text without placeholders and unknown placeholders as they are', () => {
    expect(resolveTemplate('Zwykły {tekst}', { players, player: 'Ola' }, random())).toBe(
      'Zwykły {tekst}',
    );
  });

  it('substitutes names literally', () => {
    const tricky = ['$&', '{player}', 'Ania'];
    expect(
      resolveTemplate('{player} / {playerRight}', { players: tricky, player: '$&' }, random()),
    ).toBe('$& / {player}');
  });
});

describe('resolveTemplate with {randomPlayer}', () => {
  it('never picks the current player', () => {
    for (let seed = 0; seed < 300; seed++) {
      const text = resolveTemplate(
        '{randomPlayer}',
        { players, player: 'Kuba' },
        createSeededRandom(seed),
      );
      expect(text).not.toBe('Kuba');
      expect(players).toContain(text);
    }
  });

  it('reaches every other player', () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 300; seed++) {
      seen.add(
        resolveTemplate('{randomPlayer}', { players, player: 'Kuba' }, createSeededRandom(seed)),
      );
    }
    expect([...seen].sort()).toEqual(['Ania', 'Ola', 'Tomek']);
  });

  it('picks the only other player in a two-player game', () => {
    expect(
      resolveTemplate('{randomPlayer}', { players: ['Ola', 'Kuba'], player: 'Ola' }, random()),
    ).toBe('Kuba');
  });

  it('means the same person throughout one card', () => {
    for (let seed = 0; seed < 50; seed++) {
      const text = resolveTemplate(
        '{randomPlayer}|{randomPlayer}',
        { players, player: 'Ola' },
        createSeededRandom(seed),
      );
      const [first, second] = text.split('|');
      expect(first).toBe(second);
    }
  });
});
