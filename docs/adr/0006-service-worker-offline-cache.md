# 0006: Własny service worker i cache tylko dla darmowych talii

## Status

Zaakceptowany. Decyzja zapadła przy implementacji kroku 5 (`docs/plans/005-web-app.md`).

## Kontekst

- Darmowa edycja ma działać offline po pierwszym załadowaniu. Płatne karty nigdy nie mogą trafić do cache service workera, a odpowiedzi 403 nie wolno zapisywać.
- `/api/editions/:slug/deck` wygląda tak samo dla edycji darmowej i płatnej. Odpowiedź talii nie ma pola `tier`. W fazie 3 użytkownik z `Entitlement` dostanie dla płatnej edycji 200, więc sam status nie wystarczy.
- Strona, która rejestruje service workera, nie jest jeszcze przez niego kontrolowana. Jej pierwsze żądania omijają cache, więc bez dodatkowego kroku katalog nie byłby dostępny offline po pierwszej wizycie.
- TanStack Query w domyślnym trybie wstrzymuje zapytania przy `navigator.onLine === false` i żądanie nie dochodzi do workera.

## Decyzja

**1. `vite-plugin-pwa` w trybie `injectManifest` z własnym `apps/web/src/sw/sw.ts`.** Runtime cache to nadal Workbox `StaleWhileRevalidate`, zgodnie z `docs/architecture.md`, ale zapisane w kodzie, bo decyzja o zapisie zależy od treści katalogu. SW jest budowany jako `iife`, ponieważ wtyczka rejestruje go jako klasyczny skrypt.

**2. Katalog w cache decyduje, co jest darmowe.** Przed zapisem talii worker czyta zapisany `/api/catalog` i sprawdza `tier: "free"` dla danego sluga. Brak katalogu albo katalog niezgodny z `CatalogResponseSchema` oznacza brak zapisu (fail closed). Liczy się `tier`, nie `locked`: zalogowany właściciel płatnej edycji ma `locked: false`, a jego talii też nie cache'ujemy.

Co dokładnie jest gwarantowane: talia trafia do cache tylko jako poprawna odpowiedź 200 dla edycji, którą katalog zapisany w tej przeglądarce w chwili zapisu podaje jako darmową. Nie jest to gwarancja „płatna talia nigdy nie zostanie zapisana”, bo ten katalog może być nieaktualny. Jeśli edycja stała się płatna po zapisaniu katalogu, odpowiedź 200 dla niej przejdzie przez bramkę. Dziś to nieosiągalne: api odpowiada 403 na każdą talię płatną. Przestaje być nieosiągalne w chwili, gdy `Entitlement` da właścicielowi 200.

**Do rozwiązania przed `Entitlement` (faza 3), bez tego nie wolno ich włączyć.** Decyzja o zapisie musi przestać zależeć od nieaktualnego katalogu, np. przez oznaczenie w odpowiedzi talii (`tier` albo `Cache-Control: no-store` dla talii płatnych, które worker respektuje) albo pominięcie cache dla żądań z tożsamością. Wymaga to zmiany kontraktu, więc nie jest zbudowane teraz.

**3. Zapisujemy tylko poprawne 200.** 403, 404 i błędy serwera nigdy nie trafiają do cache. Odpowiedź 200 niezgodna z `CatalogResponseSchema` albo `DeckResponseSchema` też nie, więc nie nadpisze dobrych danych. Dotyczy to tras workera i rozgrzewki.

**4. Rozgrzewka w `install`.** Worker sam pobiera katalog i talie darmowych edycji, zanim zostanie aktywowany, więc po `navigator.serviceWorker.ready` dane są na miejscu. Błędy i limit czasu (10 s) są ignorowane, żeby awaria api nie blokowała instalacji. Cache zapełni się wtedy przy normalnym użyciu. Talii płatnych rozgrzewka w ogóle nie pyta.

**5. `networkMode: 'always'` w TanStack Query**, żeby żądanie zawsze dochodziło do workera. Bez cache kończy się błędem i ekranem z ponowieniem, a nie wstrzymanym zapytaniem.

**6. Wygaszanie wpisów.** To wymóg, a nie porządek: treść wycofana z Google Play musi zniknąć także z cache użytkowników.

- Po odświeżeniu katalogu (`cacheDidUpdate`, a także w rozgrzewce) worker usuwa z cache talii wpisy spoza listy darmowych talii tego katalogu. Niepoprawny katalog niczego nie usuwa. Obejmuje to przejście na płatną i wycofanie edycji.
- Odpowiedź 403 lub 404 dla talii usuwa jej wpis (`fetchDidSucceed`). Strategia to `StaleWhileRevalidate`, więc to żądanie dostaje jeszcze starą talię z cache, kolejne już nie.
- Nazwy cache mają wersję (`tod-catalog-v2`, `tod-free-decks-v2`, stała `CACHE_VERSION`). `activate` usuwa nasze cache z innych wersji i nienazwane wersją z pierwszego wydania, a precache Workboxa i cudze cache zostawia. Podniesienie wersji to sposób na natychmiastowe usunięcie wszystkiego z poprzednich wydań.

## Konsekwencje

- Logika polityki, także pluginy Workboxa, leży w `sw/offline-cache-policy.ts` i ma testy jednostkowe. Sam `sw.ts` to wiązanie z Workboxem, sprawdzane w `e2e/tests/compliance.spec.ts` na prawdziwym workerze.
- Bundle workera zawiera `zod` i schematy z `@tod/contracts`.
- Edycja, która przestanie być darmowa, znika z cache przy najbliższym odświeżeniu katalogu albo żądaniu jej talii. Do tego czasu użytkownik offline nadal ją ma. Karty były wtedy publiczne, więc nie jest to wyciek płatnej treści.
- Równolegle lecące żądanie talii może zdecydować o zapisie na starym katalogu tuż przed jego odświeżeniem i zapisać wpis po czyszczeniu. Wpis zniknie przy następnym odświeżeniu katalogu.
- Jeśli api nie odpowiada podczas instalacji nowej wersji workera, `activate` i tak usuwa stare cache, więc dane offline wracają dopiero przy kolejnym użyciu z siecią.
- Talie płatne offline (faza 3) idą osobną ścieżką, przez IndexedDB po pobraniu przez zalogowanego użytkownika, jak w `docs/architecture.md`.
- Instalacja workera wykonuje kilka dodatkowych żądań do api.

## Odrzucone opcje

- **`generateSW` z `runtimeCaching`**: nie da się w konfiguracji uzależnić zapisu od katalogu. Reguła po URL objęłaby też talie płatne.
- **Oznaczenie w odpowiedzi talii albo nagłówek z api**: wymaga zmiany kontraktu, a katalog już ma tę informację.
- **Rozgrzewka ze strony po `controllerchange`**: zależy od tego, czy strona pozostanie otwarta, i rozprasza odpowiedzialność za cache między aplikację a workera.
- **`networkMode: 'offlineFirst'`**: przy braku cache zapytanie zostaje wstrzymane, więc ekran ładowania nigdy się nie kończy.
