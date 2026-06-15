import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uid = () => crypto.randomUUID();

function req(name, method, urlPath, opts = {}) {
  const { auth, body, desc, tests, prerequest } = opts;
  const headers = [{ key: 'Content-Type', value: 'application/json' }];
  if (auth === 'dueno') headers.push({ key: 'Authorization', value: 'Bearer {{token_dueno}}' });
  if (auth === 'dueno2') headers.push({ key: 'Authorization', value: 'Bearer {{token_dueno2}}' });
  if (auth === 'vet') headers.push({ key: 'Authorization', value: 'Bearer {{token_vet}}' });
  if (auth === 'admin') headers.push({ key: 'Authorization', value: 'Bearer {{token_admin}}' });
  if (auth === 'proveedor') headers.push({ key: 'Authorization', value: 'Bearer {{token_proveedor}}' });

  const item = {
    name,
    request: {
      method,
      header: headers,
      url: {
        raw: `{{baseUrl}}${urlPath}`,
        host: ['{{baseUrl}}'],
        path: urlPath.replace(/^\//, '').split('/').filter(Boolean),
      },
      description: desc || '',
    },
    response: [],
  };

  if (body) {
    item.request.body = {
      mode: 'raw',
      raw: typeof body === 'string' ? body : JSON.stringify(body, null, 2),
    };
  }

  if (tests || prerequest) {
    item.event = [];
    if (prerequest) {
      item.event.push({
        listen: 'prerequest',
        script: { type: 'text/javascript', exec: prerequest },
      });
    }
    if (tests) {
      item.event.push({
        listen: 'test',
        script: { type: 'text/javascript', exec: tests },
      });
    }
  }

  return item;
}

function urlReq(name, method, urlObj, opts = {}) {
  const item = req(name, method, '/', opts);
  item.request.url = urlObj;
  if (opts.auth === undefined) {
    item.request.header = item.request.header.filter((h) => h.key !== 'Authorization');
  }
  return item;
}

function folder(name, items, desc) {
  return { name, item: items, description: desc || '' };
}

const loginDuenoTests = [
  'pm.test("Status 200", () => pm.response.to.have.status(200));',
  'const json = pm.response.json();',
  'pm.test("Token presente", () => pm.expect(json.token).to.be.a("string"));',
  'if (json.token) pm.environment.set("token_dueno", json.token);',
  'if (json.user && json.user.id) pm.environment.set("userId_dueno", json.user.id);',
];

const loginVetTests = [
  'pm.test("Status 200", () => pm.response.to.have.status(200));',
  'const json = pm.response.json();',
  'if (json.token) pm.environment.set("token_vet", json.token);',
  'if (json.token) pm.environment.set("token_proveedor", json.token);',
  'if (json.user && json.user.id) pm.environment.set("userId_vet", json.user.id);',
];

const loginAdminTests = [
  'pm.test("Status 200", () => pm.response.to.have.status(200));',
  'const json = pm.response.json();',
  'if (json.token) pm.environment.set("token_admin", json.token);',
];

const loginDueno2Tests = [
  'pm.test("Status 200", () => pm.response.to.have.status(200));',
  'const json = pm.response.json();',
  'if (json.token) pm.environment.set("token_dueno2", json.token);',
];

const registerDuenoTests = [
  'pm.test("Status 201 o 409", () => pm.expect(pm.response.code).to.be.oneOf([201, 409]));',
];

const forgotPasswordTests = [
  'pm.test("Status 200", () => pm.response.to.have.status(200));',
  'const json = pm.response.json();',
  'if (json.resetUrl) {',
  '  const match = json.resetUrl.match(/token=([^&]+)/);',
  '  if (match) pm.environment.set("resetToken", match[1]);',
  '}',
];

const resetPasswordTests = [
  'pm.test("Status 200", () => pm.response.to.have.status(200));',
  'pm.test("Token capturado", () => pm.expect(pm.environment.get("resetToken")).to.be.a("string").and.not.empty);',
];

const stdOk = ['pm.test("Status OK", () => pm.expect(pm.response.code).to.be.oneOf([200, 201]));'];
const std201 = ['pm.test("Status 201", () => pm.response.to.have.status(201));'];

const healthReq = {
  name: 'SMK-001 Health check',
  request: {
    method: 'GET',
    header: [],
    url: '{{healthUrl}}',
    description: 'GET /health — sin prefijo /api',
  },
  event: [
    {
      listen: 'test',
      script: {
        type: 'text/javascript',
        exec: [
          'pm.test("Health 200", () => pm.response.to.have.status(200));',
          'pm.test("status ok", () => pm.expect(pm.response.json().status).to.eql("ok"));',
        ],
      },
    },
  ],
  response: [],
};

const mapUrl = {
  raw: '{{baseUrl}}/proveedores/mapa?lat={{mapLat}}&lng={{mapLng}}&radioKm={{mapRadioKm}}',
  host: ['{{baseUrl}}'],
  path: ['proveedores', 'mapa'],
  query: [
    { key: 'lat', value: '{{mapLat}}' },
    { key: 'lng', value: '{{mapLng}}' },
    { key: 'radioKm', value: '{{mapRadioKm}}' },
  ],
};

const searchUrl = {
  raw: '{{baseUrl}}/proveedores/buscar?tipo=veterinaria&pagina=1&limite=5',
  host: ['{{baseUrl}}'],
  path: ['proveedores', 'buscar'],
  query: [
    { key: 'tipo', value: 'veterinaria' },
    { key: 'pagina', value: '1' },
    { key: 'limite', value: '5' },
  ],
};

const searchFullUrl = {
  raw: '{{baseUrl}}/proveedores/buscar?tipo=veterinaria&ciudad=Santiago&pagina=1&limite=10',
  host: ['{{baseUrl}}'],
  path: ['proveedores', 'buscar'],
  query: [
    { key: 'tipo', value: 'veterinaria' },
    { key: 'ciudad', value: 'Santiago' },
    { key: 'pagina', value: '1' },
    { key: 'limite', value: '10' },
  ],
};

const slotsUrl = {
  raw: '{{baseUrl}}/appointments/providers/{{providerId}}/available-slots?clinicServiceId={{clinicServiceId}}',
  host: ['{{baseUrl}}'],
  path: ['appointments', 'providers', '{{providerId}}', 'available-slots'],
  query: [{ key: 'clinicServiceId', value: '{{clinicServiceId}}' }],
};

const slotsSaveFirst = [
  ...stdOk,
  'const json = pm.response.json();',
  'pm.test("Slots disponibles", () => {',
  '  pm.expect(json.slots).to.be.an("array").that.is.not.empty;',
  '  pm.expect(json.slots[0]._id).to.be.a("string");',
  '});',
  'if (json.slots && json.slots[0] && json.slots[0]._id) pm.environment.set("slotId", json.slots[0]._id);',
];

const createAppointmentTests = [
  ...std201,
  'const json = pm.response.json();',
  'const appt = json.appointment || json;',
  'const id = appt._id || appt.id;',
  'if (id) pm.environment.set("appointmentId", String(id));',
];

const saveReviewIdTests = [
  'pm.test("Status 201 o 409", () => pm.expect(pm.response.code).to.be.oneOf([201, 409]));',
  'if (pm.response.code === 201) {',
  '  const json = pm.response.json();',
  '  const review = json.review || json;',
  '  const id = review._id || review.id;',
  '  if (id) pm.environment.set("reviewId", String(id));',
  '}',
];

const reviewEligibilityTests = [
  ...stdOk,
  'const json = pm.response.json();',
  'if (json.reviewId) pm.environment.set("reviewId", String(json.reviewId));',
];

const agendaDatePrerequest = [
  'const from = new Date();',
  'from.setDate(from.getDate() + 1);',
  'const to = new Date(from);',
  'to.setDate(to.getDate() + 7);',
  'const fmt = (d) => d.toISOString().slice(0, 10);',
  'pm.variables.set("agendaFromDate", fmt(from));',
  'pm.variables.set("agendaToDate", fmt(to));',
];

const agendaSlotsSaveFirst = [
  ...stdOk,
  'const json = pm.response.json();',
  'const available = (json.slots || []).find((s) => s.status === "available");',
  'pm.test("Slot disponible en agenda", () => pm.expect(available).to.be.an("object"));',
  'if (available && available._id) pm.environment.set("slotId", available._id);',
];

const stdOkOr400 = [
  'pm.test("Status OK o regla de negocio", () => pm.expect(pm.response.code).to.be.oneOf([200, 201, 400]));',
];

const createEncounterTests = [
  'pm.test("Status 201 o 409", () => pm.expect(pm.response.code).to.be.oneOf([201, 409]));',
  'if (pm.response.code === 201) {',
  '  const json = pm.response.json();',
  '  const enc = json.encounter || json;',
  '  const id = enc._id || enc.id;',
  '  if (id) pm.environment.set("encounterId", String(id));',
  '}',
];

const agendaOmitsUrl = {
  raw: '{{baseUrl}}/provider/agenda/omits?from={{agendaFromDate}}&to={{agendaToDate}}',
  host: ['{{baseUrl}}'],
  path: ['provider', 'agenda', 'omits'],
  query: [
    { key: 'from', value: '{{agendaFromDate}}' },
    { key: 'to', value: '{{agendaToDate}}' },
  ],
};

const smokeCreateAppointmentTests = [
  'pm.test("slotId presente", () => pm.expect(pm.environment.get("slotId")).to.be.a("string").and.not.empty);',
  ...std201,
];

const chatSaveSession = [
  ...stdOk,
  'const json = pm.response.json();',
  'if (json.sessionId) pm.environment.set("chatSessionId", json.sessionId);',
];

const collection = {
  info: {
    _postman_id: uid(),
    name: 'PetConnect API',
    description:
      'Colección QA PetConnect — alineada con TEST_PLAN.md y test-cases/smoke-tests.md.\n\n1. Importar un environment (Local/Staging/Production).\n2. Ejecutar Auth > Login dueño (o Smoke > SMK-002).\n3. Completar variables petId, providerId, slotId según datos semilla.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  item: [
    folder(
      'Smoke',
      [
        healthReq,
        req('SMK-002 Login dueño', 'POST', '/auth/login', {
          body: { email: '{{email_dueno}}', password: '{{password_dueno}}' },
          desc: 'Guarda token_dueno',
          tests: loginDuenoTests,
        }),
        req('SMK-004 Listar mascotas', 'GET', '/pets', { auth: 'dueno', tests: stdOk }),
        urlReq('SMK-005 Mapa proveedores', 'GET', mapUrl, { tests: stdOk }),
        urlReq('SMK-006 Buscar veterinarias', 'GET', searchUrl, { tests: stdOk }),
        urlReq('SMK-007a Slots disponibles', 'GET', slotsUrl, { auth: 'dueno', tests: slotsSaveFirst }),
        req('SMK-007b Crear cita', 'POST', '/appointments', {
          auth: 'dueno',
          body: {
            providerId: '{{providerId}}',
            slotId: '{{slotId}}',
            petId: '{{petId}}',
            reason: 'Smoke test Postman',
          },
          tests: smokeCreateAppointmentTests,
        }),
        req('SMK-008 Bookings dueño', 'GET', '/bookings/mine', { auth: 'dueno', tests: stdOk }),
        req('SMK-009a Login veterinario', 'POST', '/auth/login', {
          body: { email: '{{email_vet}}', password: '{{password_vet}}' },
          tests: loginVetTests,
        }),
        req('SMK-009 Pacientes vet', 'GET', '/vet/patients', { auth: 'vet', tests: stdOk }),
        req('SMK-010 Ficha médica resumen', 'GET', '/pets/{{petId}}/medical-summary', {
          auth: 'dueno',
          tests: stdOk,
        }),
        req('SMK-011 Chat Vetto', 'POST', '/chat', {
          body: { message: 'Hola, mi gato no come desde ayer' },
          tests: chatSaveSession,
        }),
        req('SMK-015 Forgot password', 'POST', '/auth/forgot-password', {
          body: { email: '{{email_dueno}}' },
          tests: ['pm.test("Status 200", () => pm.response.to.have.status(200));'],
        }),
      ],
      'Casos críticos pre-deploy (smoke-tests.md)',
    ),
    folder('Health', [healthReq]),
    folder('Auth', [
      req('Register dueño', 'POST', '/auth/register', {
        body: {
          name: 'Test',
          lastName: 'Dueño',
          email: 'dueno+nuevo@test.com',
          password: 'Test1234!',
          phone: '+56900000001',
        },
        tests: registerDuenoTests,
      }),
      req('Login dueño', 'POST', '/auth/login', {
        body: { email: '{{email_dueno}}', password: '{{password_dueno}}' },
        tests: loginDuenoTests,
      }),
      req('Login veterinario', 'POST', '/auth/login', {
        body: { email: '{{email_vet}}', password: '{{password_vet}}' },
        tests: loginVetTests,
      }),
      req('Login admin', 'POST', '/auth/login', {
        body: { email: '{{email_admin}}', password: '{{password_admin}}' },
        tests: loginAdminTests,
      }),
      req('Forgot password', 'POST', '/auth/forgot-password', {
        body: { email: '{{email_dueno}}' },
        tests: forgotPasswordTests,
      }),
      req('Reset password', 'POST', '/auth/reset-password', {
        body: { email: '{{email_dueno}}', token: '{{resetToken}}', newPassword: '{{password_dueno}}' },
        tests: resetPasswordTests,
      }),
    ]),
    folder('Profile', [
      req('GET profile/me', 'GET', '/profile/me', { auth: 'dueno', tests: stdOk }),
      req('PUT profile/me', 'PUT', '/profile/me', {
        auth: 'dueno',
        body: { name: 'Juan', lastName: 'Pérez', phone: '+56912345678' },
        tests: stdOk,
      }),
    ]),
    folder('Pets', [
      req('POST crear mascota', 'POST', '/pets', {
        auth: 'dueno',
        body: {
          name: 'Firulais',
          species: 'perro',
          breed: 'Labrador',
          birthDate: '2020-05-15',
          sex: 'macho',
          color: 'dorado',
        },
        tests: std201,
      }),
      req('GET listar mascotas', 'GET', '/pets', { auth: 'dueno', tests: stdOk }),
      req('GET mascota por ID', 'GET', '/pets/{{petId}}', { auth: 'dueno', tests: stdOk }),
      req('PATCH actualizar mascota', 'PATCH', '/pets/{{petId}}', {
        auth: 'dueno',
        body: { name: 'Firulais II', color: 'negro' },
        tests: stdOk,
      }),
      req('GET medical-summary', 'GET', '/pets/{{petId}}/medical-summary', { auth: 'dueno', tests: stdOk }),
      req('GET clinical-encounters', 'GET', '/pets/{{petId}}/clinical-encounters', { auth: 'dueno', tests: stdOk }),
      req('GET encounter detail', 'GET', '/pets/{{petId}}/clinical-encounters/{{encounterId}}', {
        auth: 'dueno',
        tests: stdOk,
      }),
      req('GET export PDF', 'GET', '/pets/{{petId}}/medical-record/export.pdf', { auth: 'dueno', tests: stdOk }),
    ]),
    folder('Appointments', [
      urlReq('GET available-slots (cancel dueño)', 'GET', slotsUrl, { auth: 'dueno', tests: slotsSaveFirst }),
      req('POST crear cita (cancel dueño)', 'POST', '/appointments', {
        auth: 'dueno',
        body: {
          providerId: '{{providerId}}',
          slotId: '{{slotId}}',
          petId: '{{petId}}',
          reason: 'QA cancel dueño',
        },
        tests: createAppointmentTests,
      }),
      req('PATCH cancelar (dueño)', 'PATCH', '/appointments/{{appointmentId}}/cancel', {
        auth: 'dueno',
        body: { cancellationReason: 'Prueba QA' },
        tests: stdOk,
      }),
      urlReq('GET available-slots (cancel proveedor)', 'GET', slotsUrl, { auth: 'dueno', tests: slotsSaveFirst }),
      req('POST crear cita (cancel proveedor)', 'POST', '/appointments', {
        auth: 'dueno',
        body: {
          providerId: '{{providerId}}',
          slotId: '{{slotId}}',
          petId: '{{petId}}',
          reason: 'QA cancel proveedor',
        },
        tests: createAppointmentTests,
      }),
      req('PATCH cancelar (proveedor)', 'PATCH', '/appointments/{{appointmentId}}/provider/cancel', {
        auth: 'proveedor',
        body: { cancellationReason: 'Proveedor no disponible' },
        tests: stdOk,
      }),
      urlReq('GET available-slots', 'GET', slotsUrl, { auth: 'dueno', tests: slotsSaveFirst }),
      req('POST crear cita', 'POST', '/appointments', {
        auth: 'dueno',
        body: {
          providerId: '{{providerId}}',
          slotId: '{{slotId}}',
          petId: '{{petId}}',
          reason: 'Consulta general',
        },
        tests: createAppointmentTests,
      }),
      req('GET mis citas', 'GET', '/appointments/mine', { auth: 'dueno', tests: stdOk }),
      req('PATCH confirmar (proveedor)', 'PATCH', '/appointments/{{appointmentId}}/provider/confirm', {
        auth: 'proveedor',
        tests: stdOk,
      }),
      req('PATCH internal-notes', 'PATCH', '/appointments/{{appointmentId}}/provider/internal-notes', {
        auth: 'proveedor',
        body: { internalNotes: 'Nota interna QA' },
        tests: stdOk,
      }),
      req('PATCH complete-walker', 'PATCH', '/appointments/{{appointmentId}}/provider/complete-walker', {
        auth: 'proveedor',
        tests: stdOkOr400,
      }),
      req('PATCH complete-vet', 'PATCH', '/appointments/{{appointmentId}}/provider/complete-vet', {
        auth: 'proveedor',
        tests: stdOk,
      }),
      req('PATCH complete-visit', 'PATCH', '/appointments/{{appointmentId}}/provider/complete-visit', {
        auth: 'proveedor',
        tests: stdOkOr400,
      }),
      req('GET review-eligibility', 'GET', '/appointments/{{appointmentId}}/review-eligibility', {
        auth: 'dueno',
        tests: reviewEligibilityTests,
      }),
      req('POST crear reseña cita', 'POST', '/appointments/{{appointmentId}}/reviews', {
        auth: 'dueno',
        body: { rating: 5, comment: 'Excelente atención' },
        tests: saveReviewIdTests,
      }),
    ]),
    folder('Bookings', [
      req('GET bookings/mine', 'GET', '/bookings/mine', { auth: 'dueno', tests: stdOk }),
      req('GET bookings/provider/mine', 'GET', '/bookings/provider/mine', { auth: 'proveedor', tests: stdOk }),
    ]),
    folder('Agenda', [
      req('POST generate slots', 'POST', '/provider/agenda/generate', {
        auth: 'proveedor',
        body: { fromDate: '{{agendaFromDate}}', toDate: '{{agendaToDate}}' },
        prerequest: agendaDatePrerequest,
        tests: stdOk,
      }),
      req('GET slots', 'GET', '/provider/agenda/slots', { auth: 'proveedor', tests: agendaSlotsSaveFirst }),
      req('PATCH block slot', 'PATCH', '/provider/agenda/slots/{{slotId}}/block', {
        auth: 'proveedor',
        tests: stdOk,
      }),
      req('PATCH unblock slot', 'PATCH', '/provider/agenda/slots/{{slotId}}/unblock', {
        auth: 'proveedor',
        tests: stdOk,
      }),
      req('DELETE slot', 'DELETE', '/provider/agenda/slots/{{slotId}}', { auth: 'proveedor', tests: stdOk }),
      urlReq('DELETE clear omits', 'DELETE', agendaOmitsUrl, {
        auth: 'proveedor',
        prerequest: agendaDatePrerequest,
        tests: stdOk,
      }),
    ]),
    folder('Providers', [
      urlReq('GET buscar', 'GET', searchFullUrl, { tests: stdOk }),
      urlReq('GET mapa', 'GET', mapUrl, { tests: stdOk }),
      req('GET listar aprobados', 'GET', '/proveedores', { tests: stdOk }),
      req('GET perfil por ID', 'GET', '/proveedores/{{providerId}}/perfil', { tests: stdOk }),
      req('GET perfil por slug', 'GET', '/proveedores/perfil/veterinaria/{{providerSlug}}', { tests: stdOk }),
      req('GET reviews proveedor', 'GET', '/proveedores/{{providerId}}/reviews', { tests: stdOk }),
      req('PUT mi-perfil proveedor', 'PUT', '/proveedores/mi-perfil', {
        auth: 'proveedor',
        body: { description: 'Perfil actualizado QA' },
        tests: stdOk,
      }),
      req('POST solicitar servicio', 'POST', '/proveedores/solicitar-servicio', {
        auth: 'dueno',
        body: {
          providerId: '{{walkerProviderId}}',
          pet: { name: 'Firulais', species: 'perro' },
          message: 'Necesito paseo',
          preferredStart: '2026-06-15T10:00:00.000Z',
          preferredEnd: '2026-06-15T11:00:00.000Z',
        },
        tests: std201,
      }),
    ]),
    folder('Clinic Services', [
      req('GET servicios', 'GET', '/provider/clinic-services', { auth: 'proveedor', tests: stdOk }),
      req('POST crear servicio', 'POST', '/provider/clinic-services', {
        auth: 'proveedor',
        body: { displayName: 'Vacuna QA TCP-001', kind: 'consulta', slotDurationMinutes: 30, priceClp: 25000 },
        tests: ['pm.test("Status 201 o 409", () => pm.expect(pm.response.code).to.be.oneOf([201, 409]));'],
      }),
      req('PATCH actualizar servicio', 'PATCH', '/provider/clinic-services/{{clinicServiceId}}', {
        auth: 'proveedor',
        body: { priceClp: 30000 },
        tests: stdOk,
      }),
    ]),
    folder('Vet Clinical', [
      req('GET pacientes', 'GET', '/vet/patients', { auth: 'vet', tests: stdOk }),
      req('GET encounters', 'GET', '/vet/pets/{{petId}}/clinical-encounters', { auth: 'vet', tests: stdOk }),
      req('POST crear encounter', 'POST', '/vet/pets/{{petId}}/clinical-encounters', {
        auth: 'vet',
        body: {
          appointmentId: '{{appointmentId}}',
          type: 'consulta',
          motivo: 'Control rutinario QA',
          diagnostico: 'Estado general bueno',
          tratamiento: 'Continuar alimentación habitual',
        },
        tests: createEncounterTests,
      }),
      req('GET encounter detail', 'GET', '/vet/pets/{{petId}}/clinical-encounters/{{encounterId}}', {
        auth: 'vet',
        tests: stdOk,
      }),
      req('PATCH actualizar encounter', 'PATCH', '/vet/clinical-encounters/{{encounterId}}', {
        auth: 'vet',
        body: { observaciones: 'Actualizado QA' },
        tests: stdOkOr400,
      }),
      req('POST retracción', 'POST', '/vet/clinical-encounters/{{encounterId}}/retractions', {
        auth: 'vet',
        body: { text: 'Corrección de nota QA' },
        tests: stdOkOr400,
      }),
    ]),
    folder('Reviews', [
      req('Login dueño2', 'POST', '/auth/login', {
        body: { email: '{{email_dueno2}}', password: '{{password_dueno}}' },
        tests: loginDueno2Tests,
      }),
      req('PATCH editar reseña', 'PATCH', '/reviews/{{reviewId}}', {
        auth: 'dueno',
        body: { rating: 4, comment: 'Muy bueno' },
        tests: stdOk,
      }),
      req('POST reportar reseña', 'POST', '/reviews/{{reviewId}}/report', {
        auth: 'dueno2',
        body: { reason: 'lenguaje_ofensivo', details: 'Prueba QA' },
        tests: [
          'pm.test("Status 201 o 409", () => pm.expect(pm.response.code).to.be.oneOf([201, 409]));',
        ],
      }),
      req('GET reseñas panel proveedor', 'GET', '/provider/reviews', { auth: 'proveedor', tests: stdOk }),
      req('PUT reply proveedor', 'PUT', '/provider/reviews/{{reviewId}}/reply', {
        auth: 'proveedor',
        body: { text: 'Gracias por su feedback' },
        tests: stdOkOr400,
      }),
    ]),
    folder('Chat', [
      req('POST mensaje', 'POST', '/chat', {
        body: { message: 'Mi perro tiene vómitos desde ayer' },
        tests: chatSaveSession,
      }),
      req('POST continuar sesión', 'POST', '/chat', {
        body: { message: 'Tiene 3 años', sessionId: '{{chatSessionId}}' },
        tests: chatSaveSession,
      }),
      req('POST reset sesión', 'POST', '/chat', {
        body: { reset: true, sessionId: '{{chatSessionId}}' },
        tests: stdOk,
      }),
    ]),
    folder('Admin', [
      req('GET providers pending', 'GET', '/admin/providers/pending', { auth: 'admin', tests: stdOk }),
      req('GET providers active', 'GET', '/admin/providers/active', { auth: 'admin', tests: stdOk }),
      req('GET providers suspended', 'GET', '/admin/providers/suspended', { auth: 'admin', tests: stdOk }),
      req('PATCH approve provider', 'PATCH', '/admin/providers/{{pendingProviderId}}/approve', {
        auth: 'admin',
        tests: stdOkOr400,
      }),
      req('PATCH reject provider', 'PATCH', '/admin/providers/{{pendingProviderId}}/reject', {
        auth: 'admin',
        body: { reason: 'Documentación incompleta' },
        tests: stdOkOr400,
      }),
      req('PATCH suspend provider', 'PATCH', '/admin/providers/{{providerUserId}}/suspend', {
        auth: 'admin',
        tests: stdOk,
      }),
      req('PATCH reactivate provider', 'PATCH', '/admin/providers/{{providerUserId}}/reactivate', {
        auth: 'admin',
        tests: stdOk,
      }),
      req('GET audit-logs', 'GET', '/admin/audit-logs', { auth: 'admin', tests: stdOk }),
      req('GET review-reports', 'GET', '/admin/review-reports', { auth: 'admin', tests: stdOk }),
      req('PATCH decide report', 'PATCH', '/admin/review-reports/{{reportId}}', {
        auth: 'admin',
        body: { accion: 'aprobar_reseña', nota: 'Sin violación' },
        tests: stdOkOr400,
      }),
      req('POST run reminders 24h', 'POST', '/admin/jobs/reminders24h/run', { auth: 'admin', tests: stdOk }),
    ]),
    folder('Pets cleanup', [
      req('PATCH mark-deceased', 'PATCH', '/pets/{{petId}}/mark-deceased', { auth: 'dueno', tests: stdOk }),
    ]),
  ],
  variable: [
    { key: 'baseUrl', value: 'http://localhost:3000/api' },
    { key: 'healthUrl', value: 'http://localhost:3000/health' },
  ],
};

function buildEnv(name, overrides = {}) {
  const defaults = {
    baseUrl: 'http://localhost:3000/api',
    healthUrl: 'http://localhost:3000/health',
    email_dueno: 'smoke.qa@test.com',
    password_dueno: 'SmokeTest2026!',
    email_vet: 'vet@prueba.cl',
    password_vet: 'prueba123',
    email_admin: 'admin@petconnect.local',
    password_admin: 'AdminPetConnect2026',
    token_dueno: '',
    token_vet: '',
    token_admin: '',
    token_proveedor: '',
    userId_dueno: '',
    userId_vet: '',
    petId: '',
    providerId: '',
    providerUserId: '',
    providerSlug: '',
    pendingProviderId: '',
    walkerProviderId: '',
    email_dueno2: '',
    token_dueno2: '',
    slotId: '',
    appointmentId: '',
    encounterId: '',
    reviewId: '',
    reportId: '',
    clinicServiceId: '',
    resetToken: '',
    chatSessionId: '',
    mapLat: '-33.4489',
    mapLng: '-70.6693',
    mapRadioKm: '15',
  };
  const merged = { ...defaults, ...overrides };
  return {
    id: uid(),
    name,
    values: Object.entries(merged).map(([key, value]) => ({
      key,
      value: String(value),
      type: 'default',
      enabled: true,
    })),
    _postman_variable_scope: 'environment',
  };
}

const outDir = __dirname;
fs.writeFileSync(path.join(outDir, 'PetConnect.postman_collection.json'), JSON.stringify(collection, null, 2));
fs.writeFileSync(path.join(outDir, 'PetConnect-Local.postman_environment.json'), JSON.stringify(buildEnv('PetConnect - Local'), null, 2));
fs.writeFileSync(
  path.join(outDir, 'PetConnect-Staging.postman_environment.json'),
  JSON.stringify(
    buildEnv('PetConnect - Staging', {
      baseUrl: 'https://YOUR-RENDER-STAGING.onrender.com/api',
      healthUrl: 'https://YOUR-RENDER-STAGING.onrender.com/health',
    }),
    null,
    2,
  ),
);
fs.writeFileSync(
  path.join(outDir, 'PetConnect-Production.postman_environment.json'),
  JSON.stringify(
    buildEnv('PetConnect - Production', {
      baseUrl: 'https://YOUR-RENDER-PROD.onrender.com/api',
      healthUrl: 'https://YOUR-RENDER-PROD.onrender.com/health',
      password_dueno: 'CHANGE_ME',
      password_vet: 'CHANGE_ME',
      password_admin: 'CHANGE_ME',
      email_admin: 'admin@petconnect.app',
    }),
    null,
    2,
  ),
);

console.log('Postman files generated in', outDir);
