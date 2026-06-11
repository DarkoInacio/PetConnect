# Colección Postman — PetConnect API

Artefactos exportables para pruebas API alineados con [TEST_PLAN.md](../TEST_PLAN.md) y [test-cases/smoke-tests.md](../test-cases/smoke-tests.md).

## Archivos

| Archivo | Descripción |
|---------|-------------|
| `PetConnect.postman_collection.json` | Colección completa (~70 requests) |
| `PetConnect-Local.postman_environment.json` | Environment local (`localhost:3000`) |
| `PetConnect-Staging.postman_environment.json` | Environment staging (editar URLs Render) |
| `PetConnect-Production.postman_environment.json` | Environment producción (editar URLs y credenciales) |
| `generate-postman.mjs` | Script para regenerar la colección desde código |

## Importar en Postman

1. Abrir Postman → **Import**.
2. Arrastrar los 4 archivos JSON (colección + 3 environments).
3. Seleccionar environment **PetConnect - Local** en el selector superior derecho.
4. Editar credenciales en el environment si difieren de las semilla.

## Uso recomendado

### Smoke pre-deploy

1. Seleccionar carpeta **Smoke**.
2. **Run collection** (Collection Runner) solo sobre la carpeta Smoke.
3. Antes de ejecutar, completar en el environment: `petId`, `providerId`, `slotId` (para SMK-007).

### Flujo completo API

1. `Auth` → **Login dueño** (guarda `token_dueno` automáticamente).
2. `Auth` → **Login veterinario** (guarda `token_vet` y `token_proveedor`).
3. `Auth` → **Login admin** (guarda `token_admin`).
4. Ejecutar carpetas según módulo bajo prueba.

## Variables de environment

| Variable | Uso |
|----------|-----|
| `baseUrl` | Base API (`http://localhost:3000/api`) |
| `healthUrl` | Health check (`http://localhost:3000/health`) |
| `token_dueno` / `token_vet` / `token_admin` | JWT — se auto-guardan tras login |
| `token_proveedor` | Igual que vet si el proveedor es veterinario |
| `petId`, `providerId`, `slotId`, `appointmentId` | IDs MongoDB — completar manualmente o desde respuestas |
| `mapLat`, `mapLng`, `mapRadioKm` | Geolocalización mapa (default Santiago) |

## Newman (CLI)

```bash
npm install -g newman

newman run postman/PetConnect.postman_collection.json \
  -e postman/PetConnect-Local.postman_environment.json \
  --folder Smoke
```

## Regenerar colección

Tras cambios en rutas del backend:

```bash
node postman/generate-postman.mjs
```

Copiar los JSON generados al repo backend si se mantiene sincronizado.

## Carpetas de la colección

- **Smoke** — 11 requests API de smoke-tests.md
- **Health** — `GET /health`
- **Auth** — registro, login, forgot/reset password
- **Profile** — `GET/PUT /profile/me`
- **Pets** — CRUD + ficha médica dueño
- **Appointments** — slots, crear, cancelar, confirmar, completar
- **Bookings** — reservas unificadas
- **Agenda** — generar/bloquear slots proveedor
- **Providers** — búsqueda, mapa, perfiles
- **Clinic Services** — servicios de clínica vet
- **Vet Clinical** — pacientes, encounters
- **Reviews** — reseñas y reportes
- **Chat** — Vetto (`POST /chat`)
- **Admin** — proveedores, audit-logs, jobs
