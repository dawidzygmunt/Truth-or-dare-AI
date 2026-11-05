import { isEditionLocked, type Edition } from '../../domain/edition.js';
import type { Game } from '../../domain/game.js';
import type { EditionRepository } from '../ports/edition-repository.port.js';

export type CatalogEditionEntry = Pick<
  Edition,
  'slug' | 'name' | 'tier' | 'intensity' | 'ageRating' | 'platforms' | 'locale'
> & { locked: boolean };

export type CatalogGameEntry = Pick<Game, 'slug' | 'name' | 'description' | 'engine'> & {
  editions: CatalogEditionEntry[];
};

export interface Catalog {
  games: CatalogGameEntry[];
}

export class ListCatalog {
  constructor(private readonly editions: EditionRepository) {}

  async execute(): Promise<Catalog> {
    const games = await this.editions.listPublishedGames();

    return {
      games: games.map(({ slug, name, description, engine, editions }) => ({
        slug,
        name,
        description,
        engine,
        editions: editions.map(toCatalogEdition),
      })),
    };
  }
}

function toCatalogEdition(edition: Edition): CatalogEditionEntry {
  const { slug, name, tier, intensity, ageRating, platforms, locale } = edition;
  return {
    slug,
    name,
    tier,
    locked: isEditionLocked(edition),
    intensity,
    ageRating,
    platforms,
    locale,
  };
}
