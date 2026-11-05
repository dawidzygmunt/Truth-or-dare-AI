# CLAUDE.md

Platforma gier imprezowych (prawda czy wyzwanie, pije ten kto, beer pong…) działająca jako PWA na telefonie, później opakowana jako aplikacja Android (TWA) w Google Play.

Pełny opis architektury: `docs/architecture.md`. Decyzje: `docs/adr/`. Design: `docs/design/`.
Przeczytaj `docs/architecture.md` przed pierwszą zmianą w nowym module.

## Stack

- **Monorepo**: pnpm workspaces
  - `apps/web`: React + Vite + TypeScript, `vite-plugin-pwa`, React Router, TanStack Query, Zustand, Tailwind (tokeny z `docs/design/tokens`)
  - `apps/api`: NestJS + TypeScript, Prisma, PostgreSQL
  - `packages/game-engine`: czysty TypeScript, logika gier (zero zależności od React/Nest/przeglądarki)
  - `packages/contracts`: schematy Zod + typy DTO współdzielone przez web i api
- **Testy**: Vitest (unit/integration), Testcontainers (Postgres w testach integracyjnych api), Playwright (E2E)
- **Płatności**: Stripe Checkout za portem `PaymentProvider` (szczegóły w architekturze)

## Komendy

```bash
pnpm install
docker compose up -d                  # Postgres lokalnie
pnpm dev                              # web + api równolegle
pnpm test                             # wszystkie testy unit/integration
pnpm --filter game-engine test:watch  # TDD na silniku gier
pnpm --filter api test                # testy api (wymaga Dockera dla Testcontainers)
pnpm test:e2e                         # Playwright (wymaga Dockera: baza tod-e2e na 55432, buduje web i odpala api)
pnpm lint && pnpm typecheck           # przed każdym commitem
pnpm --filter api prisma migrate dev  # nowa migracja
pnpm --filter api db:seed             # seed gier, edycji i kart
```

## Workflow: TDD, zawsze

1. **Red**: napisz test opisujący zachowanie. Uruchom go i zobacz, że failuje z właściwego powodu.
2. **Green**: minimalny kod, żeby test przeszedł.
3. **Refactor**: popraw kod przy zielonych testach.
4. Przed uznaniem zadania za skończone: `pnpm lint && pnpm typecheck && pnpm test` muszą przejść. Jeśli zmiana dotyczy przepływu użytkownika, dodaj lub zaktualizuj test Playwright.

Zasady testów:
- Logika gier testowana w `packages/game-engine` bez mocków. To czyste funkcje i klasy, losowość wstrzykiwana (`Random` port, w testach seedowany).
- Use case'y w api testowane z in-memory implementacjami repozytoriów (nie mockuj Prismy).
- Repozytoria Prisma testowane integracyjnie na prawdziwym Postgresie (Testcontainers).
- Kontrolery: testy e2e Nesta (supertest) tylko dla ścieżek krytycznych (auth, entitlement, webhook płatności).
- Playwright: selektory przez `getByRole` / `getByTestId`, nigdy przez klasy CSS. Testy w projektach mobilnych (iPhone/WebKit i Pixel/Chromium).
- Nie zmieniaj ani nie usuwaj istniejącego testu tylko po to, żeby przeszedł. Jeśli test jest błędny, napisz dlaczego.

## Zasady architektury (skrót, szczegóły w `docs/architecture.md`)

- **Clean Architecture w api**: `domain` ← `application` ← `infrastructure` / `presentation`. Zależności tylko do środka.
  - `domain`: encje, value objects, reguły. Zero importów z `@nestjs/*`, `@prisma/*`, `stripe`.
  - `application`: use case'y i porty (interfejsy repozytoriów i usług zewnętrznych).
  - `infrastructure`: implementacje portów (Prisma, Stripe, mail).
  - `presentation`: kontrolery Nest, DTO, guardy. Kontroler wywołuje use case i nic więcej.
- **Logika gier tylko w `packages/game-engine`**. Komponenty React wyświetlają stan silnika i wysyłają akcje, nie losują ani nie liczą.
- **Typy na granicy web↔api tylko z `packages/contracts`**. Nie duplikuj typów DTO.
- **Płatne karty nigdy nie trafiają do bundla frontu.** Serwer zwraca talię płatnej edycji tylko po sprawdzeniu `Entitlement`.
- **Gracz bez konta może grać w darmowe edycje.** Nie dodawaj wymogu logowania poza zakupem i dostępem do płatnych edycji.
- Granice warstw pilnuje ESLint (`eslint-plugin-boundaries`). Jeśli lint blokuje import, popraw kod, nie konfigurację.

## Konwencje

- Kod, nazwy, commity i komentarze po angielsku. Teksty UI po polsku przez i18n (`apps/web/src/i18n`), nigdy zahardkodowane w komponentach.
- Treści kart to dane w bazie (seed w `apps/api/prisma/seed/`), nie w kodzie.
- Commity: Conventional Commits (`feat(game-engine): …`, `fix(api): …`), krótkie (jedna linia tytułu, body tylko gdy naprawdę potrzebne).
- Bez stopek o współautorstwie AI (`Co-Authored-By: Claude…`, „Generated with Claude Code” itp.) w commitach i PR-ach.
- Git: remote `origin` = `git@github.com:dawidzygmunt/Truth-or-dare-AI.git`. Każdy feature/krok na osobnym branchu (`feat/…`, `chore/…`, `fix/…`) od `main`; push brancha i PR do `main`. Nie commituj bezpośrednio na `main`.
- Bez `gh` CLI (za szerokie uprawnienia). PR otwiera użytkownik: po pushu podaj link `https://github.com/dawidzygmunt/Truth-or-dare-AI/compare/main...<branch>?expand=1` oraz gotowy tytuł i opis PR.
- Nazwy plików: `kebab-case.ts`; use case: `start-session.use-case.ts`; port: `card-repository.port.ts`.
- Błędy domenowe jako klasy (`EditionLockedError`), mapowane na HTTP w warstwie presentation.
- Bez `any`. Bez `// @ts-ignore` bez komentarza z uzasadnieniem.

## Treści i zgodność

- Nowe karty i edycje: bez promowania upijania się ani picia na czas, bez treści seksualnie eksplicytnych (wymóg Google Play). Edycja ma pole `platforms`. Treści tylko na web oznaczaj `["web"]`.
- Dwa tryby kar w sesji: `shots` (pokazuje `penaltyShots` z karty po „nie wykonane”) i `none` („nie wykonane” tylko przechodzi dalej). Nie sumuj shotów na gracza i nie rób rankingów picia.
- Beer pong nie liczy kubków. To talia wyzwań dla gracza wskazanego jako trafiony.
- Age gate 18+ przy pierwszym uruchomieniu, zapamiętany lokalnie.

## Czego NIE robić

- Nie dodawaj Next.js, SSR ani nowego frameworka stanu bez ADR.
- Nie wywołuj Stripe ani Prismy z use case'ów bezpośrednio. Tylko przez porty.
- Nie zapisuj sekretów w repo. Konfiguracja w `.env` (wzór: `.env.example`).
- Nie wyłączaj reguł ESLint ani TypeScript strict, żeby „przeszło”.

## Gdy podejmujesz decyzję architektoniczną

Dodaj ADR w `docs/adr/NNNN-tytul.md` (kontekst, decyzja, konsekwencje, odrzucone opcje). Jeśli powtarza się ten sam błąd agenta, dopisz regułę do tego pliku.
