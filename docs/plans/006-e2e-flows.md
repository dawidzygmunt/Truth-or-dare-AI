# 006: E2E w Playwright, przepływy użytkownika (faza 1, krok 6)

Status: w toku

Zadania z roadmapy: T6.1–T6.4 (`docs/roadmap.md`). ADR-y powiązane: brak.

## Cel

Cztery scenariusze z `docs/KICKOFF.md` (krok 6) przechodzą na obu projektach przeglądarek, `iphone-webkit` i `pixel-chromium`, a `pnpm lint && pnpm typecheck && pnpm test && pnpm format:check && pnpm test:e2e` przechodzi w całości. Testy opisują widoczne zachowanie aplikacji i nie znają logiki gry. Stabilność sprawdza trzykrotne uruchomienie całego zestawu (`--repeat-each=3`).

## Zakres

- Age gate: pierwsze uruchomienie pokazuje bramkę, potwierdzenie zostaje zapamiętane po odświeżeniu, odmowa nie wpuszcza do aplikacji.
- Przepływ gościa: age gate → katalog → edycja „Klasyczna” → 3 graczy → pięć tur. W każdej turze nagłówek `current-player` pokazuje właściwe imię w kolejności dodania, a po trzecim graczu kolejka zaczyna od nowa (A, B, C, A, B).
- Odświeżenie w trakcie gry: stan wraca z kartą (ten sam gracz, rodzaj i tekst karty) oraz z widoczną karą (ten sam gracz i ta sama liczba shotów). Po odświeżeniu da się grać dalej.
- Tryby kar: `shots` pokazuje `penalty` po „nie wykonane”, a „wykonane” przechodzi dalej bez kary; `none` po „nie wykonane” od razu przechodzi do następnego gracza i nie pokazuje kary. Brak kumulacji: wiele kar z rzędu pokazuje wartość jednej karty, nigdy sumę.
- Offline: po pierwszym załadowaniu, gdy service worker kontroluje stronę, `context.setOffline(true)` nie przeszkadza w pełnym przepływie: katalog, ustawienia, talia, gra.
- Wspólne pomocniki w `e2e/tests/helpers/`, bez zależności między testami i bez współdzielonego kontekstu. Stan zapisany w przeglądarce (localStorage, IndexedDB, cache) jest per kontekst, a każdy test dostaje własny.

Kryteria akceptacji: każdy scenariusz z listy poniżej przechodzi na obu projektach; `pnpm test:e2e --repeat-each=3` przechodzi bez ponowień; każdy scenariusz da się zepsuć (dowód: tymczasowo błędne oczekiwanie, test failuje, zmiana cofnięta).

## Poza zakresem

- Płatna edycja dla gościa i zakup (scenariusze 4 i 5 z sekcji 9 architektury): dopiero w fazie 3 (logowanie, płatności).
- Pije ten kto, beer pong i TWA.
- Zmiany w `apps/`, `packages/`, `docs/roadmap.md`, `CLAUDE.md`, `docs/architecture.md`, `docs/KICKOFF.md`. Jeśli test ujawni błąd aplikacji, nie naprawiamy go tutaj: zatrzymujemy ten test, zgłaszamy z dowodem, a resztę zestawu utrzymujemy zielonym bez osłabiania testu, który padł.
- `e2e/tests/smoke.spec.ts` zostaje bez zmian.

## Decyzje

- **Losowość kart**: talia jest tasowana w przeglądarce, więc test nie zakłada żadnej konkretnej karty. Sprawdza tylko to, co widać: imię gracza, rodzaj karty (`card-kind`), że `card-text` jest niepusty, i że po odświeżeniu te same wartości wracają.
- **Kara**: tekst `penalty` to „Imię: N shot(y/ów)”. Test czyta imię i liczbę z widocznego tekstu i sprawdza, że N jest dodatnią liczbą całkowitą. Konkretna wartość zależy od wylosowanej karty (seed ma karty z `penaltyShots` równym 1 i 2, a karty bez pola dają 1).
- **Brak kumulacji**: test wymusza dziewięć porażek z rzędu (trzech graczy, trzy rundy), więc ten sam gracz dostaje trzy kary. Suma tych kar wynosiłaby co najmniej 3. Granicą jest największa wartość pojedynczej karty z talii pobranej z `/api/editions/truth-or-dare-klasyczna/deck` (`penaltyShots ?? 1`). Każda widoczna kara musi być dodatnią liczbą całkowitą nie większą niż ta granica, a imię w karze musi być imieniem gracza, który właśnie zawiódł. Test czyta dane talii, nie zasady silnika.
- **Offline**: po age gate test czeka na `navigator.serviceWorker.ready`, potem sonduje (`expect.poll`), aż `navigator.serviceWorker.controller !== null`, i dopiero wtedy wywołuje `context.setOffline(true)`. Rozgrzewka z fazy `install` workera ma wtedy dane w cache. Bez `waitForTimeout`; tylko asercje z oczekiwaniem i sondowanie.
- **Selektory**: tylko `getByRole` i `getByTestId`, nigdy klasy CSS. Teksty UI są po polsku i pochodzą z i18n, więc tam, gdzie to możliwe, używamy `data-testid` z listy w planie 005.
- **Pomocniki** (`e2e/tests/helpers/`): `confirmAge(page)`, `openSetup(page)` (katalog → edycja), `addPlayers(page, names)`, `startGame(page, { players, penaltyMode })`, `currentPlayer(page)`, `playTurn(page, { kind, outcome })`, `waitForServiceWorkerControl(page)`. Pomocniki wykonują akcje użytkownika i nie zawierają reguł gry.
- **Izolacja**: testy nie dzielą kontekstu; domyślny fixture `page` tworzy nowy kontekst na test. Testy nie zależą od kolejności (`fullyParallel: true` zostaje).

## Pliki do zmiany

```
e2e/tests/helpers/app.ts          (nowy) akcje użytkownika: age gate, katalog, ustawienia, tury
e2e/tests/helpers/service-worker.ts (nowy) oczekiwanie na kontrolę service workera
e2e/tests/age-gate.spec.ts        (nowy) bramka 18+, pamięć po odświeżeniu, odmowa
e2e/tests/guest-game.spec.ts      (nowy) gość, 3 graczy, 5 tur, rotacja z zawinięciem
e2e/tests/reload.spec.ts          (nowy) odświeżenie z kartą i z karą
e2e/tests/penalty-modes.spec.ts   (nowy) shots i none, brak kumulacji
e2e/tests/offline.spec.ts         (nowy) gra bez sieci po pierwszym załadowaniu
docs/plans/006-e2e-flows.md       (ten plik)
```

`e2e/playwright.config.ts` i `e2e/tests/smoke.spec.ts` bez zmian, chyba że okaże się to konieczne (wtedy opisane w „Odstępstwach”). Żaden dokument z listy zakazanej nie jest zmieniany.

## Testy do napisania (kolejność red)

Aplikacja już istnieje, więc testy powinny w większości przejść od razu. Dla każdego scenariusza „red” to dowód, że test potrafi zawieść: tymczasowo błędne oczekiwanie (np. zły gracz w rotacji), uruchomienie, potwierdzenie porażki z właściwego powodu, cofnięcie zmiany.

1. `age-gate.spec.ts`:
   1. pierwsze uruchomienie pokazuje bramkę (`age-gate-confirm`, `age-gate-decline`) i nie pokazuje katalogu;
   2. po potwierdzeniu i odświeżeniu bramki nie ma, a katalog jest widoczny;
   3. odmowa pokazuje komunikat „tylko dla pełnoletnich”, nie wpuszcza do aplikacji, a odświeżenie znów pokazuje bramkę (odmowa nie jest zapamiętywana).
2. `guest-game.spec.ts`: gość przechodzi age gate → katalog → `edition-truth-or-dare-klasyczna` → dodaje Anię, Bartka i Czesię (`player-item` w tej kolejności) → `start-game` → 5 tur. W turach 1–5 `current-player` to Ania, Bartek, Czesia, Ania, Bartek. W każdej turze użytkownik wybiera prawdę lub wyzwanie, widzi `card-kind` zgodny z wyborem i niepusty `card-text`, i klika „wykonane”.
   1. wariant: start z mniej niż dwoma graczami pokazuje `setup-error` i nie wchodzi do gry.
3. `reload.spec.ts`:
   1. odświeżenie z wylosowaną kartą: ten sam `current-player`, `card-kind` i `card-text`, przyciski `mark-done` i `mark-not-done` aktywne, gra toczy się dalej;
   2. odświeżenie z widoczną karą (`shots`): to samo `penalty`, ten sam gracz, `next-turn` przechodzi do następnego gracza;
   3. `resume-game` na katalogu po odświeżeniu wraca do tej samej tury.
4. `penalty-modes.spec.ts`:
   1. `shots`, „nie wykonane”: `penalty` zawiera imię gracza i dodatnią liczbę całkowitą, `next-turn` przechodzi do następnego gracza, a kara znika;
   2. `shots`, „wykonane”: kolejny gracz bez kary;
   3. `none`, „nie wykonane”: bez `penalty` i bez `next-turn`, od razu następny gracz;
   4. brak kumulacji: dziewięć porażek z rzędu w `shots`, każda kara to wartość jednej karty z talii, nigdy suma.
5. `offline.spec.ts`: po age gate i `waitForServiceWorkerControl` ustawienie `context.setOffline(true)`, potem pełny przepływ (katalog, ustawienia, 3 graczy, start, tura z kartą, „wykonane”). Red, bo: bez oczekiwania na kontrolę workera pierwsze żądanie do api nie ma cache (dowód: wariant bez czekania, jeśli da się go odtworzyć; w przeciwnym razie błędne oczekiwanie).

Wytyczne (z `CLAUDE.md`): selektory przez `getByRole` / `getByTestId`; projekty `iphone-webkit` (iPhone 15) i `pixel-chromium` (Pixel 7); nie zmieniamy ani nie usuwamy istniejącego testu, żeby przeszedł.

## Kroki

1. Ten plan, commit.
2. Pomocniki i `age-gate.spec.ts`.
3. `guest-game.spec.ts`.
4. `penalty-modes.spec.ts`.
5. `reload.spec.ts`.
6. `offline.spec.ts`.
7. Dowód porażki dla każdego scenariusza (tymczasowo błędne oczekiwanie, cofnięcie).
8. `pnpm --filter @tod/e2e test:e2e --repeat-each=3`, raport o stabilności.
9. Weryfikacja: `pnpm lint && pnpm typecheck && pnpm test && pnpm format:check && pnpm test:e2e`.
10. Commity w Conventional Commits na branchu `feat/e2e-flows`, push.

## Ryzyka

- **WebKit, service worker i `setOffline`**: zachowanie WebKit na Linuksie może różnić się od Safari na iOS. Jeśli offline nie działa na WebKit z powodu aplikacji, zgłaszamy z dowodem, a nie osłabiamy testu.
- **Losowość kar**: wartość kary zależy od wylosowanej karty, więc asercje są na własnościach (dodatnia liczba całkowita, granica z talii), a nie na konkretnej wartości.
- **Pierwsza wizyta a kontrola workera**: `ready` nie oznacza jeszcze, że strona jest kontrolowana. Dlatego test sonduje `controller`, zamiast zakładać.
- **`reuseExistingServer` lokalnie**: serwer zostawiony na porcie 3100 pomija start bazy. Zachowanie Playwrighta, bez obejścia. Port 5432 należy do innego projektu i nie jest ruszany; E2E używa projektu compose `tod-e2e` na 55432.
- **Równoległość i jedna baza**: testy tylko czytają `catalog` i `deck`, więc współdzielona baza nie powoduje konfliktów.

## Odstępstwa od planu (po implementacji)

Wypełniane po zakończeniu.
