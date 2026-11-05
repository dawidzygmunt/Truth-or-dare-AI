# 007: Design SZOT w `apps/web` (warstwa wizualna po fazie 1)

Status: zrealizowany

Zadania z roadmapy: brak osobnego zadania, praca po zamknięciu fazy 1 na podstawie eksportu Claude Design (`docs/design/screens/plan-szot.dc.html`). ADR-y powiązane: 0006 (cache service workera, precache fontów).

## Cel

`apps/web` wygląda jak design SZOT na szerokości 320–430 px, działa offline razem z fontami, a zachowanie aplikacji zostaje bez zmian poza etykietą przycisku „nie wykonane” zależną od trybu kar. Przechodzą `pnpm lint && pnpm typecheck && pnpm test && pnpm format:check && pnpm build && pnpm test:e2e`, także po usunięciu `dist`.

## Zakres

- Tokeny w jednym miejscu: `docs/design/tokens/tokens.css` jako blok `@theme` Tailwinda v4, importowany z `apps/web/src/index.css`. W komponentach nie ma surowych kolorów, a domyślna paleta Tailwinda jest wyłączona (`--color-*: initial`), więc klasa spoza tokenów nic nie wygeneruje.
- Fonty lokalnie przez `@fontsource-variable/space-grotesk` i `@fontsource-variable/dm-sans` (subset latin-ext dla polskich znaków, `font-display: swap`). Pliki `woff2` trafiają do precache service workera. Bez Google Fonts: link z eksportu nie zadziałałby offline.
- Nazwa „SZOT” i hasło „jedna apka, cała impreza” w manifeście, `index.html` i i18n. `theme_color` i `background_color` to `#0a0510`. Nowe ikony.
- Ekrany z tabeli niżej plus stany bez projektu: age gate, instalacja, błąd, ładowanie, potwierdzenia, wybór prawda/wyzwanie, kara.
- Etykieta „nie wykonane”: w trybie `shots` „Piję 🍺”, w trybie `none` „Nie wykonane”. Tryb `none` nigdzie nie wspomina o piciu.
- Kolor awatara po indeksie gracza, cztery tokeny po kolei w kółko. To czysto UI.
- Zachowane: test id, fokus, `aria-live`, safe area, cele dotyku 48 px, `prefers-reduced-motion`.

Kryteria akceptacji: każda zmiana zachowania ma test z listy niżej, a wygląd sprawdzają zrzuty 390×844 i 320×640 porównane z designem.

## Mapowanie ekranów

| Ekran w designie | Ekran w aplikacji |
| --- | --- |
| Panel „Plan · założenia” | poza zakresem: to opis projektu, nie ekran. Stąd tylko system wizualny (kolory, typografia, logotyp, hasło) |
| 1 · Wbij graczy | `/setup/:editionSlug` (`SetupScreen`). Bez „KROK 1 / 2”, bo po tym ekranie nie ma drugiego kroku z designu. Dodany wybór trybu kar |
| 2 · Wybór gry | poza zakresem: wcześniejsza wersja tego samego ekranu, zastępuje ją 04 |
| 3 · Prawda czy wyzwanie | `/game`, faza z wylosowaną kartą (`GameScreen`). Bez plakietki „🔥 Ostre”, bo nie ma poziomów ostrości |
| 4 · Pije ten, kto… | poza zakresem: tej gry nie ma w katalogu |
| 5 · Nigdy przenigdy | poza zakresem: tej gry nie ma w katalogu |
| 6 · Poziom ostrości | poza zakresem: w fazie 1 nie ma poziomów ostrości. Stąd tylko wzorzec karty wyboru, użyty do trybu kar |
| 7 · Tryb drużynowy | poza zakresem: drużyny nie istnieją, a punkty i wyniki łamią zasady z `CLAUDE.md` |
| 8 · Premium (paywall) | poza zakresem: zakupy to faza 3 |
| 03 · Wariant A | poza zakresem jako osobny ekran: szkic wariantu rozwiniętego w 04 |
| 03 · Wariant B, Wariant C | poza zakresem: warianty odrzucone w designie |
| 04 · Wariant A, pełny ekran główny | `/` (`CatalogScreen`). Nagłówek „W co gramy?”, karta „Wróć do gry”, wyróżniony kafel pierwszej gry, pozostałe gry jako zwykłe kafle, plakietka „★ PRO” |

Stany bez projektu, zbudowane z tego samego języka: age gate, `/install`, ekran błędu, ładowanie, panel potwierdzenia, faza wyboru prawda/wyzwanie (dwa duże kafle), kara.

## Poza zakresem

- Z designu świadomie nie budujemy: dolnej nawigacji, Drużyn, Profilu, ikony ustawień, „Losuj grę”, banera SZOT PRO, paywalla, ekranu ostrości, „Domówka u Kuby · #14”, „Runda 7”, „12 / 50”, listy graczy na ekranie głównym, kafli gier spoza katalogu. To nie istnieje w fazie 1, a aplikacja nie pokazuje wymyślonych danych.
- Plakietka „⭐ NAJPOPULARNIEJSZE”: nie mamy takich danych. Na kaflu stoi opis gry z api.
- „Gotowi na szoty?”: zastąpione przez „W co gramy?” (`CLAUDE.md`, zasady treści).
- Filtrowanie po `platforms`, zmiany w `packages/` i `apps/api`.

## Decyzje

- **Kontrast.** Design zestawia biały tekst z gradientami, które nie spełniają WCAG AA (4,5:1). Wartości policzone z oklch na sRGB:

| Para w designie | Kontrast z białym | Po zmianie |
| --- | --- | --- |
| CTA `0.74 0.19 350` → `0.64 0.2 300` | 2,53 i 3,66 | `0.58 0.19 350` → `0.58 0.2 300`, min. 4,64 |
| Kafel `0.7 0.19 350` → `0.6 0.2 320` | 2,94 i 4,38 | `0.58 0.19 350` → `0.58 0.2 320`, min. 4,69 |
| Karta `0.68 0.2 320` → `0.58 0.21 300` | 3,17 i 4,73 | prawda `0.58 0.2 320` → `0.58 0.21 300`, min. 4,67; wyzwanie `0.58 0.19 350` → `0.58 0.2 330`, min. 4,71 |
| Awatar fiolet `0.66 0.2 300` | 3,38 | kolor bez zmian, litera ciemna (`#1a0a14`, 5,66) |

  Tekst na gradientach jest w pełni biały, bez przezroczystości z designu (`.7`, `.8`). Wyciszony tekst na tle ma `.6` zamiast `.45–.5`, bo na szklanych kartach `.45` daje 4,31:1. Ceną jest ciemniejszy róż niż w makiecie, poświata zostaje bez zmian. Minima zmierzone na pikselach gradientów wyrenderowanych w Chromium.
- **Panel potwierdzenia jest wyśrodkowaną nakładką.** CTA stoi przy dolnej krawędzi, więc panel w tym miejscu postawiłby „potwierdź” dokładnie pod drugim tapnięciem i złamał test `double-tap`. Nakładka trzyma przyciski z dala od dołu ekranu, a tło zjada drugie tapnięcie.
- **Kafle wyboru stoją na środku, nie przy dolnej krawędzi.** Dzięki temu nie nachodzą na „Zrobione”: podwójne tapnięcie nie wybiera za następnego gracza. Pilnuje tego nowy test e2e.
- **`current-player` to nadal `<h1>` z samym imieniem.** „Kolej:” stoi obok nagłówka, bo testy czytają w nim dokładnie imię i tam trafia fokus.
- **Pole imienia ma prawdziwą etykietę**, ukrytą wizualnie (`sr-only`). Wiersz z designu to pole z placeholderem „Dodaj gracza” i okrągłym przyciskiem `+`.
- **Fokus i nazwy dostępne bez zmian.** Dopiski na kartach trybu kar idą przez `aria-describedby`, a karta „Wróć do gry” ma `aria-label`, więc nazwy kontrolek zostają krótkie.
- **`DM Sans` bez osi `opsz`.** Plik `wght` waży o ponad 25 kB mniej na subset, a różnica przy tych rozmiarach jest niewidoczna.
- **Animacja `scfloat`** jest tylko na znaku wodnym `?!` i tylko przez wariant `motion-safe`.

## Pliki do zmiany

```
docs/design/tokens/tokens.css                        (nowy) tokeny jako @theme
docs/design/screens/implemented/*.png                (nowe) zrzuty 390×844
apps/web/package.json, pnpm-lock.yaml                (zmiana) fonty
apps/web/vite.config.ts, index.html, public/*        (zmiana) manifest, globy precache, ikony
apps/web/src/index.css, main.tsx                     (zmiana) tokeny, fonty, tło
apps/web/src/i18n/pl.ts                              (zmiana) teksty
apps/web/src/shared/ui/{avatar,back-link,wordmark}.tsx  (nowe)
apps/web/src/shared/ui/*.tsx                         (zmiana) przyciski, ramka ekranu, stany
apps/web/src/app/{age-gate,error-boundary}.tsx       (zmiana)
apps/web/src/features/*/*-screen.tsx                 (zmiana) ekrany
e2e/tests/{offline,mobile,double-tap}.spec.ts        (zmiana) fonty offline, reduced motion, tapnięcia
```

## Testy do napisania (kolejność red)

1. `apps/web/src/features/truth-or-dare/game-screen.test.tsx`: etykieta przycisku zależy od trybu. Red, bo: jest jedna etykieta.
   1. `shots`: widać „Piję 🍺”, nie ma „Nie wykonane”;
   2. `none`: widać „Nie wykonane”, nigdzie nie ma „Piję”.
2. `apps/web/src/shared/ui/avatar.test.tsx`: kolor awatara po indeksie, cztery tokeny, potem od nowa, oraz litera imienia. Red, bo: brak komponentu.
3. `apps/web/src/features/session-setup/setup-screen.test.tsx`: awatary graczy kolejno w kolorach z cyklu. Red, bo: brak awatarów.
4. `apps/web/src/features/truth-or-dare/game-screen.test.tsx`: awatar bieżącego gracza ma kolor z jego pozycji na liście. Red, bo: brak awatara.
5. `apps/web/src/features/catalog/catalog-screen.test.tsx`: karta wznowienia ma tekst „Wróć do gry” i pojawia się tylko przy trwającej grze. Istniejące testy już sprawdzają widoczność; test dopisany dla treści karty. Red, bo: stara etykieta.
6. `apps/web/src/i18n/pl.test.ts`: nazwa „SZOT”, hasło, „W co gramy?” i brak „Gotowi na szoty?”. Red, bo: stare teksty.
7. `e2e/tests/offline.spec.ts`: fonty z polskimi znakami ładują się po odcięciu sieci. Red, bo: `woff2` poza globami precache.
8. `e2e/tests/mobile.spec.ts`: znak wodny pływa, a przy `prefers-reduced-motion` nie ma animacji. Test sprawdza oba tryby, żeby nie przechodził przy braku animacji.
9. `e2e/tests/double-tap.spec.ts`: kafle wyboru nie nachodzą na przyciski karty.

## Kroki

1. Tokeny, fonty, manifest, ikony.
2. Testy 1–6 (red), potem komponenty i ekrany (green).
3. Testy e2e 7–9.
4. Zrzuty 390×844 i 320×640, porównanie z designem, przepełnienia przy 320 px, poprawki.
5. Weryfikacja od stanu bez `dist`: `pnpm lint && pnpm typecheck && pnpm test && pnpm format:check && pnpm build && pnpm test:e2e`.
6. Push brancha.

## Ryzyka

- **Tekst e2e w elementach z test id**: `current-player`, `card-kind` i `penalty` są czytane dosłownie. Ozdoby idą poza te elementy, a wielkie litery przez CSS.
- **Precache**: fonty zwiększają pierwsze pobranie o kilkadziesiąt kB. Sprawdzamy rozmiar przed i po.
- **Emoji w etykietach**: renderują się czcionką systemu, więc wyglądają różnie na iOS i Androidzie.

## Odstępstwa od planu (po implementacji)

- `Wszystkie gry` zostaje jako etykieta nad kaflami, bez selektora ostrości. Przy jednej grze w katalogu brzmi trochę na wyrost, ale to układ z designu.
- Nagłówki `Kto dziś gra?` i tekst kart mieszczą się w jednej kolumnie bez wymuszonych złamań z makiety, bo szerokość jest płynna.
- Karta „Kolej:” ma 16 px zamiast 14 px, awatar 36 px zamiast 30 px: makieta ma 300 px szerokości, ekran docelowy 390 px.
- Wyciszony tekst przy zaznaczonej karcie trybu kar ma `.8`, bo tło jest tam jaśniejsze.
- Tytuł `Gra` zostaje tylko na ekranie ładowania gry, poza nim `h1` to imię gracza.
- Ikona to litera S narysowana ścieżką, bez fontu, żeby `icon.svg` nie zależał od fontów systemu.
- `docs/design/screens/implemented/home-pro.png` powstał na podstawionym katalogu z nazwami próbnymi, bo seed nie ma płatnej edycji ani drugiej gry.
