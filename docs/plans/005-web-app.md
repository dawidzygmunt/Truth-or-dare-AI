# 005: `apps/web`, prawda czy wyzwanie od początku do końca (faza 1, krok 5)

Status: zrealizowany

Zadania z roadmapy: T5.1–T5.5 (`docs/roadmap.md`). ADR-y powiązane: 0001, 0004, 0005, nowy 0006 (cache service workera).

## Cel

Gość przechodzi w telefonie cały przepływ: age gate → wybór edycji z api → gracze i tryb kar → tury prawdy czy wyzwania. Odświeżenie w trakcie gry przywraca stan, a darmowa edycja działa offline po pierwszym załadowaniu. Działają `pnpm lint && pnpm typecheck && pnpm test && pnpm format:check && pnpm build && pnpm test:e2e`, także po usunięciu katalogów `dist`.

## Zakres

- Age gate 18+ zapamiętany lokalnie (`localStorage`, z działaniem w pamięci, gdy niedostępny).
- Trasy: `/` (katalog), `/setup/:editionSlug` (gracze i tryb kar), `/game` (gra), `/install` (instrukcja iOS).
- Stan gry w Zustand nad reduktorem z `game-engine`, zapisywany w IndexedDB (`idb-keyval`) jako wersjonowana migawka.
- Klient api: `/api/catalog`, `/api/editions/:slug/deck`, walidacja schematami z `@tod/contracts`, TanStack Query, obsługa 403 i błędów sieci.
- PWA: manifest po polsku, ikony placeholder, service worker, cache katalogu i darmowych talii.
- Teksty przez `apps/web/src/i18n` (`CLAUDE.md` wygrywa z `shared/i18n` z architektury), także etykiety aria.
- Vitest + Testing Library w `apps/web`, działające na świeżym klonie bez `dist`.
- Baza dla `pnpm test:e2e`: osobny projekt compose `tod-e2e` na porcie 55432.
- `data-testid` potrzebne w kroku 6.

## Poza zakresem

- Pełne testy Playwright (krok 6). Tu tylko ręczna weryfikacja przepływu skryptem jednorazowym.
- Logowanie, zakupy: płatna edycja jest widoczna jako zablokowana i nie da się jej uruchomić.
- `beforeinstallprompt` na Androidzie (T7.5).
- Filtrowanie po `Edition.platforms`: poprawny filtr wymaga rozpoznania TWA, więc wraca w fazie 4. Filtr `web` dzisiaj nic nie zmienia (seed ma obie platformy), a później byłby błędny w aplikacji z Play.
- Tokeny designu i docelowy wygląd: `docs/design/` jest puste, zostają domyślne klasy Tailwinda.
- Pije ten kto i beer pong: katalog pokaże każdą grę, ale ekran gry zna tylko prawdę czy wyzwanie.
- Talie płatne w IndexedDB (faza 3).

## Decyzje

### Stan gry

- `createGameStore({ random, storage })` to fabryka na `zustand/vanilla`. Sklep trafia do komponentów przez kontekst, więc testy podają seedowany `Random` i własny magazyn bez mockowania silnika. Reduktor jest wywoływany raz na akcję, poza Reactem.
- Przy `{ ok: false }` stan zostaje stary, a do `error` trafia stabilny `code`. Komponent mapuje go na tekst przez `pl.errors`.
- Sklep sam wykonuje `nextTurn`, gdy gra stoi w `awaitingTurn` bez kary (start gry, „wykonane”, „nie wykonane” w trybie `none`). Dzięki temu tryb `none` przechodzi dalej od razu, a komponent nie decyduje o przebiegu gry. Kara w trybie `shots` czeka na przycisk „Dalej”.
- Reguły graczy (minimum, duplikaty, puste nazwy) są tylko w silniku. Ekran pokazuje błąd zwrócony przez `start` i niczego nie sprawdza sam.

### Trwałość

- Migawka: `{ version: 1, game }`. Starą wersję, nieczytelny kształt i błąd odczytu traktujemy jak brak gry, a zły zapis usuwamy.
- Kształt stanu sprawdza schemat Zod w `features/truth-or-dare/game-snapshot.ts`, otypowany jako `z.ZodType<TruthOrDareState>`, więc zmiana stanu w silniku psuje typecheck i wymusza decyzję o podniesieniu wersji. Reduktor zakłada poprawny stan (np. tablicę graczy) i rzuciłby wyjątkiem na złych danych. Silnik zostaje bez zmian i bez zależności. `zod` staje się jawną zależnością `apps/web` (i tak jest w bundlu przez `contracts`).
- Magazyn jest portem `GameStorage`. Sklep łapie każdy błąd zapisu i odczytu: w trybie prywatnym gra działa w pamięci.

### Api i offline

- `ApiError` ma `code` (`edition_locked`, `not_found`, `offline`, `server`, `invalid_response`). 401 i 403 to `edition_locked`.
- TanStack Query z `networkMode: 'always'`. Domyślny tryb `online` wstrzymuje zapytania przy `navigator.onLine === false`, więc żądanie nigdy nie doszłoby do service workera z cache.
- Service worker przez `injectManifest` i własny `src/sw/sw.ts` zamiast `generateSW`: dopuszczenie talii do cache zależy od katalogu, czego nie da się wyrazić samą konfiguracją. Szczegóły w ADR 0006.
- Przy pierwszej wizycie strona nie jest jeszcze kontrolowana przez worker, więc jej żądania omijają cache. Dlatego worker w `install` sam pobiera katalog i talie darmowych edycji. Po `navigator.serviceWorker.ready` dane są już na miejscu.
- Do cache trafiają tylko odpowiedzi 200, a talia tylko wtedy, gdy zapisany katalog mówi, że edycja ma `tier: "free"`. Brak katalogu oznacza brak zapisu (fail closed).

### UI

- `<main>` i `<h1>` są na każdym ekranie, też w age gate, więc istniejący smoke test Playwrighta zostaje bez zmian.
- Domyślny tryb kar to `none`: każdą grę da się prowadzić bez picia (`docs/architecture.md`, sekcja 8).
- `BrowserRouter` i `Routes` bez data routera: nie potrzebujemy loaderów.

### Baza w E2E

- `docker-compose.yml` dostaje `POSTGRES_PORT` (domyślnie 5432). Port 5432 na tej maszynie jest zajęty przez inny projekt i nie wolno go ruszać.
- `webServer` api w Playwright: `docker compose -p tod-e2e up -d --wait postgres`, `prisma migrate deploy`, `db:seed`, build, start. Zmienne podane jawnie, więc lokalny `.env` ich nie nadpisze. Kontener zostaje po testach, żeby kolejne uruchomienia były szybkie.

## Pliki do zmiany

```
apps/web/package.json, tsconfig.json, vite.config.ts, index.html                     (zmiana)
apps/web/vitest.config.ts, apps/web/src/test/{setup.ts,render-app.tsx,fixtures.ts,memory-storage.ts}   (nowe)
apps/web/public/{icon-192.png,icon-512.png,icon-maskable-512.png,apple-touch-icon.png}  (nowe)
apps/web/src/main.tsx                                      (zmiana)
apps/web/src/i18n/{pl.ts,plural.ts}                        (zmiana, nowy)
apps/web/src/app/{app.tsx,app-routes.tsx,providers.tsx,age-gate.tsx}                 (nowe, zmiana)
apps/web/src/features/catalog/catalog-screen.tsx           (nowy)
apps/web/src/features/session-setup/setup-screen.tsx       (nowy)
apps/web/src/features/truth-or-dare/{game-store.ts,game-store-context.tsx,game-snapshot.ts,game-screen.tsx}  (nowe)
apps/web/src/features/install/install-screen.tsx           (nowy)
apps/web/src/shared/api/{api-error.ts,api-client.ts,queries.ts,query-client.ts}      (nowe)
apps/web/src/shared/storage/{key-value-storage.ts,age-gate-storage.ts}               (nowe)
apps/web/src/shared/ui/{screen.tsx,button.tsx,api-error-message.tsx,loading-message.tsx}  (nowe)
apps/web/src/sw/{sw.ts,offline-cache-policy.ts}            (nowe)
docker-compose.yml, .env.example, e2e/playwright.config.ts (zmiana)
docs/adr/0006-service-worker-offline-cache.md              (nowy)
```

`docs/roadmap.md`, `CLAUDE.md`, `docs/architecture.md`, `docs/KICKOFF.md` zostają bez zmian. Rozbieżności trafiają do raportu.

## Testy do napisania (kolejność red)

1. `i18n/plural.test.ts`: polska odmiana 1 shot, 2 shoty, 5 shotów, 22 shoty. Red, bo: brak modułu.
2. `app/age-gate.test.tsx`: pierwsze uruchomienie pokazuje bramkę, potwierdzenie odsłania aplikację i zostaje zapamiętane, odmowa blokuje, niedostępny `localStorage` nie psuje przepływu.
3. `shared/storage/key-value-storage.test.ts`: zapis, odczyt i usuwanie na `fake-indexeddb`; odrzucenie zamiast wyjątku synchronicznego, gdy IndexedDB nie istnieje.
4. `shared/api/api-client.test.ts`: poprawna odpowiedź, 403, 404, 500, błąd sieci, odpowiedź niezgodna ze schematem; `shared/api/query-client.test.ts`: 403 bez ponawiania, tryb `always`.
5. `features/truth-or-dare/game-snapshot.test.ts`: round-trip w każdej fazie, odrzucenie starej wersji, śmieci i uszkodzonego stanu.
6. `features/truth-or-dare/game-store.test.ts` (prawdziwy silnik, `createSeededRandom`):
   1. start przechodzi do tury pierwszego gracza; błędy setupu zwracają `code` i nie tworzą gry;
   2. `complete` i `fail` w `none` przechodzą dalej od razu; `fail` w `shots` zatrzymuje się na karze, `nextTurn` ją kasuje;
   3. niedozwolona akcja zostawia stan, ustawia `error`, kolejna udana akcja go czyści;
   4. reduktor jest wołany raz na akcję (licznik `Random`);
   5. zapis po każdej akcji, `hydrate` przywraca grę i talię, `reset` czyści magazyn;
   6. stara i uszkodzona migawka: świeży start i usunięcie zapisu; magazyn odrzucający `load` i `save`: gra działa w pamięci; `hydrate` nie nadpisuje gry już rozpoczętej.
7. `features/catalog/catalog-screen.test.tsx`: lista z api, edycja płatna zablokowana bez linku, błąd z ponowieniem, pusta lista, „kontynuuj grę”.
8. `features/session-setup/setup-screen.test.tsx`: dodawanie i usuwanie graczy, błędy silnika jako `alert`, wybór trybu kar trafia do gry, 403 i błąd sieci przy talii.
9. `features/truth-or-dare/game-screen.test.tsx`: imię gracza, wybór, karta, tryb `shots` z karą i bez niej w `none`, przywrócenie gry, przekierowanie bez gry, błąd z `code`.
10. `features/install/install-screen.test.tsx`: kroki instrukcji iOS.
11. `sw/offline-cache-policy.test.ts`: tylko darmowe talie, zły katalog daje pustą listę, rozgrzewka nie pobiera talii płatnych i nie zapisuje odpowiedzi innych niż 200, awaria api nie blokuje instalacji.

Zmiana przepływu użytkownika: test Playwright to krok 6. Tu weryfikacja jednorazowym skryptem na obu silnikach przeglądarek.

## Kroki

1. Ten plan.
2. Narzędzia testowe, alias na źródła `@tod/*` w Vitest.
3. i18n, age gate, router, providery (testy 1–2).
4. Magazyn i klient api (testy 3–4).
5. Migawka i sklep (testy 5–6).
6. Ekrany (testy 7–10).
7. Service worker, manifest, ikony, ADR 0006 (test 11).
8. Baza E2E, przepływ sprawdzony skryptem jednorazowym, także offline i z płatną edycją.
9. Weryfikacja bez `dist`: `pnpm lint && pnpm typecheck && pnpm test && pnpm format:check && pnpm build && pnpm test:e2e`.
10. Odstępstwa w tym planie, push `feat/web-app`.

## Ryzyka

- **Pierwsza wizyta bez kontroli workera**: strona, która jeszcze nie jest kontrolowana, nie zasila cache. Rozwiązane rozgrzewką w `install`.
- **`install` zależy od api**: rozgrzewka łapie błędy i ma limit czasu, a brak danych nie blokuje instalacji. Wtedy cache zapełnia się przy normalnym użyciu.
- **WebKit w Playwright a service worker i `setOffline`**: zachowanie na Linuksie może różnić się od Safari. Sprawdzić skryptem i opisać wynik dla kroku 6.
- **Limit czasu `webServer`**: pobranie obrazu Postgresa i buildy mogą przekroczyć domyślne 60 s, więc limit zostaje podniesiony.
- **`reuseExistingServer` lokalnie**: serwer zostawiony na porcie 3100 pomija start bazy. Zachowanie Playwrighta, bez obejścia.

## Odstępstwa od planu (po implementacji)

- Puste imię: przycisk „Dodaj gracza” jest wyłączony, gdy pole po przycięciu jest puste. To obsługa formularza, reguły graczy nadal egzekwuje silnik. `empty_player_name` ma tłumaczenie, ale z tego ekranu nie jest osiągalny.
- Bez `workbox-cacheable-response`: `CacheableResponsePlugin` nie kompiluje się z `exactOptionalPropertyTypes` (typ `WorkboxPlugin`), a warunek to jedna linia, więc jest zwykłym pluginem w `sw.ts`.
- SW budowany jako `iife` (`rollupFormat`), bo `registerSW.js` rejestruje klasyczny skrypt.
- CI bez zmian: `pnpm test:e2e` sam uruchamia bazę, a `ubuntu-latest` ma Dockera z compose. Nie sprawdzone na GitHub Actions, tylko lokalnie.
- Smoke test Playwrighta bez zmian: age gate ma `main` i `h1`.
- Weryfikacja jednorazowym skryptem (usuniętym) na `iphone-webkit` i `pixel-chromium`: pełny przepływ, 5 tur, odświeżenie z kartą i z karą, tryb `none`, offline zaraz po pierwszym załadowaniu bez wchodzenia na ekran graczy, edycja płatna (lista, 403, brak w cache), odpowiedź 200 dla edycji płatnej wg katalogu nie trafia do cache, gra w pamięci przy zablokowanym IndexedDB.
