import { describe, expect, it } from 'vitest';
import { pl } from './pl.js';

describe('pl', () => {
  it('names the app SZOT and carries the tagline', () => {
    expect(pl.app.title).toBe('SZOT');
    expect(pl.app.tagline).toBe('jedna apka, cała impreza');
  });

  it('asks what to play without pushing shots', () => {
    expect(pl.catalog.title).toBe('W co gramy?');
    expect(JSON.stringify(pl)).not.toContain('Gotowi na szoty');
  });

  it('labels the outcome buttons as agreed for each penalty mode', () => {
    expect(pl.game.done).toBe('Zrobione ✓');
    expect(pl.game.notDoneShots).toBe('Piję 🍺');
    expect(pl.game.notDone).toBe('Nie wykonane');
  });

  it('never mentions drinking in what the mode without penalties shows', () => {
    const noPenaltyCopy = [pl.game.notDone, pl.setup.penaltyNone, pl.setup.penaltyNoneHint];

    expect(noPenaltyCopy.join(' ')).not.toMatch(/pij|pić|shot|szot|🍺/iu);
  });
});
