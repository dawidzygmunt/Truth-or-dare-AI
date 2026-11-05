# 004: Minimalne api, moduł `catalog` (faza 1, krok 4)

Status: zrealizowany

## Cel

`apps/api` serwuje katalog gier (`GET /catalog`) i talię darmowej edycji (`GET /editions/:slug/deck`) z Postgresa przez Prismę, w Clean Architecture i w TDD. Płatna edycja zawsze daje 403, a jej karty nie opuszczają bazy. Seed daje grywalną „Prawdę czy wyzwanie: Klasyczną”. Kontrakty odpowiedzi trafiają do `packages/contracts`, żeby `apps/web` (krok 5) mógł z nich korzystać.

## Zakres

- `packages/contracts`: schematy Zod i typy `CatalogResponse`, `DeckResponse` i ich części.
- Moduł `apps/api/src/modules/catalog/{domain,application,infrastructure,presentation}`:
  - `domain`: `Game`, `Edition`, `Card`, `isEditionLocked`, `EditionLockedError`, `EditionNotFoundError`;
  - `application`: port `EditionRepository` (token `EDITION_REPOSITORY`), use case'y `ListCatalog` i `GetEditionDeck` jako zwykłe klasy z `execute()`;
  - `infrastructure`: `PrismaEditionRepository`;
  - `presentation`: `CatalogController`, `CatalogExceptionFilter` (403 / 404).
- Prisma 7.10.1 (`prisma`, `@prisma/client`, `@prisma/adapter-pg` w tej samej dokładnej wersji; `latest` z npm to 8.0.0-rc i świadomie go nie używamy): modele `Game`, `Edition`, `Card`, pierwsza migracja, `prisma.config.ts`, skrypt `prisma`, `pnpm --filter api prisma migrate dev`.
- Klient Prismy generowany do `apps/api/src/generated/prisma` (generator `prisma-client`, ESM, importy `.js`), poza gitem, generowany w `postinstall` pakietu api. Dzięki temu lint, typecheck, CI i `pnpm test` działają na świeżym klonie bez osobnego kroku.
- `PrismaModule` / `PrismaService` w `apps/api/src/database/`. Połączenie leniwe: api startuje bez bazy, a `/health` jej nie potrzebuje.
- Seed idempotentny z JSON w `apps/api/prisma/seed/`: gra `truth-or-dare`, edycja „Klasyczna” (free), 30 prawd i 30 wyzwań po polsku, część z `penaltyShots`. Zastępuje zaślepkę `db:seed`.

## Poza zakresem

- `User`, `Entitlement`, port `EntitlementChecker`, logowanie. Płatna edycja jest zablokowana zawsze, a `isEditionLocked` to jedyne miejsce do rozszerzenia.
- Filtrowanie po platformie po stronie api (`platforms` jest w odpowiedzi, decyduje klient).
- Pozostałe gry i edycje, panel admina.
- Zmiany w `apps/web`, `packages/game-engine`, `docs/roadmap.md`, `CLAUDE.md`, `docs/architecture.md`, `docs/KICKOFF.md`.

## Decyzje

- `intensity` (edycji i karty): `Int` 1–5. `ageRating`: `Int` (18). Architektura nie określa typów.
- `Edition.slug` jest unikalny globalnie, bo endpoint talii nie zawiera gry. Seedowy slug: `truth-or-dare-klasyczna`.
- Karty w JSON mają stabilne `id` (np. `tod-klasyczna-truth-001`). Seed robi upsert po `id` i usuwa karty edycji, których nie ma już w pliku. To daje idempotencję i stabilne identyfikatory między wydaniami.
- `isPublished` domyślnie `false`: nowa edycja nie pojawi się przez przypadek.
- Gra bez opublikowanych edycji nie pojawia się w katalogu.
- Kolejność jawna: gry i edycje po `name`, karty po `id`. Tasuje silnik.
- Odpowiedź katalogu: `{ games: [...] }`. Odpowiedź talii: `{ editionSlug, cards }`.
- Use case'y zwracają wynik zgodny strukturalnie z DTO, więc kontroler tylko deklaruje typ z `contracts` i nie mapuje danych. `GetEditionDeck` jawnie zawęża kartę do `id`, `kind`, `template`, `penaltyShots`.
- Bez `@nestjs/config`: `DATABASE_URL` z `process.env`, tak jak `PORT` w `main.ts`. `node --env-file-if-exists` ładuje root `.env`, a `prisma.config.ts` robi to przez `process.loadEnvFile`.
- Use case'y wiązane w module przez `useFactory`, żeby `application` nie miało dekoratorów Nesta.
- Seed uruchamiany przez `tsx` z warunkiem `@tod/source`, bo żyje poza `src` i nie wchodzi do builda.
- Testy e2e Nesta idą przez cały stos na Postgresie z Testcontainers (bez podmiany repozytorium), żeby sprawdzić też wiązanie DI i konfigurację połączenia.
- Migracje w testach przez `prisma migrate deploy`, czyli testują migrację z repo, a nie `db push`.
- `exactOptionalPropertyTypes` zostaje włączone w api, o ile nie okaże się kolizyjne. Odstępstwo zostanie opisane niżej.

## Pliki

```
packages/contracts/src/catalog/{catalog-response.schema.ts,deck-response.schema.ts}
packages/contracts/src/catalog/{catalog-response.schema.test.ts,deck-response.schema.test.ts}
packages/contracts/src/index.ts
apps/api/package.json, apps/api/prisma.config.ts, apps/api/vitest.config.ts, apps/api/tsconfig.json
apps/api/prisma/schema.prisma, apps/api/prisma/migrations/*
apps/api/prisma/seed/{truth-or-dare.json,seed-data.schema.ts,seed-data.test.ts,seed-game.ts,index.ts}
apps/api/src/database/{prisma.module.ts,prisma.service.ts}
apps/api/src/modules/catalog/catalog.module.ts
apps/api/src/modules/catalog/domain/{card.ts,edition.ts,game.ts,edition-locked.error.ts,edition-not-found.error.ts}
apps/api/src/modules/catalog/application/ports/edition-repository.port.ts
apps/api/src/modules/catalog/application/use-cases/{list-catalog.use-case.ts,get-edition-deck.use-case.ts}
apps/api/src/modules/catalog/infrastructure/prisma-edition.repository.ts
apps/api/src/modules/catalog/presentation/{catalog.controller.ts,catalog-exception.filter.ts}
apps/api/test/support/{in-memory-edition.repository.ts,catalog-fixtures.ts,test-database.ts}
apps/api/test/catalog.e2e.test.ts, apps/api/test/seed.integration.test.ts
package.json (pnpm.onlyBuiltDependencies), .gitignore, .prettierignore, eslint.config.js (ignore kodu generowanego)
```

## Testy (kolejność red)

1. `contracts`: schematy katalogu i talii akceptują poprawny kształt, odrzucają złe `kind`, `tier`, `platforms`, a katalog nie ma pola `cards`.
2. `domain/edition.test.ts`: `isEditionLocked` dla `free` i `paid`.
3. `get-edition-deck.use-case.test.ts` (in-memory repo): darmowa edycja zwraca karty w kształcie DTO; nieznana i nieopublikowana dają `EditionNotFoundError`; płatna daje `EditionLockedError` i **repozytorium nie jest pytane o karty**.
4. `list-catalog.use-case.test.ts`: gry z edycjami, `locked` wg tieru, nieopublikowane edycje i gry bez edycji pominięte, brak kart w wyniku.
5. `prisma-edition.repository.integration.test.ts` (Testcontainers): to samo zachowanie na Postgresie, mapowanie `platforms`, `penaltyShots`, kolejność.
6. `prisma/seed/seed-data.test.ts`: JSON zgodny ze schematem, ok. 30 prawd i 30 wyzwań, tylko dozwolone placeholdery, unikalne `id`, `android` w `platforms`, część kart z `penaltyShots`.
7. `test/seed.integration.test.ts`: podwójny seed nie duplikuje kart, usuwa kartę, której nie ma już w danych.
8. `test/catalog.e2e.test.ts` (supertest + Testcontainers): `GET /catalog` zgodny z `CatalogResponseSchema`; talia free 200; paid 403; nieznana i nieopublikowana 404; treść płatnej karty (wartownik) nie występuje w odpowiedzi 403 ani w `GET /catalog`.

Istniejący `test/health.e2e.test.ts` zostaje bez zmian i ma przechodzić bez bazy.

## Kroki

1. Ten plan.
2. Zależności, Prisma, ignorowanie kodu generowanego.
3. `contracts`: test 1 (red), schematy (green).
4. `domain` i `application`: testy 2–4 (red → green).
5. Schemat i migracja, test 5 (red), `PrismaEditionRepository` (green).
6. Seed: testy 6–7 (red), dane i `seedCatalog` (green).
7. `presentation`, `CatalogModule`: test 8 (red → green).
8. Weryfikacja na świeżym stanie: `pnpm lint && pnpm typecheck && pnpm test && pnpm format:check && pnpm test:e2e`.
9. Aktualizacja CI, jeśli będzie potrzebna, i odstępstwa w tym planie.

## Ryzyka

- **Prisma 7 na Node 26**: `engines` pozwala (`>=24`), ale preinstall wypisuje ostrzeżenie. Sprawdzone: instalacja przechodzi.
- **`pnpm test` wymaga teraz Dockera** (Testcontainers), także w CI. Runner `ubuntu-latest` ma Dockera.
- **E2E Playwright a baza**: `webServer` startuje api. Dzięki leniwemu połączeniu `/health` działa bez bazy, więc obecny smoke nie wymaga Postgresa w CI. Krok 5 zacznie go wymagać (katalog w UI).
- **Port 5432 zajęty lokalnie** przez inny projekt: `docker compose up` może się nie udać. Weryfikacja `migrate dev` i seeda na tymczasowym kontenerze z innym portem.
- **Treści kart**: ręczna kontrola zgodności (bez picia na czas, bez upijania, bez treści seksualnie eksplicytnych), bo test sprawdza tylko strukturę.

## Odstępstwa od planu (po implementacji)

- Seed: plik `seed-game.ts` z funkcją `seedGame` zamiast `seed-catalog.ts`. Jeden plik JSON to jedna gra.
- `apps/api/vitest.config.ts`: alias `@tod/contracts` na źródła. Vitest działa w środowisku serwerowym, które ignoruje `resolve.conditions`, więc `/health` e2e przechodził tylko po zbudowaniu `contracts`. Na świeżym klonie (i w CI, gdzie `test` jest przed `build`) `pnpm test` padał. Błąd istniał przed tym krokiem.
- `PrismaService` to zwykła klasa tworzona przez `useFactory` w `PrismaModule`. Konstruktor dostaje connection string, więc testy i seed nie muszą ustawiać `process.env`.
- `exactOptionalPropertyTypes` zostało włączone w api: nie koliduje z Prismą ani Nestem. Kod generowany ma `@ts-nocheck`.
- `pnpm.ignoredBuiltDependencies`: `cpu-features`, `protobufjs`, `ssh2` (zależności Testcontainers, działają bez skryptów budowania). `onlyBuiltDependencies`: `@prisma/engines`, `prisma`, `esbuild`.
- CI bez zmian: `postinstall` generuje klienta, a `ubuntu-latest` ma Dockera dla Testcontainers. Playwright nie potrzebuje bazy, dopóki UI nie korzysta z katalogu.
- Test zawartości seeda sprawdza dodatkowo unikalność szablonów, obecność `{player}` na każdej karcie i brak poleceń picia w treści (kara należy do trybu `shots`).
- Treści kart unikają form rodzajowych i odmiany imion, np. „osoba: {randomPlayer}”, bo imiona podstawiane są w mianowniku.
