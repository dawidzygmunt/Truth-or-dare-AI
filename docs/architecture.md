# Architektura

Status: wersja wstępna (listopad 2026). Zmiany decyzji zapisuj jako ADR w `docs/adr/`.

## 1. Cel i wymagania

Platforma gier imprezowych na telefon:

- Gry karciane: prawda czy wyzwanie, nigdy przenigdy oraz beer pong. Beer pong i nigdy przenigdy to proste losowanie kart bez imion graczy i kar (ADR 0008). W beer pongu aplikacja nie liczy kubków.
- Dwa tryby kar wybierane przy starcie gry:
  - **Shoty**: karta ma karę w liczbie shotów, wyświetlaną, gdy gracz nie wykona zadania.
  - **Bez kar**: gracz oznacza „nie wykonane” i gra toczy się dalej. Nic nie jest zapisywane.
- Każda gra ma **edycje** (np. „Klasyczna”, „Spicy”), darmowe lub płatne.
- Granie w darmowe edycje **bez konta**. Zakup i dostęp do płatnych edycji wymaga logowania.
- Dystrybucja: PWA (iPhone przez Safari, Android, desktop) oraz aplikacja Android w Google Play (TWA nad tą samą PWA).
- Darmowe edycje działają offline po pierwszym załadowaniu.

Wymagania niefunkcjonalne: mobile-first, szybki start (< 2 s na 4G), działanie przy słabym zasięgu, TDD, testy E2E na WebKit i Chromium.

## 2. Struktura repozytorium

```
/
├─ apps/
│  ├─ web/                 React + Vite PWA
│  └─ api/                 NestJS
├─ packages/
│  ├─ game-engine/         czysta logika gier (TS, bez zależności od frameworków)
│  └─ contracts/           schematy Zod i typy DTO web↔api
├─ e2e/                    testy Playwright
├─ android/                konfiguracja TWA (Bubblewrap), dodana w fazie Play
├─ docs/
│  ├─ architecture.md
│  ├─ adr/
│  └─ design/              eksporty z Claude Design, tokeny, opis ekranów
├─ docker-compose.yml      Postgres (+ Mailpit do magic linków lokalnie)
├─ CLAUDE.md
└─ .claude/agents/         subagenci (np. code-reviewer)
```

### Graf zależności

```
apps/web ──► packages/game-engine
   │    └──► packages/contracts ◄── apps/api
   └─(HTTP)──────────────────────────► apps/api
```

`game-engine` nie importuje niczego z `apps/*` ani `contracts`. `contracts` nie importuje niczego poza Zod.

## 3. Model domeny

```
Game        id, slug, name, engine: "card_deck", description
Edition     id, gameId, slug, name, tier: "free" | "paid", productId?, intensity,
            ageRating, platforms: ("web" | "android")[], locale, isPublished
Card        id, editionId, kind: "truth" | "dare" | "statement" | "challenge",
            template, tags[], intensity, penaltyShots?
User        id, email, createdAt
Entitlement id, userId, scope: { editionId } | "all_access",
            source: "stripe" | "google_play", externalRef, grantedAt, revokedAt?
Purchase    id, userId, provider, externalId, productId, status, amount, currency
```

Gracze w sesji gry **nie są encjami w bazie**. To lokalny stan rozgrywki.

Na razie wszystkie gry używają silnika `card_deck`. Pole `engine` zostaje, żeby w przyszłości dodać grę o innej mechanice bez migracji modelu.

### Tryby kar

`PenaltyMode = "shots" | "none"`, wybierany w ustawieniach sesji, nie w edycji:

- `shots`: po „nie wykonane” silnik zwraca `penaltyShots` z karty (domyślnie 1, gdy karta go nie ma).
- `none`: „nie wykonane” tylko przechodzi do następnej tury. Silnik niczego nie zlicza.

Shoty **nie są sumowane** na gracza ani pokazywane w rankingu. Zliczanie i rywalizacja w piciu łamałyby politykę Google Play.

### Szablony kart

Karta to szablon z placeholderami rozwiązywanymi przez silnik:

- `{player}`: gracz, którego jest tura
- `{randomPlayer}`: losowy inny gracz
- `{playerLeft}` / `{playerRight}`: sąsiedzi wg kolejności

Przykład: `"{player}, opowiedz {randomPlayer} o swojej najgorszej randce."`
Karta z `{randomPlayer}` jest pomijana, jeśli w grze jest tylko jeden gracz.

## 4. `packages/game-engine`

Serce aplikacji. Działa w przeglądarce offline, więc logika gier **nie** może zależeć od api.

```
game-engine/src/
├─ core/
│  ├─ random.ts            port Random + implementacja seedowana (testy) i crypto (produkcja)
│  ├─ deck.ts              tasowanie, dobieranie bez powtórzeń, resetowanie talii
│  ├─ player-queue.ts      kolejka tur: rotacja / losowanie bez powtórzeń w rundzie
│  └─ template.ts          rozwiązywanie placeholderów
├─ games/
│  ├─ truth-or-dare/       stan, akcje (chooseTruth, chooseDare, skip, next), reguły
│  └─ card-draw/           losowanie kart: beer pong i nigdy przenigdy
└─ index.ts
```

Zasady:
- Każda gra to funkcja reduktora `(state, action) => state` plus selektory. Stan jest serializowalny (JSON), co daje trwałość sesji w IndexedDB i łatwe testy.
- Losowość tylko przez wstrzyknięty `Random`. Testy używają seeda, więc wyniki są deterministyczne.
- Brak wiedzy o płatnościach. Silnik dostaje gotową listę kart.

Przykład przepływu prawda czy wyzwanie:

```
setup(players, cards) → nextTurn() → state.currentPlayer = "Ola"
chooseTruth() → state.currentCard = resolve(drawFrom("truth"), players)
complete() | fail() → nextTurn() …
  fail() w trybie "shots" → state.penalty = { player: "Ola", shots: 2 }
  fail() w trybie "none"  → state.penalty = null
```

Przepływ `card_draw`, czyli beer pong i nigdy przenigdy (bez graczy, kolejki i kar, ADR 0008):

```
setup(cards) → draw() → state.currentCard = drawFrom(talia)
draw() → kolejna karta; po wyczerpaniu talia jest tasowana od nowa
```

## 5. `apps/api`: NestJS w Clean Architecture

### Moduły (bounded contexts)

| Moduł       | Odpowiedzialność                                            |
|-------------|-------------------------------------------------------------|
| `catalog`   | gry, edycje, karty; publiczny katalog; wydawanie talii      |
| `identity`  | użytkownicy, logowanie (Google, magic link), sesje           |
| `billing`   | checkout, webhooki płatności, `Entitlement`                  |
| `admin`     | zarządzanie treściami (później; na start tylko seed)         |

### Warstwy w module

```
modules/catalog/
├─ domain/            Edition, Card, EditionLockedError, reguły dostępu
├─ application/
│  ├─ ports/          EditionRepository, EntitlementChecker
│  └─ use-cases/      ListCatalog, GetEditionDeck
├─ infrastructure/    PrismaEditionRepository, …
└─ presentation/      CatalogController, DTO (z packages/contracts), guardy
```

Reguła zależności: `presentation` i `infrastructure` → `application` → `domain`. Wiązanie portów z implementacjami w module Nest przez tokeny (`{ provide: EDITION_REPOSITORY, useClass: PrismaEditionRepository }`). Use case'y to zwykłe klasy z metodą `execute()`, testowalne bez Nesta.

Komunikacja między modułami: `catalog` pyta `billing` o uprawnienia przez port `EntitlementChecker`, który implementuje adapter w module billing. Brak bezpośrednich importów z cudzych `domain` i `infrastructure`.

### Najważniejsze endpointy

```
GET  /catalog                         gry + edycje (z flagą locked dla bieżącego usera)
GET  /editions/:slug/deck             karty edycji; 401/403 dla płatnej bez entitlement
POST /auth/magic-link                 wysyła link
GET  /auth/magic-link/verify
GET  /auth/google, /auth/google/callback
POST /auth/logout
GET  /me                              profil + lista entitlementów
POST /billing/checkout                { productId } → URL Stripe Checkout
POST /billing/webhooks/stripe         nadaje / odbiera Entitlement
```

### Uwierzytelnianie

- Passport w NestJS: Google OAuth + magic link mailem. Sign in with Apple w późniejszej fazie.
- Sesja: krótkotrwały access token i refresh token w ciasteczkach `httpOnly`, `Secure`, `SameSite=Lax`. Web i api pod jedną domeną (`app.example.pl` + `/api` przez reverse proxy) upraszcza ciasteczka i TWA.

## 6. `apps/web`: React PWA

```
apps/web/src/
├─ app/               router, providery, layout, age gate
├─ features/
│  ├─ catalog/        lista gier i edycji, ekran zakupu
│  ├─ session-setup/  dodawanie graczy, wybór edycji, tryb kar (shoty / bez kar)
│  ├─ truth-or-dare/  ekrany gry (renderują stan z game-engine)
│  ├─ card-draw/      beer pong i nigdy przenigdy
│  └─ account/        logowanie, zakupy
├─ shared/
│  ├─ api/            klient HTTP (typy z contracts), TanStack Query hooks
│  ├─ storage/        adapter IndexedDB dla sesji gry i talii
│  ├─ ui/             komponenty z design systemu
│  └─ i18n/
└─ sw/                konfiguracja service workera
```

- **Stan gry**: Zustand store opakowuje reduktor z `game-engine` i persystuje go do IndexedDB. Odświeżenie strony nie przerywa gry.
- **Stan serwerowy** (katalog, profil, talie): TanStack Query.
- **Offline**: `vite-plugin-pwa` (Workbox). Precache app shell; runtime cache `stale-while-revalidate` dla `/catalog` i talii darmowych edycji. Talie płatne cache'owane w IndexedDB dopiero po pobraniu przez zalogowanego użytkownika.
- **Instalacja**: na Androidzie `beforeinstallprompt`; na iOS ekran z instrukcją „Udostępnij → Do ekranu początkowego”.

## 7. Płatności

Priorytet: prostota integracji ważniejsza niż wysokość prowizji.

### Faza 1: web i PWA (iPhone, Android przez przeglądarkę)
- **Stripe Checkout** (strona hostowana przez Stripe): karty, BLIK, Przelewy24, Apple Pay, Google Pay. Brak własnego formularza płatności.
- Przepływ: `POST /billing/checkout` → przekierowanie do Stripe → webhook `checkout.session.completed` → `GrantEntitlement` → powrót do aplikacji, odświeżenie `/me`.
- Webhook jest jedynym źródłem prawdy o zakupie (nie parametr w URL powrotu). Obsługa idempotentna po `event.id`.
- Produkty: jednorazowe zakupy edycji + pakiet „all access”. Bez subskrypcji na start.

### Faza 2: aplikacja w Google Play
Decyzja do podjęcia przed publikacją (ADR). Opcje:
1. **Google Play Billing** w TWA przez Digital Goods API + Payment Request API. Wymagane klasycznie, najprostsze pod kątem zgodności z zasadami Play.
2. **Program billing choice** Google Play (dostępny w EOG od 30.06.2026): Stripe także w aplikacji z Play, po zapisaniu się do programu; wyższe łączne opłaty i wymogi UI.

W obu przypadkach nowy adapter implementuje port `PaymentProvider`, a `Entitlement` ma `source`. Kupione na webie działa w aplikacji i odwrotnie, bo uprawnienia są przypisane do konta.

```
billing/application/ports/payment-provider.port.ts
  createCheckout(userId, productId): Promise<{ redirectUrl }>
  parseWebhook(rawBody, signature): Promise<PaymentEvent>
```

## 8. Treści i zgodność ze sklepami

- `Edition.platforms` decyduje, gdzie edycja jest widoczna. Aplikacja z Play (wykrywana po `display-mode` i parametrze startowym TWA) ukrywa edycje `web`-only.
- Treści bez promowania upijania się, picia na czas i bez treści seksualnie eksplicytnych w edycjach `android`.
- Każdą grę da się prowadzić w trybie `none` (bez kar), więc aplikacja nie wymaga picia.
- Brak sumowania shotów, rankingów i rywalizacji w piciu.
- Age gate 18+ i klasyfikacja wiekowa w Play Console.

## 9. Testy

| Poziom       | Narzędzie                     | Co testujemy                                         |
|--------------|-------------------------------|------------------------------------------------------|
| Unit         | Vitest                        | `game-engine` (100% reguł gier), domena i use case'y api z in-memory repo |
| Integracyjne | Vitest + Testcontainers       | repozytoria Prisma, webhook Stripe (podpisane payloady testowe) |
| API e2e      | Vitest + supertest            | auth, `/editions/:slug/deck` z i bez entitlementu     |
| Komponenty   | Vitest + Testing Library      | kluczowe ekrany gry                                  |
| E2E          | Playwright                    | przepływy użytkownika                                |

Vitest w NestJS wymaga `unplugin-swc` (obsługa dekoratorów i metadanych).

Playwright, projekty: `iPhone 15` (WebKit), `Pixel 7` (Chromium). Scenariusze krytyczne:
1. Gość: age gate → dodanie 3 graczy → prawda czy wyzwanie → 5 tur, każda z imieniem gracza.
2. Odświeżenie strony w trakcie gry przywraca stan.
2a. Tryb shoty: „nie wykonane” pokazuje karę; tryb bez kar: „nie wykonane” od razu przechodzi do następnej tury.
3. Tryb offline: po pierwszym załadowaniu darmowa edycja działa bez sieci (`context.setOffline(true)`).
4. Płatna edycja dla gościa → ekran logowania.
5. Zakup: Stripe w trybie testowym (lub zamockowany endpoint checkout + wstrzyknięty webhook) → edycja odblokowana.

## 10. Infrastruktura

- Lokalnie: `docker compose` (Postgres, Mailpit).
- CI (GitHub Actions): lint → typecheck → unit/integration → build → Playwright. Merge tylko na zielonym.
- Hosting (do decyzji): frontend jako statyczne pliki (np. Cloudflare Pages), api + Postgres na jednym dostawcy (np. Railway / Render / Fly.io). Wymóg: jedna domena dla web i `/api`.
- TWA: `assetlinks.json` w `/.well-known/` (Digital Asset Links) serwowany przez web.

## 11. Fazy

1. **Fundament**: monorepo, CI, `game-engine` z prawdą czy wyzwanie (TDD), PWA z jedną darmową edycją, offline, E2E.
2. **Katalog i treści**: api `catalog`, seed, kolejne gry (beer pong, nigdy przenigdy), age gate, tryby kar.
3. **Konta i płatności**: `identity`, `billing`, Stripe Checkout, pierwsza płatna edycja.
4. **Google Play**: TWA, ADR o płatnościach na Androidzie, przegląd treści pod politykę Play.

## 12. Otwarte decyzje

- Płatności w aplikacji z Play: Play Billing vs billing choice (faza 5).
- Hosting api i bazy.
- Języki: tylko polski czy od razu angielski (wpływa na `Edition.locale`).
- Model cen: tylko jednorazowe zakupy czy także subskrypcja.
