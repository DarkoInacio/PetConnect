# Plan de Pruebas — PetConnect

**Versión:** 1.0  
**Fecha:** Junio 2026  
**Proyecto:** PetConnect (PWA) + PetConnectBackend (API REST)  
**Enfoque:** Híbrido — Postman para capa API (~50–60%), manual para UI/PWA/geo

---

## 1. Introducción y Objetivos

### Propósito del plan

Este documento define la estrategia, el alcance y los casos de prueba para **PetConnect**, una Progressive Web App (PWA) que conecta dueños de mascotas con veterinarias, paseadores y cuidadores. Cubre el frontend ([PetConnect](https://github.com/) — React + Vite, desplegado en Vercel) y el backend ([PetConnectBackend](https://github.com/) — Node.js/Express/MongoDB, desplegado en Render).

El plan sigue una estructura inspirada en TestRail y está pensado para ejecución manual, con soporte Postman en la capa API y smoke tests obligatorios antes de cada deploy.

### Alcance general del esfuerzo de pruebas

- Validar flujos críticos end-to-end por rol: **dueño**, **proveedor** (veterinaria/paseador/cuidador) y **administrador**.
- Verificar integración frontend ↔ backend (JWT, CORS, Axios, uploads).
- Confirmar funcionalidad PWA (instalación, offline parcial, service worker).
- Priorizar módulos de **autenticación**, **ficha médica** y **agendamiento** como ALTA prioridad.

---

## 2. Alcance de las Pruebas

### En scope

| Módulo | Backend | Frontend |
|--------|---------|----------|
| Autenticación | `src/routes/auth.routes.js` | `LoginPage`, `RegisterOwnerPage`, `RegisterProviderPage`, `ForgotPasswordPage`, `ResetPasswordPage`, `AuthProvider` |
| Perfil usuario | `src/routes/profile.routes.js` | `OwnerProfilePage`, `ProviderMiPerfilPage` |
| Mascotas CRUD | `src/routes/pets.routes.js` | `MyPetsPage`, `PetFormPage`, `PetDetailPage`, `PetPhoto` |
| Ficha médica | `pets.routes.js` + `vetClinical.routes.js` | `PetMedicalPage`, `PetEncounterDetailPage`, `VetClinicalPage`, `VetPetMedicalPage`, `VetEncounterDetailPage` |
| Búsqueda / geo | `src/routes/providers.routes.js` | `ProvidersMapPage`, `ProvidersExplorePage`, `ProvidersMap`, `ProviderProfilePage` |
| Agendamiento | `appointments`, `providerAgenda`, `bookings` | `BookAppointmentPage`, `MyBookingsPage`, `VetClinicAdminPage`, `ProviderClinicCalendar` |
| Servicios walker/cuidador | `POST /api/proveedores/solicitar-servicio` | `RequestServicePage` |
| Reseñas | `reviews.routes.js`, `appointmentReviews` | `OwnerAppointmentReviewPanel`, `ProviderReviewsPage`, `ReviewReportModal` |
| Chatbot Vetto | `POST /api/chat` | `ChatWidget`, `src/services/chat.js` |
| Panel proveedor | agenda, clinic-services | `ProviderDashboardPage`, `VetPatientsPage` |
| Admin | `admin.routes.js`, `adminJobs.routes.js` | `AdminProvidersPage`, `AdminReviewReportsPage` |
| PWA | — | `vite-plugin-pwa`, `OfflineBanner`, `useOnlineStatus` |
| Notificaciones email | `appointmentReminders.job.js`, `utils/email.js` | `src/services/adminJobs.js` |

### Fuera de scope (este ciclo)

- Notificaciones push o in-app (no implementadas en el código).
- Rutas legacy no montadas: `chatbot.routes.js`, `vet.routes.js`, `providerPanel.routes.js`.
- Pruebas de carga, stress testing y pentesting profundo.
- Persistencia multi-instancia del chat (sesiones en memoria del servidor).
- Persistencia de uploads en Render free tier (`UPLOADS_DIR=/tmp/uploads` es efímero).
- Automatización E2E completa (roadmap futuro: Playwright, Jest+Supertest).

---

## 3. Objetivos de Prueba

| Módulo | Objetivo específico de prueba |
|--------|-------------------------------|
| Autenticación | Garantizar registro, login, logout y recuperación de contraseña con JWT válido; bloquear roles no permitidos. |
| Perfil | Verificar lectura y actualización de perfil dueño/proveedor vía `GET/PUT /api/profile/me`. |
| Mascotas | Validar CRUD completo, foto, marcar fallecida; solo el dueño accede a sus mascotas. |
| Ficha médica | Confirmar que el dueño lee resumen/encounters y el veterinario crea/edita encounters con control de acceso. |
| Búsqueda/geo | Validar búsqueda por tipo, ciudad, radio Haversine y visualización en mapa Leaflet. |
| Agendamiento | Probar flujo slots → crear cita → confirmar/cancelar/completar según tipo de proveedor. |
| Walker/cuidador | Validar solicitud de servicio y reservas unificadas en `/api/bookings/mine`. |
| Reseñas | Verificar elegibilidad post-cita, creación, edición, reporte y respuesta del proveedor. |
| Chatbot | Confirmar respuestas de Vetto, detección de urgencia y comportamiento offline en UI. |
| Panel proveedor | Validar generación de agenda, bloqueo de slots y servicios de clínica. |
| Admin | Verificar aprobación/rechazo/suspensión de proveedores y gestión de reportes de reseñas. |
| PWA | Confirmar instalabilidad, precache de assets y banner offline. |
| Notificaciones email | Verificar envío de recordatorios 24h y emails de cancelación (Mailtrap). |

---

## 4. Estrategia de Pruebas

> **Nota Postman:** este plan no es una colección Postman. Postman es la herramienta principal para casos con `Tipo: API`. Los casos `Manual`, `PWA` y `Geo` se ejecutan en navegador.

| Tipo de prueba | Qué se prueba | Herramienta sugerida | Prioridad | Automatizable |
|----------------|---------------|----------------------|-----------|---------------|
| Funcionales (manual) | Flujos UI por rol en páginas React | Chrome DevTools + checklist | Alta | Playwright (futuro) |
| API | Endpoints REST, auth, 4xx/5xx | **Postman** (+ Newman futuro) | Alta | Newman / Jest+Supertest |
| Integración FE↔BE | Axios, JWT, CORS, uploads | Postman + manual UI | Alta | Parcial (Postman) |
| Geolocalización | `navigator.geolocation`, filtros radio, mapa | Manual Chrome + móvil | Media | No |
| Chatbot | `POST /api/chat`, urgencia, fallback | Postman + `ChatWidget` | Media | Postman parcial |
| PWA | Instalación, offline shell, SW, cache | Lighthouse + Chrome Application | Media | Lighthouse CI |
| Seguridad | JWT expirado/inválido, roles, acceso cruzado | Postman + manual | Alta | Postman |
| Usabilidad / responsive | Tailwind breakpoints, navegación móvil | Manual multi-dispositivo | Media | No |
| Regresión | Smoke + suite completa pre-release | `smoke-tests.md` + Postman smoke folder | Alta | Newman (futuro) |

### Columna `Tipo` en casos de prueba

- **API** — ejecutable 100% en Postman.
- **Manual** — solo navegador.
- **API+Integración** — Postman + verificación en UI.
- **PWA** / **Geo** — solo manual.

### Roadmap de automatización

1. **Corto plazo:** colección Postman + environments (`Local`, `Staging`, `Production`).
2. **Medio plazo:** Newman en GitHub Actions para smoke API pre-deploy.
3. **Largo plazo:** Jest+Supertest (backend), Playwright E2E (frontend).

---

## 5. Casos de Prueba por Módulo

Convención de IDs: `PC-{MODULO}-{NNN}`.

---

### 5.1 Autenticación (`auth.routes.js`, `AuthProvider`, páginas auth)

| ID | Nombre del caso | Precondición | Pasos | Resultado esperado | Prioridad | Tipo |
|----|-----------------|--------------|-------|-------------------|-----------|------|
| PC-AUTH-001 | Registro dueño exitoso | Email no registrado | `POST /api/auth/register` body: `{"name":"Juan","lastName":"Pérez","email":"dueno@test.com","password":"Test1234!","phone":"+56912345678"}` | 201, `{token, user}` con `role: "dueno"` | Alta | API |
| PC-AUTH-002 | Registro dueño email duplicado | Email ya registrado como dueño | `POST /api/auth/register` con mismo email | 409, mensaje correo ya registrado | Alta | API |
| PC-AUTH-003 | Login exitoso | Usuario dueño registrado | `POST /api/auth/login` body: `{"email":"dueno@test.com","password":"Test1234!"}` | 200, `{token, user}` | Alta | API |
| PC-AUTH-004 | Login credenciales inválidas | Usuario existe | `POST /api/auth/login` con password incorrecta | 401, credenciales inválidas | Alta | API |
| PC-AUTH-005 | Login UI | Usuario registrado | Navegar `/login`, ingresar credenciales, enviar | Redirección según rol; token en `localStorage` (`petconnect_token`) | Alta | Manual |
| PC-AUTH-006 | Logout | Sesión activa | Clic logout en `AppLayoutHeader` | Token eliminado de localStorage; redirección a home/login | Alta | Manual |
| PC-AUTH-007 | Registro proveedor | Formulario completo | `POST /api/auth/register-provider` multipart (datos + fotos) | 201, usuario `proveedor` pendiente de aprobación | Alta | API+Integración |
| PC-AUTH-008 | Registro proveedor vía UI | — | Navegar `/registro-proveedor`, completar formulario | Solicitud enviada; mensaje de éxito | Alta | Manual |
| PC-AUTH-009 | Forgot password | Email registrado | `POST /api/auth/forgot-password` body: `{"email":"dueno@test.com"}` | 200; en dev puede incluir `resetUrl`; en prod email Mailtrap | Alta | API |
| PC-AUTH-010 | Reset password | Token válido de forgot | `POST /api/auth/reset-password` body: `{"email":"...","token":"...","newPassword":"Nueva1234!"}` | 200; login con nueva clave funciona | Alta | API+Integración |
| PC-AUTH-011 | Forgot/reset UI | Email registrado | `/recuperar-clave` → email → `/reset-password?token=...` | Flujo completo en UI | Alta | Manual |
| PC-AUTH-012 | Token JWT inválido | — | Cualquier ruta protegida con `Authorization: Bearer token_invalido` | 401 Unauthorized | Alta | API |
| PC-AUTH-013 | Upgrade dueño a proveedor | Dueño autenticado | `POST /api/auth/upgrade-to-provider` Bearer token + body registro | 201/200 según flujo | Media | API |
| PC-AUTH-014 | Bloqueo registro admin | — | `POST /api/auth/register` body `{"role":"admin",...}` | 403, no permitido crear admin | Media | API |

---

### 5.2 Perfil (`profile.routes.js`)

| ID | Nombre del caso | Precondición | Pasos | Resultado esperado | Prioridad | Tipo |
|----|-----------------|--------------|-------|-------------------|-----------|------|
| PC-PROF-001 | Obtener perfil | Usuario autenticado | `GET /api/profile/me` Bearer token | 200, datos del usuario | Media | API |
| PC-PROF-002 | Actualizar perfil dueño | Dueño autenticado | `PUT /api/profile/me` body campos editables | 200; cambios reflejados en `/cuenta/perfil` | Media | API+Integración |
| PC-PROF-003 | Perfil sin token | — | `GET /api/profile/me` sin Authorization | 401 | Media | API |

---

### 5.3 Mascotas (`pets.routes.js`, `MyPetsPage`, `PetFormPage`)

| ID | Nombre del caso | Precondición | Pasos | Resultado esperado | Prioridad | Tipo |
|----|-----------------|--------------|-------|-------------------|-----------|------|
| PC-PETS-001 | Crear mascota | Dueño autenticado | `POST /api/pets` body: `{"name":"Firulais","species":"perro","breed":"Labrador","birthDate":"2020-05-15","sex":"macho","color":"dorado"}` | 201, mascota creada | Alta | API |
| PC-PETS-002 | Listar mascotas | Dueño con mascotas | `GET /api/pets` Bearer token | 200, array de mascotas del dueño | Alta | API |
| PC-PETS-003 | Obtener mascota por ID | Mascota del dueño | `GET /api/pets/:petId` | 200, detalle completo | Alta | API |
| PC-PETS-004 | Actualizar mascota | Mascota existente | `PATCH /api/pets/:petId` body campos parciales | 200, datos actualizados | Alta | API |
| PC-PETS-005 | Crear mascota UI | Dueño logueado | `/mascotas/nueva` → formulario → guardar | Mascota visible en `/cuenta/mascotas` | Alta | Manual |
| PC-PETS-006 | Editar mascota UI | Mascota existente | `/mascotas/:petId/edit` | Cambios persistidos | Alta | Manual |
| PC-PETS-007 | Foto de mascota | Mascota con foto | `GET /api/pets/:petId/photo` | 200, imagen binaria; `PetPhoto` renderiza | Media | API+Integración |
| PC-PETS-008 | Marcar fallecida | Mascota activa | `PATCH /api/pets/:petId/mark-deceased` | 200; status `deceased`; no permite agendar | Alta | API |
| PC-PETS-009 | Acceso cruzado mascota | Dueño B, mascota de dueño A | `GET /api/pets/:petId` con token de B | 404 o 403 | Alta | API |
| PC-PETS-010 | CRUD sin autenticación | — | `GET /api/pets` sin token | 401 | Alta | API |

---

### 5.4 Ficha médica (`vetClinical.routes.js`, `PetMedicalPage`, `VetClinicalPage`)

| ID | Nombre del caso | Precondición | Pasos | Resultado esperado | Prioridad | Tipo |
|----|-----------------|--------------|-------|-------------------|-----------|------|
| PC-MED-001 | Resumen médico dueño | Dueño con mascota | `GET /api/pets/:petId/medical-summary` | 200, resumen clínico | Alta | API |
| PC-MED-002 | Resumen médico UI | Dueño logueado | `/mascotas/:petId/ficha` (`PetMedicalPage`) | Página carga resumen e historial | Alta | Manual |
| PC-MED-003 | Listar encounters dueño | Mascota con atenciones | `GET /api/pets/:petId/clinical-encounters` | 200, lista de encuentros | Alta | API |
| PC-MED-004 | Detalle encounter dueño | Encounter existente | `GET /api/pets/:petId/clinical-encounters/:encounterId` | 200, detalle completo | Alta | API |
| PC-MED-005 | Vet crea encounter | Vet autenticado, paciente con acceso | `POST /api/vet/pets/:petId/clinical-encounters` multipart (diagnóstico, notas, adjuntos) | 201; visible en ficha dueño | Alta | API+Integración |
| PC-MED-006 | Vet crea encounter UI | Vet en `/proveedor/atencion-clinica` | Completar formulario clínico | Encounter aparece en `/proveedor/pacientes/:petId/ficha` | Alta | Manual |
| PC-MED-007 | Vet actualiza encounter | Encounter existente | `PATCH /api/vet/clinical-encounters/:encounterId` | 200, cambios guardados | Alta | API |
| PC-MED-008 | Retracción comentario | Vet autor | `POST /api/vet/clinical-encounters/:encounterId/retractions` body comentario | 200, retracción registrada | Media | API |
| PC-MED-009 | Export PDF ficha | Dueño con historial | `GET /api/pets/:petId/medical-record/export.pdf` | 200, PDF descargable | Alta | API |
| PC-MED-010 | Descargar adjunto dueño | Encounter con adjunto | `GET /api/pets/:petId/clinical-encounters/:encounterId/attachments/0` | 200, archivo binario | Media | API |
| PC-MED-011 | Listar pacientes vet | Vet autenticado | `GET /api/vet/patients` | 200, lista de pacientes | Alta | API |
| PC-MED-012 | Acceso vet sin relación | Vet sin cita con mascota | `GET /api/vet/pets/:petId/clinical-encounters` | 403 o 404 | Alta | API |

---

### 5.5 Búsqueda y geolocalización (`providers.routes.js`, `ProvidersMapPage`)

| ID | Nombre del caso | Precondición | Pasos | Resultado esperado | Prioridad | Tipo |
|----|-----------------|--------------|-------|-------------------|-----------|------|
| PC-SEARCH-001 | Buscar veterinarias | Proveedores aprobados | `GET /api/proveedores/buscar?tipo=veterinaria&pagina=1&limite=10` | 200, lista paginada | Media | API |
| PC-SEARCH-002 | Buscar por ciudad | — | `GET /api/proveedores/buscar?tipo=veterinaria&ciudad=Santiago` | 200, filtrado por ciudad | Media | API |
| PC-SEARCH-003 | Mapa de proveedores | — | `GET /api/proveedores/mapa?lat=-33.4489&lng=-70.6693&radioKm=10` | 200, markers con coordenadas | Media | API |
| PC-SEARCH-004 | Mapa UI home | — | Navegar `/` (`ProvidersMapPage`) | Mapa Leaflet carga; markers visibles | Media | Geo |
| PC-SEARCH-005 | Geolocalización permitida | Permiso GPS concedido | En mapa, activar "Mi ubicación" | Centro mapa en posición usuario | Media | Geo |
| PC-SEARCH-006 | Geolocalización denegada | Permiso GPS denegado | Abrir `/` sin GPS | Fallback centro Santiago (-33.4489, -70.6693) | Media | Geo |
| PC-SEARCH-007 | Explorar con filtros | — | `/explorar?tipo=veterinaria` (`ProvidersExplorePage`) | Listado filtrado | Media | Manual |
| PC-SEARCH-008 | Perfil público por slug | Slug existente | `GET /api/proveedores/perfil/veterinaria/:slug` | 200, perfil con `ratingSummary`, `reviewsRecent` | Media | API |
| PC-SEARCH-009 | Perfil público UI | — | `/proveedores/perfil/veterinaria/:slug` o `/proveedores/:id` | `ProviderProfilePage` renderiza datos y mini-mapa | Media | Manual |

---

### 5.6 Agendamiento de citas (`appointments.routes.js`, `BookAppointmentPage`)

| ID | Nombre del caso | Precondición | Pasos | Resultado esperado | Prioridad | Tipo |
|----|-----------------|--------------|-------|-------------------|-----------|------|
| PC-APPT-001 | Listar slots disponibles | Proveedor vet con agenda | `GET /api/appointments/providers/:providerId/available-slots` | 200, `{slots: [...]}` futuros | Alta | API |
| PC-APPT-002 | Crear cita clínica | Dueño, mascota activa, slot libre | `POST /api/appointments` body: `{"providerId":"...","slotId":"...","petId":"...","reason":"Consulta general"}` Bearer token | 201, cita `pending` | Alta | API |
| PC-APPT-003 | Crear cita UI | Mismo precondición | `/agendar` → seleccionar proveedor, mascota, slot | Cita visible en `/cuenta/reservas` | Alta | API+Integración |
| PC-APPT-004 | Slot ya reservado | Slot consumido | `POST /api/appointments` mismo slotId | 409, bloque no disponible | Alta | API |
| PC-APPT-005 | Listar mis citas | Dueño con citas | `GET /api/appointments/mine` | 200, lista de citas | Alta | API |
| PC-APPT-006 | Cancelar cita dueño | Cita pending/confirmed | `PATCH /api/appointments/:id/cancel` body opcional `cancellationReason` | 200, status cancelada | Alta | API |
| PC-APPT-007 | Confirmar cita proveedor | Proveedor autenticado | `PATCH /api/appointments/:id/provider/confirm` | 200, status confirmed | Alta | API |
| PC-APPT-008 | Cancelar cita proveedor | Proveedor autenticado | `PATCH /api/appointments/:id/provider/cancel` | 200; email notificación si SMTP configurado | Alta | API |
| PC-APPT-009 | Completar cita vet | Cita confirmada veterinaria | `PATCH /api/appointments/:id/provider/complete-vet` | 200, status completed | Alta | API |
| PC-APPT-010 | Completar cita walker | Cita paseador | `PATCH /api/appointments/:id/provider/complete-walker` | 200 | Alta | API |
| PC-APPT-011 | Completar visita cuidador | Cita cuidador | `PATCH /api/appointments/:id/provider/complete-visit` | 200 | Media | API |
| PC-APPT-012 | Notas internas proveedor | Proveedor de la cita | `PATCH /api/appointments/:id/provider/internal-notes` body `{"internalNotes":"..."}` | 200 | Media | API |
| PC-APPT-013 | Agendar mascota fallecida | Mascota deceased | `POST /api/appointments` con petId fallecida | 400, solo mascotas activas | Alta | API |
| PC-APPT-014 | Admin citas vet UI | Vet logueado | `/proveedor/admin-citas` (`VetClinicAdminPage`) | Calendario y acciones visibles | Alta | Manual |
| PC-APPT-015 | Panel calendario proveedor | Proveedor vet | `ProviderClinicCalendar` en dashboard | Slots y citas renderizados | Media | Manual |

---

### 5.7 Agenda proveedor (`providerAgenda.routes.js`, `agenda.js`)

| ID | Nombre del caso | Precondición | Pasos | Resultado esperado | Prioridad | Tipo |
|----|-----------------|--------------|-------|-------------------|-----------|------|
| PC-AGENDA-001 | Generar slots agenda | Proveedor vet autenticado | `POST /api/provider/agenda/generate` body rango fechas | 201/200, slots creados | Media | API |
| PC-AGENDA-002 | Listar mis slots | Proveedor autenticado | `GET /api/provider/agenda/slots` | 200, slots del proveedor | Media | API |
| PC-AGENDA-003 | Bloquear slot | Slot disponible | `PATCH /api/provider/agenda/slots/:slotId/block` | 200, slot bloqueado | Media | API |
| PC-AGENDA-004 | Desbloquear slot | Slot bloqueado | `PATCH /api/provider/agenda/slots/:slotId/unblock` | 200 | Media | API |
| PC-AGENDA-005 | Eliminar slot | Slot existente | `DELETE /api/provider/agenda/slots/:slotId` | 200/204 | Media | API |
| PC-AGENDA-006 | Limpiar omisiones | Proveedor vet | `DELETE /api/provider/agenda/omits` | 200 | Baja | API |

---

### 5.8 Reservas unificadas (`bookings.routes.js`, `MyBookingsPage`)

| ID | Nombre del caso | Precondición | Pasos | Resultado esperado | Prioridad | Tipo |
|----|-----------------|--------------|-------|-------------------|-----------|------|
| PC-BOOK-001 | Bookings dueño | Dueño con reservas | `GET /api/bookings/mine` | 200, citas y solicitudes unificadas | Alta | API |
| PC-BOOK-002 | Bookings dueño UI | Dueño logueado | `/cuenta/reservas` (`MyBookingsPage`) | Listado coherente con API | Alta | API+Integración |
| PC-BOOK-003 | Bookings proveedor | Proveedor autenticado | `GET /api/bookings/provider/mine` | 200, reservas del proveedor | Alta | API |
| PC-BOOK-004 | Solicitar servicio walker | Dueño autenticado | `POST /api/proveedores/solicitar-servicio` body: `{"providerId":"...","pet":{...},"message":"...","preferredStart":"...","preferredEnd":"..."}` | 201, solicitud creada | Media | API |

---

### 5.9 Reseñas (`reviews.routes.js`, `OwnerAppointmentReviewPanel`)

| ID | Nombre del caso | Precondición | Pasos | Resultado esperado | Prioridad | Tipo |
|----|-----------------|--------------|-------|-------------------|-----------|------|
| PC-REV-001 | Elegibilidad reseña | Cita completada | `GET /api/appointments/:id/review-eligibility` | 200, `{eligible: true/false}` | Media | API |
| PC-REV-002 | Crear reseña | Elegible | `POST /api/appointments/:id/reviews` body rating y comentario | 201 | Media | API |
| PC-REV-003 | Editar reseña dueño | Reseña propia | `PATCH /api/reviews/:reviewId` | 200 | Media | API |
| PC-REV-004 | Reportar reseña | Usuario autenticado | `POST /api/reviews/:reviewId/report` body motivo | 201 | Media | API |
| PC-REV-005 | Listar reseñas proveedor | — | `GET /api/proveedores/:providerId/reviews?pagina=1&limite=10` | 200, paginado | Media | API |
| PC-REV-006 | Respuesta proveedor | Proveedor autenticado | `PUT /api/provider/reviews/:reviewId/reply` body reply | 200 | Media | API |

---

### 5.10 Chatbot Vetto (`chat.routes.js`, `ChatWidget`)

| ID | Nombre del caso | Precondición | Pasos | Resultado esperado | Prioridad | Tipo |
|----|-----------------|--------------|-------|-------------------|-----------|------|
| PC-CHAT-001 | Enviar mensaje chat | OPENAI_API_KEY configurada | `POST /api/chat` body: `{"message":"Mi perro tiene vómitos","sessionId":null}` | 200, `{reply, sessionId, urgencyLevel, actions}` | Media | API |
| PC-CHAT-002 | Continuar sesión | sessionId previo | `POST /api/chat` con `sessionId` e historial | 200, contexto mantenido | Media | API |
| PC-CHAT-003 | Reset sesión | Sesión activa | `POST /api/chat` body `{"reset":true,"sessionId":"..."}` | 200, nueva sesión | Media | API |
| PC-CHAT-004 | Chat widget UI | App cargada | Abrir `ChatWidget`, enviar mensaje | Respuesta visible; acciones de navegación | Media | Manual |
| PC-CHAT-005 | Chat offline UI | Sin conexión | Desactivar red, abrir chat | Input deshabilitado; mensaje offline | Media | PWA |

---

### 5.11 Panel proveedor y servicios clínica

| ID | Nombre del caso | Precondición | Pasos | Resultado esperado | Prioridad | Tipo |
|----|-----------------|--------------|-------|-------------------|-----------|------|
| PC-PROV-001 | Actualizar perfil proveedor | Proveedor autenticado | `PUT /api/proveedores/mi-perfil` body campos perfil | 200 | Media | API |
| PC-PROV-002 | Perfil proveedor UI | Proveedor logueado | `/proveedor/mi-perfil` | Cambios visibles en perfil público | Media | Manual |
| PC-PROV-003 | Listar servicios clínica | Vet autenticado | `GET /api/provider/clinic-services` | 200, servicios | Media | API |
| PC-PROV-004 | Crear servicio clínica | Vet autenticado | `POST /api/provider/clinic-services` body nombre, duración, precio | 201 | Media | API |
| PC-PROV-005 | Actualizar servicio | Servicio existente | `PATCH /api/provider/clinic-services/:id` | 200 | Media | API |
| PC-PROV-006 | Solicitar servicio UI | Dueño logueado | `/solicitar-servicio` (`RequestServicePage`) | Formulario enviado correctamente | Media | Manual |

---

### 5.12 Administración (`admin.routes.js`, `AdminProvidersPage`)

| ID | Nombre del caso | Precondición | Pasos | Resultado esperado | Prioridad | Tipo |
|----|-----------------|--------------|-------|-------------------|-----------|------|
| PC-ADMIN-001 | Listar proveedores pendientes | Admin autenticado | `GET /api/admin/providers/pending` | 200, lista pendientes | Media | API |
| PC-ADMIN-002 | Aprobar proveedor | Admin, proveedor pending | `PATCH /api/admin/providers/:userId/approve` | 200, status approved | Media | API |
| PC-ADMIN-003 | Rechazar proveedor | Admin | `PATCH /api/admin/providers/:userId/reject` body motivo | 200 | Media | API |
| PC-ADMIN-004 | Suspender proveedor | Admin | `PATCH /api/admin/providers/:userId/suspend` | 200 | Media | API |
| PC-ADMIN-005 | Admin UI proveedores | Admin logueado | `/admin/proveedores` | Listas pending/active/suspended funcionan | Media | Manual |
| PC-ADMIN-006 | Reportes reseñas | Admin | `GET /api/admin/review-reports` + `PATCH .../:reportId` | 200, decisión registrada | Media | API |
| PC-ADMIN-007 | Job recordatorios manual | Admin, scope full | `POST /api/admin/jobs/reminders24h/run` | 200, job ejecutado | Baja | API |

---

### 5.13 PWA (`vite.config.js`, `OfflineBanner`)

| ID | Nombre del caso | Precondición | Pasos | Resultado esperado | Prioridad | Tipo |
|----|-----------------|--------------|-------|-------------------|-----------|------|
| PC-PWA-001 | Service worker registrado | Build producción (`npm run build && npm run preview`) | DevTools → Application → Service Workers | SW activo (`registerSW` en `main.jsx`) | Media | PWA |
| PC-PWA-002 | Manifest válido | Build prod | Lighthouse PWA audit | Manifest con name PetConnect, icons 192/512 | Media | PWA |
| PC-PWA-003 | Instalación PWA | Chrome desktop/móvil | Clic "Instalar app" | App abre en standalone | Media | PWA |
| PC-PWA-004 | Banner offline | App cargada | DevTools → Network → Offline | `OfflineBanner` visible | Media | PWA |
| PC-PWA-005 | Shell offline | SW precacheado | Offline, navegar rutas cacheadas | HTML/JS/CSS cargan; API falla gracefully | Media | PWA |

---

### 5.14 Notificaciones email

| ID | Nombre del caso | Precondición | Pasos | Resultado esperado | Prioridad | Tipo |
|----|-----------------|--------------|-------|-------------------|-----------|------|
| PC-NOTIF-001 | Email cancelación cita | SMTP Mailtrap configurado | Cancelar cita como proveedor | Email en bandeja Mailtrap | Baja | Manual |
| PC-NOTIF-002 | Recordatorio 24h | Cita mañana, cron activo | Esperar job o `POST /api/admin/jobs/reminders24h/run` | Email recordatorio al dueño | Baja | Manual |
| PC-NOTIF-003 | Forgot password email | SMTP configurado, NODE_ENV=production | `POST /api/auth/forgot-password` | Email con link reset | Baja | Manual |

---

## 6. Entorno de Pruebas

### Hardware / navegadores / dispositivos

| Categoría | Recomendación |
|-----------|---------------|
| Desktop | Windows 10/11, macOS — Chrome 120+, Firefox 120+ |
| Móvil | Android Chrome, Safari iOS 16+ |
| Viewports | 375px (móvil), 768px (tablet), 1280px (desktop) |
| Red | WiFi estable + throttling 3G para PWA |

### URLs

| Entorno | Frontend (Vercel) | Backend (Render) | Health check |
|---------|-------------------|------------------|--------------|
| Local | `http://localhost:5173` | `http://localhost:3000/api` | `GET http://localhost:3000/health` |
| Staging | *(configurar en dashboard Vercel — proyecto `petconnect-web`)* | *(configurar en Render — servicio `petconnect-backend`)* | `GET {backend}/health` |
| Producción | *(dominio Vercel de producción)* | *(URL Render de producción)* | `GET {backend}/health` |

**Variables cruzadas deploy:**
- Backend `CLIENT_URL` debe incluir dominio(s) Vercel (prod + preview).
- Frontend build `VITE_API_BASE_URL` debe apuntar a URL Render del backend + `/api`.

### Variables de entorno — Backend (`.env.example`)

| Variable | Requerida | Propósito |
|----------|-----------|-----------|
| `PORT` | No (default 3000) | Puerto HTTP |
| `NODE_ENV` | Sí | `development` / `production` |
| `CLIENT_URL` | Sí (prod) | CORS y links reset password |
| `MONGODB_URI` | Sí | MongoDB Atlas/local |
| `JWT_SECRET` | Sí | Firma JWT |
| `JWT_EXPIRES_IN` | No (default 7d) | Expiración token |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`, `MAIL_FROM` | Para emails | Nodemailer / Mailtrap |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | Para chat IA | Vetto chatbot |
| `PETCONNECT_API_SCOPE` | No (default full) | `full` o `spa` (oculta admin/jobs) |
| `ADMIN_NOTIFICATION_EMAILS` | Opcional | Avisos admin |
| `NOMINATIM_BASE_URL`, `NOMINATIM_TIMEOUT_MS`, `NOMINATIM_USER_AGENT` | Opcional | Geocodificación OSM |
| `ADMIN_SEED_EMAIL`, `ADMIN_SEED_PASSWORD` | Seed | `npm run seed:admin` |
| `AGENDA_TIMEZONE` | No (default America/Santiago) | Agenda vet Luxon |
| `CHAT_LLM_TIMEOUT_MS`, `CHAT_SESSION_TTL_MS`, `CHAT_SESSION_MAX_MESSAGES` | Opcional | Chat Vetto |
| `UPLOADS_DIR` | Render | Directorio uploads (`/tmp/uploads` en free tier) |
| `ADMIN_REVIEW_EMAILS`, `REMINDER_WINDOW_MINUTES` | Opcional | Reportes reseñas, ventana cron |

### Variables de entorno — Frontend (`.env.example`)

| Variable | Requerida | Default | Propósito |
|----------|-----------|---------|-----------|
| `VITE_API_BASE_URL` | No | `http://localhost:3000/api` | Base URL Axios (`src/services/api.js`) |
| `VITE_AUTH_TOKEN_KEY` | No | `petconnect_token` | Key localStorage JWT |

### Setup Postman recomendado

**Collection:** `PetConnect API`

Carpetas: `Health`, `Auth`, `Profile`, `Pets`, `Appointments`, `Agenda`, `Bookings`, `Providers`, `Vet`, `Reviews`, `Chat`, `Admin`, `Smoke`.

**Environments:**

| Variable | Local | Staging / Production |
|----------|-------|----------------------|
| `baseUrl` | `http://localhost:3000/api` | `https://{render-host}/api` |
| `healthUrl` | `http://localhost:3000/health` | `https://{render-host}/health` |
| `token_dueno` | *(auto desde login)* | idem |
| `token_vet` | idem | idem |
| `token_admin` | idem | idem |
| `petId` | idem | idem |
| `providerId` | idem | idem |
| `slotId` | idem | idem |
| `appointmentId` | idem | idem |

**Pre-request script (carpeta Auth → Login dueño):**

```javascript
// Tras login exitoso, en Tests tab:
const json = pm.response.json();
pm.environment.set("token_dueno", json.token);
```

**Datos semilla:** ejecutar `npm run seed:admin` en backend; crear dueño, proveedor vet aprobado y mascota de prueba.

---

## 7. Recursos y Responsabilidades

| Rol | Responsabilidad |
|-----|-----------------|
| QA Engineer | Ejecutar casos, mantener `smoke-tests.md`, reportar bugs, configurar Postman |
| Dev Frontend | Corregir bugs UI/PWA, implementar Playwright (futuro) |
| Dev Backend | Corregir bugs API, implementar Jest+Supertest (futuro) |
| DevOps | Variables Render/Vercel, MongoDB Atlas, Mailtrap, monitoreo `/health` |
| Product Owner | Aprobar criterios de salida y sign-off de release |

---

## 8. Cronograma de Pruebas

| Fase | Actividad | Duración estimada |
|------|-----------|-------------------|
| 1 | Setup entorno local, Postman, datos semilla, smoke tests | 2 días |
| 2 | Auth, mascotas, ficha médica (prioridad ALTA) | 4 días |
| 3 | Citas, búsqueda/geo, proveedor (ALTA/MEDIA) | 4 días |
| 4 | Chat, PWA, admin, reseñas, notificaciones (MEDIA/BAJA) | 3 días |
| 5 | Regresión completa + reporte final | 2 días |
| **Total** | | **~15 días hábiles (3 semanas)** |

---

## 9. Riesgos y Mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Uploads efímeros en Render free tier | Alto en prod | Probar uploads en local; documentar limitación en release notes |
| Chat sesión en memoria (sin Redis) | Medio | Reinicio backend pierde contexto; validar fallback offline |
| OpenAI timeout o sin API key | Medio | Probar con/sin key; verificar respuesta fallback en `chat.controller.js` |
| Geolocalización denegada | Medio | Validar fallback Santiago en mapa y búsqueda |
| Sin tests automatizados | Alto (regresión) | Smoke tests obligatorios pre-deploy; roadmap Newman/Playwright |
| CORS mismatch Vercel ↔ Render | Alto | Checklist: `CLIENT_URL` + `VITE_API_BASE_URL` alineados |
| Rate limiting API | Bajo | Respetar límites en pruebas masivas Postman |

---

## 10. Criterios de Entrada y Salida

### Criterios de entrada

- [ ] Backend arranca sin errores (`npm start`) y `GET /health` retorna 200.
- [ ] Frontend arranca (`npm run dev`) y carga en `localhost:5173`.
- [ ] `.env` configurados en ambos repos (MongoDB, JWT, SMTP, OpenAI opcional).
- [ ] Admin semilla creado (`npm run seed:admin`).
- [ ] Datos de prueba: dueño, proveedor vet **aprobado** con agenda, al menos 1 mascota activa.
- [ ] Colección Postman importada con environment `Local`.

### Criterios de salida

- [ ] 100% casos **ALTA** pasados.
- [ ] ≥95% casos **MEDIA** pasados.
- [ ] 0 bugs **críticos** abiertos; bugs altos con workaround documentado.
- [ ] Smoke tests (`test-cases/smoke-tests.md`) verdes en staging.
- [ ] Reporte de pruebas entregado con evidencias de flujos críticos.

---

## 11. Entregables

| Artefacto | Ubicación | Descripción |
|-----------|-----------|-------------|
| Plan de pruebas | `PetConnect/TEST_PLAN.md` | Este documento |
| Smoke tests | `PetConnect/test-cases/smoke-tests.md` | 15 casos pre-deploy |
| Smoke tests (backend) | `PetConnectBackend/test-cases/smoke-tests.md` | Copia + enlace al plan |
| Matriz trazabilidad | *(hoja externa / Notion)* | Caso ↔ ruta API ↔ componente ↔ Postman Sí/No |
| Reporte de bugs | Jira / Notion / GitHub Issues | ID, severidad, pasos, evidencia |
| Colección Postman | `PetConnect/postman/PetConnect.postman_collection.json` | Export JSON + environments Local/Staging/Production |
| Evidencias | Carpeta compartida QA | Screenshots, videos flujos críticos |

---

## Apéndice A — Matriz de trazabilidad (extracto)

| ID caso | Ruta API | Componente frontend | Postman |
|---------|----------|---------------------|---------|
| PC-AUTH-003 | `POST /api/auth/login` | `LoginPage`, `AuthProvider` | Sí |
| PC-PETS-001 | `POST /api/pets` | `PetFormPage` | Sí |
| PC-MED-005 | `POST /api/vet/pets/:petId/clinical-encounters` | `VetClinicalPage` | Sí |
| PC-APPT-002 | `POST /api/appointments` | `BookAppointmentPage` | Sí |
| PC-SEARCH-004 | `GET /api/proveedores/mapa` | `ProvidersMapPage` | Sí |
| PC-PWA-004 | — | `OfflineBanner` | No |
| PC-CHAT-004 | `POST /api/chat` | `ChatWidget` | Parcial |

---

## Apéndice B — Health check y rutas no montadas

- **Health:** `GET /health` (sin prefijo `/api`) — usar en smoke y monitoreo Render.
- **Legacy no montadas (no probar):** `/api/chatbot/message`, `/api/chatbot/triage`, rutas en `vet.routes.js`, `providerPanel.routes.js`.
