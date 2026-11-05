# 0002: Clean Architecture w `apps/api`

## Status

Zaakceptowany.

## Kontekst

- `apps/api` to NestJS podzielony na moduły (bounded contexts): `catalog`, `identity`, `billing`, `admin`.
- Api korzysta z zewnętrznych zależności (Prisma/PostgreSQL, Stripe, mail), a dostawca płatności w aplikacji z Google Play może się jeszcze zmienić (ADR 0003).
- Projekt jest prowadzony w TDD. Use case'y mają być testowalne bez Nesta i bez bazy, a repozytoria Prisma na prawdziwym Postgresie.
- Moduły muszą się ze sobą komunikować (np. `catalog` pyta `billing` o uprawnienia) bez wzajemnego sprzęgania się.

Źródła: `docs/architecture.md` (§5, §9), `docs/KICKOFF.md` (Technologia), `CLAUDE.md` (Zasady architektury).

## Decyzja

Każdy moduł api ma cztery warstwy, a zależności idą tylko do środka: `domain` ← `application` ← `infrastructure` / `presentation`.

```
modules/<nazwa>/
├─ domain/            encje, value objects, reguły, błędy domenowe
├─ application/
│  ├─ ports/          interfejsy repozytoriów i usług zewnętrznych
│  └─ use-cases/      klasy z metodą execute()
├─ infrastructure/    implementacje portów (Prisma, Stripe, mail)
└─ presentation/      kontrolery Nest, DTO (z packages/contracts), guardy
```

Reguły:

- `domain` nie importuje z `@nestjs/*`, `@prisma/*` ani `stripe`.
- Use case'y to zwykłe klasy z metodą `execute()`, testowalne bez Nesta. Nie wywołują Stripe ani Prismy bezpośrednio, tylko przez porty.
- Kontroler wywołuje use case i nic więcej.
- Porty wiążemy z implementacjami w module Nest przez tokeny, np. `{ provide: EDITION_REPOSITORY, useClass: PrismaEditionRepository }`.
- Moduły komunikują się przez porty. Przykład: `catalog` pyta o uprawnienia przez port `EntitlementChecker`, który implementuje adapter w module `billing`. Brak bezpośrednich importów z cudzych `domain` i `infrastructure`.
- Błędy domenowe to klasy (np. `EditionLockedError`), mapowane na HTTP w warstwie `presentation`.
- Granice pilnuje ESLint (`eslint-plugin-boundaries`).
- Nazwy plików: `kebab-case.ts`, use case `start-session.use-case.ts`, port `card-repository.port.ts`.

Testy:

- Use case'y z in-memory implementacjami repozytoriów (nie mockujemy Prismy).
- Repozytoria Prisma integracyjnie na prawdziwym Postgresie (Testcontainers).
- Kontrolery: testy e2e Nesta (supertest) tylko dla ścieżek krytycznych (auth, entitlement, webhook płatności).

## Konsekwencje

- Każda zewnętrzna zależność wymaga portu w `application` i wiązania przez token w module Nest.
- Wymiana dostawcy (np. kolejny adapter płatności) nie zmienia use case'ów ani domeny.
- Domena i use case'y są testowane szybko, bez Nesta, bazy i sieci.
- Naruszenie kierunku zależności kończy się błędem lintu. Poprawiamy kod, nie konfigurację ESLint.
- Każdy nowy moduł zaczyna od tej samej struktury czterech warstw.

## Odrzucone opcje

Dokumentacja projektu nie opisuje innych rozważanych architektur api. Wprost wykluczone są:

- **Use case'y lub kontrolery sięgające bezpośrednio do Prismy lub Stripe**: tylko przez porty.
- **Logika w kontrolerach**: kontroler wywołuje use case i nic więcej.
- **Bezpośrednie importy między modułami z cudzych `domain` i `infrastructure`**: komunikacja przez porty.
- **Mockowanie Prismy w testach use case'ów**: używamy in-memory implementacji repozytoriów.
