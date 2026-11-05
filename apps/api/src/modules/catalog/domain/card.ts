export type CardKind = 'truth' | 'dare' | 'statement' | 'challenge';

export interface Card {
  id: string;
  kind: CardKind;
  template: string;
  tags: string[];
  intensity: number;
  penaltyShots: number | null;
}
