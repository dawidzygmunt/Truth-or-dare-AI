# 0007: Model stanu i reduktora w `game-engine`

## Status

Zaakceptowany. Decyzje zapadły przy implementacji kroku 3 (`docs/plans/003-game-engine.md`, sekcja „Decyzje”). Ten ADR je zapisuje, bo `apps/web` (krok 5) buduje na nich swój kod.

## Kontekst

- `docs/architecture.md` (§4): każda gra to funkcja reduktora `(state, action) => state` plus selektory. Stan jest serializowalny do JSON (trwałość sesji w IndexedDB). Losowość tylko przez wstrzyknięty `Random`.
- `docs/KICKOFF.md` (krok 3):
  - niedozwolone akcje „zwracają błąd domenowy, nie zmieniają stanu”;
  - `JSON.parse(JSON.stringify(state))` daje równoważny stan, „z którego gra toczy się dalej”;
  - prawda czy wyzwanie to `setup → nextTurn → chooseTruth | chooseDare → complete | fail → nextTurn`;
  - kolejka graczy ma rotację w kolejności dodania, a minimum to 2 graczy.
- `docs/KICKOFF.md` (krok 5): stan gry jest w Zustand opakowującym reduktor z `game-engine` i persystowany w IndexedDB.
- `docs/architecture.md` (§4) rozjeżdża się z `KICKOFF.md` w dwóch miejscach: szkic katalogu wymienia akcję `skip`, a `player-queue.ts` ma mieć tryby „rotacja / losowanie bez powtórzeń w rundzie”. Kryteria kroku 3 w `KICKOFF.md` mają tylko `complete | fail` i rotację.
- `docs/adr/0004-penalty-modes-and-beer-pong-as-cards.md`: kara w stanie jest tylko chwilową informacją o ostatniej karcie, bez sumowania.

Źródła: `docs/architecture.md` (§4), `docs/KICKOFF.md` (krok 3, krok 5), `docs/plans/003-game-engine.md`, ADR 0004.

## Decyzja

**Reduktor zwraca `Result`.** `createTruthOrDareReducer(random)` zwraca funkcję `(state, action) => Result<TruthOrDareState, ActionNotAllowedError | MissingCardKindError>`, czyli `{ ok: true, value } | { ok: false, error }`.

- `KICKOFF.md` wymaga zwróconego błędu domenowego, więc kształt wyniku różni się od `(state, action) => state` z architektury.
- Przy błędzie nowego stanu nie ma w ogóle, więc „nie zmienia stanu” wynika z typu: wywołujący zostaje przy starym stanie i musi obsłużyć gałąź błędu.
- Błędu nie zapisujemy w stanie: stan opisuje grę, nie ostatnią nieudaną akcję.
- Błędy domenowe są zwracane, nie rzucane. `throw` zostaje dla błędów programisty (`RangeError` przy złym argumencie `nextInt`).
- `setupTruthOrDare` używa tego samego `Result`, bo przy złej konfiguracji nie ma jeszcze stanu.

**`Random` jest związany w fabryce reduktora i nie ma go w stanie.** `createTruthOrDareReducer(random)` przyjmuje `Random` raz, a stan zawiera tylko dane, które da się zapisać jako JSON. Generator seedowany służy tylko testom i nie jest serializowany.

**Stan trzyma pełną pozycję rozgrywki.** W stanie są: przetasowana kolejność kart i `nextIndex` każdego stosu, `nextIndex` kolejki graczy oraz rozwiązany tekst bieżącej karty. Odtworzona gra dobiera te same karty w tej samej kolejności, niezależnie od użytego `Random`, aż do następnego tasowania. `{randomPlayer}` jest rozwiązywany raz, przy dobieraniu, więc odświeżenie strony nie zmienia tekstu karty. Stan nie zawiera `undefined`: pola puste to `null`, a `penaltyShots` karty jest normalizowane do `number | null` przy tworzeniu talii.

**Reduktor wywołuje się raz na akcję, bez Reactowego `useReducer`.** `Random` zużywany jest przy tasowaniu i wyborze `{randomPlayer}`, a `createCryptoRandom` nie ma stanu do odtworzenia, więc reduktor nie jest ściśle czysty: dwa wywołania na tym samym stanie mogą dać inny wynik. `apps/web` woła go raz na akcję, poza `useReducer` w StrictMode. Zustand tego wymogu nie narusza.

**Brak akcji `skip`, kolejka tylko w rotacji.** Obowiązują kryteria z `KICKOFF.md`, nie szkic z `docs/architecture.md` (§4): akcje to `nextTurn`, `chooseTruth`, `chooseDare`, `complete`, `fail`, a kolejka graczy ma wyłącznie rotację w kolejności dodania.

**Pomijanie `{randomPlayer}` przy jednym graczu nie jest zbudowane.** Minimum to 2 graczy, więc w tej grze przypadek jednego gracza nie występuje.

**`{randomPlayer}` może być tą samą osobą co sąsiad.** `{randomPlayer}` to dowolny gracz poza bieżącym, losowany niezależnie od `{playerLeft}` i `{playerRight}`. Na jednej karcie może więc paść „Ania i Ania” (np. szablon `{playerLeft} i {randomPlayer}`). Silnik tego nie wyklucza.

## Konsekwencje

- `apps/web` musi obsługiwać obie gałęzie `Result` po każdej akcji. Przy `ok: false` zostaje przy poprzednim stanie.
- Stan z IndexedDB wystarcza do kontynuowania gry bez zapisywania `Random`. Stan ze starszej wersji silnika może mieć inny kształt, a wersjonowanie stanu (np. przez `ENGINE_VERSION`) jest tematem kroku 5.
- Test ciągłości odtworzonej gry używa dwóch instancji generatora z tym samym seedem, bo pozycji generatora nie da się zapisać.
- Reduktor nie nadaje się do `useReducer` w StrictMode. Wymaga wywołania raz na akcję, np. z akcji w Zustand.
- Rozjazd z `docs/architecture.md` (§4) co do `skip` i losowania kolejki zostaje: dla silnika obowiązuje `KICKOFF.md`.
- Zbieg `{randomPlayer}` z sąsiadem to kwestia treści kart: autor szablonu musi się liczyć z tym, że dwa placeholdery graczy w jednej karcie mogą wskazać tę samą osobę. Przy 2 graczach `{playerLeft}` i `{playerRight}` to zawsze ten sam, jedyny drugi gracz.

## Odrzucone opcje

- **Błędy domenowe rzucane jako wyjątki**: `KICKOFF.md` wymaga zwróconego błędu domenowego. `throw` zostaje dla błędów programisty.
- **Błąd ostatniej akcji w stanie**: stan opisuje grę, nie nieudaną akcję.
- **`Random` w stanie**: stan przestaje być JSON. Mutacja trzymająca `Random` w stanie dała czerwone testy serializacji.
- **Reactowy `useReducer` w StrictMode**: reduktor z crypto `Random` nie jest ściśle czysty (dwa wywołania mogą dać inny wynik), więc ma być wołany raz na akcję.
- **Akcja `skip` i losowanie kolejki bez powtórzeń w rundzie**: poza kryteriami kroku 3 w `KICKOFF.md`, więc nie są zbudowane.
- **Pomijanie kart z `{randomPlayer}` przy jednym graczu**: minimum to 2 graczy, więc nie budujemy obsługi.
