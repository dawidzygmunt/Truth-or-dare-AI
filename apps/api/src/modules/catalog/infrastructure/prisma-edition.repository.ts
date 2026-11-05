import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';
import type { EditionRepository } from '../application/ports/edition-repository.port.js';
import type { Card } from '../domain/card.js';
import type { Edition } from '../domain/edition.js';
import type { GameWithEditions } from '../domain/game.js';

@Injectable()
export class PrismaEditionRepository implements EditionRepository {
  constructor(private readonly prisma: PrismaService) {}

  listPublishedGames(): Promise<GameWithEditions[]> {
    return this.prisma.game.findMany({
      where: { editions: { some: { isPublished: true } } },
      orderBy: { name: 'asc' },
      include: {
        editions: {
          where: { isPublished: true },
          orderBy: { name: 'asc' },
          omit: { gameId: true },
        },
      },
    });
  }

  findPublishedBySlug(slug: string): Promise<Edition | null> {
    return this.prisma.edition.findFirst({
      where: { slug, isPublished: true },
      omit: { gameId: true },
    });
  }

  findCardsByEditionId(editionId: string): Promise<Card[]> {
    return this.prisma.card.findMany({
      where: { editionId },
      orderBy: { id: 'asc' },
      omit: { editionId: true },
    });
  }
}
