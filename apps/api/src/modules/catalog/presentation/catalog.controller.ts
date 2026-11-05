import type { CatalogResponse, DeckResponse } from '@tod/contracts';
import { Controller, Get, Param, UseFilters } from '@nestjs/common';
import { GetEditionDeck } from '../application/use-cases/get-edition-deck.use-case.js';
import { ListCatalog } from '../application/use-cases/list-catalog.use-case.js';
import { CatalogExceptionFilter } from './catalog-exception.filter.js';

@Controller()
@UseFilters(CatalogExceptionFilter)
export class CatalogController {
  constructor(
    private readonly listCatalog: ListCatalog,
    private readonly getEditionDeck: GetEditionDeck,
  ) {}

  @Get('catalog')
  catalog(): Promise<CatalogResponse> {
    return this.listCatalog.execute();
  }

  @Get('editions/:slug/deck')
  deck(@Param('slug') slug: string): Promise<DeckResponse> {
    return this.getEditionDeck.execute(slug);
  }
}
