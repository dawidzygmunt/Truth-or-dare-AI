export class EditionNotFoundError extends Error {
  override readonly name = 'EditionNotFoundError';

  constructor(readonly slug: string) {
    super(`Edition "${slug}" was not found`);
  }
}
