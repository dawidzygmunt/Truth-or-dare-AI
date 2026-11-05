import type { Edition } from './edition.js';

export type GameEngine = 'card_deck';

export interface Game {
  id: string;
  slug: string;
  name: string;
  engine: GameEngine;
  description: string;
}

export interface GameWithEditions extends Game {
  editions: Edition[];
}
