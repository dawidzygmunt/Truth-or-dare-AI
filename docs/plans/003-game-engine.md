# 003: `packages/game-engine` z prawdą czy wyzwanie (faza 1, krok 3)

Status: w realizacji

## Cel

Silnik gier w czystym TypeScripcie: elementy wspólne (`Random`, talia, kolejka graczy, szablony) i gra prawda czy wyzwanie jako reduktor plus selektory. Stan jest serializowalny do JSON, a gra toczy się dalej ze stanu odtworzonego po `JSON.parse(JSON.stringify(state))`. `apps/web` (krok 5) buduje na publicznym API z `src/index.ts`.

## Zakres

- `core/random.ts`: port `Random`, `createSeededRandom(seed)` (testy), `createCryptoRandom()` (produkcja, `globalThis.crypto`).
- `core/deck.ts`: tasowanie, dobieranie bez powtórzeń, ponowne tasowanie tylko wyczerpanego rodzaju kart.
- `core/player-queue.ts`: walidacja graczy, rotacja w kolejności dodania, sąsiedzi.
- `core/template.ts`: podstawianie `{player}`, `{randomPlayer}`, `{playerLeft}`, `{playerRight}`.
- `core/result.ts`, `core/errors.ts`: wynik operacji i błędy domenowe.
- `games/truth-or-dare/`: setup, reduktor, selektory.
- Publiczne API w `src/index.ts`. `ENGINE_VERSION` i jego test zostają.

## Poza zakresem

- Pije ten kto, beer pong (brak stanu i reduktorów tych gier; rodzaje `statement` i `challenge` są tylko akceptowane w typie karty).
- Tryb losowania kolejki („losowanie bez powtórzeń w rundzie” z architektury). Kryteria kroku 3 wymagają tylko rotacji.
- Akcja `skip` z `docs/architecture.md`: kryteria z `KICKOFF.md` definiują tylko `complete | fail`.
- Trwałość w IndexedDB, Zustand, UI (krok 5).
- Pomijanie kart z `{randomPlayer}` przy jednym graczu: minimum to 2 graczy, więc ten przypadek nie występuje w tej grze. Nie budujemy obsługi.
- Unikanie tej samej karty dwa razy z rzędu na styku cykli talii: kryteria mówią o braku powtórzeń do wyczerpania, nie między cyklami.

## Decyzje

### Wynik i błędy domenowe

- Reduktor zwraca `Result<TruthOrDareState, ActionNotAllowedError | MissingCardKindError>`:
  `{ ok: true, value: nowyStan } | { ok: false, error }`.
- Przy błędzie nowego stanu nie ma w ogóle, więc „nie zmienia stanu” wynika z typu: wywołujący zostaje przy starym stanie i musi obsłużyć gałąź błędu. Reduktor nie mutuje wejścia (testy na głęboko zamrożonym stanie).
- Błędu nie zapisujemy w stanie: stan opisuje grę, nie ostatnią nieudaną akcję.
- Błędy domenowe to klasy (konwencja z `CLAUDE.md`), dziedziczą po `GameError` i mają pole `code` do mapowania na i18n. Są zwracane, nie rzucane. `throw` zostaje tylko dla błędów programisty (`RangeError` przy złym argumencie `nextInt`).
- `setupTruthOrDare` używa tego samego `Result`, bo przy złej konfiguracji nie ma jeszcze żadnego stanu.

### `Random` a reduktor i serializacja

- `Random` nie jest częścią stanu. `createTruthOrDareReducer(random)` zwraca funkcję `(state, action) => Result`, więc kształt reduktora z architektury zostaje, a `Random` jest wstrzyknięty raz, na zewnątrz stanu.
- W stanie jest pełna pozycja rozgrywki: przetasowana kolejność kart i `nextIndex` każdego stosu, `nextIndex` kolejki graczy, rozwiązany tekst bieżącej karty. Odtworzona gra dobiera te same karty w tej samej kolejności, niezależnie od użytego `Random`, aż do następnego tasowania. `{randomPlayer}` jest rozwiązywany raz, przy dobieraniu, więc odświeżenie strony nie zmienia tekstu karty.
- `Random` zużywany jest tylko przy tasowaniu i wyborze `{randomPlayer}`. `createCryptoRandom` nie ma stanu do odtworzenia. Generator seedowany służy tylko testom, więc nie jest serializowany: test ciągłości używa dwóch instancji z tym samym seedem.
- Reduktor nie jest ściśle czysty, gdy `Random` to crypto (dwa wywołania mogą dać inny wynik). Dla `apps/web`: wywoływać go raz na akcję, poza Reactowym `useReducer` w StrictMode. Zustand tego wymogu nie narusza.
- Stan nie zawiera `undefined`: pola puste to `null`, a `penaltyShots` karty jest normalizowane do `number | null` przy tworzeniu talii. Dzięki temu round-trip JSON jest ścisły (`toStrictEqual`).

### Dostęp do `globalThis.crypto` bez DOM i `@types/node`

`tsconfig.json` pakietu ma `types: ["node"]`, ale `tsconfig.build.json` dziedziczy `types: []` i `lib: ["es2023"]`, gdzie `crypto` nie istnieje. W `core/random.ts` jest lokalna deklaracja ambientowa w zakresie modułu:

```ts
declare const crypto: { getRandomValues(array: Uint32Array): Uint32Array };
```

Nic nie emituje, działa w każdym tsconfigu (także w `apps/web` z `lib: dom`), bez nowej zależności, bez rzutowań i bez zmian w konfiguracji.

### Brak kart danego rodzaju

- `setupTruthOrDare` zwraca `MissingCardKindError(kind)`, gdy talia nie ma ani jednej prawdy albo ani jednego wyzwania. Błąd wychodzi od razu przy starcie, gra nie utknie w połowie, a UI nie potrzebuje wyłączania przycisków.
- Po ponownym tasowaniu stos nigdy nie jest pusty, więc w poprawnym stanie dobieranie zawsze się udaje. `chooseTruth`/`chooseDare` zwracają ten sam błąd dla stanu, który go nie spełnia (np. ręcznie zmieniony stan z IndexedDB), zamiast rzucać wyjątek.
- Karty `statement` i `challenge` w tej grze są ignorowane: lądują na swoich stosach i nigdy nie są dobierane.

### Stan i przejścia

```
setupTruthOrDare(config, random)      phase = awaitingTurn, currentPlayer = null
nextTurn                              awaitingTurn → choosing,  kolejny gracz, penalty = null
chooseTruth | chooseDare              choosing → cardDrawn,     currentCard = rozwiązana karta
complete                              cardDrawn → awaitingTurn, currentCard = null
fail                                  cardDrawn → awaitingTurn, currentCard = null, penalty wg trybu
```

- Stan to unia dyskryminowana po `phase`, więc reguły nie mają nieosiągalnych sprawdzeń `null`.
- Każda akcja poza powyższymi przejściami zwraca `ActionNotAllowedError(action, phase)`.
- `penalty` to `{ player, shots } | null`, dotyczy tylko ostatniej karty, jest nadpisywane i kasowane przez `nextTurn`. Stan nie ma żadnego licznika shotów na gracza.
- Lewy sąsiad to poprzedni na liście, prawy to następny, z zawijaniem.

### Typ karty

`Card` jest strukturalnie zgodny z tym, co zwróci `packages/contracts`, bez importu:
`{ id: string; kind: CardKind; template: string; penaltyShots?: number | null | undefined }`.
Jawne `| undefined` jest konieczne przy `exactOptionalPropertyTypes`: Zod `.nullable().optional()` daje typ z `undefined`, który inaczej nie byłby przypisywalny. Typ `{ penaltyShots?: number | null }` nadal się przypisuje.

## Pliki

```
packages/game-engine/src/
├─ index.ts, index.test.ts
├─ core/
│  ├─ errors.ts, result.ts
│  ├─ random.ts, random.test.ts
│  ├─ deck.ts, deck.test.ts
│  ├─ player-queue.ts, player-queue.test.ts
│  └─ template.ts, template.test.ts
└─ games/truth-or-dare/
   ├─ index.ts
   ├─ state.ts              typy stanu, akcji, setup
   ├─ reducer.ts
   ├─ selectors.ts
   └─ truth-or-dare.test.ts
```

## Testy do napisania (kolejność red)

1. `random.test.ts`
   1. seedowany: ten sam seed daje ten sam ciąg, inny seed inny;
   2. `nextInt(n)` zawsze całkowite z `[0, n)` i pokrywa cały zakres;
   3. `nextInt` odrzuca `0`, ujemne i niecałkowite (`RangeError`);
   4. crypto: wartości z zakresu, pokrywa cały zakres, ten sam `RangeError`.
2. `deck.test.ts`
   1. `shuffle`: permutacja wejścia, nie mutuje wejścia, deterministyczna dla seeda, zmienia kolejność;
   2. dobieranie: bez powtórzeń do wyczerpania rodzaju; nie mutuje talii;
   3. po wyczerpaniu: nowy pełny cykl tego rodzaju, inne stosy nietknięte;
   4. dobieranie z pustego rodzaju daje `null`;
   5. `penaltyShots` znormalizowane do `null`.
3. `player-queue.test.ts`
   1. rotacja w kolejności dodania, zawijanie po ostatnim;
   2. przycinanie nazw;
   3. mniej niż 2 graczy, pusta nazwa, duplikat bez rozróżniania wielkości liter (także polskie znaki) → błędy;
   4. sąsiedzi z zawijaniem.
4. `template.test.ts`
   1. podstawianie wszystkich placeholderów i wielokrotnych wystąpień, nieznany placeholder zostaje;
   2. `{randomPlayer}` nigdy nie jest bieżącym graczem (wiele seedów), w jednej karcie to ta sama osoba;
   3. nazwy z `$&` i `{player}` podstawiane dosłownie.
5. `truth-or-dare.test.ts`
   1. setup: stan początkowy, błędy graczy, `MissingCardKindError`;
   2. przepływ: `nextTurn → chooseTruth|chooseDare → complete → nextTurn`, kolejność graczy, karta właściwego rodzaju z rozwiązanym tekstem, bez powtórzeń;
   3. `fail`: `shots` z `penaltyShots`, domyślnie 1 dla `null` i braku pola, `none` bez kary, `nextTurn` kasuje karę;
   4. brak sumowania: kolejne `fail` tego samego gracza dają tylko karę ostatniej karty, klucze stanu się nie zmieniają;
   5. każda niedozwolona akcja w każdej fazie → `ActionNotAllowedError`, zamrożony stan nieruszony;
   6. stan niespełniający niezmiennika talii → `MissingCardKindError`;
   7. serializacja: `toStrictEqual` po round-tripie w każdej fazie; gra odtworzona zachowuje się jak oryginał (ten sam seed), reszta cyklu talii jest ta sama przy dowolnym `Random`, tekst bieżącej karty się nie zmienia.
6. `index.test.ts`: cała tura przez publiczne API z `createCryptoRandom`. Istniejący test `ENGINE_VERSION` bez zmian.

## Kroki

1. Commit planu.
2. Moduły `core` w kolejności testów 1–4, każdy cykl: test (red, uruchomiony), minimalny kod (green), refaktor. Osobne commity `test(game-engine)` i `feat(game-engine)`.
3. Prawda czy wyzwanie w kolejności testów 5.
4. Publiczne API i test 6.
5. Weryfikacja z korzenia repo: `pnpm lint && pnpm typecheck && pnpm test && pnpm format:check` oraz `pnpm --filter game-engine build`. Push `feat/game-engine`.

## Ryzyka

- **Build a typecheck różnią się `types`**: typecheck przechodzi z `@types/node`, a `tsc -p tsconfig.build.json` go nie ma. Dlatego `build` jest częścią weryfikacji.
- **`noUncheckedIndexedAccess` a zakaz `!`**: `strictTypeChecked` zabrania non-null assertion. Kod ma używać `splice`/destrukturyzacji i helpera `pickOne`, nie `!`.
- **Stan z IndexedDB ze starszej wersji silnika** może mieć inny kształt. Wersjonowanie stanu to temat kroku 5 (`ENGINE_VERSION` może być kluczem).
- **Reshuffle a powtórka na styku cykli**: ostatnia karta cyklu może wyjść pierwsza w następnym. Akceptowane, zob. „Poza zakresem”.
