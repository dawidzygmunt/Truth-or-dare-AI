import { describe, expect, it } from 'vitest';
import { HealthResponseSchema } from './index.js';

describe('HealthResponseSchema', () => {
  it('accepts an ok status', () => {
    expect(HealthResponseSchema.parse({ status: 'ok' })).toEqual({ status: 'ok' });
  });

  it('rejects any other shape', () => {
    expect(HealthResponseSchema.safeParse({ status: 'down' }).success).toBe(false);
    expect(HealthResponseSchema.safeParse({}).success).toBe(false);
  });
});
