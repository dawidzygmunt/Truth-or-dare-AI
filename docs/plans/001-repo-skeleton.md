# 001: Szkielet repo (faza 1, krok 1)

Status: zrealizowany (e2e na WebKit/Chromium czeka na biblioteki systemowe, patrz niżej)

## Cel

Działające monorepo, w którym przechodzą `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm dev` i `pnpm test:e2e`, a granice warstw i pakietów są pilnowane przez ESLint. Bez logiki biznesowej.

## Zakres

- pnpm workspaces (`apps/*`, `packages/*`, `e2e`), Node 26 (`.nvmrc`, `engines`), pnpm 10 (`packageManager`).
- Nazwy pakietów w scope `@tod/*` (`@tod/web`, `@tod/api`, `@tod/game-engine`, `@tod/contracts`, `@tod/e2e`). `pnpm --filter api` i `--filter game-engine` z `CLAUDE.md` działają, bo pnpm dopasowuje nazwę bez scope.
- `tsconfig.base.json`: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax` (poza api, gdzie dekoratory Nesta wymagają `emitDecoratorMetadata`).
- ESLint 9 (flat config) + `typescript-eslint` (strict, `no-explicit-any`, `ban-ts-comment` z wymogiem opisu) + `eslint-plugin-boundaries`:
  - api: `domain` ← `application` ← `infrastructure` / `presentation`; `domain` bez `@nestjs/*`, `@prisma/*`, `stripe`;
  - `packages/*` nie importują `apps/*`; `game-engine` nie importuje `contracts`; `contracts` importuje tylko `zod`.
- Prettier (+ `eslint-config-prettier`).
- Szkielety:
  - `packages/game-engine`: pusty `src/index.ts`, Vitest, skrypty `test`, `test:watch`, `typecheck`, `build`.
  - `packages/contracts`: `zod`, pusty `src/index.ts`, Vitest.
  - `apps/api`: NestJS z `GET /health`, Vitest + `unplugin-swc`, supertest. Struktura `src/modules/` pusta.
  - `apps/web`: Vite + React + TS, `vite-plugin-pwa` (manifest placeholder), Tailwind, React Router, TanStack Query, Zustand jako zależności; jeden pusty ekran. Proxy `/api` → api w dev (jedna domena).
  - `e2e/`: Playwright, projekty `iPhone 15` (WebKit) i `Pixel 7` (Chromium), `webServer` buduje web (`vite preview`) i startuje api.
- `docker-compose.yml`: Postgres 17, Mailpit. `.env.example` (`DATABASE_URL`, `PORT`, `WEB_ORIGIN`, …), `.gitignore`.
- GitHub Actions `ci.yml`: install → lint → typecheck → test → build → e2e (z cache pnpm i przeglądarek Playwright).
- Skrypty w root `package.json`: `dev`, `test`, `test:e2e`, `lint`, `typecheck`, `build`, `format`.

## Poza zakresem

- Prisma, schemat, migracje, seed (krok 4). Do tego czasu `pnpm --filter api prisma migrate dev` i `db:seed` z `CLAUDE.md` nie działają; `db:seed` dostanie skrypt-zaślepkę z komunikatem „available from step 4”. **Do potwierdzenia**, czy to akceptowalne, czy wolisz pusty `schema.prisma` już teraz.
- ADR-y, szablon planu, subagenci (krok 2). Ten plan ma strukturę przyszłego szablonu.
- Logika gier, i18n, age gate, Service Worker poza domyślną konfiguracją pluginu.

## Pliki do utworzenia

```
package.json, pnpm-workspace.yaml, .nvmrc, .npmrc, tsconfig.base.json
eslint.config.js, .prettierrc, .prettierignore, .gitignore, .editorconfig
docker-compose.yml, .env.example
.github/workflows/ci.yml
packages/game-engine/{package.json,tsconfig.json,vitest.config.ts,src/index.ts,src/index.test.ts}
packages/contracts/{package.json,tsconfig.json,vitest.config.ts,src/index.ts,src/index.test.ts}
apps/api/{package.json,tsconfig.json,tsconfig.build.json,nest-cli.json,vitest.config.ts}
apps/api/src/{main.ts,app.module.ts,health/health.controller.ts}
apps/api/test/health.e2e.test.ts
apps/web/{package.json,tsconfig.json,vite.config.ts,index.html,tailwind/postcss config}
apps/web/src/{main.tsx,app/app.tsx}
e2e/{package.json,playwright.config.ts,tests/smoke.spec.ts}
tooling/eslint-boundaries/boundaries.test.ts  (+ fixtures)
```

## Testy do napisania (kolejność red)

1. `tooling/eslint-boundaries/boundaries.test.ts` (Vitest + API `ESLint`, na plikach-fixture):
   1. import z `infrastructure` w `domain` api → błąd `boundaries/*`;
   2. import `@nestjs/common` w `domain` → błąd;
   3. import `presentation` z `application` → błąd;
   4. import `application` z `infrastructure` → OK;
   5. import `apps/*` z `packages/game-engine` → błąd;
   6. import `@tod/contracts` z `game-engine` → błąd;
   7. użycie `any` → błąd; `// @ts-ignore` bez opisu → błąd.
2. `packages/game-engine/src/index.test.ts`: smoke, eksportuje `ENGINE_VERSION` (dowód, że Vitest + TS działają w pakiecie).
3. `packages/contracts/src/index.test.ts`: smoke, eksportowany schemat `HealthResponseSchema` parsuje `{ status: "ok" }` i odrzuca inny kształt.
4. `apps/api/test/health.e2e.test.ts` (supertest): `GET /health` → 200 i body zgodne z `HealthResponseSchema` (dowód, że `unplugin-swc` obsługuje dekoratory, a api używa `contracts`).
5. `e2e/tests/smoke.spec.ts` (Playwright, oba projekty): strona startowa się ładuje, ma `role="main"`, a `/api/health` przez proxy zwraca `ok`.

## Kroki

1. Root: workspace, tsconfig, Prettier, `.gitignore`, `.nvmrc`.
2. Test 1 (red) → `eslint.config.js` z boundaries (green).
3. `game-engine` i `contracts`: testy 2–3 (red → green).
4. `api`: test 4 (red) → Nest + `/health` (green).
5. `web`: szkielet Vite/React/PWA/Tailwind, `pnpm dev` uruchamia web + api równolegle.
6. `e2e`: test 5 (red) → konfiguracja `webServer` (green) na WebKit i Chromium.
7. `docker-compose.yml`, `.env.example`, CI.
8. Weryfikacja: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e`. Commit `chore: bootstrap monorepo skeleton`.

## Ryzyka

- **Docker niedostępny w WSL** (brak integracji Docker Desktop). Nie blokuje kroku 1, ale blokuje `docker compose up` i Testcontainers od kroku 4. Do włączenia: Docker Desktop → Settings → Resources → WSL integration.
- **Playwright WebKit na WSL/Linux** wymaga bibliotek systemowych (`pnpm exec playwright install --with-deps` potrzebuje `sudo`). Jeśli nie zadziała, zgłoszę listę pakietów do doinstalowania.
- `eslint-plugin-boundaries` w flat config: konfiguracja elementów po ścieżkach; test 1 pilnuje, że reguły rzeczywiście działają, a nie tylko istnieją.
- `exactOptionalPropertyTypes` bywa uciążliwe z bibliotekami; jeśli koliduje z Nest/Prisma, wyłączę je tylko w `apps/api` i opiszę dlaczego.

## Odstępstwa od planu (po implementacji)

- TypeScript `~6.0` zamiast 7.x: `typescript-eslint` 8.72 wspiera `<6.1`.
- Nest 12 jest ESM-only, więc całe repo jest ESM (`"type": "module"`). Api budowane `tsc` (bez Nest CLI, bez `nest-cli.json`), dev przez `tsc --watch` + `node --watch`.
- Testy granic w `tooling/eslint/boundaries.test.ts` (pakiet `@tod/tooling`), konfiguracja w `tooling/eslint/*.js` importowana przez `eslint.config.js`.
- `boundaries/dependencies` wymaga `checkAllOrigins: true`, inaczej nie sprawdza pakietów zewnętrznych ani wbudowanych modułów Node.
- Pakiety eksportują `@tod/source` (źródła TS dla Vite/Vitest/typecheck) i `dist` (runtime api, e2e).
- `CLAUDE.md` i `docs/` wyłączone z Prettiera, żeby nie przeformatowywał dokumentów.
- E2E: test api przez proxy przechodzi; testy przeglądarkowe wymagają `playwright install-deps` (sudo) na tej maszynie.
