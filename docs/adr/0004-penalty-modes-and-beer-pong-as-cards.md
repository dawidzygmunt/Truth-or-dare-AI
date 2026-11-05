# 0004: Tryby kar i beer pong jako karty

## Status

Zaakceptowany.

## Kontekst

- Gry to prawda czy wyzwanie, pije ten kto i beer pong (kolejne później). Wszystkie działają na jednym silniku kart `card_deck`.
- Aplikacja trafi do Google Play. Polityka Google Play nie pozwala na promowanie upijania się i picia na czas ani na treści seksualnie eksplicytne w edycjach na Androida.
- Zliczanie i rywalizacja w piciu łamałyby politykę Google Play.
- Aplikacja nie może wymagać picia: każdą grę trzeba móc prowadzić bez kar.
- W beer pongu aplikacja nie liczy kubków, a kolejność wyznacza gra przy stole.

Źródła: `docs/architecture.md` (§1, §3, §4, §8), `docs/KICKOFF.md` (Gry, Tryby kar, Treści i Google Play), `CLAUDE.md` (Treści i zgodność).

## Decyzja

**Tryby kar.** `PenaltyMode = "shots" | "none"`, wybierany przy starcie sesji, w ustawieniach sesji (nie w edycji):

- `shots`: po „nie wykonane” silnik zwraca `penaltyShots` z karty (domyślnie 1, gdy karta go nie ma), dla bieżącego gracza.
- `none`: „nie wykonane” tylko przechodzi do następnej tury. Silnik niczego nie ustawia ani nie zlicza.

W stanie gry kara jest tylko chwilową informacją do wyświetlenia (`state.penalty = { player, shots }` albo `null`).

**Brak sumowania.** Shoty nie są sumowane na gracza i nie ma rankingów picia ani statystyk.

**Beer pong jako karty.** Aplikacja nie liczy kubków. Beer pong to talia kart `challenge`: wskazujesz gracza, któremu wrzucono piłeczkę (`hit(player)`), i losuje się dla niego wyzwanie. Kolejka tur nie jest używana, bo kolejność wyznacza gra przy stole.

**Wspólny silnik.** Wszystkie gry używają `card_deck`. Karty to szablony z placeholderami (`{player}`, `{randomPlayer}`, `{playerLeft}`, `{playerRight}`) rozwiązywanymi przez silnik, a ich rodzaje to `truth`, `dare`, `statement` i `challenge`. Pole `Game.engine` zostaje, żeby w przyszłości dodać grę o innej mechanice bez migracji modelu.

**Treści.** Karty to dane w bazie (seed), nie w kodzie. Bez promowania upijania się i picia na czas oraz bez treści seksualnie eksplicytnych. Pole `Edition.platforms` pozwala trzymać śmielsze edycje tylko na webie (`["web"]`).

## Konsekwencje

- Silnik nie trzyma liczników kar, więc nie ma z czego zbudować rankingu ani sumy shotów.
- Każdą grę da się prowadzić w trybie `none`, więc aplikacja nie wymaga picia.
- Beer pong nie ma stanu stołu ani kubków. Jego logika to wskazanie gracza i wylosowanie karty `challenge`.
- Nowa gra o innej mechanice nie wymaga migracji modelu (`Game.engine`).
- Wprowadzenie sumowania shotów, rankingów lub liczenia kubków wymaga nowego ADR i przeglądu zgodności z polityką Google Play.
- Formalny przegląd treści pod politykę Play jest w fazie Google Play (roadmap T9.5), ale nowe karty i edycje podlegają tym samym zasadom od początku (`CLAUDE.md`).

## Odrzucone opcje

- **Sumowanie shotów na gracza, rankingi picia**: łamałyby politykę Google Play.
- **Liczenie kubków w beer pongu**: aplikacja nie liczy kubków, tylko losuje wyzwanie dla trafionego gracza.
- **Karę wymaganą w każdej grze**: dlatego tryb `none` jest dostępny dla każdej gry.
- **Tryb kar jako właściwość edycji**: tryb wybiera się przy starcie sesji.
