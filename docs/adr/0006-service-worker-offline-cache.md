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

**3. Zapisujemy tylko status 200.** 403, 404 i błędy serwera nigdy nie trafiają do cache.

**4. Rozgrzewka w `install`.** Worker sam pobiera katalog i talie darmowych edycji, zanim zostanie aktywowany, więc po `navigator.serviceWorker.ready` dane są na miejscu. Błędy i limit czasu (10 s) są ignorowane, żeby awaria api nie blokowała instalacji. Cache zapełni się wtedy przy normalnym użyciu. Talii płatnych rozgrzewka w ogóle nie pyta.

**5. `networkMode: 'always'` w TanStack Query**, żeby żądanie zawsze dochodziło do workera. Bez cache kończy się błędem i ekranem z ponowieniem, a nie wstrzymanym zapytaniem.

## Konsekwencje

- Logika polityki leży w `sw/offline-cache-policy.ts` i ma testy jednostkowe. Sam `sw.ts` to wiązanie z Workboxem, sprawdzane w przeglądarce.
- Bundle workera zawiera `zod` i schematy z `@tod/contracts`.
- Edycja, która przestanie być darmowa, zostaje w cache u użytkownika do czasu wymiany wersji cache. Karty były wtedy publiczne, więc nie jest to wyciek płatnej treści.
- Talie płatne offline (faza 3) idą osobną ścieżką, przez IndexedDB po pobraniu przez zalogowanego użytkownika, jak w `docs/architecture.md`.
- Instalacja workera wykonuje kilka dodatkowych żądań do api.

## Odrzucone opcje

- **`generateSW` z `runtimeCaching`**: nie da się w konfiguracji uzależnić zapisu od katalogu. Reguła po URL objęłaby też talie płatne.
- **Oznaczenie w odpowiedzi talii albo nagłówek z api**: wymaga zmiany kontraktu, a katalog już ma tę informację.
- **Rozgrzewka ze strony po `controllerchange`**: zależy od tego, czy strona pozostanie otwarta, i rozprasza odpowiedzialność za cache między aplikację a workera.
- **`networkMode: 'offlineFirst'`**: przy braku cache zapytanie zostaje wstrzymane, więc ekran ładowania nigdy się nie kończy.
