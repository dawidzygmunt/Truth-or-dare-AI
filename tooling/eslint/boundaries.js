import boundariesModule from 'eslint-plugin-boundaries';

// The plugin's typings declare an ESM default export, but at runtime it is `module.exports = plugin`,
// so under `nodenext` TypeScript sees the wrong shape. The runtime value is the plugin itself.
const boundaries = /** @type {import('eslint').ESLint.Plugin} */ (
  /** @type {unknown} */ (boundariesModule)
);

const apiModules = 'apps/api/src/modules/*';
const apiLayers = ['api-domain', 'api-application', 'api-infrastructure', 'api-presentation'];

/**
 * Architectural boundaries (see docs/architecture.md):
 * - api modules follow Clean Architecture: domain <- application <- infrastructure / presentation,
 *   and never reach into another module's domain or infrastructure,
 * - game-engine is framework-free and depends on nothing,
 * - contracts depends only on zod,
 * - packages never import apps.
 *
 * @param {{ rootPath: string, tsconfig: string | string[] }} options
 * @returns {import('eslint').Linter.Config[]}
 */
export function boundariesConfig({ rootPath, tsconfig }) {
  return [
    {
      files: ['**/*.ts', '**/*.tsx'],
      ignores: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/test/**', '**/*.config.ts'],
      plugins: { boundaries },
      settings: {
        'boundaries/root-path': rootPath,
        'boundaries/legacy-templates': false,
        'import/resolver': {
          typescript: {
            alwaysTryTypes: true,
            noWarnOnMultipleProjects: true,
            project: tsconfig,
            conditionNames: ['@tod/source', 'types', 'import', 'node', 'default'],
          },
        },
        'boundaries/elements': [
          {
            type: 'api-domain',
            pattern: `${apiModules}/domain`,
            capture: ['module'],
            partialMatch: false,
          },
          {
            type: 'api-application',
            pattern: `${apiModules}/application`,
            capture: ['module'],
            partialMatch: false,
          },
          {
            type: 'api-infrastructure',
            pattern: `${apiModules}/infrastructure`,
            capture: ['module'],
            partialMatch: false,
          },
          {
            type: 'api-presentation',
            pattern: `${apiModules}/presentation`,
            capture: ['module'],
            partialMatch: false,
          },
          { type: 'api', pattern: 'apps/api', partialMatch: false },
          { type: 'web', pattern: 'apps/web', partialMatch: false },
          { type: 'game-engine', pattern: 'packages/game-engine', partialMatch: false },
          { type: 'contracts', pattern: 'packages/contracts', partialMatch: false },
        ],
      },
      rules: {
        'boundaries/dependencies': [
          'error',
          {
            default: 'allow',
            checkAllOrigins: true,
            policies: [
              {
                from: { element: { type: 'api-domain' } },
                disallow: [
                  { to: { element: { type: '!api-domain' }, module: { origin: 'local' } } },
                  {
                    to: {
                      module: { origin: 'external', source: ['@nestjs/*', '@prisma/*', 'stripe'] },
                    },
                  },
                ],
                message: 'domain must not depend on {{to.element.types}}{{to.module.source}}',
              },
              {
                from: { element: { type: 'api-application' } },
                disallow: {
                  to: { element: { type: ['api-infrastructure', 'api-presentation', 'api'] } },
                },
                message: 'application must not depend on {{to.element.types}}',
              },
              {
                from: { element: { type: apiLayers } },
                disallow: {
                  to: {
                    element: {
                      type: ['api-domain', 'api-infrastructure'],
                      captured: { module: '!{{ from.element.captured.module }}' },
                    },
                  },
                },
                message:
                  "modules must not import another module's domain or infrastructure; use a port",
              },
              {
                from: { element: { type: 'web' } },
                disallow: { to: { element: { type: ['api', ...apiLayers] } } },
                message: 'web talks to api over HTTP only; share types via @tod/contracts',
              },
              {
                from: { element: { type: 'game-engine' } },
                disallow: [
                  { to: { element: { type: '!game-engine' }, module: { origin: 'local' } } },
                  { to: { module: { origin: ['external', 'core'] } } },
                ],
                message: 'game-engine must stay dependency-free',
              },
              {
                from: { element: { type: 'contracts' } },
                disallow: [
                  { to: { element: { type: '!contracts' }, module: { origin: 'local' } } },
                  { to: { module: { origin: 'core' } } },
                  { to: { module: { origin: 'external', source: '!zod' } } },
                ],
                message: 'contracts may depend on zod only',
              },
            ],
          },
        ],
      },
    },
  ];
}
