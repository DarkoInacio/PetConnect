# PLAN DE PRUEBAS

**PetConnect** — PWA de servicios para mascotas

| Campo | Valor |
|-------|-------|
| **Plan ID** | TCP-001 |
| **Versión** | 1.2 (seed QA, Jest ampliado, Playwright E2E — Jun 2026) |
| **Preparado por** | Equipo QA PetConnect |
| **Fecha** | Junio 2026 |
| **Repositorio Backend** | [DarkoInacio/PetConnectBackend](https://github.com/DarkoInacio/PetConnectBackend) |
| **Repositorio Frontend** | [DarkoInacio/PetConnect](https://github.com/DarkoInacio/PetConnect) |
| **Stack Backend** | Node.js + Express + MongoDB (Mongoose) · Render |
| **Stack Frontend** | React 19 + Vite + TailwindCSS (PWA) · Vercel |
| **Estándar de referencia** | IEEE Std 829-2008 · [Guía TestRail — Create a Test Plan](https://www.testrail.com/blog/create-a-test-plan/) |

> **Convención de rutas en este documento:** la API real usa prefijo `/api` y rutas en español (`/proveedores`, no `/providers`). Health check: `GET /health` (sin `/api`). Chat: `POST /api/chat` (no existe `/api/chatbot/message` montado).

---

## Resumen ejecutivo

| TL;DR |
|-------|
| Este plan define alcance, cronograma, estrategia, ambiente y casos de prueba para el release mayor v1.0 de PetConnect. **A junio 2026 la automatización ampliada está implementada** (150 tests Jest + Newman smoke; 38 Vitest + 6 Playwright E2E; `seed-qa.js`), pero **aún no se cumplen todos los criterios de salida TCP-001** para Go/No-Go: faltan UAT firmado, Lighthouse PWA archivado ≥90, ejecución Postman completa registrada, E2E de reserva/ficha con API real, y cobertura ≥70% en servicios. |

### Veredicto rápido (Jun 2026)

| Criterio TCP-001 (Sección 5.5) | ¿Cumple? |
|-------------------------------|----------|
| 100% casos P1 ejecutados y PASS | **Parcial** — P1 API mayormente en Jest/Newman; UI P1 (reservar, ficha, admin) sin E2E completo |
| ≥ 90% casos P2 PASS | **No** — sin ejecución formal registrada |
| 0 defectos Críticos/Altos abiertos | **N/A** — requiere ciclo de ejecución + tracking en Issues |
| Suite regresión en CI | **Sí** — backend Jest + Newman; frontend Vitest + Playwright |
| Playwright / UAT / Lighthouse | **Parcial** — 6 E2E P1 con mocks; UAT y Lighthouse sin archivo de evidencia |

---

## 1. Alcance del release

### 1.1 ¿Qué se lanza?

| Módulo | Tipo | Riesgo | Prioridad |
|--------|------|--------|-----------|
| Autenticación (registro, login, recuperación) | Nuevo | Alto | Crítica |
| Gestión de mascotas (CRUD, foto, estado) | Nuevo | Alto | Crítica |
| Ficha médica + exportación PDF | Nuevo | Alto | Crítica |
| Agenda y Citas (ciclo completo de reserva) | Nuevo | Alto | Crítica |
| Proveedores: exploración, mapa, búsqueda geolocalizada | Nuevo | Alto | Crítica |
| Seguridad transversal (JWT, roles, rate limiting, CORS) | Nuevo | Alto | Crítica |
| Panel de administración (aprobación, reportes) | Nuevo | Medio | Alta |
| Reseñas y reportes de abuso | Nuevo | Medio | Alta |
| Chatbot de salud animal (OpenAI / Vetto) | Nuevo | Medio | Alta |
| Notificaciones por email y recordatorios (cron) | Nuevo | Medio | Alta |
| Perfil usuario (dueño / proveedor) | Nuevo | Medio | Alta |
| Reservas unificadas (`/bookings`) | Nuevo | Medio | Alta |
| Servicios de clínica (`clinic-services`) | Nuevo | Medio | Alta |
| Comportamiento offline PWA / Service Worker | Nuevo | Bajo | Media |

### 1.2 Fuera de alcance

- Carga masiva (> 500 usuarios concurrentes).
- Pentesting avanzado (OWASP ZAP, Burp).
- IE11, Safari &lt; 14.
- Infraestructura Render/Vercel (responsabilidad del proveedor cloud).
- Rutas legacy no montadas: `chatbot.routes.js`, `vet.routes.js` (duplicado), `providerPanel.routes.js`.

### 1.3 Áreas de mayor atención (regresión)

- Ciclo completo de citas (slots, conflictos 409, confirmar/completar/cancelar).
- Autorización por roles (`dueno`, `proveedor`, `administrador`).
- Generación y descarga de PDF de ficha médica.
- Ventana horaria de agenda Chile (smoke CI nocturno).

---

## 2. Cronograma

| Fase | Actividad | Duración orientativa |
|------|-----------|----------------------|
| Preparación | Ambiente QA, seed, Postman | 2 días |
| Diseño de casos | Completar TCP-001 + trazabilidad | 3 días |
| Unitarias / integración | Jest backend + Vitest frontend | 3 días |
| API | Postman manual + Newman smoke CI | 4 días |
| UI / E2E | Playwright flujos críticos | 3 días |
| Seguridad | JWT, roles, rate limit, headers | 2 días |
| UAT | Dueño + proveedor reales | 2 días |
| Regresión + cierre | Re-run fallidos, informe | 2 días |
| Go / No-Go | QA Lead + PO | 1 día |

**Estado Jun 2026:** fases Jest, Newman, Vitest y **Playwright base** completadas en repo; fases UAT, informe de cierre y **evidencia Lighthouse** pendientes.

---

## 3. Objetivos y métricas

Objetivos y métricas según plantilla TCP-001 (Sección 3 del documento guía): 100% P1 PASS, ≥90% P2, P95 &lt; 2s, Lighthouse PWA ≥ 90, cobertura servicios ≥ 70%.

| Métrica | Meta TCP-001 | Estado actual (aprox.) |
|---------|--------------|------------------------|
| Tests backend automatizados | Suite regresión | **150** Jest + **14** Newman smoke |
| Tests frontend automatizados | Suite regresión UI lógica | **38** Vitest + **6** Playwright E2E |
| Cobertura código servicios backend | ≥ 70% | **Parcial** (~45% controllers críticos) |
| Playwright E2E | Flujos P1 | **6** (login, mascotas, mapa, offline, recuperar clave) |
| Lighthouse PWA ≥ 90 | Documentado + archivado | **Procedimiento en §6.4** · sin reporte guardado |
| Tasa ejecución casos TCP-001 | ≥ 95% | **~65–70%** vía automatización |

---

## 4. Entregables

| Entregable | Estado Jun 2026 | Ubicación |
|------------|-----------------|-----------|
| Plan de pruebas v1.0/1.1 | ✅ Este documento | `docs/qa/TCP-001-plan-de-pruebas.md` |
| Colección Postman | ✅ | `PetConnectBackend/postman/` |
| Newman smoke CI | ✅ | `.github/workflows/backend-tests.yml` |
| Seed smoke (CI/local) | ✅ | `scripts/seed-smoke.js` |
| Seed QA completo (`seed-qa.js`) | ✅ | `scripts/seed-qa.js` → `postman/PetConnect-QA.postman_environment.json` |
| Jest backend | ✅ | `npm test` (150) |
| Vitest frontend | ✅ | `npm test` (38) |
| Playwright | ✅ Base P1 | `npm run test:e2e` (6) · CI `frontend-tests.yml` |
| Informe cierre / UAT firmado | ⬜ Pendiente | — |
| Log ejecución TestRail/Sheet | ⬜ Pendiente | — |

---

## 5. Estrategia de pruebas

### 5.1 Tipos y herramientas (actualizado al código real)

| Tipo | Herramienta | Auto/Manual | CI |
|------|-------------|-------------|-----|
| Unitarias + integración API | Jest + Supertest + mongodb-memory-server | Auto | ✅ Backend |
| Smoke API pre-deploy | Newman (carpeta Smoke) | Auto | ✅ Backend |
| Unitarias / componentes FE | Vitest + Testing Library | Auto | ✅ Frontend |
| API exploración / regresión manual | Postman (todas las carpetas) | Manual | — |
| E2E navegador | Playwright (`e2e/`, mocks API) | Auto | ✅ Frontend |
| PWA / Lighthouse | Chrome DevTools + procedimiento §6.4 | Manual | ⬜ Evidencia |
| Seguridad | Postman + Jest (401/403) | Mixto | Parcial |
| Email / cron | Mailtrap + manual / mock en Jest | Manual | Mock en tests |
| UAT | Usuarios reales | Manual | — |

### 5.2 Criterios de salida (TCP-001)

- 100% casos **P = A** ejecutados y PASS.
- ≥ 90% casos **P = M** PASS.
- Cero defectos Críticos/Altos abiertos.
- Informe firmado QA + PO.

---

## 6. Ambiente y datos

### 6.1 Ambiente

| Componente | Detalle |
|------------|---------|
| Backend local | `http://localhost:3000` · `GET /health` |
| Frontend local | `http://localhost:5173` |
| Backend prod/staging | Render (según `.env`) |
| Frontend prod | Vercel |
| BD tests Jest | mongodb-memory-server |
| BD smoke CI | MongoDB 7 service en GitHub Actions |
| Email tests | Mock `nodemailer` en Jest; Mailtrap para manual |
| OpenAI | Mock en Jest; key real para manual/UAT |

### 6.2 Seed de datos

| Script | Propósito | Estado |
|--------|-----------|--------|
| `scripts/seed-smoke.js` | Dueño `smoke.qa@test.com`, vet `vet@prueba.cl`, mascota, slot | ✅ Idempotente |
| `scripts/seed-qa.js` | Admin, dueño1/2, vet, paseador, cuidador `en_revision`, mascotas Firulais/Mishi, cita completed, encuentro clínico | ✅ Idempotente |

**Credenciales seed QA (por defecto):** password `QaTest2026!` para todos los usuarios (`admin@petconnect.test`, `dueno1@petconnect.test`, `vet@petconnect.test`, etc.). Regenerar environment: `npm run seed:qa` en backend.

### 6.4 Auditoría Lighthouse PWA (manual, antes de Go/No-Go)

1. `npm run build && npm run preview` en frontend (o URL Vercel preview).
2. Chrome → DevTools → Lighthouse → categorías **Performance**, **PWA**, **Accessibility**.
3. Modo **Mobile**, throttling simulado.
4. Guardar HTML/JSON en `docs/qa/evidence/lighthouse-YYYY-MM-DD/` (crear carpeta al ejecutar).
5. **Criterio TCP-001:** PWA ≥ 90; Performance ≥ 80 (orientativo).
6. Verificar: manifest, `sw.js`, iconos 192/512, `display: standalone`, banner offline (CP-15-04 cubierto en Vitest + Playwright).

---

### 6.3 Smoke de ambiente (antes de cada ciclo)

| Check | Acción | Esperado | Auto |
|-------|--------|----------|------|
| Backend activo | `GET /health` | 200 `{ status: "ok" }` | Newman SMK-001 |
| Login dueño smoke | `POST /api/auth/login` | 200 + token | Newman SMK-002 |
| Flujo cita smoke | slots → crear cita | 201 | Newman SMK-007 |
| Frontend build | `npm run build` | `sw.js` + manifest | Manual |
| Suite CI | push a `main` | Jest + Newman + Vitest + Playwright green | ✅ |

---

## 7. Casos de prueba detallados

**Leyenda de columnas añadidas:**

| Símbolo cobertura | Significado |
|-------------------|-------------|
| ✅ | Cubierto por automatización (Jest/Vitest/Newman) |
| 🟡 | Parcial (solo feliz/error básico o solo Postman) |
| ⬜ | Pendiente — ejecutar manual o implementar test |
| 📋 | Postman request existe; sin test Jest dedicado |

**Prioridad:** A = Alta (P1), M = Media (P2), B = Baja (P3).

---

### 7.1 M-01: Autenticación

| ID | Caso | Pasos (API real) | Esperado | P | Cobertura |
|----|------|------------------|----------|---|-----------|
| CP-01-01 | Registro dueño exitoso | `POST /api/auth/register` | 201 + token | A | ✅ Jest `auth.routes` |
| CP-01-02 | Email duplicado | Mismo email | 409 | A | ✅ Jest |
| CP-01-03 | Password débil / campos faltantes | Body inválido | 400 | A | ✅ Jest |
| CP-01-04 | Login exitoso | `POST /api/auth/login` | 200 + token | A | ✅ Jest + Newman + Vitest Login |
| CP-01-05 | Login password incorrecta | Credenciales malas | 400 | A | ✅ Jest + Vitest Login |
| CP-01-06 | Forgot password | `POST /api/auth/forgot-password` | 200 | A | ✅ Jest + Newman + Vitest |
| CP-01-07 | Reset password válido | `POST /api/auth/reset-password` | 200 | A | ✅ Jest |
| CP-01-08 | Reset token expirado/inválido | Token malo | 400 | M | ✅ Jest |
| CP-01-09 | Registro proveedor multipart | `POST /api/auth/register-provider` + fotos | 201 en_revision | A | 📋 Postman · ⬜ Jest |
| CP-01-10 | Upgrade dueño → proveedor | `POST /api/auth/upgrade-to-provider` + JWT | 200/201 | M | 🟡 Jest 403 dueño sin body · ⬜ multipart |
| CP-01-11 | Login sin email/password | Body vacío | 400 | A | ✅ Jest |
| CP-01-12 | Register rol no permitido | role distinto de dueno | 403 | A | ✅ Jest |
| CP-01-13 | UI registro dueño | `/registro` formulario | Redirección post-éxito | A | ⬜ Playwright |
| CP-01-14 | UI recuperar clave | `/recuperar-clave` | Mensaje éxito | A | ✅ Vitest + Playwright E2E |
| CP-01-15 | UI login dueño | `/login` → mapa | Sesión activa | A | ✅ Playwright E2E |

---

### 7.2 M-02: Perfil usuario

| ID | Caso | Pasos | Esperado | P | Cobertura |
|----|------|-------|----------|---|-----------|
| CP-02-01 | GET perfil autenticado | `GET /api/profile/me` | 200 + user | A | ✅ Jest + Newman implícito |
| CP-02-02 | GET sin token | Sin Authorization | 401 | A | ✅ Jest |
| CP-02-03 | PUT actualizar nombre/teléfono | `PUT /api/profile/me` | 200 | A | ✅ Jest |
| CP-02-04 | PUT intentar cambiar email | email en body | 400 | A | ✅ Jest |
| CP-02-05 | PUT con foto perfil | multipart | 200 | M | 📋 Postman · ⬜ Jest |
| CP-02-06 | UI perfil dueño | `/perfil` | Campos actualizados | M | ⬜ Playwright |

---

### 7.3 M-03: Gestión de mascotas

| ID | Caso | Pasos | Esperado | P | Cobertura |
|----|------|-------|----------|---|-----------|
| CP-03-01 | Crear mascota con foto | `POST /api/pets` multipart | 201 | A | 🟡 Jest sin archivo real · 📋 Postman |
| CP-03-02 | Crear sin foto | POST JSON/Form sin foto | 201 | M | ✅ Jest |
| CP-03-03 | Especie inválida | species inválida | 400 | A | ✅ Jest |
| CP-03-04 | Listar mascotas dueño | `GET /api/pets` | 200 | A | ✅ Jest + Newman |
| CP-03-05 | GET por ID | `GET /api/pets/:id` | 200 | A | ✅ Jest |
| CP-03-06 | PATCH actualizar | `PATCH /api/pets/:id` | 200 | A | ✅ Jest |
| CP-03-07 | Marcar fallecida | `PATCH .../mark-deceased` | 200 status deceased | M | ✅ Jest |
| CP-03-08 | GET foto | `GET /api/pets/:id/photo` | 200 bytes | M | ⬜ Jest · 📋 Postman |
| CP-03-09 | Dueño ajeno | GET con token incorrecto | 403/404 | A | ✅ Jest |
| CP-03-10 | Sin autenticación | POST/GET sin JWT | 401 | A | ✅ Jest |
| CP-03-11 | Listar para agenda | `GET /api/pets?forAgenda=1` | 200 | M | ✅ Jest |
| CP-03-12 | UI listar mascotas | `/cuenta/mascotas` | Lista tras login | A | ✅ Playwright E2E |
| CP-03-13 | Servicio FE createPet | `pets.js` FormData | Llama POST /pets | M | ✅ Vitest `pets.test` |

---

### 7.4 M-04: Ficha médica y encuentros clínicos

| ID | Caso | Pasos | Esperado | P | Cobertura |
|----|------|-------|----------|---|-----------|
| CP-04-01 | Resumen médico dueño | `GET /api/pets/:id/medical-summary` | 200 | A | ✅ Jest + Newman |
| CP-04-02 | Listar encuentros | `GET /api/pets/:id/clinical-encounters` | 200 | A | ✅ Jest |
| CP-04-03 | Detalle encuentro | `GET .../clinical-encounters/:encId` | 200 | A | ✅ Jest |
| CP-04-04 | Adjunto encuentro | `GET .../attachments/:index` | 200 | M | ⬜ Jest · 📋 Postman |
| CP-04-05 | Export PDF | `GET .../medical-record/export.pdf` | 200 application/pdf | A | 🟡 Jest 401/403 + service PDF · ⬜ stream completo |
| CP-04-06 | Vet crea encuentro | `POST /api/vet/pets/:petId/clinical-encounters` | 201 | A | ✅ Jest |
| CP-04-07 | No-vet crea encuentro | Token paseador | 403 | A | ✅ Jest |
| CP-04-08 | Vet PATCH encuentro | `PATCH /api/vet/clinical-encounters/:id` | 200 | M | ✅ Jest |
| CP-04-09 | Retracción comentario | `POST .../retractions` | 201 | M | 📋 Postman · ⬜ Jest |
| CP-04-10 | Acceso vet sin cita confirmada | dueño/vet sin relación | 403 | A | ✅ `petAccess.service` |
| CP-04-11 | UI ficha dueño | `/mascotas/:id/ficha` | Render resumen | A | ⬜ Playwright |
| CP-04-12 | UI ficha vet | `/proveedor/clinica/...` | Crear encounter | A | ⬜ Playwright |

---

### 7.5 M-05/06: Proveedores y búsqueda

> Rutas reales: `/api/proveedores/*` (no `/api/providers`).

| ID | Caso | Pasos | Esperado | P | Cobertura |
|----|------|-------|----------|---|-----------|
| CP-05-01 | Listar aprobados | `GET /api/proveedores?tipo=veterinaria` | 200 | A | ✅ Jest |
| CP-05-02 | Buscar por tipo | `GET /api/proveedores/buscar?tipo=veterinaria` | 200 | A | ✅ Jest + Newman |
| CP-05-03 | Búsqueda geo radio | `GET /api/proveedores/buscar?lat&lng&radioKm` | 200 filtrado | A | 🟡 Jest sin assert distancia · 📋 Postman |
| CP-05-04 | Mapa marcadores | `GET /api/proveedores/mapa?lat&lng&radioKm` | 200 markers | A | ✅ Jest + Newman |
| CP-05-05 | Perfil público por ID | `GET /api/proveedores/:id/perfil` | 200 | M | ✅ Jest |
| CP-05-06 | Perfil por slug | `GET /api/proveedores/perfil/:tipo/:slug` | 200 | M | ✅ Jest |
| CP-05-07 | Proveedor actualiza perfil | `PUT /api/proveedores/mi-perfil` | 200 | A | 🟡 Jest 401/403 · ⬜ feliz |
| CP-05-08 | Solicitar paseador | `POST /api/proveedores/solicitar-servicio` | 201 | A | ✅ Jest |
| CP-05-09 | Solicitar a vet (no paseador) | providerType veterinaria | 400 | A | ✅ Jest |
| CP-05-10 | Tipo inválido en listado | `?tipo=dragon` | 400 | A | ✅ Jest |
| CP-05-11 | UI mapa explorar | `/` y `/explorar` | Mapa + menú cuenta | A | 🟡 Playwright navegación · ⬜ geo manual |
| CP-05-12 | UI perfil público proveedor | `/proveedor/:id` | Datos públicos | M | ⬜ Playwright |

---

### 7.6 M-07: Agenda del proveedor

| ID | Caso | Pasos | Esperado | P | Cobertura |
|----|------|-------|----------|---|-----------|
| CP-07-01 | Generar slots | `POST /api/provider/agenda/generate` | 200/201 | A | 📋 Postman · ⬜ Jest |
| CP-07-02 | Listar slots proveedor | `GET /api/provider/agenda/slots` | 200 | A | ✅ Jest |
| CP-07-03 | Bloquear slot | `PATCH .../slots/:id/block` | 200 | A | ✅ Jest |
| CP-07-04 | Desbloquear slot | `PATCH .../unblock` | 200 | M | 📋 Postman · ⬜ Jest |
| CP-07-05 | Eliminar slot | `DELETE .../slots/:id` | 200 | M | 📋 Postman · ⬜ Jest |
| CP-07-06 | No proveedor accede agenda | Token dueño | 403 | A | ✅ Jest |
| CP-07-07 | UI calendario clínica | `/proveedor/clinica` | Ver/bloquear slots | M | ⬜ Playwright |

---

### 7.7 M-08: Citas (appointments)

| ID | Caso | Pasos | Esperado | P | Cobertura |
|----|------|-------|----------|---|-----------|
| CP-08-01 | Slots disponibles | `GET /api/appointments/providers/:id/available-slots` | 200 | A | ✅ Jest + Newman |
| CP-08-02 | Crear cita | `POST /api/appointments` | 201 | A | ✅ Jest + Newman + smoke.flow |
| CP-08-03 | Slot ocupado | Mismo slot dos veces | 409 | A | ✅ Jest |
| CP-08-04 | Confirmar (proveedor) | `PATCH .../provider/confirm` | 200 confirmed | A | ✅ Jest |
| CP-08-05 | Completar vet | `PATCH .../provider/complete-vet` | 200 completed | A | ✅ Jest |
| CP-08-06 | Completar paseador | `PATCH .../provider/complete-walker` | 200 | A | ✅ Jest |
| CP-08-07 | Completar visita cuidador | `PATCH .../provider/complete-visit` | 200 | M | 📋 Postman · ⬜ Jest |
| CP-08-08 | Cancelar dueño | `PATCH .../cancel` | 200 | A | ✅ Jest |
| CP-08-09 | Cancelar proveedor | `PATCH .../provider/cancel` | 200 | M | ✅ Jest |
| CP-08-10 | Notas internas vet | `PATCH .../provider/internal-notes` | 200 | M | 📋 Postman · ⬜ Jest |
| CP-08-11 | Mis citas dueño | `GET /api/appointments/mine` | 200 | A | ✅ Jest |
| CP-08-12 | No-dueño crea cita | Token proveedor | 403 | A | ✅ Jest |
| CP-08-13 | Sin JWT | POST appointments | 401 | A | ✅ Jest |
| CP-08-14 | UI reservar cita | `/reservar/:providerId` | Flujo slot → confirmación | A | ⬜ Playwright |

---

### 7.8 M-09: Reservas unificadas (bookings)

| ID | Caso | Pasos | Esperado | P | Cobertura |
|----|------|-------|----------|---|-----------|
| CP-09-01 | Bookings dueño | `GET /api/bookings/mine` | 200 | A | ✅ Jest + Newman |
| CP-09-02 | Bookings proveedor | `GET /api/bookings/provider/mine` | 200 | A | ✅ Jest |
| CP-09-03 | Dueño no ve panel proveedor | Token dueño en provider/mine | 403 | A | ✅ Jest |
| CP-09-04 | UI mis reservas | `/mis-reservas` | Lista unificada | A | ⬜ Playwright |

---

### 7.9 M-10: Reseñas

| ID | Caso | Pasos | Esperado | P | Cobertura |
|----|------|-------|----------|---|-----------|
| CP-10-01 | Elegibilidad reseña | `GET /api/appointments/:id/review-eligibility` | 200 eligible | A | ✅ Jest |
| CP-10-02 | Crear reseña post-cita | `POST /api/appointments/:id/reviews` | 201 | A | ✅ Jest |
| CP-10-03 | Doble reseña misma cita | Segundo POST | 409/400 | A | ✅ Jest |
| CP-10-04 | Editar reseña propia | `PATCH /api/reviews/:reviewId` | 200 | M | ✅ Jest |
| CP-10-05 | Listar reseñas proveedor | `GET /api/proveedores/:id/reviews` | 200 | A | ✅ Jest |
| CP-10-06 | Reportar reseña | `POST /api/reviews/:id/report` | 201 | M | ✅ Jest |
| CP-10-07 | Panel reseñas proveedor | `GET /api/provider/reviews` | 200 | M | ✅ Jest |
| CP-10-08 | Respuesta proveedor | `PUT /api/provider/reviews/:id/reply` | 200 | M | 📋 Postman · ⬜ Jest |
| CP-10-09 | Tercero no reseña cita ajena | Token intruso | 403 | A | ✅ Jest |
| CP-10-10 | UI dejar reseña | Panel post-cita | Estrellas + comentario | M | ⬜ Playwright |

---

### 7.10 M-11/12: Chat Vetto (OpenAI)

> Ruta real: `POST /api/chat` (visitante o autenticado). No usar `/api/chatbot/*`.

| ID | Caso | Pasos | Esperado | P | Cobertura |
|----|------|-------|----------|---|-----------|
| CP-11-01 | Mensaje anónimo | `POST /api/chat` `{ message }` | 200 + reply | A | ✅ Jest + Newman |
| CP-11-02 | Mensaje autenticado | Con JWT opcional | 200 | M | 🟡 mismo endpoint |
| CP-11-03 | Sin mensaje | body vacío | 400 | A | ✅ Jest |
| CP-11-04 | Reset sesión | `POST /api/chat` `{ reset: true }` | 200 intro | M | 📋 Postman · ⬜ Jest |
| CP-11-05 | Fallback sin OpenAI key | Sin OPENAI_API_KEY | 200 texto offline | M | 🟡 mock en Jest |
| CP-11-06 | UI chat offline | Sin red | Input deshabilitado + aviso | M | ✅ Vitest ChatWidget |
| CP-11-07 | UI enviar mensaje online | Widget Vetto | Respuesta visible | A | ✅ Vitest ChatWidget |
| CP-11-08 | Servicio FE sendChat | `chat.js` | POST /chat | M | ✅ Vitest |

---

### 7.11 M-13: Panel administración

| ID | Caso | Pasos | Esperado | P | Cobertura |
|----|------|-------|----------|---|-----------|
| CP-13-01 | Pendientes | `GET /api/admin/providers/pending` | 200 | A | ✅ Jest |
| CP-13-02 | Aprobar | `PATCH /api/admin/providers/:id/approve` | 200 aprobado | A | ✅ Jest |
| CP-13-03 | Rechazar | `PATCH .../reject` | 200 rechazado | A | ✅ Jest |
| CP-13-04 | Suspender | `PATCH .../suspend` | 200 suspendido | A | ✅ Jest |
| CP-13-05 | Reactivar | `PATCH .../reactivate` | 200 aprobado | M | 📋 Postman · ⬜ Jest |
| CP-13-06 | Activos / suspendidos list | GET active/suspended | 200 | M | 📋 Postman · ⬜ Jest |
| CP-13-07 | Audit logs | `GET /api/admin/audit-logs` | 200 | M | ✅ Jest |
| CP-13-08 | Reportes reseñas | `GET /api/admin/review-reports` | 200 | A | 📋 Postman · ⬜ Jest |
| CP-13-09 | Decidir reporte | `PATCH /api/admin/review-reports/:id` | 200 | A | 📋 Postman · ⬜ Jest |
| CP-13-10 | No-admin | GET admin con token dueño | 403 | A | ✅ Jest |
| CP-13-11 | UI admin proveedores | `/admin/proveedores` | Aprobar/rechazar | A | ⬜ Playwright |

---

### 7.12 M-14: Seguridad transversal

| ID | Caso | Pasos | Esperado | P | Cobertura |
|----|------|-------|----------|---|-----------|
| CP-14-01 | JWT inválido | Authorization Bearer fake | 401 | A | 🟡 varios Jest |
| CP-14-02 | JWT expirado | Token expirado | 401 | A | ⬜ Jest dedicado |
| CP-14-03 | Rol incorrecto (403) | dueño en ruta vet | 403 | A | ✅ Jest multi-módulo |
| CP-14-04 | Rate limiting `/api` | >100 req/15min | 429 | M | ⬜ Manual/k6 |
| CP-14-05 | CORS origen no permitido | Origen ajeno | Bloqueado browser | M | ⬜ Manual |
| CP-14-06 | Helmet headers | GET /health | Headers seguridad | M | ⬜ Manual |
| CP-14-07 | Upload tipo no permitido | Multer archivo malicioso | 400 | M | ⬜ Jest |
| CP-14-08 | IDOR mascota ajena | Varias rutas pets | 403/404 | A | ✅ Jest |

---

### 7.13 M-15: PWA y frontend shell

| ID | Caso | Pasos | Esperado | P | Cobertura |
|----|------|-------|----------|---|-----------|
| CP-15-01 | SW registrado prod | build + preview, DevTools | SW activo | M | ⬜ Manual |
| CP-15-02 | Manifest válido | Lighthouse PWA | name, icons 192/512 | M | ⬜ Manual |
| CP-15-03 | Instalable | Chrome “Instalar app” | standalone | M | ⬜ Manual |
| CP-15-04 | Banner offline global | Network offline | OfflineBanner | M | ✅ Vitest + Playwright E2E |
| CP-15-05 | Shell offline | Offline tras 1ª visita | HTML/JS/CSS cargan | M | ⬜ Manual |
| CP-15-06 | Mapa sin red | `/` offline | Mensaje sin mapa | M | 🟡 Playwright offline (banner + mapa) |
| CP-15-07 | Lighthouse score ≥ 90 | Mobile audit | PWA + Performance | M | 📋 Procedimiento §6.4 · ⬜ evidencia |
| CP-15-08 | AuthProvider sesión | Token localStorage | Restaura usuario | A | ✅ Vitest |

---

### 7.14 M-16: Servicios de clínica

| ID | Caso | Pasos | Esperado | P | Cobertura |
|----|------|-------|----------|---|-----------|
| CP-16-01 | Listar servicios vet | `GET /api/provider/clinic-services` | 200 | A | ✅ Jest |
| CP-16-02 | Crear servicio | `POST /api/provider/clinic-services` | 201 | A | ✅ Jest |
| CP-16-03 | Actualizar servicio | `PATCH .../:id` | 200 | M | ✅ Jest |
| CP-16-04 | Slots requieren clinicServiceId | GET slots multi-servicio | 400 sin id | A | ✅ Jest appointments |

---

### 7.17 M-17: Notificaciones email y cron

| ID | Caso | Pasos | Esperado | P | Cobertura |
|----|------|-------|----------|---|-----------|
| CP-17-01 | Email forgot-password | Mailtrap + forgot | Email capturado | A | ⬜ Manual (mock en Jest) |
| CP-17-02 | Recordatorio cita 24h | Cron job | Email enviado | M | ⬜ Manual · mock cron Jest |
| CP-17-03 | Email cancelación cita | Cancelar cita | Notificación | M | ⬜ Manual |
| CP-17-04 | Reporte reseña a admin | POST report | Email admin si config | B | 🟡 warn en Jest si sin admin email |

---

## 8. Matriz de cobertura automatizada (Jun 2026 — v1.2)

| Módulo | Casos TCP-001 | ✅ Auto | 🟡 Parcial | ⬜ Pendiente |
|--------|---------------|---------|------------|--------------|
| M-01 Auth | 15 | 11 | 2 | 2 |
| M-02 Perfil | 6 | 4 | 0 | 2 |
| M-03 Mascotas | 13 | 10 | 0 | 3 |
| M-04 Ficha/PDF | 12 | 8 | 1 | 3 |
| M-05/06 Proveedores | 12 | 8 | 2 | 2 |
| M-07 Agenda | 7 | 2 | 0 | 5 |
| M-08 Citas | 14 | 11 | 0 | 3 |
| M-09 Bookings | 4 | 3 | 0 | 1 |
| M-10 Reseñas | 10 | 8 | 0 | 2 |
| M-11 Chat | 8 | 5 | 2 | 1 |
| M-13 Admin | 11 | 5 | 0 | 6 |
| M-14 Seguridad | 8 | 3 | 1 | 4 |
| M-15 PWA/UI | 8 | 3 | 2 | 3 |
| M-16 Clinic services | 4 | 4 | 0 | 0 |
| M-17 Email/cron | 4 | 0 | 1 | 3 |
| **Total aprox.** | **~136** | **~85 (63%)** | **~10 (7%)** | **~41 (30%)** |

### Artefactos CI

| Repo | Workflow | Jobs |
|------|----------|------|
| PetConnectBackend | `backend-tests.yml` | Jest (150) + Newman Smoke (14 requests) |
| PetConnect | `frontend-tests.yml` | Vitest (38) + Playwright E2E (6) |

---

## 9. Roles y responsabilidades

Sin cambios respecto a TCP-001 v1.0: QA Lead, Tester Backend, Tester Frontend, Devs, PO, DevOps.

---

## 10. Riesgos y mitigación

| Riesgo | Prob. | Impacto | Mitigación | Estado |
|--------|-------|---------|------------|--------|
| OpenAI quota QA | Media | Alto | Mock en Jest; key QA limitada | ✅ Mock |
| Render cold start | Media | Medio | Warm-up; smoke CI con Mongo local | ✅ Mitigado en CI |
| Seed incompleto | Baja | Alto | `seed-qa.js` + environment Postman | ✅ Mitigado |
| Plan con rutas obsoletas | Alta | Medio | Este doc corrige rutas reales | ✅ |
| Sin E2E UI completo | Media | Alto | Playwright P1 base; ampliar reserva/ficha con API | 🟡 En progreso |

---

## 11. Errores comunes a evitar

(Referencia TestRail: plan vivo, alineado con dev/PO, riesgo primero, datos listos antes de ejecutar.)

---

## 12. One-pager operativo

| Sección | Ciclo actual |
|---------|--------------|
| ID / Título | TCP-001 / PetConnect v1.0 |
| Alcance In | Auth · Mascotas · Ficha · Proveedores · Citas · Bookings · Reseñas · Chat · Admin · PWA |
| Objetivo release | Go/No-Go con 100% P1 PASS |
| Automatización lista | Jest 150 · Newman 14 · Vitest 38 · Playwright 6 |
| Brecha principal | E2E reserva/ficha con API · Postman completo registrado · Lighthouse evidencia · UAT |
| Próximo hito | Ejecutar Postman QA con `seed:qa` · archivar Lighthouse · UAT dueño/vet |

---

## Anexo A — Datos seed QA (`seed-qa.js`) ✅

| Entidad | Datos |
|---------|-------|
| Admin | `admin@petconnect.test` |
| Dueño 1 | `dueno1@petconnect.test` · mascotas Firulais + Mishi · cita `completed` |
| Dueño 2 | `dueno2@petconnect.test` · sin mascotas |
| Vet | `vet@petconnect.test` · aprobado · slot mañana 10:00 Chile |
| Paseador | `paseador@petconnect.test` · aprobado |
| Cuidador | `cuidador@petconnect.test` · `en_revision` |
| Encuentro | 1 en Firulais con adjunto PDF de prueba |
| Password (todos) | `QaTest2026!` (override: `QA_DEFAULT_PASSWORD`) |
| Environment | `postman/PetConnect-QA.postman_environment.json` (generado) |

---

## Anexo B — Referencias en el repositorio

| Recurso | Ruta |
|---------|------|
| Este plan | `PetConnect/docs/qa/TCP-001-plan-de-pruebas.md` |
| Plan legado (más casos PC-*) | `PetConnect/TEST_PLAN.md` |
| Postman + smoke | `PetConnectBackend/postman/` |
| Smoke casos texto | `PetConnectBackend/test-cases/smoke-tests.md` (si existe) |
| Tests backend | `PetConnectBackend/src/**/*.test.js` |
| Tests frontend | `PetConnect/src/**/*.test.{js,jsx}` |
| E2E Playwright | `PetConnect/e2e/*.spec.js` |
| Seed QA | `PetConnectBackend/scripts/seed-qa.js` |

---

*Fin del documento · PetConnect TCP-001 v1.2 · Junio 2026*
