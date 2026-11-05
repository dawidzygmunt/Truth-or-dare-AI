export class EditionLockedError extends Error {
  override readonly name = 'EditionLockedError';

  constructor(readonly slug: string) {
    super(`Edition "${slug}" is locked`);
  }
}
