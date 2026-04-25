import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { hasRole } from '../lib/userRoles';
import { WEEK_DAYS, WEEK_DAY_LABELS } from '../constants/providerWeek';
import { getProviderProfilePath, updateMyProviderProfile } from '../services/providers';

function emptyWeekly() {
	return Object.fromEntries(
		WEEK_DAYS.map((d) => [d, { enabled: false, start: '09:00', end: '18:00' }])
	);
}

function weeklyFromApi(raw) {
	const out = emptyWeekly();
	if (!Array.isArray(raw)) return out;
	for (const row of raw) {
		if (!row || !WEEK_DAYS.includes(row.day)) continue;
		const r0 = Array.isArray(row.ranges) ? row.ranges[0] : null;
		out[row.day] = {
			enabled: row.enabled !== false,
			start: r0?.start || '09:00',
			end: r0?.end || '18:00'
		};
	}
	return out;
}

function userToForm(user) {
	const pp = user?.providerProfile || {};
	const addr = pp.address || {};
	const wt = pp.walkerTariffs || {};
	const sm = pp.socialMedia || {};
	const pType = user?.providerType;
	const isWalkerT = pType === 'paseador' || pType === 'cuidador';
	const isVetT = pType === 'veterinaria';
	const schedRaw = (pp.schedule || '').trim();
	let open24Hours = false;
	let scheduleFree = schedRaw;
	if (!isWalkerT && !isVetT && (/^24\/7(\s*—\s*|\s*-\s*|\s+)/.test(schedRaw) || schedRaw === '24/7')) {
		open24Hours = true;
		scheduleFree = schedRaw
			.replace(/^24\/7(\s*—\s*|\s*-\s*|\s+)/, '')
			.replace(/^24\/7$/i, '')
			.trim();
	}
	const vetSched = isVetT ? parseVetScheduleString(schedRaw) : null;

	return {
		phone: user?.phone || '',
		description: pp.description || '',
		open24Hours: isVetT ? Boolean(vetSched.open24) : isWalkerT ? false : open24Hours,
		schedule: isVetT ? '' : isWalkerT ? schedRaw : scheduleFree,
		receptionOpen: isVetT ? vetSched.open : '09:00',
		receptionClose: isVetT ? vetSched.close : '18:00',
		scheduleNotes: isVetT ? vetSched.notes : '',
		services: Array.isArray(pp.services) ? pp.services.join('\n') : '',
		publicSlug: pp.publicSlug || '',
		isPublished: pp.isPublished !== false,
		operationalStatus: pp.operationalStatus || 'abierto',
		addressStreet: addr.street || '',
		addressCommune: addr.commune || '',
		addressCity: addr.city || '',
		socialInstagram: sm.instagram || '',
		socialFacebook: sm.facebook || '',
		socialTwitter: sm.twitter || '',
		socialWebsite: sm.website || '',
		serviceCommunes: Array.isArray(pp.serviceCommunes) ? pp.serviceCommunes.join(', ') : '',
		petTypes: Array.isArray(pp.petTypes) ? pp.petTypes.join(', ') : '',
		experienceYears: pp.experienceYears != null ? String(pp.experienceYears) : '',
		petsAttended: pp.petsAttended || '',
		weeklyAvailability: weeklyFromApi(pp.weeklyAvailability),
		walk30min: wt.walk30min != null ? String(wt.walk30min) : '',
		walk60min: wt.walk60min != null ? String(wt.walk60min) : '',
		dayCare: wt.dayCare != null ? String(wt.dayCare) : '',
		overnight: wt.overnight != null ? String(wt.overnight) : '',
		walkerCurrency: wt.currency || 'CLP',
		refAmount: pp.referenceRate?.amount != null ? String(pp.referenceRate.amount) : '',
		refUnit: pp.referenceRate?.unit || '',
		refCurrency: pp.referenceRate?.currency || 'CLP',
		agendaSlotStart: toTimeInputValue(pp.agendaSlotStart) || '09:00',
		agendaSlotEnd: toTimeInputValue(pp.agendaSlotEnd) || '18:00'
	};
}

function toTimeInputValue(s) {
	if (s == null) return '';
	const t = String(s).trim();
	if (!t) return '';
	const m = t.match(/^(\d{1,2}):(\d{2})/);
	if (!m) return '';
	const h = String(m[1]).padStart(2, '0');
	return `${h}:${m[2]}`;
}

function timeStringToMinutes(hhmm) {
	const t = toTimeInputValue(hhmm);
	if (!t) return NaN;
	const [h, m] = t.split(':').map(Number);
	return h * 60 + m;
}

/**
 * A partir de providerProfile.schedule (veterinaria) obtiene 24/7, rango apertura/cierre y notas extra.
 * Formato de guardado: "24/7" o "24/7 — notas", o "Horario 09:00 – 18:00 · notas" (ver onSubmit).
 */
function parseVetScheduleString(raw) {
	const t = (raw || '').trim();
	const defaults = { open: '09:00', close: '18:00' };
	if (!t) {
		return { open24: false, ...defaults, notes: '' };
	}
	if (/^24\/7(\s*—\s*|\s*-\s*|\s+|$)/.test(t) || /^24\/7$/i.test(t)) {
		const notes = t
			.replace(/^24\/7(\s*—\s*|\s*-\s*|\s+)/, '')
			.replace(/^24\/7$/i, '')
			.trim();
		return { open24: true, ...defaults, notes };
	}
	const m = t.match(
		/(\d{1,2}):(\d{2})\s*(?:[-–—]|a\.?\s*las?|hasta|to)\s*(\d{1,2}):(\d{2})/i
	);
	if (m) {
		const o = toTimeInputValue(`${m[1]}:${m[2]}`) || defaults.open;
		const c = toTimeInputValue(`${m[3]}:${m[4]}`) || defaults.close;
		let notes = t.replace(m[0], ' ').replace(/\s+/g, ' ').replace(/^horario\s*/i, '').trim();
		notes = notes
			.replace(/^\s*·\s*|\s*·\s*$/g, '')
			.replace(/\s*·\s*$/g, '')
			.trim();
		return { open24: false, open: o, close: c, notes: notes || '' };
	}
	return { open24: false, ...defaults, notes: t };
}

export function ProviderMiPerfilPage() {
	const { user, loading, refreshUser } = useAuth();
	const [form, setForm] = useState(null);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState('');
	const [error, setError] = useState('');
	/** Paseador/cuidador y veterinaria: sección activa (una a la vez) */
	const [profileSection, setProfileSection] = useState('visibilidad');

	useEffect(() => {
		if (user && hasRole(user, 'proveedor')) {
			setForm(userToForm(user));
		}
	}, [user]);

	/* Cuenta dueño+proveedor: role sigue "dueno" pero roles incluye proveedor. */
	if (!loading && (!user || !hasRole(user, 'proveedor'))) {
		return <Navigate to='/login' replace state={{ from: '/proveedor/mi-perfil' }} />;
	}

	if (loading || !form) {
		return (
			<div className='page'>
				<p>Cargando perfil…</p>
			</div>
		);
	}

	const isWalker = user.providerType === 'paseador' || user.providerType === 'cuidador';
	const isVet = user.providerType === 'veterinaria';

	const WALKER_SECTIONS = [
		{ id: 'visibilidad', label: 'Visibilidad' },
		{ id: 'contacto', label: 'Perfil' },
		{ id: 'ubicacion', label: 'Ubicación' },
		{ id: 'disponibilidad', label: 'Disponibilidad y precios' },
		{ id: 'redes', label: 'Redes' }
	];

	const VET_SECTIONS = [
		{ id: 'visibilidad', label: 'Visibilidad' },
		{ id: 'contacto', label: 'Horario y servicios' },
		{ id: 'ubicacion', label: 'Ubicación' },
		{ id: 'redes', label: 'Redes' }
	];

	const useSectionedLayout = isVet || isWalker;
	const profileSections = isVet ? VET_SECTIONS : WALKER_SECTIONS;
	const activeIdx = profileSections.findIndex((s) => s.id === profileSection);
	const sectionStep = activeIdx >= 0 ? activeIdx + 1 : 1;
	const sectionCount = profileSections.length;

	/** Misma lógica para clínica y paseo/cuidado: ocultar bloques sin desmontar campos. */
	function profilePanelClass(section) {
		if (!useSectionedLayout) return 'provider-mi-ficha__group';
		return profileSection === section
			? 'provider-mi-ficha__group'
			: 'provider-mi-ficha__group provider-mi-ficha__group--hidden';
	}

	function setField(key, value) {
		setForm((f) => ({ ...f, [key]: value }));
	}

	function setWeeklyDay(day, patch) {
		setForm((f) => ({
			...f,
			weeklyAvailability: {
				...f.weeklyAvailability,
				[day]: { ...f.weeklyAvailability[day], ...patch }
			}
		}));
	}

	async function onSubmit(e) {
		e.preventDefault();
		setError('');
		setMessage('');
		setSaving(true);
		try {
			let scheduleOut;
			if (isVet) {
				if (form.open24Hours) {
					scheduleOut =
						'24/7' + (form.scheduleNotes && String(form.scheduleNotes).trim() ? ' — ' + String(form.scheduleNotes).trim() : '');
				} else {
					const o = toTimeInputValue(form.receptionOpen) || '09:00';
					const c = toTimeInputValue(form.receptionClose) || '18:00';
					const minO = timeStringToMinutes(o);
					const minC = timeStringToMinutes(c);
					if (Number.isNaN(minO) || Number.isNaN(minC)) {
						setError('Indica apertura y cierre con formato de hora válido.');
						setSaving(false);
						return;
					}
					if (minO >= minC) {
						setError('La hora de cierre debe ser posterior a la de apertura.');
						setSaving(false);
						return;
					}
					const extra = form.scheduleNotes && String(form.scheduleNotes).trim() ? ` · ${String(form.scheduleNotes).trim()}` : '';
					scheduleOut = `Horario ${o} – ${c}${extra}`;
				}
			} else {
				scheduleOut = form.schedule.trim();
			}

			const body = {
				phone: form.phone.trim(),
				description: form.description.trim(),
				schedule: scheduleOut,
				services: form.services
					.split(/[\n,]+/)
					.map((s) => s.trim())
					.filter(Boolean),
				publicSlug: form.publicSlug.trim() ? form.publicSlug.trim() : null,
				isPublished: Boolean(form.isPublished),
				operationalStatus: form.operationalStatus,
				address: {
					street: form.addressStreet.trim(),
					commune: form.addressCommune.trim(),
					city: form.addressCity.trim()
				},
				socialMedia: {
					instagram: form.socialInstagram.trim(),
					facebook: form.socialFacebook.trim(),
					twitter: form.socialTwitter.trim(),
					website: form.socialWebsite.trim()
				}
			};

			if (isWalker) {
				body.serviceCommunes = form.serviceCommunes
					.split(',')
					.map((s) => s.trim())
					.filter(Boolean);
				body.petTypes = form.petTypes
					.split(',')
					.map((s) => s.trim())
					.filter(Boolean);
				if (form.experienceYears.trim() !== '') {
					body.experienceYears = Number(form.experienceYears);
				}
				if (form.petsAttended.trim()) {
					body.petsAttended = form.petsAttended.trim();
				}
				body.weeklyAvailability = WEEK_DAYS.map((day) => {
					const row = form.weeklyAvailability[day];
					const enabled = Boolean(row?.enabled);
					const ranges =
						enabled && row.start && row.end
							? [{ start: row.start.trim(), end: row.end.trim() }]
							: [];
					return { day, enabled, ranges };
				});

				const wt = {};
				if (form.walk30min.trim() !== '') wt.walk30min = Number(form.walk30min);
				if (form.walk60min.trim() !== '') wt.walk60min = Number(form.walk60min);
				if (form.dayCare.trim() !== '') wt.dayCare = Number(form.dayCare);
				if (form.overnight.trim() !== '') wt.overnight = Number(form.overnight);
				if (Object.keys(wt).length > 0) {
					wt.currency = form.walkerCurrency.trim() || 'CLP';
					body.walkerTariffs = wt;
				}
			}

			if (isWalker && form.refAmount.trim() !== '') {
				body.referenceRate = {
					amount: Number(form.refAmount),
					unit: form.refUnit.trim() || 'por_servicio',
					currency: form.refCurrency.trim() || 'CLP'
				};
			}

			if (isVet) {
				// Mismo rango que apertura/cierre de recepción (configurado arriba) salvo 24/7, donde hace falta
				// una ventana explícita de bloques 30 min.
				if (form.open24Hours) {
					body.agendaSlotStart = String(form.agendaSlotStart).trim();
					body.agendaSlotEnd = String(form.agendaSlotEnd).trim();
				} else {
					body.agendaSlotStart = toTimeInputValue(form.receptionOpen) || '09:00';
					body.agendaSlotEnd = toTimeInputValue(form.receptionClose) || '18:00';
				}
			}

			const res = await updateMyProviderProfile(body);
			setMessage(res.message || 'Guardado.');
			await refreshUser();
		} catch (err) {
			setError(err.response?.data?.message || 'No se pudo guardar el perfil.');
		} finally {
			setSaving(false);
		}
	}

	const userId = user._id || user.id;
	const previewPath =
		user.providerType && form.publicSlug.trim()
			? getProviderProfilePath({
					id: userId,
					providerType: user.providerType,
					publicSlug: form.publicSlug.trim()
				})
			: userId
				? getProviderProfilePath({ id: userId, providerType: user.providerType })
				: null;

	return (
		<div
			className={
				useSectionedLayout
					? 'page provider-edit-page provider-mi-ficha--sectioned'
					: 'page provider-edit-page'
			}
		>
			<Link className='back-link' to='/proveedor'>
				← Volver al panel
			</Link>
			<header className='provider-mi-ficha__intro'>
				<h1>
					{isVet ? 'Configuración de clínica' : isWalker ? 'Tu ficha de paseo / cuidado' : 'Configurar perfil de servicio'}
				</h1>
				{useSectionedLayout ? (
					<p className='provider-mi-ficha__lede'>
						Edita por secciones y pulsa <strong>Guardar cambios</strong> al final. Los datos se recuerdan al cambiar de
						pestaña.
					</p>
				) : null}
				{user.status && user.status !== 'aprobado' ? (
					<p className='warn-banner' style={{ margin: '0.4rem 0 0' }}>
						{user.status === 'en_revision' ? 'Cuenta en revisión' : `Estado: ${user.status}`} · el perfil público
						solo aplica con cuenta aprobada
					</p>
				) : null}
				{previewPath ? (
					<p className='provider-mi-ficha__preview' style={{ margin: '0.5rem 0 0' }}>
						{user.status === 'aprobado' ? (
							<Link to={previewPath}>Abrir ficha pública</Link>
						) : (
							<span className='hint muted' title={previewPath}>
								URL pública: se activará con la aprobación
							</span>
						)}
					</p>
				) : null}
			</header>

			{useSectionedLayout && (
				<div className='provider-mi-ficha__nav-card' aria-label='Navegación de secciones'>
					<div className='provider-mi-ficha__nav-head'>
						<div>
							<p className='provider-mi-ficha__nav-kicker'>Tu ficha</p>
							<p className='provider-mi-ficha__nav-title'>
								{profileSections.find((s) => s.id === profileSection)?.label ?? 'Secciones'}
							</p>
						</div>
						<p
							className='provider-mi-ficha__nav-step'
							role='status'
							aria-live='polite'
							aria-atomic='true'
						>
							{sectionStep} de {sectionCount}
						</p>
					</div>
					<div
						className='provider-mi-ficha__tab-scroll'
						role='tablist'
						aria-label='Secciones de la ficha'
					>
						{profileSections.map((s) => (
							<button
								key={s.id}
								type='button'
								role='tab'
								aria-selected={profileSection === s.id}
								id={`provider-mi-ficha-tab-${s.id}`}
								className={
									profileSection === s.id
										? 'provider-mi-ficha__tab is-active'
										: 'provider-mi-ficha__tab'
								}
								onClick={() => setProfileSection(s.id)}
							>
								{s.label}
							</button>
						))}
					</div>
				</div>
			)}

			<form className='app-form provider-edit-form' onSubmit={onSubmit} id='provider-mi-ficha-form'>
				<div className={profilePanelClass('visibilidad')}>
				<fieldset className='edit-fieldset'>
					<legend>Visibilidad</legend>
					<label className='check-row'>
						<input
							type='checkbox'
							checked={form.isPublished}
							onChange={(e) => setField('isPublished', e.target.checked)}
						/>
						<span>Perfil publicado (visible en mapa y URLs públicas)</span>
					</label>
					{!isWalker ? (
						<p className='hint muted' style={{ marginTop: 6 }}>
							Desmarca &quot;publicado&quot; para ocultarte en el mapa sin borrar datos.
						</p>
					) : null}
					<label className='edit-field'>
						<span>Slug público (minúsculas, sin espacios: usa -)</span>
						<input
							type='text'
							value={form.publicSlug}
							onChange={(e) => {
								const v = e.target.value
									.toLowerCase()
									.replace(/\s+/g, '-')
									.replace(/--+/g, '-');
								setField('publicSlug', v);
							}}
							placeholder='ej. clinica-calle-los-rosales'
							autoComplete='off'
						/>
					</label>
					<label className='edit-field'>
						<span>Estado operativo</span>
						<select
							value={form.operationalStatus}
							onChange={(e) => setField('operationalStatus', e.target.value)}
						>
							<option value='abierto'>Abierto</option>
							<option value='temporalmente_cerrado'>Temporalmente cerrado</option>
						</select>
					</label>
				</fieldset>
				</div>

				<div className={profilePanelClass('contacto')}>
				<fieldset className='edit-fieldset'>
					<legend>Contacto y descripción</legend>
					<label className='edit-field'>
						<span>Teléfono</span>
						<input value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
					</label>
					<label className='edit-field'>
						<span>Descripción</span>
						<textarea
							rows={4}
							value={form.description}
							onChange={(e) => setField('description', e.target.value)}
						/>
					</label>
					{isVet ? (
						<div className='edit-field schedule-24h-block'>
							<label className='check-row' style={{ marginBottom: 8 }}>
								<input
									type='checkbox'
									checked={form.open24Hours}
									onChange={(e) => setField('open24Hours', e.target.checked)}
								/>
								<span>Atención 24/7 (sin cierre; urgencias o turno continuo)</span>
							</label>
							{!form.open24Hours ? (
								<div className='edit-row-2 reception-time-row'>
									<label className='edit-field'>
										<span>Apertura (recepción / atención al público)</span>
										<input
											type='time'
											step={300}
											value={form.receptionOpen}
											onChange={(e) => setField('receptionOpen', e.target.value)}
										/>
									</label>
									<label className='edit-field'>
										<span>Cierre (recepción)</span>
										<input
											type='time'
											step={300}
											value={form.receptionClose}
											onChange={(e) => setField('receptionClose', e.target.value)}
										/>
									</label>
								</div>
							) : (
								<p className='hint muted' style={{ margin: '0 0 8px' }}>
									Si atiendes 24/7, no aplica apertura/cierre. Puedes añadir un comentario abajo (feriados,
									urgencias, etc.).
								</p>
							)}
							<label className='edit-field'>
								<span>Comentario opcional</span>
								<textarea
									rows={2}
									placeholder='Ej. Sábados cierre 14:00, cerrado domingos, recepción de urgencias nocturna…'
									value={form.scheduleNotes}
									onChange={(e) => setField('scheduleNotes', e.target.value)}
								/>
							</label>
						</div>
					) : (
						<label className='edit-field'>
							<span>Horarios (texto libre)</span>
							<textarea
								rows={2}
								value={form.schedule}
								onChange={(e) => setField('schedule', e.target.value)}
							/>
						</label>
					)}
					<label className='edit-field'>
						<span>Servicios (uno por línea o separados por coma)</span>
						<textarea
							rows={3}
							value={form.services}
							onChange={(e) => setField('services', e.target.value)}
						/>
					</label>
					{isVet && !form.open24Hours ? (
						<p className='hint muted' style={{ marginTop: 10 }}>
							Los <strong>bloques de 30 min</strong> (panel del proveedor) se generan entre <strong>apertura
							y cierre de recepción</strong> que fijaste arriba, en hora Chile. No hace falta un segundo
							horario.
						</p>
					) : null}
					{isVet && form.open24Hours ? (
						<div className='edit-fieldset vet-agenda-in-contact' style={{ border: 0, padding: 0, marginTop: 12 }}>
							<strong className='block mb-1'>Rango de bloques de agenda (citas, hora Chile)</strong>
							<p className='hint muted' style={{ margin: '0 0 8px' }}>
								Con atención 24/7 indica una <strong>ventana</strong> concreta para ofrecer reservas por
								agenda (p. ej. 08:00–20:00). Lo puedes ajustar sin tocar el texto 24/7.
							</p>
							<div className='edit-row-2'>
								<label className='edit-field'>
									<span>Primera cita (HH:MM)</span>
									<input
										type='time'
										step={1800}
										value={form.agendaSlotStart}
										onChange={(e) => setField('agendaSlotStart', e.target.value)}
									/>
								</label>
								<label className='edit-field'>
									<span>Fin de citas (HH:MM, exclusivo del último bloque)</span>
									<input
										type='time'
										step={1800}
										value={form.agendaSlotEnd}
										onChange={(e) => setField('agendaSlotEnd', e.target.value)}
									/>
								</label>
							</div>
						</div>
					) : null}
				</fieldset>
				</div>

				<div className={profilePanelClass('ubicacion')}>
				<fieldset className='edit-fieldset'>
					<legend>Dirección</legend>
					<p className='hint muted'>Calle, comuna y ciudad para el mapa.</p>
					<label className='edit-field'>
						<span>Calle</span>
						<input value={form.addressStreet} onChange={(e) => setField('addressStreet', e.target.value)} />
					</label>
					<label className='edit-field'>
						<span>Comuna</span>
						<input value={form.addressCommune} onChange={(e) => setField('addressCommune', e.target.value)} />
					</label>
					<label className='edit-field'>
						<span>Ciudad</span>
						<input value={form.addressCity} onChange={(e) => setField('addressCity', e.target.value)} />
					</label>
				</fieldset>
				</div>

				{isWalker ? (
					<div className={profilePanelClass('disponibilidad')}>
					<p className='hint muted' style={{ margin: '0 0 0.6rem' }}>
						Para aparecer en el buscador hace falta: comunas, tipos de mascota, al menos un día con horario y
						una tarifa o referencia.
					</p>
					<fieldset className='edit-fieldset'>
						<legend>Tarifa referencial (opcional)</legend>
						<p className='hint muted'>Suma a la ficha pública; abajo, tarifas por tipo de servicio.</p>
						<div className='edit-row-2'>
							<label className='edit-field'>
								<span>Monto</span>
								<input value={form.refAmount} onChange={(e) => setField('refAmount', e.target.value)} />
							</label>
							<label className='edit-field'>
								<span>Unidad (ej. por_hora, consulta)</span>
								<input value={form.refUnit} onChange={(e) => setField('refUnit', e.target.value)} />
							</label>
						</div>
						<label className='edit-field'>
							<span>Moneda</span>
							<input value={form.refCurrency} onChange={(e) => setField('refCurrency', e.target.value)} />
						</label>
					</fieldset>

					<fieldset className='edit-fieldset'>
						<legend>Zona, disponibilidad y precios</legend>
						<label className='edit-field'>
							<span>Comunas donde atiendes (separadas por coma)</span>
							<input
								value={form.serviceCommunes}
								onChange={(e) => setField('serviceCommunes', e.target.value)}
								placeholder='Providencia, Las Condes'
							/>
						</label>
						<label className='edit-field'>
							<span>Tipos de mascota (separados por coma)</span>
							<input
								value={form.petTypes}
								onChange={(e) => setField('petTypes', e.target.value)}
								placeholder='perro, gato'
							/>
						</label>
						<div className='edit-row-2'>
							<label className='edit-field'>
								<span>Años de experiencia</span>
								<input
									type='number'
									min='0'
									value={form.experienceYears}
									onChange={(e) => setField('experienceYears', e.target.value)}
								/>
							</label>
							<label className='edit-field'>
								<span>Mascotas atendidas (texto)</span>
								<input value={form.petsAttended} onChange={(e) => setField('petsAttended', e.target.value)} />
							</label>
						</div>

						<div className='weekly-grid'>
							<strong className='weekly-title'>Disponibilidad semanal</strong>
							{WEEK_DAYS.map((day) => {
								const row = form.weeklyAvailability[day];
								return (
									<div key={day} className='weekly-row'>
										<label className='check-row'>
											<input
												type='checkbox'
												checked={row.enabled}
												onChange={(e) => setWeeklyDay(day, { enabled: e.target.checked })}
											/>
											<span>{WEEK_DAY_LABELS[day]}</span>
										</label>
										<input
											type='time'
											disabled={!row.enabled}
											value={row.start}
											onChange={(e) => setWeeklyDay(day, { start: e.target.value })}
										/>
										<span className='weekly-sep'>—</span>
										<input
											type='time'
											disabled={!row.enabled}
											value={row.end}
											onChange={(e) => setWeeklyDay(day, { end: e.target.value })}
										/>
									</div>
								);
							})}
						</div>

						<div className='tariffs-block'>
							<strong>Tarifas (CLP u otra moneda)</strong>
							<label className='edit-field'>
								<span>Moneda</span>
								<input value={form.walkerCurrency} onChange={(e) => setField('walkerCurrency', e.target.value)} />
							</label>
							<div className='edit-row-2'>
								<label className='edit-field'>
									<span>Paseo 30 min</span>
									<input value={form.walk30min} onChange={(e) => setField('walk30min', e.target.value)} />
								</label>
								<label className='edit-field'>
									<span>Paseo 60 min</span>
									<input value={form.walk60min} onChange={(e) => setField('walk60min', e.target.value)} />
								</label>
							</div>
							<div className='edit-row-2'>
								<label className='edit-field'>
									<span>Día completo</span>
									<input value={form.dayCare} onChange={(e) => setField('dayCare', e.target.value)} />
								</label>
								<label className='edit-field'>
									<span>Pernocta</span>
									<input value={form.overnight} onChange={(e) => setField('overnight', e.target.value)} />
								</label>
							</div>
						</div>
					</fieldset>
					</div>
				) : null}

				<div className={profilePanelClass('redes')}>
					<fieldset className='edit-fieldset'>
						<legend>Redes</legend>
						<label className='edit-field'>
							<span>Instagram</span>
							<input value={form.socialInstagram} onChange={(e) => setField('socialInstagram', e.target.value)} />
						</label>
						<label className='edit-field'>
							<span>Facebook</span>
							<input value={form.socialFacebook} onChange={(e) => setField('socialFacebook', e.target.value)} />
						</label>
						<label className='edit-field'>
							<span>Twitter / X</span>
							<input value={form.socialTwitter} onChange={(e) => setField('socialTwitter', e.target.value)} />
						</label>
						<label className='edit-field'>
							<span>Sitio web</span>
							<input value={form.socialWebsite} onChange={(e) => setField('socialWebsite', e.target.value)} />
						</label>
					</fieldset>
				</div>

				<div
					className={
						useSectionedLayout
							? 'provider-mi-ficha__form-actions'
							: 'provider-mi-ficha__form-actions provider-mi-ficha__form-actions--inline'
					}
				>
					<button type='submit' className='save-profile-btn' disabled={saving}>
						{saving ? 'Guardando…' : 'Guardar cambios'}
					</button>
				</div>
				{message ? <p className='review-success'>{message}</p> : null}
				{error ? <p className='error'>{error}</p> : null}
			</form>
		</div>
	);
}
