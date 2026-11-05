import { describe, expect, it } from 'vitest';
import { SlugSchema } from '../index.js';

describe('SlugSchema', () => {
  it.each(['truth-or-dare-klasyczna', 'nope', 'edition-2', '42'])('accepts %s', (slug) => {
    expect(SlugSchema.safeParse(slug).success).toBe(true);
  });

  it.each([
    ['empty', ''],
    ['upper case', 'Klasyczna'],
    ['a space', 'two words'],
    ['an underscore', 'two_words'],
    ['a path separator', 'a/b'],
    ['a dot', '..'],
    ['a polish letter', 'żółw'],
    ['a NUL byte', '\u0000'],
    ['a trailing newline', 'klasyczna\n'],
  ])('rejects a slug with %s', (_, slug) => {
    expect(SlugSchema.safeParse(slug).success).toBe(false);
  });
});
