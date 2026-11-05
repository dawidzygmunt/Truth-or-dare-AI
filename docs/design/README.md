# Design

Tu trafiają eksporty z Claude Design, tokeny designu i opisy ekranów aplikacji. To źródło prawdy dla wyglądu UI w `apps/web`.

## Struktura

```
docs/design/
├─ README.md
├─ screens/     eksporty ekranów z Claude Design i opisy ekranów
└─ tokens/      tokeny designu
```

- `screens/`: eksporty ekranów (jeśli są) wraz z krótkim opisem każdego ekranu, czyli co pokazuje i jakie ma stany. Format eksportu zależy od Claude Design i nie jest tu narzucany. Nazwy plików w `kebab-case`.
- `tokens/`: tokeny designu (kolory, typografia, odstępy). Tailwind w `apps/web` korzysta z tokenów z tego katalogu.

## Zasady

- Eksporty wrzucamy tu przed pracą nad UI. Jeśli katalogi są puste, `apps/web` dostaje prosty mobile-first placeholder, bez wymyślania docelowego designu.
- Teksty w eksportach to materiał poglądowy. W aplikacji teksty UI są po polsku i idą przez i18n (`apps/web`), nigdy nie są zahardkodowane w komponentach.
- Treść kart (prawdy, wyzwania itd.) nie należy do designu. To dane w bazie, seed w `apps/api/prisma/seed/`.
- Katalog `docs/` jest wyłączony z Prettiera, więc eksporty nie są automatycznie przeformatowywane.

## Puste katalogi w gicie

Git nie śledzi pustych katalogów, dlatego w `screens/` i `tokens/` leżą pliki `.gitkeep`. Gdy dodasz pierwszy prawdziwy plik do danego katalogu, możesz usunąć jego `.gitkeep`.
