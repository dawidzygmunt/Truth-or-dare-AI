# 003: `packages/game-engine` z prawdą czy wyzwanie (faza 1, krok 3)

Status: zrealizowany

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

## Odstępstwa od planu (po implementacji)

- `neighboursOf` przyjmuje `players`, nie całą kolejkę: `template.ts` potrzebuje tylko listy.
- Reduktor rozdziela akcje według `phase` w jednym miejscu, a funkcje przejść dostają już zawężony typ stanu. Dzięki temu nie ma w nich strażników fazy, a `ActionNotAllowedError` powstaje tylko w jednym miejscu.
- `core/random.ts` używa `const [value = 0] = crypto.getRandomValues(buffer)`, bo `as number` łamie `non-nullable-type-assertion-style`, a `!` łamie `no-non-null-assertion`. Domyślne `0` jest nieosiągalne.
- Testy serializacji (5.7) przeszły od razu, bo zaprojektowany kształt stanu już je spełniał, więc nie było fazy red. Zdolność wykrywania błędów sprawdzona mutacją: `Random` w stanie, brak zapisu pozycji talii i brak normalizacji `penaltyShots` dają czerwone testy serializacji. Mutacja cofnięta.

## Poprawki po review

Branch `fix/game-engine-review`. Publiczne API z `src/index.ts`, kształt stanu i sygnatura reduktora bez zmian. Decyzje o stanie i reduktorze zapisuje `docs/adr/0006-game-engine-state-model.md`.

- **Mutanty, które przechodziły 102 testy.** Pętla odrzucania w `random.ts` (usunięta, `limit = UINT32_RANGE`, `>` zamiast `>=`) oraz tasowanie z `Math.min(nextInt, nextInt)` i z nietasowanym pierwszym elementem. Dodano `createRandomFromUint32Source(next)` wyeksportowane z `core/random.ts` (nie z `index.ts`) i testy ze skryptowanym źródłem (`[0xffffffff, 0xfffffffe]` dla `nextInt(3)` daje `2` po dwóch odczytach, `nextInt(2 ** 32)` niczego nie odrzuca), test równomierności `shuffle([0, 1, 2])` na 6000 prób z seedem oraz te same przypadki `RangeError` dla crypto co dla seedowanego. Każdy mutant po wprowadzeniu daje czerwony test.
- **Nazwy graczy.** Nazwa jest zapisywana w NFC i przycinana, a kluczem duplikatu jest nazwa bez znaków formatujących (`\p{Cf}`), w NFC i małymi literami. Pusta jest nazwa, w której po usunięciu `\p{Z}`, `\p{Cc}` i `\p{Cf}` nic nie zostaje. „Zoé” w NFC i w NFD oraz „Ola” i „Ola” ze spacją zerowej szerokości na końcu to teraz duplikaty. Zapisana nazwa zachowuje to, co wpisał gracz, poza przycięciem i NFC.
- **`GameError.name`** to nazwa konkretnej klasy (`new.target.name`). W wyniku `tsc` (ES2023) i w Vitest działa. W minifikowanej paczce Vite 8 (Rolldown) nazwy klas są skracane (sprawdzone: `t`, `r`, `n`), więc w produkcyjnym froncie `name` nie jest czytelne bez `build.rolldownOptions.output.keepNames: true` w konfiguracji `apps/web`. Stabilnym identyfikatorem dla UI zostaje `code`.
- **`penaltyShots`.** `createDeck` zamienia wszystko, co nie jest dodatnią liczbą całkowitą (0, ujemne, ułamki, `NaN`, nieskończoność), na `null`, więc `penaltyShots ?? 1` z `KICKOFF.md` daje 1 jak dla braku pola. Zgodne z `packages/contracts` (`int().positive().nullable()`).
- **Testy wzmocnione (i dlaczego były słabe):**
  - „keeps going after a kind is exhausted” sprawdzał tylko `phase`, więc przechodził też przy talii, która wraca na początek bez tasowania. Teraz sprawdza, że każdy cykl obsługuje każdą kartę raz, a osobny test, że po wyczerpaniu stos ma nową kolejność w stanie, a drugi rodzaj kart jest nietknięty.
  - Test zamrożonego stanu robił po jednym dobraniu prawdy i wyzwania, więc nigdy nie wchodził w ścieżkę ponownego tasowania. Nowy test robi cztery dobrania z 2-kartowego stosu ze zamrożonego stanu.
  - „never sums shots”: wbrew opisowi z review kara nie była tam `null` (test kończy się na `fail`), więc wykrywał sumowanie. Był jednak słaby inaczej: wszystkie karty miały 3 shoty i sprawdzany był tylko ostatni `fail`, więc nie odróżniał wartości ostatniej karty od maksimum czy wartości przeniesionej z poprzednich tur (taki mutant przechodził). Teraz karty mają 1, 2, 4 i 8 shotów, a po każdym z sześciu kolejnych `fail` kara musi równać się wartości właśnie dobranej karty.
