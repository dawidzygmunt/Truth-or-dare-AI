# 0001: Monorepo z React + Vite i NestJS

## Status

Zaakceptowany.

## Kontekst

- Produkt to platforma gier imprezowych na telefon. Dystrybucja: PWA (iPhone przez Safari, Android, desktop), później aplikacja Android w Google Play jako TWA nad tą samą PWA.
- Darmowe edycje muszą działać offline po pierwszym załadowaniu. Logika gier działa więc w przeglądarce i nie może zależeć od api.
- Wymagania niefunkcjonalne: mobile-first, szybki start (< 2 s na 4G), działanie przy słabym zasięgu.
- Web i api mają stać pod jedną domeną (`/api` przez reverse proxy), co upraszcza ciasteczka sesji i TWA.
- Web i api wymieniają dane przez HTTP, więc potrzebują wspólnych typów DTO.

Źródła: `docs/architecture.md` (§1, §2, §4, §6), `docs/KICKOFF.md` (Technologia).

## Decyzja

Jedno repozytorium, pnpm workspaces:

```
apps/web               React + Vite + TypeScript, vite-plugin-pwa, React Router,
                       TanStack Query, Zustand, Tailwind (tokeny z docs/design/tokens)
apps/api               NestJS + TypeScript, Prisma, PostgreSQL
packages/game-engine   czysty TypeScript, logika gier
packages/contracts     schematy Zod i typy DTO współdzielone przez web i api
```

Zasady:

- Frontend to SPA zbudowana Vite, bez SSR.
- Logika gier jest tylko w `packages/game-engine`, bez zależności od React, Nest i przeglądarki. Komponenty React wyświetlają stan silnika i wysyłają akcje, nie losują ani nie liczą.
- Typy na granicy web↔api pochodzą wyłącznie z `packages/contracts`. Nie duplikujemy typów DTO.
- Graf zależności: `apps/web` zależy od `game-engine` i `contracts`, `apps/api` od `contracts`. `game-engine` nie importuje niczego z `apps/*` ani z `contracts`. `contracts` nie importuje niczego poza Zod. Granice pilnuje ESLint (`eslint-plugin-boundaries`).
- Stan gry: Zustand opakowuje reduktor z `game-engine` i persystuje go do IndexedDB. Stan serwerowy (katalog, profil, talie): TanStack Query.
- Testy: Vitest (unit/integration), Testcontainers (Postgres w testach api), Playwright (E2E na iPhone/WebKit i Pixel/Chromium).

## Konsekwencje

- Jeden zestaw narzędzi (TypeScript strict, ESLint, Vitest) dla całego repozytorium.
- Silnik gier działa w przeglądarce offline. Rozgrywka w darmowej edycji nie wymaga api.
- Frontend jest zbudowany do statycznych plików. Hosting nie jest ustalony; wymóg to jedna domena dla web i `/api`.
- Dodanie Next.js, SSR albo nowego frameworka stanu wymaga nowego ADR (`CLAUDE.md`).
- Gdy lint blokuje import między pakietami, poprawiamy kod, nie konfigurację.
- Sposób konsumowania pakietów workspace (źródła TS vs `dist`) opisuje ADR 0005.

## Odrzucone opcje

- **Next.js (i SSR)**: SPA z Vite jest prostsza do PWA i TWA.
- **Logika gier zależna od api**: silnik musi działać offline w przeglądarce, więc nie może zależeć od api (`docs/architecture.md` §4).
