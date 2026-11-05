import { describe, expect, it } from 'vitest';
import { plural } from './plural.js';

const shots = { one: 'shot', few: 'shoty', many: 'shotów' };

describe('plural', () => {
  it.each([
    [1, 'shot'],
    [2, 'shoty'],
    [4, 'shoty'],
    [5, 'shotów'],
    [12, 'shotów'],
    [22, 'shoty'],
  ])('uses the Polish form for %i', (count, form) => {
    expect(plural(count, shots)).toBe(form);
  });
});
