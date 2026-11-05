import { Catch, ForbiddenException, NotFoundException, type ArgumentsHost } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { EditionLockedError } from '../domain/edition-locked.error.js';
import { EditionNotFoundError } from '../domain/edition-not-found.error.js';

@Catch(EditionLockedError, EditionNotFoundError)
export class CatalogExceptionFilter extends BaseExceptionFilter {
  override catch(error: EditionLockedError | EditionNotFoundError, host: ArgumentsHost): void {
    const httpError =
      error instanceof EditionLockedError
        ? new ForbiddenException(error.message)
        : new NotFoundException(error.message);

    super.catch(httpError, host);
  }
}
