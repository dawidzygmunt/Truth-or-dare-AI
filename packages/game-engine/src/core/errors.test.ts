import { describe, expect, it } from 'vitest';
import {
  ActionNotAllowedError,
  DuplicatePlayerNameError,
  EmptyPlayerNameError,
  GameError,
  MissingCardKindError,
  TooFewPlayersError,
} from './errors.js';

describe('domain errors', () => {
  it.each([
    ['TooFewPlayersError', new TooFewPlayersError(2)],
    ['EmptyPlayerNameError', new EmptyPlayerNameError()],
    ['DuplicatePlayerNameError', new DuplicatePlayerNameError('Ola')],
    ['MissingCardKindError', new MissingCardKindError('truth')],
    ['ActionNotAllowedError', new ActionNotAllowedError('complete', 'choosing')],
  ])('%s carries its own class name, so logs can tell the errors apart', (name, error) => {
    expect(error.name).toBe(name);
    expect(error).toBeInstanceOf(GameError);
    expect(error).toBeInstanceOf(Error);
    expect(String(error)).toMatch(new RegExp(`^${name}: `));
  });

  it('names a subclass defined outside the module after that subclass', () => {
    class CustomError extends GameError {
      readonly code = 'custom';
    }

    expect(new CustomError().name).toBe('CustomError');
  });
});
