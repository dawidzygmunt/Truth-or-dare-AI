import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module.js';
import {
  EDITION_REPOSITORY,
  type EditionRepository,
} from './application/ports/edition-repository.port.js';
import { GetEditionDeck } from './application/use-cases/get-edition-deck.use-case.js';
import { ListCatalog } from './application/use-cases/list-catalog.use-case.js';
import { PrismaEditionRepository } from './infrastructure/prisma-edition.repository.js';
import { CatalogController } from './presentation/catalog.controller.js';

@Module({
  imports: [PrismaModule],
  controllers: [CatalogController],
  providers: [
    { provide: EDITION_REPOSITORY, useClass: PrismaEditionRepository },
    {
      provide: ListCatalog,
      useFactory: (editions: EditionRepository) => new ListCatalog(editions),
      inject: [EDITION_REPOSITORY],
    },
    {
      provide: GetEditionDeck,
      useFactory: (editions: EditionRepository) => new GetEditionDeck(editions),
      inject: [EDITION_REPOSITORY],
    },
  ],
})
export class CatalogModule {}
