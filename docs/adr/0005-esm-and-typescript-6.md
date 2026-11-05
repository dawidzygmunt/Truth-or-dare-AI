# 0005: ESM w całym repo i TypeScript 6

## Status

Zaakceptowany. Decyzja zapadła przy implementacji kroku 1 (`docs/plans/001-repo-skeleton.md`, sekcja „Odstępstwa od planu”).

## Kontekst

- NestJS 12 jest dostarczany wyłącznie jako ESM: pakiety `@nestjs/*` 12.x mają `"type": "module"` i pole `exports` bez wariantu CommonJS.
- `typescript-eslint` 8.72 deklaruje peer dependency `typescript >=4.8.4 <6.1.0`. Plan 001 zakładał TypeScript 7.x, który ten zakres wyklucza.
- Pakiety workspace (`@tod/game-engine`, `@tod/contracts`) są konsumowane na dwa sposoby: jako źródła TypeScript (Vite, Vitest, typecheck) oraz jako skompilowany JavaScript (Node: api i `webServer` w e2e).

## Decyzja

**1. Całe repozytorium to ESM.**

- `"type": "module"` w korzeniu i w każdym pakiecie (`apps/*`, `packages/*`, `e2e`, `tooling`).
- `tsconfig.base.json` ma `module` i `moduleResolution` ustawione na `nodenext`. `apps/web` nadpisuje je na `esnext` i `bundler`.
- W kodzie kompilowanym przez `nodenext` (api, pakiety) importy względne mają rozszerzenie `.js`, np. `./app.module.js`.

**2. TypeScript przypięty do `~6.0`.**

- Korzeń repo ma `"typescript": "~6.0.3"`, bo `typescript-eslint` 8.72 wspiera wersje `<6.1`.
- Podniesienie wersji TypeScript wymaga najpierw wsparcia w `typescript-eslint` (sprawdź jego `peerDependencies`) i aktualizacji tego ADR.

**3. Api budowane zwykłym `tsc`, bez Nest CLI.**

- `build`: `tsc -p tsconfig.build.json` do `dist/`. Tak samo budowane są pakiety. W repo nie ma `nest-cli.json`.
- `dev`: jednorazowy `tsc`, potem równolegle (przez `concurrently`) `tsc --watch` i `node --watch`. `start`: `node --env-file-if-exists=../../.env dist/main.js`.
- Dekoratory Nesta: `experimentalDecorators` i `emitDecoratorMetadata` w `apps/api/tsconfig.json`. Vitest w api używa `unplugin-swc`, bo DI Nesta potrzebuje metadanych dekoratorów.

**4. Warunek eksportu `@tod/source` w pakietach.**

`packages/game-engine` i `packages/contracts` eksportują:

```json
"exports": {
  ".": {
    "@tod/source": "./src/index.ts",
    "types": "./dist/index.d.ts",
    "default": "./dist/index.js"
  }
}
```

- Warunek `@tod/source` jest aktywny w typecheckingu (`customConditions: ["@tod/source"]` w `tsconfig.base.json`) oraz w Vite (`apps/web`) i Vitest (pakiety, api) przez `resolve.conditions: ['@tod/source']`. Wtedy importy `@tod/*` wskazują na źródła TypeScript, bez budowania.
- Warunek jest wyłączony w budowaniu (`customConditions: []` w `tsconfig.build.json`) i w runtime Node (api `start`, e2e). Wtedy importy `@tod/*` wskazują na `dist`.
- Kolejność kluczy ma znaczenie: `@tod/source` stoi pierwszy, więc wygrywa, gdy jest aktywny.

## Konsekwencje

- Nie używamy `require` ani CommonJS. Importy względne w api i pakietach kończą się na `.js`.
- Wersja TypeScript jest ograniczona do `<6.1`, dopóki `typescript-eslint` nie rozszerzy zakresu.
- Nie ma `nest start` ani generatorów Nest CLI. Build i watch to `tsc` i `node --watch`.
- Runtime api i e2e wymaga zbudowanych pakietów. `pnpm dev` i `webServer` w Playwright budują je przed startem (`pnpm --filter "./packages/*" build`), a `pnpm build` (`pnpm -r build`) buduje całość w kolejności zależności.
- Nowy pakiet w `packages/` musi powtórzyć ten układ: `exports` z warunkiem `@tod/source`, `tsconfig.build.json` z `customConditions: []` i `resolve.conditions` w konfiguracji Vitest.

## Odrzucone opcje

- **TypeScript 7.x**: `typescript-eslint` 8.72 wspiera tylko `<6.1`.
- **CommonJS w części repozytorium**: Nest 12 jest ESM-only, więc całe repo jest ESM.
- **Nest CLI do budowania api**: api budujemy `tsc`, tym samym poleceniem co pakiety. Plan 001 nie podaje dodatkowego uzasadnienia.
