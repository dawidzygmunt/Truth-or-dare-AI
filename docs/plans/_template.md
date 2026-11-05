# NNN: Tytuł zadania (faza X, krok Y)

Status: szkic

<!--
Jak używać:
- Skopiuj ten plik do `docs/plans/NNN-nazwa.md` (kolejny wolny numer, nazwa w kebab-case).
- Usuń komentarze HTML i sekcje, które nie mają zastosowania (zostaw nagłówek z dopiskiem „nie dotyczy”, jeśli brak treści).
- Status: `szkic` → `zaakceptowany` (po akceptacji użytkownika) → `w toku` → `zrealizowany`.
- Plan pisze się przed implementacją i czeka na akceptację. Implementacja idzie w TDD według listy testów poniżej.
- Wzór wypełnienia: `docs/plans/001-repo-skeleton.md`.
-->

Zadania z roadmapy: T… (`docs/roadmap.md`). ADR-y powiązane: … (lub „brak”).

## Cel

Jedno–trzy zdania: co ma działać po tym zadaniu i po czym to poznać (np. które komendy lub testy przechodzą).

## Zakres

- Co wchodzi do zadania, konkretnie i sprawdzalnie.
- Kryteria akceptacji: każde = co najmniej jeden test z listy poniżej.

## Poza zakresem

- Co świadomie pomijamy i w którym kroku lub zadaniu to wróci.
- Decyzje, które nie należą do tego zadania. Pytania do użytkownika oznacz **Do potwierdzenia**.

## Pliki do zmiany

Nowe i modyfikowane pliki, pogrupowane wg pakietu lub warstwy. Nazwy plików w `kebab-case.ts`, use case `*.use-case.ts`, port `*.port.ts`.

```
packages/…/src/…        (nowy | zmiana) krótki opis
apps/api/src/modules/…  (nowy | zmiana) krótki opis
```

Wskaż, które dokumenty trzeba zaktualizować (np. nowy ADR, gdy zadanie wymaga decyzji architektonicznej).

## Testy do napisania (kolejność red)

Testy piszemy przed kodem, w tej kolejności. Dla każdego: plik, zachowanie i oczekiwany powód porażki (red), zanim powstanie implementacja.

1. `ścieżka/do/pliku.test.ts`: zachowanie opisane jednym zdaniem. Red, bo: brak funkcji / zły wynik / brak błędu.
   1. wariant lub przypadek brzegowy;
   2. błąd domenowy (np. `EditionLockedError`) zamiast zmiany stanu.
2. `ścieżka/do/innego.test.ts`: …

Wytyczne (z `CLAUDE.md`):

- `game-engine`: bez mocków, losowość przez `Random` z seedem.
- Use case'y api: z in-memory repozytoriami, bez mockowania Prismy.
- Repozytoria Prisma: Testcontainers na prawdziwym Postgresie.
- Kontrolery: supertest tylko dla ścieżek krytycznych (auth, entitlement, webhook płatności).
- Zmiana przepływu użytkownika: test Playwright (`getByRole` / `getByTestId`, projekty iPhone/WebKit i Pixel/Chromium).

## Kroki

Kolejność implementacji. Każdy krok zaczyna się od testu red, potem green, potem refaktor.

1. Test 1 (red) → minimalny kod (green) → refaktor.
2. Test 2 (red) → …
3. Weryfikacja: `pnpm lint && pnpm typecheck && pnpm test` (oraz `pnpm test:e2e`, jeśli zmieniono przepływ użytkownika).
4. Review diffu przez subagenta `code-reviewer`, poprawa blokerów.
5. Commit w Conventional Commits na osobnym branchu (`feat/…`, `chore/…`, `fix/…`) i PR do `main`.

## Ryzyka

- **Nazwa ryzyka**: opis, wpływ i plan awaryjny lub sposób wykrycia.

## Odstępstwa od planu (po implementacji)

Wypełniane po zakończeniu: co wyszło inaczej niż w planie i dlaczego. Usuń sekcję, jeśli nie było odstępstw.
