import { z } from 'zod';

/** URL-safe identifier of an edition (and any future slug-addressed resource). */
export const SlugSchema = z.string().regex(/^[a-z0-9-]+$/);

export type Slug = z.infer<typeof SlugSchema>;
