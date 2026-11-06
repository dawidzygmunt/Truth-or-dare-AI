# 0008: Beer pong i nigdy przenigdy jako proste losowanie kart

## Status

Zaakceptowany. Zastępuje w ADR 0004 część „Beer pong jako karty” oraz założenie, że wszystkie gry używają jednego przepływu `card_deck`.

## Kontekst

- Zakres to trzy gry: prawda czy wyzwanie, beer pong i nigdy przenigdy (roadmap, D9). „Pije ten kto” nie jest osobną grą, to nigdy przenigdy.
- Beer pong miał wskazywać trafionego gracza (`hit(player)`). Użytkownik zdecydował, że to zwykłe losowanie wyzwań pod beer ponga, bez imion i kar.
- Nigdy przenigdy działa tak samo, różni się tylko treścią kart.
- Obie gry mają pozwalać na wybór wersji kart.

## Decyzja

**Wspólny silnik.** Nowa wartość `GameEngine`: `card_draw`. W `packages/game-engine` jeden reduktor `games/card-draw/` obsługuje obie gry. `card_deck` zostaje bez zmian i oznacza przepływ prawdy czy wyzwania.

**Przepływ.** Gra → wybór wersji (`Edition`) → losowanie. Akcja to dobranie następnej karty. Po wyczerpaniu talii silnik tasuje ją od nowa, jak w `core/deck.ts`.

**Bez graczy i kar.** Gry `card_draw` nie mają ekranu graczy, kolejki tur, placeholderów, `penaltyShots` ani trybu kar. Nie ma „wykonane” ani „nie wykonane”.

**Karty.** Beer pong używa rodzaju `challenge`, nigdy przenigdy rodzaju `statement`. Oba rodzaje są już w modelu, więc `Card` się nie zmienia. Szablony tych gier są zwykłym tekstem, seed odrzuca w nich placeholdery i `penaltyShots`.

**Wersje.** Wersja to `Edition`, jak w D8. Wybór, poziom darmowy lub płatny i `platforms` działają tak samo jak w prawdzie czy wyzwaniu.

**Web.** Jeden feature `apps/web/src/features/card-draw/` obsługuje obie gry. Różnią się tylko danymi z katalogu i tekstami i18n.

## Konsekwencje

- Trzecia gra nie wymaga trzeciego silnika: nową grę tego typu dodaje się samym seedem.
- Rozszerzenie `GameEngine` wymaga migracji i zmiany schematu w `packages/contracts`.
- Routing z TD.4 wybiera przepływ na podstawie `Game.engine`, a nie sluga gry.
- Snapshot sesji w IndexedDB ma osobny kształt dla `card_draw`.
- Polityki z ADR 0004 obowiązują nadal: bez sumowania shotów, rankingów i liczenia kubków.

## Odrzucone opcje

- **`hit(player)` w beer pongu**: użytkownik chce samo losowanie, bez imion.
- **Osobne reduktory dla każdej gry**: mechanika jest identyczna, więc byłby to zduplikowany kod.
- **Tryb `card_deck` bez graczy**: mieszałby w reduktorze prawdy czy wyzwania dwa przepływy.
- **Rozróżnianie przepływu po slugu gry**: każda nowa gra wymagałaby zmiany w kodzie.
