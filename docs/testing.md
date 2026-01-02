# Testing y coverage (Phase 6)

Esta fase incorpora tests automáticos y cobertura >= 80% para backend,
frontend e infraestructura. Cada proyecto genera LCOV para SonarCloud.

## Backend (apps/backend)

```bash
npx nx run backend:test
npx nx run backend:test --configuration=ci
```

Salida de cobertura:
- `coverage/apps/backend/lcov.info`

## Frontend (apps/web)

```bash
npx nx run web:test
npx nx run web:test:ci
```

Salida de cobertura:
- `coverage/apps/web/lcov.info`

## E2E (frontend)

Actualmente no hay runner e2e configurado en el repo. Si se agrega Cypress o
Playwright, se recomienda un target `web:e2e:ci` separado para CI.

## Infraestructura (apps/infra)

```bash
npx nx run infra:test
npx nx run infra:test --configuration=ci
```

Salida de cobertura:
- `coverage/apps/infra/lcov.info`

## Ejecucion agregada

```bash
npm run test:ci
```

## Umbrales de cobertura

Cada proyecto exige >= 80% en lines/statements/branches/functions. Si no
se cumple, el comando falla.

## SonarCloud

El workflow `sonar.yml` ejecuta los tests en CI y reporta los LCOV
correspondientes a SonarCloud.

Si los umbrales fallan, el job de tests finaliza con error antes del scan.
