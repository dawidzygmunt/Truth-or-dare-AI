# 002: Dokumentacja i agenci (faza 1, krok 2)

Status: zrealizowany

Zadania z roadmapy: T2.1–T2.4 (`docs/roadmap.md`). ADR-y powiązane: 0001–0005.

## Cel

Decyzje z `CLAUDE.md`, `docs/architecture.md` i `docs/KICKOFF.md` zapisane jako ADR-y, gotowy szablon planu, dwaj subagenci (`planner`, `code-reviewer`) i opisana struktura `docs/design/`. Od tego kroku każde zadanie ma plan według szablonu, a diff przechodzi review subagenta.

## Zakres

- ADR `0001`–`0004` według `docs/KICKOFF.md`, wyłącznie z treści istniejących dokumentów, bez nowych decyzji.
- ADR `0005` o decyzjach z kroku 1 (`docs/plans/001-repo-skeleton.md`, „Odstępstwa od planu”): ESM w całym repo, TypeScript `~6.0`, api budowane `tsc`, warunek eksportu `@tod/source`. Treść zweryfikowana z `package.json` i `tsconfig*.json`.
- `docs/plans/_template.md`: cel, zakres i poza zakresem, pliki do zmiany, lista testów (kolejność red), kroki, ryzyka.
- `.claude/agents/planner.md` (odczyt + zapis w `docs/plans/`) i `.claude/agents/code-reviewer.md` (odczyt, raport: blokery / sugestie / drobiazgi).
- `docs/design/README.md` ze strukturą `screens/` i `tokens/` oraz plikami `.gitkeep`.

## Poza zakresem

- Edycje `docs/roadmap.md`, `CLAUDE.md`, `docs/architecture.md` i `docs/KICKOFF.md`. Roadmapę prowadzi użytkownik, a sprzeczności w dokumentach źródłowych są zgłaszane, nie poprawiane.
- Zmiana jakiejkolwiek podjętej decyzji. ADR-y opisują stan obecny.
- ADR o płatnościach w Google Play (T9.1), ADR o hostingu (D2).
- Kod w `packages/game-engine` i `apps/api` (kroki 3 i 4).

## Pliki do zmiany

```
docs/adr/0001-monorepo-react-vite-nestjs.md                 (nowy)
docs/adr/0002-clean-architecture-api.md                     (nowy)
docs/adr/0003-stripe-checkout-behind-port.md                (nowy)
docs/adr/0004-penalty-modes-and-beer-pong-as-cards.md       (nowy)
docs/adr/0005-esm-and-typescript-6.md                       (nowy)
docs/plans/_template.md                                     (nowy)
docs/plans/002-project-docs.md                              (nowy)
docs/design/README.md                                       (nowy)
docs/design/screens/.gitkeep, docs/design/tokens/.gitkeep   (nowe)
.claude/agents/planner.md                                   (nowy)
.claude/agents/code-reviewer.md                             (nowy)
```

## Testy do napisania (kolejność red)

Nie dotyczy: zmiana wyłącznie dokumentacyjna, bez kodu wykonywalnego. Zamiast testów weryfikacja:

1. Każde twierdzenie w ADR `0005` sprawdzone w plikach: `"type": "module"` w pakietach i w `@nestjs/*` 12.x, `"typescript": "~6.0.3"`, peer dependency `typescript-eslint` `<6.1.0` w `pnpm-lock.yaml`, brak `nest-cli.json`, warunek `@tod/source` w `exports`, `customConditions` w `tsconfig.base.json` i `tsconfig.build.json`, `resolve.conditions` w konfiguracjach Vite i Vitest.
2. ADR `0001`–`0004` porównane z `CLAUDE.md`, `docs/architecture.md` i `docs/KICKOFF.md`: brak nowych decyzji i uzasadnień spoza dokumentów.
3. Frontmatter subagentów (`name`, `description`, `tools`) w formacie Claude Code. Brak narzędzia, które by go zwalidowało w tym środowisku, więc sprawdzenie jest ręczne.
4. `pnpm format:check` (pliki w `.claude/` formatowane Prettierem) i `pnpm lint` przechodzą.

## Kroki

1. ADR `0001`–`0004`, osobny commit.
2. ADR `0005` po weryfikacji z konfiguracją repo, osobny commit.
3. Szablon `docs/plans/_template.md` na wzór planu `001`.
4. Subagenci `planner` i `code-reviewer`, formatowanie Prettierem.
5. `docs/design/README.md` i pliki `.gitkeep` (git nie śledzi pustych katalogów).
6. Ten plan, weryfikacja (`pnpm install`, `pnpm format:check`, `pnpm lint`), push brancha.

## Ryzyka

- **ADR przypisujący dokumentom więcej, niż w nich napisano.** ADR-y opierają się wyłącznie na istniejących dokumentach. Tam, gdzie dokumenty nie podają powodu (np. brak Nest CLI), ADR to zaznacza.
- **Ograniczenia narzędzi subagentów.** Pole `tools` wybiera narzędzia, ale nie ogranicza ścieżek zapisu ani komend. `planner` ma `Write` i `Edit`, a `code-reviewer` ma `Bash`; „zapis tylko w `docs/plans/`” i „tylko komendy odczytu” wynikają z instrukcji w treści agenta, nie z mechanizmu wymuszającego.
- **Rozjazd dokumentów źródłowych.** Wykryte sprzeczności są wymienione niżej i nie zostały poprawione.

## Do potwierdzenia

Niespójności w dokumentach źródłowych, bez zmian w nich:

- `CLAUDE.md` wskazuje i18n w `apps/web/src/i18n`, a `docs/architecture.md` §6 w `apps/web/src/shared/i18n/`.
- `docs/architecture.md` §7 numeruje fazy płatności „Faza 1” (web) i „Faza 2” (Google Play), a §11 i roadmapa mają płatności w fazie 3, a Google Play w fazie 4. ADR 0003 pomija numery faz.
- `docs/architecture.md` §4 wymienia akcje silnika `skip` i `next` oraz kolejkę „rotacja / losowanie bez powtórzeń”, a KICKOFF (krok 3) definiuje `complete` / `fail` i rotację w kolejności dodania. ADR 0004 trzyma się KICKOFF.
- `docs/architecture.md` §9 nazywa projekty Playwright `iPhone 15` i `Pixel 7`, a w repo to `iphone-webkit` i `pixel-chromium` (urządzenia `iPhone 15`, `Pixel 7`).
- `docs/plans/001-repo-skeleton.md` zapowiada `verbatimModuleSyntax` wyłączone w api, a `apps/api/tsconfig.json` go nie nadpisuje (obowiązuje wartość z `tsconfig.base.json`).

## Odstępstwa od planu (po implementacji)

- Branch `chore/project-docs` był zajęty przez inny worktree, więc praca poszła na `chore/project-docs-step2` utworzonym z `origin/chore/project-docs`.
