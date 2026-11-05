# Roadmap

Jedyne miejsce ze statusem zadań. Szczegóły kroków: `docs/KICKOFF.md`, plany: `docs/plans/`, architektura: `docs/architecture.md`.

Status: `[ ]` do zrobienia, `[~]` w toku, `[x]` zrobione, `[?]` czeka na decyzję.
Model: **O** = Opus 5.5 (zadania cięższe), **S** = Sonnet 5.5 z extra thinking (prostsze).

## Faza 1: fundament i prawda czy wyzwanie

Zakres według KICKOFF (obejmuje też minimalny `catalog`, seed i age gate).

### Krok 1: szkielet repo
- [x] T1.1 Monorepo, TS strict, ESLint z granicami, Vitest, Playwright, Docker, CI (`001`)

### Krok 2: dokumentacja i agenci (S, fala 1, `002`)
- [x] T2.1 ADR 0001–0004 oraz 0005 (ESM, TypeScript 6)
- [x] T2.2 `docs/plans/_template.md`
- [x] T2.3 Subagenci `.claude/agents/planner.md` i `code-reviewer.md`
- [x] T2.4 `docs/design/README.md`

### Krok 3: `packages/game-engine` (O, fala 1, `003`, branch `feat/game-engine`)
- [x] T3.1 Port `Random`: seedowany i `crypto`
- [x] T3.2 Talia: tasowanie, dobieranie bez powtórzeń, reset danego rodzaju kart
- [x] T3.3 Gracze: walidacja i kolejka tur
- [x] T3.4 Szablony i placeholdery
- [x] T3.5 Reduktor prawdy czy wyzwania, tryby kar, błędy domenowe
- [x] T3.6 Serializowalność stanu

### Krok 4: minimalne `apps/api` (O, fala 1, `004`, branch `feat/api-catalog`)
- [x] T4.0 `pnpm test` na czystym checkoucie nie może wymagać `contracts/dist` (`ssr.resolve.conditions` w Vitest)
- [x] T4.1 Kontrakty `catalog` i talii w `packages/contracts`
- [x] T4.2 Prisma: `Game`, `Edition`, `Card`, migracja (usuwa zaślepkę `db:seed`)
- [x] T4.3 Domena i use case'y `ListCatalog`, `GetEditionDeck` (in-memory)
- [x] T4.4 `PrismaEditionRepository` (Testcontainers)
- [x] T4.5 Kontroler, `GET /catalog`, `GET /editions/:slug/deck`, `EditionLockedError` → 403
- [x] T4.6 Seed z JSON: edycja „Klasyczna”, ok. 30 prawd i 30 wyzwań

### Krok 5: `apps/web` (O, fala 2, `005`, branch `feat/web-app`)
- [x] T5.1 i18n, router, providery, age gate
- [x] T5.2 Wybór gry i edycji, dodawanie graczy, tryb kar
- [x] T5.3 Store Zustand nad reduktorem, persystencja w IndexedDB
- [x] T5.4 Ekran gry
- [x] T5.5 PWA: ikony, cache katalogu i darmowej talii, instrukcja instalacji na iOS

### Krok 6: E2E (S, fala 3, `006`, branch `feat/e2e-flows`)
- [x] T6.1 Gość: age gate → 3 graczy → 5 tur
- [x] T6.2 Odświeżenie strony przywraca stan
- [x] T6.3 Tryby `shots` i `none`
- [x] T6.4 Offline po pierwszym załadowaniu

## Faza 2: kolejne gry i treści

- [ ] T7.1 `game-engine`: pije ten kto (O)
- [ ] T7.2 `game-engine`: beer pong, `hit(player)` bez kolejki tur (O)
- [ ] T7.3 Seed: edycje pije ten kto i beer pong, przegląd zgodności treści (S)
- [ ] T7.4 Web: ekrany obu gier, testy Playwright (S)
- [ ] T7.5 Web: instalacja przez `beforeinstallprompt` na Androidzie (S)
- [?] T7.6 Nigdy przenigdy, patrz D1

## Faza 3: konta i płatności

- [ ] T8.1 `identity`: `User`, magic link, Mailpit (O)
- [ ] T8.2 `identity`: Google OAuth, ciasteczka, refresh, `/auth/logout`, `/me` (O)
- [ ] T8.3 `billing`: `Purchase`, `Entitlement`, port `PaymentProvider` (O)
- [ ] T8.4 `billing`: Stripe Checkout, idempotentny webhook (O)
- [ ] T8.5 `catalog`: `EntitlementChecker`, flaga `locked`, talia płatna po uprawnieniach (O). Warunek: service worker nie może polegać na zapisanym katalogu przy decyzji o cache'u talii (znacznik tier w odpowiedzi albo świeży katalog), inaczej nieaktualny `free` wpuści płatną talię do `tod-free-decks`
- [ ] T8.6 Web: logowanie, ekran zakupu, odświeżenie `/me`, płatne talie w IndexedDB (O)
- [ ] T8.7 Pierwsza płatna edycja „Spicy” i produkty, w tym all access (S)
- [ ] T8.8 Playwright: płatna edycja dla gościa, zakup z webhookiem (S)

## Faza 4: Google Play

- [?] T9.1 ADR: płatności na Androidzie, Play Billing czy billing choice (O)
- [ ] T9.2 TWA: Bubblewrap w `android/`, `assetlinks.json` (S)
- [ ] T9.3 Wykrywanie TWA i ukrywanie edycji `web`-only (S)
- [ ] T9.4 Adapter `PaymentProvider` dla wybranej opcji (O)
- [ ] T9.5 Przegląd treści pod Play, klasyfikacja wiekowa, listing (S)

## Przed pierwszym wdrożeniem

- [ ] TD.1 Błąd przy starcie api, gdy brakuje `DATABASE_URL` na produkcji (dziś `/health` jest zielony, a `/catalog` daje 500)
- [ ] TD.2 `prisma` w zależnościach produkcyjnych lub warunkowy `postinstall`; opisać migrację i seed na produkcji
- [x] TD.3 Czyszczenie cache'u service workera, gdy darmowa edycja staje się płatna (ADR 0006)
- [ ] TD.4 Filtrowanie gier według silnika i routing per gra przed fazą 2 (dziś każda gra startuje przepływ prawdy czy wyzwania)

## Znane ograniczenia fazy 1

- Wiele kart przeglądarki: ostatni zapis wygrywa.
- Podwójne stuknięcie „Wykonane” może dobrać kartę następnemu graczowi (gra zostaje).
- `GameError.name` jest skracany w produkcji; identyfikatorem pozostaje `code`. `keepNames` cofnięte: +82 kB bundla.
- Niesprawdzone: GitHub Actions, prawdziwe urządzenia, Safari, czytnik ekranu.

## Otwarte decyzje

- [?] D1 Czy „nigdy przenigdy” wchodzi do zakresu? Jest w `architecture.md`, nie ma w KICKOFF ani `CLAUDE.md`.
- [?] D2 Hosting api i bazy (przed publikacją).
- [?] D3 Potwierdzenie założeń z KICKOFF: tylko polski, jednorazowe zakupy + all access, logowanie Google + magic link.
- [?] D4 Literówki w `architecture.md`: „faza 5” w sekcji 12 powinna być fazą 4; sekcja 11 umieszcza `catalog` i age gate w fazie 2, a KICKOFF w fazie 1 (przyjęty KICKOFF).
- [?] D5 Rozjazdy w dokumentach do ujednolicenia: i18n w `apps/web/src/i18n` (`CLAUDE.md`) czy `shared/i18n/` (`architecture.md` §6); numeracja faz płatności w §7 (faza 1/2) wobec §11 (faza 3/4); akcje `skip`/`next` i losowa kolejka w §4 wobec `complete`/`fail` i rotacji w KICKOFF (ADR 0004 idzie za KICKOFF); nazwy projektów Playwright w §9; plan 001 mówi, że `verbatimModuleSyntax` jest w api wyłączone, a jest włączone; §4 pokazuje reduktor zwracający stan, a silnik zwraca `Result` (plan 003).

## Kolejność pracy

- **Fala 1, równolegle:** kroki 2, 3, 4.
- **Fala 2:** krok 5.
- **Fala 3:** krok 6, potem review całości fazy 1.
