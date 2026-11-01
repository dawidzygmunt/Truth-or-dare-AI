# KICKOFF: start projektu z Claude Code

## Jak użyć

1. Utwórz pusty katalog projektu i zainicjuj git.
2. Wrzuć pliki:
   - `CLAUDE.md` → korzeń repo
   - `architecture.md` → `docs/architecture.md`
   - ten plik → `docs/KICKOFF.md`
3. Eksporty z Claude Design (jeśli są) → `docs/design/screens/`, tokeny → `docs/design/tokens/`.
4. Uruchom Claude Code w katalogu projektu i wklej prompt z sekcji „Prompt startowy” na końcu.

---

## Podsumowanie ustaleń

### Produkt
- Platforma gier imprezowych na telefon: prawda czy wyzwanie, pije ten kto, beer pong (kolejne gry później).
- Każda gra ma edycje (np. „Klasyczna”, „Spicy”), darmowe lub płatne.
- Darmowe edycje bez konta. Płatne wymagają logowania i zakupu.
- PWA (iPhone przez Safari, Android, desktop), później aplikacja Android w Google Play jako TWA nad tą samą PWA.
- Darmowe edycje działają offline po pierwszym załadowaniu.
- Age gate 18+ przy pierwszym uruchomieniu.

### Gry (wszystkie na jednym silniku kart `card_deck`)
- **Prawda czy wyzwanie**: gracze dodawani na starcie, w każdej turze pojawia się gracz, wybiera prawdę lub wyzwanie, losuje się karta.
- **Pije ten kto**: karty-stwierdzenia („Pije ten, kto…”), bez przypisanego gracza.
- **Beer pong**: aplikacja NIE liczy kubków. Wskazujesz gracza, któremu wrzucono piłeczkę, i losuje się dla niego wyzwanie.
- Karty to szablony z placeholderami: `{player}`, `{randomPlayer}`, `{playerLeft}`, `{playerRight}`.

### Tryby kar (wybierane przy starcie sesji)
- `shots`: po „nie wykonane” wyświetla się kara z karty (`penaltyShots`, domyślnie 1).
- `none`: „nie wykonane” po prostu przechodzi do następnej tury, nic nie jest zapisywane.
- Shoty nie są sumowane na gracza, brak rankingów picia (polityka Google Play).

### Technologia
- Monorepo pnpm: `apps/web` (React + Vite + PWA), `apps/api` (NestJS + Prisma + Postgres), `packages/game-engine` (czysty TS), `packages/contracts` (Zod).
- Next.js odrzucony: SPA z Vite jest prostsza do PWA i TWA.
- Clean Architecture w api, logika gier tylko w `game-engine`.
- TDD zawsze. Vitest, Testcontainers, Playwright (iPhone/WebKit + Pixel/Chromium).

### Płatności
- Priorytet: prostota integracji, nie wysokość prowizji.
- Web/PWA: Stripe Checkout (hostowany): karty, BLIK, Przelewy24, Apple Pay, Google Pay. Webhook jest jedynym źródłem prawdy o zakupie.
- Google Play: decyzja (Play Billing vs program billing choice) odłożona do fazy publikacji, za portem `PaymentProvider`.
- Uprawnienia (`Entitlement`) przypisane do konta, działają na każdej platformie.
- Płatne karty nigdy nie trafiają do bundla frontu.

### Treści i Google Play
- Bez promowania upijania się i picia na czas, bez treści seksualnie eksplicytnych w edycjach na Androida.
- Pole `Edition.platforms` pozwala trzymać śmielsze edycje tylko na webie.

### Workflow pracy z AI
- Wiedza projektu w repo: `CLAUDE.md`, `docs/architecture.md`, `docs/adr/`. Bez bazy wektorowej.
- Każde większe zadanie: plan w `docs/plans/NNN-nazwa.md` → akceptacja → TDD → weryfikacja (lint, typecheck, testy) → review przez subagenta → commit.
- Subagenci: `planner` (tylko odczyt kodu, zapis w `docs/plans/`) i `code-reviewer` (tylko odczyt, świeży kontekst).
- Backlog: GitHub Issues (lub `docs/roadmap.md`), plany zadań w `docs/plans/`.
- Zasady egzekwowane narzędziami: TS strict, ESLint z `eslint-plugin-boundaries`, CI.

### Założenia dla otwartych pytań (do potwierdzenia)
- Język: tylko polski, ale z polem `locale` na edycjach.
- Model cen: jednorazowe zakupy edycji + pakiet „all access”, bez subskrypcji.
- Logowanie: Google + magic link mailem, Apple później.
- Treści: seed z plików JSON, panel admina później.
- Hosting: nieustalony; wymóg jednej domeny dla web i `/api`.
- Kolejność tur w prawdzie czy wyzwanie: rotacja w kolejności dodania graczy.

---

## Faza 1: zakres

### Krok 1. Szkielet repo
- pnpm workspaces, TypeScript strict we wszystkich pakietach, wspólny `tsconfig.base.json`.
- ESLint (z `eslint-plugin-boundaries` dla warstw api i zakazu importu `apps/*` w `packages/*`), Prettier.
- Vitest we wszystkich pakietach (w api z `unplugin-swc`), Playwright w `e2e/`.
- `docker-compose.yml` (Postgres, Mailpit), `.env.example`.
- GitHub Actions: lint → typecheck → test → build → e2e.
- Skrypty z sekcji „Komendy” w `CLAUDE.md` muszą działać.

### Krok 2. Dokumentacja i agenci
- ADR: `0001-monorepo-react-vite-nestjs.md`, `0002-clean-architecture-api.md`, `0003-stripe-checkout-behind-port.md`, `0004-penalty-modes-and-beer-pong-as-cards.md`.
- `docs/plans/_template.md`: cel, zakres i poza zakresem, pliki do zmiany, **lista testów do napisania (kolejność red)**, kroki, ryzyka.
- `.claude/agents/planner.md`: tylko narzędzia do czytania + zapis w `docs/plans/`; pisze plan według szablonu, nie implementuje.
- `.claude/agents/code-reviewer.md`: tylko odczyt; sprawdza diff względem `CLAUDE.md`, `docs/architecture.md` i ADR-ów; raport: blokery / sugestie / drobiazgi.
- `docs/design/README.md` ze strukturą katalogu na eksporty.

### Krok 3. `packages/game-engine` (TDD)
Kryteria akceptacji (każde = co najmniej jeden test):
- `Random` port, implementacja seedowana (testy) i oparta na `crypto` (produkcja).
- Talia: tasowanie, dobieranie bez powtórzeń, po wyczerpaniu ponowne tasowanie danego rodzaju kart.
- Kolejka graczy: rotacja w kolejności dodania, zawija się po ostatnim graczu.
- Gracze: min. 2, nazwy przycięte, niepuste, unikalne (bez rozróżniania wielkości liter).
- Szablony: podstawianie placeholderów; `{randomPlayer}` nigdy nie jest graczem z bieżącej tury.
- Prawda czy wyzwanie: `setup → nextTurn → chooseTruth | chooseDare → complete | fail → nextTurn`.
- `fail` w trybie `shots` ustawia karę (`penaltyShots ?? 1`) dla bieżącego gracza; w trybie `none` nie ustawia niczego.
- Niedozwolone akcje (np. `complete` bez wylosowanej karty) zwracają błąd domenowy, nie zmieniają stanu.
- Stan jest serializowalny: `JSON.parse(JSON.stringify(state))` daje równoważny stan, z którego gra toczy się dalej.

### Krok 4. Minimalne `apps/api`
- Moduł `catalog` w Clean Architecture: `ListCatalog`, `GetEditionDeck`.
- Prisma: `Game`, `Edition`, `Card` (bez `User`, `Entitlement` na tym etapie).
- Seed z JSON: prawda czy wyzwanie, edycja „Klasyczna” (free), ok. 30 prawd i 30 wyzwań, część z `penaltyShots`.
- `GET /catalog`, `GET /editions/:slug/deck`. Dla edycji płatnej na razie zawsze 403 (`EditionLockedError`).
- Testy: use case'y z in-memory repo, repozytorium na Testcontainers, e2e endpointu talii.

### Krok 5. `apps/web`
- Age gate 18+ (zapamiętany lokalnie).
- Ekran wyboru gry/edycji (z api), ekran dodawania graczy, wybór trybu kar.
- Ekran gry: imię gracza, wybór prawda/wyzwanie, karta, przyciski „wykonane” / „nie wykonane”, kara w trybie `shots`.
- Stan gry w Zustand opakowującym reduktor z `game-engine`, persystowany w IndexedDB.
- PWA: manifest, ikony (placeholder), service worker, cache katalogu i darmowej talii, ekran instrukcji instalacji na iOS.
- Teksty przez i18n (polski).
- UI: jeśli w `docs/design/` nie ma eksportów, prosty mobile-first placeholder bez wymyślania docelowego designu.

### Krok 6. E2E (Playwright)
1. Gość: age gate → 3 graczy → 5 tur prawdy czy wyzwanie, każda z imieniem właściwego gracza.
2. Odświeżenie strony w trakcie gry przywraca stan.
3. Tryb `shots` pokazuje karę po „nie wykonane”; tryb `none` od razu przechodzi dalej.
4. Offline: po pierwszym załadowaniu gra działa bez sieci.

Poza zakresem fazy 1: logowanie, płatności, pije ten kto, beer pong, TWA.

---

## Prompt startowy

Wklej do Claude Code:

```
Zaczynamy nowy projekt. Przeczytaj CLAUDE.md, docs/architecture.md i docs/KICKOFF.md. To jest komplet ustaleń; nie zmieniaj podjętych decyzji bez pytania mnie.

Realizujemy fazę 1 z KICKOFF.md, krok po kroku (kroki 1–6). Dla każdego kroku:
1. Napisz plan w docs/plans/NNN-nazwa.md (zgodnie z szablonem, gdy już istnieje), z listą testów do napisania. Zatrzymaj się i poczekaj na moją akceptację.
2. Implementuj w TDD: najpierw test, uruchom go i pokaż, że failuje, potem minimalny kod, potem refaktor.
3. Przed zakończeniem kroku uruchom pnpm lint, pnpm typecheck i pnpm test (oraz e2e, jeśli dotyczy). Wszystko musi przejść.
4. Poproś subagenta code-reviewer o review diffu (od kroku 2, gdy już istnieje) i popraw blokery.
5. Zrób commit w Conventional Commits i podsumuj krótko, co powstało i co zostało do decyzji.

Jeśli coś w ustaleniach jest sprzeczne albo niejasne, zapytaj, zanim zaczniesz implementację. Zacznij od planu kroku 1.
```
