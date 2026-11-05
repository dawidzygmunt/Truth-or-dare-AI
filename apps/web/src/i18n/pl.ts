import { plural } from './plural.js';

export const pl = {
  app: {
    title: 'Prawda czy wyzwanie',
    description: 'Gry imprezowe na telefon',
  },
  common: {
    loading: 'Ładowanie…',
    retry: 'Spróbuj ponownie',
    back: 'Wróć',
  },
  ageGate: {
    title: 'Masz ukończone 18 lat?',
    description: 'Ta aplikacja jest przeznaczona wyłącznie dla osób pełnoletnich.',
    confirm: 'Mam 18 lat',
    decline: 'Nie mam 18 lat',
    declined: 'Aplikacja jest tylko dla pełnoletnich',
  },
  catalog: {
    title: 'Wybierz grę',
    empty: 'Nie ma jeszcze żadnych gier.',
    locked: 'Zablokowana',
    resume: 'Kontynuuj grę',
    install: 'Dodaj do ekranu początkowego',
  },
  setup: {
    title: 'Gracze',
    playerName: 'Imię gracza',
    addPlayer: 'Dodaj gracza',
    playersList: 'Lista graczy',
    removePlayer: (name: string) => `Usuń gracza ${name}`,
    penaltyMode: 'Tryb kar',
    penaltyNone: 'Bez kar',
    penaltyShots: 'Shoty',
    start: 'Zacznij grę',
    replaceConfirm: {
      title: 'Zacząć nową grę?',
      description: 'Trwająca gra zostanie zakończona.',
      confirm: 'Tak, zacznij nową',
      cancel: 'Nie zaczynaj',
    },
    removeSymbol: '×',
  },
  game: {
    title: 'Gra',
    truth: 'Prawda',
    dare: 'Wyzwanie',
    done: 'Wykonane',
    notDone: 'Nie wykonane',
    next: 'Dalej',
    end: 'Zakończ grę',
    endConfirm: {
      title: 'Zakończyć grę?',
      description: 'Tej gry nie będzie można już kontynuować.',
      confirm: 'Tak, zakończ',
      cancel: 'Wróć do gry',
    },
    penalty: (player: string, shots: number) =>
      `${player}: ${shots} ${plural(shots, { one: 'shot', few: 'shoty', many: 'shotów' })}`,
  },
  install: {
    title: 'Dodaj na iPhone’a',
    steps: [
      'Otwórz tę stronę w Safari.',
      'Stuknij przycisk Udostępnij.',
      'Wybierz „Do ekranu początkowego”.',
      'Potwierdź przyciskiem „Dodaj”.',
    ],
  },
  fatalError: {
    title: 'Coś poszło nie tak',
    description: 'Aplikacja napotkała błąd. Trwająca gra zostanie zakończona.',
    restart: 'Zacznij od nowa',
  },
  apiErrors: {
    edition_locked: 'Ta edycja jest zablokowana.',
    not_found: 'Nie znaleziono tej edycji.',
    offline: 'Brak połączenia. Sprawdź internet i spróbuj ponownie.',
    server: 'Coś poszło nie tak po naszej stronie. Spróbuj ponownie.',
    invalid_response: 'Nie udało się odczytać danych. Spróbuj ponownie później.',
  },
  gameErrors: {
    too_few_players: 'Dodaj co najmniej dwóch graczy.',
    empty_player_name: 'Imię gracza nie może być puste.',
    duplicate_player_name: 'Imiona graczy muszą być różne.',
    missing_card_kind: 'Ta talia jest niekompletna.',
    action_not_allowed: 'Tego nie można teraz zrobić.',
    game_corrupted: 'Nie udało się kontynuować tej gry. Zacznij nową.',
  },
};
