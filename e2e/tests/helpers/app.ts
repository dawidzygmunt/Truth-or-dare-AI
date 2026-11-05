import { expect, type Page } from '@playwright/test';

export const EDITION_SLUG = 'truth-or-dare-klasyczna';

export const PLAYERS = ['Ania', 'Bartek', 'Czesia'] as const;

export type PenaltyMode = 'none' | 'shots';
export type CardChoice = 'truth' | 'dare';

/** Visible label of the drawn card kind, as the player reads it. */
const CARD_KIND_LABEL: Readonly<Record<CardChoice, string>> = {
  truth: 'Prawda',
  dare: 'Wyzwanie',
};

export async function confirmAge(page: Page): Promise<void> {
  await page.getByTestId('age-gate-confirm').click();
  await expect(page.getByTestId(`edition-${EDITION_SLUG}`)).toBeVisible();
}

/** First visit as a guest: opens the app and passes the age gate. */
export async function openAsGuest(page: Page): Promise<void> {
  await page.goto('/');
  await confirmAge(page);
}

export async function addPlayers(page: Page, names: readonly string[]): Promise<void> {
  const items = page.getByTestId('player-item');
  for (const [index, name] of names.entries()) {
    await page.getByTestId('player-name-input').fill(name);
    await page.getByTestId('add-player').click();
    await expect(items).toHaveCount(index + 1);
    await expect(items.nth(index)).toContainText(name);
  }
}

interface StartGameOptions {
  readonly players?: readonly string[];
  readonly penaltyMode?: PenaltyMode;
}

/** From the catalog: picks the free edition, adds players, chooses a penalty mode and starts. */
export async function startGame(
  page: Page,
  { players = PLAYERS, penaltyMode = 'none' }: StartGameOptions = {},
): Promise<void> {
  await page.getByTestId(`edition-${EDITION_SLUG}`).click();
  await addPlayers(page, players);
  await page.getByTestId(`penalty-mode-${penaltyMode}`).check();
  await page.getByTestId('start-game').click();
  await expectCurrentPlayer(page, players[0] ?? '');
}

export async function expectCurrentPlayer(page: Page, name: string): Promise<void> {
  await expect(page.getByTestId('current-player')).toHaveText(name);
}

/** Picks truth or dare and waits for a card of that kind with some text on it. */
export async function drawCard(page: Page, choice: CardChoice): Promise<void> {
  await page.getByTestId(`choose-${choice}`).click();
  await expect(page.getByTestId('card-kind')).toHaveText(CARD_KIND_LABEL[choice]);
  await expect(page.getByTestId('card-text')).not.toBeEmpty();
}

export async function markDone(page: Page): Promise<void> {
  await page.getByTestId('mark-done').click();
}

export async function markNotDone(page: Page): Promise<void> {
  await page.getByTestId('mark-not-done').click();
}

export interface VisiblePenalty {
  readonly player: string;
  readonly shots: number;
}

const PENALTY_PATTERN = /^(.+): (\d+) shot/u;

/** Waits for the penalty line and reads who owes how many shots from what is shown. */
export async function readPenalty(page: Page): Promise<VisiblePenalty> {
  const penalty = page.getByTestId('penalty');
  await expect(penalty).toHaveText(PENALTY_PATTERN);
  const text = (await penalty.textContent()) ?? '';
  const match = PENALTY_PATTERN.exec(text);
  if (match?.[1] === undefined || match[2] === undefined) {
    throw new Error(`Penalty text has an unexpected shape: "${text}"`);
  }
  return { player: match[1], shots: Number(match[2]) };
}
