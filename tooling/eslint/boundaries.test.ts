import { resolve } from 'node:path';
import { ESLint, type Linter } from 'eslint';
import { describe, expect, it } from 'vitest';
import { boundariesConfig } from './boundaries.js';
import { typescriptConfig } from './typescript.js';

const fixturesRoot = resolve(import.meta.dirname, '__fixtures__');
const api = 'apps/api/src/modules';

const eslint = new ESLint({
  cwd: fixturesRoot,
  overrideConfigFile: true,
  overrideConfig: [
    ...typescriptConfig,
    ...boundariesConfig({
      rootPath: fixturesRoot,
      tsconfig: resolve(fixturesRoot, 'tsconfig.json'),
    }),
  ],
});

async function messagesFor(file: string): Promise<Linter.LintMessage[]> {
  const [result] = await eslint.lintFiles([file]);
  if (!result) throw new Error(`No lint result for ${file}`);
  return result.messages;
}

async function boundaryErrors(file: string): Promise<Linter.LintMessage[]> {
  const messages = await messagesFor(file);
  const fatal = messages.filter((message) => message.fatal);
  expect(fatal).toEqual([]);
  return messages.filter((message) => message.ruleId?.startsWith('boundaries/'));
}

async function ruleIdsForCode(code: string): Promise<(string | null)[]> {
  const [result] = await eslint.lintText(code, {
    filePath: resolve(fixturesRoot, 'packages/game-engine/src/inline.ts'),
  });
  return result?.messages.map((message) => message.ruleId) ?? [];
}

describe('api layer boundaries', () => {
  it('forbids domain from importing infrastructure', async () => {
    expect(await boundaryErrors(`${api}/catalog/domain/imports-infrastructure.ts`)).toHaveLength(1);
  });

  it('forbids domain from importing @nestjs packages', async () => {
    expect(await boundaryErrors(`${api}/catalog/domain/imports-nest.ts`)).toHaveLength(1);
  });

  it('allows domain to import its own domain', async () => {
    expect(await boundaryErrors(`${api}/catalog/domain/imports-own-domain.ts`)).toEqual([]);
  });

  it('forbids application from importing presentation', async () => {
    expect(await boundaryErrors(`${api}/catalog/application/imports-presentation.ts`)).toHaveLength(
      1,
    );
  });

  it('allows application to import domain', async () => {
    expect(await boundaryErrors(`${api}/catalog/application/use-case.ts`)).toEqual([]);
  });

  it('allows infrastructure and presentation to import application', async () => {
    expect(await boundaryErrors(`${api}/catalog/infrastructure/repo.ts`)).toEqual([]);
    expect(await boundaryErrors(`${api}/catalog/presentation/controller.ts`)).toEqual([]);
  });

  it("forbids importing another module's domain", async () => {
    expect(
      await boundaryErrors(`${api}/catalog/application/imports-other-module-domain.ts`),
    ).toHaveLength(1);
  });

  it.each(['nest', 'prisma', 'stripe'])('forbids application from importing %s', async (name) => {
    expect(await boundaryErrors(`${api}/catalog/application/imports-${name}.ts`)).toHaveLength(1);
  });

  it.each(['generated', 'database'])('forbids application from importing %s code', async (name) => {
    expect(await boundaryErrors(`${api}/catalog/application/imports-${name}.ts`)).toHaveLength(1);
  });

  it.each(['infrastructure', 'generated', 'database'])(
    'forbids presentation from importing %s',
    async (name) => {
      expect(await boundaryErrors(`${api}/catalog/presentation/imports-${name}.ts`)).toHaveLength(
        1,
      );
    },
  );

  it('allows presentation to import @nestjs packages and application', async () => {
    expect(await boundaryErrors(`${api}/catalog/presentation/nest-controller.ts`)).toEqual([]);
  });

  it('allows infrastructure to import the database module', async () => {
    expect(await boundaryErrors(`${api}/catalog/infrastructure/prisma-repo.ts`)).toEqual([]);
  });

  it('allows the Nest module file to wire infrastructure, presentation and database', async () => {
    expect(await boundaryErrors(`${api}/catalog/catalog.module.ts`)).toEqual([]);
  });
});

describe('package boundaries', () => {
  it('forbids web from importing api code', async () => {
    expect(await boundaryErrors('apps/web/src/imports-api.ts')).toHaveLength(1);
  });

  it.each(['database', 'generated'])('forbids web from importing api %s code', async (name) => {
    expect(await boundaryErrors(`apps/web/src/imports-api-${name}.ts`)).toHaveLength(1);
  });

  it('forbids game-engine from importing apps', async () => {
    expect(await boundaryErrors('packages/game-engine/src/imports-app.ts')).toHaveLength(1);
  });

  it('forbids game-engine from importing contracts', async () => {
    expect(await boundaryErrors('packages/game-engine/src/imports-contracts.ts')).toHaveLength(1);
  });

  it('forbids game-engine from importing node built-ins', async () => {
    expect(await boundaryErrors('packages/game-engine/src/imports-node.ts')).toHaveLength(1);
  });

  it('allows game-engine to import its own files', async () => {
    expect(await boundaryErrors('packages/game-engine/src/imports-own.ts')).toEqual([]);
  });

  it('allows contracts to import zod only', async () => {
    expect(await boundaryErrors('packages/contracts/src/index.ts')).toEqual([]);
    expect(await boundaryErrors('packages/contracts/src/imports-lodash.ts')).toHaveLength(1);
    expect(await boundaryErrors('packages/contracts/src/imports-game-engine.ts')).toHaveLength(1);
  });
});

describe('typescript rules', () => {
  it('forbids any', async () => {
    expect(await ruleIdsForCode('export const value: any = 1;\n')).toContain(
      '@typescript-eslint/no-explicit-any',
    );
  });

  it('forbids @ts-ignore without a justification', async () => {
    expect(await ruleIdsForCode('// @ts-ignore\nexport const value = 1;\n')).toContain(
      '@typescript-eslint/ban-ts-comment',
    );
  });

  it('allows @ts-ignore with a justification', async () => {
    const code =
      '// @ts-ignore: library typings are wrong for this overload\nexport const v = 1;\n';
    expect(await ruleIdsForCode(code)).not.toContain('@typescript-eslint/ban-ts-comment');
  });
});
