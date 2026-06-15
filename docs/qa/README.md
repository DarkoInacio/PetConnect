# QA — PetConnect

Documentación central de pruebas.

| Documento | Descripción |
|-----------|-------------|
| [TCP-001-plan-de-pruebas.md](./TCP-001-plan-de-pruebas.md) | Plan formal v1.1 (alcance, casos, cobertura, criterios de salida) |
| [../../TEST_PLAN.md](../../TEST_PLAN.md) | Plan legado con IDs `PC-*` y casos ampliados |

## Ejecutar automatización

**Backend** (`PetConnectBackend`):

```bash
npm test              # Jest — 130 tests
npm run test:smoke    # Newman carpeta Smoke (API arriba + seed)
```

**Frontend** (`PetConnect`):

```bash
npm test              # Vitest — 38 tests
npm run build         # Verificar artefactos PWA (sw.js, manifest)
```

## CI

- Backend: `.github/workflows/backend-tests.yml`
- Frontend: `.github/workflows/frontend-tests.yml`
