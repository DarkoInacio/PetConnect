import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { hasRole } from '../lib/userRoles';
import { cn } from '../lib/utils';
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
	const [profileSection, setProfileSection] = useState('visibilidad');

	useEffect(() => {
		if (user && hasRole(user, 'proveedor')) {
			setForm(userToForm(user));
		}
	}, [user]);

	if (!loading && (!user || !hasRole(user, 'proveedor'))) {
		return <Navigate to='/login' replace state={{ from: '/proveedor/mi-perfil' }} />;
	}

	if (loading || !form) {
		return (
			<div className='mx-auto w-full max-w-[1200px] px-4 py-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]'>
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

	function panelHidden(section) {
		if (!useSectionedLayout) return false;
		return profileSection !== section;
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

	const inputCls = 'h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors font-[inherit]';
	const textareaCls = 'w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm font-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors';
	const fieldCls = 'flex flex-col gap-1.5 mb-3 text-sm last:mb-0';
	const checkRowCls = 'flex items-center gap-2.5 mb-3 font-medium';

	return (
		<div
			className={cn(
				'mx-auto w-full px-4 py-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]',
				useSectionedLayout ? 'max-w-[42rem]' : 'max-w-[1200px]'
			)}
		>
			<Link
				className='inline-flex items-center gap-0.5 min-h-11 mb-2 px-0.5 py-0.5 text-primary font-semibold rounded-sm hover:text-primary/80 hover:underline'
				to='/proveedor'
			>
				← Volver al panel
			</Link>
		<header className='mb-4'>
			<p className='text-[0.7rem] font-bold uppercase tracking-widest text-primary/70 mb-1'>Configuración</p>
			<h1 className='text-[clamp(1.25rem,2.4vw,1.5rem)] font-bold tracking-tight text-foreground mb-0.5'>
				{isVet ? 'Configuración de clínica' : isWalker ? 'Tu ficha de paseo / cuidado' : 'Configurar perfil de servicio'}
			</h1>
				{useSectionedLayout ? (
					<p className='mt-1.5 m-0 max-w-[46ch] text-[0.9rem] leading-relaxed text-muted-foreground'>
						Edita por secciones y pulsa <strong>Guardar cambios</strong> al final. Los datos se recuerdan al cambiar de
						pestaña.
					</p>
				) : null}
				{user.status && user.status !== 'aprobado' ? (
					<p className='rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300 mt-1.5'>
						{user.status === 'en_revision' ? 'Cuenta en revisión' : `Estado: ${user.status}`} · el perfil público
						solo aplica con cuenta aprobada
					</p>
				) : null}
				{previewPath ? (
					<p className='mt-2'>
						{user.status === 'aprobado' ? (
							<Link to={previewPath} className='text-primary hover:underline text-sm'>
								Abrir ficha pública
							</Link>
						) : (
							<span className='text-sm text-muted-foreground' title={previewPath}>
								URL pública: se activará con la aprobación
							</span>
						)}
					</p>
				) : null}
			</header>

			{useSectionedLayout && (
				<div
					className='mb-4 rounded-2xl border border-border bg-card/80 px-3.5 pt-3.5 pb-3 shadow-sm sticky top-[3.15rem] md:top-[3.4rem] z-[4] backdrop-blur-sm'
					aria-label='Navegación de secciones'
				>
					<div className='flex items-start justify-between gap-3 mb-2.5'>
						<div>
							<p className='text-[0.68rem] font-bold tracking-[0.14em] uppercase text-muted-foreground mb-0.5'>
								Tu ficha
							</p>
							<p className='text-[1.02rem] font-bold tracking-[-0.02em] text-foreground leading-tight m-0'>
								{profileSections.find((s) => s.id === profileSection)?.label ?? 'Secciones'}
							</p>
						</div>
						<p
							className='shrink-0 text-[0.8rem] font-bold rounded-full px-2.5 py-1.5 text-muted-foreground bg-secondary border border-border whitespace-nowrap m-0'
							role='status'
							aria-live='polite'
							aria-atomic='true'
						>
							{sectionStep} de {sectionCount}
						</p>
					</div>
					<div
						className='flex flex-nowrap gap-1.5 overflow-x-auto scroll-smooth p-1.5 rounded-xl border border-border bg-secondary/90'
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
								className={cn(
									'inline-flex shrink-0 items-center justify-center min-h-[2.35rem] px-3 py-1.5 font-[inherit] text-[0.78rem] font-semibold text-muted-foreground bg-transparent border-none rounded-[0.55rem] cursor-pointer transition-colors hover:text-primary hover:bg-white/55',
									profileSection === s.id && 'bg-white text-primary border border-border/55 shadow-sm dark:bg-card'
								)}
								onClick={() => setProfileSection(s.id)}
							>
								{s.label}
							</button>
						))}
					</div>
				</div>
			)}

			<form className='flex flex-col gap-4 min-w-0 max-w-[720px]' onSubmit={onSubmit} id='provider-mi-ficha-form'>
			<div className={panelHidden('visibilidad') ? 'hidden' : undefined}>
				<fieldset className='rounded-2xl border border-border bg-card shadow-sm m-0 overflow-hidden'>
					<legend className='sr-only'>Visibilidad</legend>
					<div className='px-5 py-3.5 border-b border-border bg-gradient-to-r from-muted/40 to-transparent dark:from-muted/20'>
						<span className='text-base font-bold text-foreground'>Visibilidad</span>
					</div>
					<div className='p-5'>
						<label className={checkRowCls}>
							<input
								type='checkbox'
								checked={form.isPublished}
								onChange={(e) => setField('isPublished', e.target.checked)}
							/>
							<span>Perfil publicado (visible en mapa y URLs públicas)</span>
						</label>
						{!isWalker ? (
					<p className='text-sm mb-2.5 text-muted-foreground mt-1.5'>
							Desmarca &quot;publicado&quot; para ocultarte en el mapa sin borrar datos.
						</p>
						) : null}
						<label className={fieldCls}>
							<span>Slug público (minúsculas, sin espacios: usa -)</span>
							<input
								className={inputCls}
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
						<label className={fieldCls}>
							<span>Estado operativo</span>
							<select
								className={inputCls}
								value={form.operationalStatus}
								onChange={(e) => setField('operationalStatus', e.target.value)}
							>
								<option value='abierto'>Abierto</option>
								<option value='temporalmente_cerrado'>Temporalmente cerrado</option>
							</select>
						</label>
					</div>
				</fieldset>
			</div>

			<div className={panelHidden('contacto') ? 'hidden' : undefined}>
				<fieldset className='rounded-2xl border border-border bg-card shadow-sm m-0 overflow-hidden'>
					<legend className='sr-only'>Contacto y descripción</legend>
					<div className='px-5 py-3.5 border-b border-border bg-gradient-to-r from-muted/40 to-transparent dark:from-muted/20'>
						<span className='text-base font-bold text-foreground'>Contacto y descripción</span>
					</div>
					<div className='p-5'>
						<label className={fieldCls}>
							<span>Teléfono</span>
							<input className={inputCls} value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
						</label>
						<label className={fieldCls}>
							<span>Descripción</span>
							<textarea
								className={textareaCls}
								rows={4}
								value={form.description}
								onChange={(e) => setField('description', e.target.value)}
							/>
						</label>
						{isVet ? (
							<div className={fieldCls}>
							<label className={cn(checkRowCls, 'mb-2')}>
								<input
									type='checkbox'
									checked={form.open24Hours}
									onChange={(e) => setField('open24Hours', e.target.checked)}
								/>
								<span>Atención 24/7 (sin cierre; urgencias o turno continuo)</span>
							</label>
								{!form.open24Hours ? (
									<div className='grid grid-cols-2 gap-3 max-sm:grid-cols-1'>
										<label className={fieldCls}>
											<span>Apertura (recepción / atención al público)</span>
											<input
												className={inputCls}
												type='time'
												step={300}
												value={form.receptionOpen}
												onChange={(e) => setField('receptionOpen', e.target.value)}
											/>
										</label>
										<label className={fieldCls}>
											<span>Cierre (recepción)</span>
											<input
												className={inputCls}
												type='time'
												step={300}
												value={form.receptionClose}
												onChange={(e) => setField('receptionClose', e.target.value)}
											/>
										</label>
									</div>
								) : (
								<p className='text-sm text-muted-foreground mb-2'>
									Si atiendes 24/7, no aplica apertura/cierre. Puedes añadir un comentario abajo (feriados,
									urgencias, etc.).
								</p>
								)}
								<label className={fieldCls}>
									<span>Comentario opcional</span>
									<textarea
										className={textareaCls}
										rows={2}
										placeholder='Ej. Sábados cierre 14:00, cerrado domingos, recepción de urgencias nocturna…'
										value={form.scheduleNotes}
										onChange={(e) => setField('scheduleNotes', e.target.value)}
									/>
								</label>
							</div>
						) : (
							<label className={fieldCls}>
								<span>Horarios (texto libre)</span>
								<textarea
									className={textareaCls}
									rows={2}
									value={form.schedule}
									onChange={(e) => setField('schedule', e.target.value)}
								/>
							</label>
						)}
						<label className={fieldCls}>
							<span>Servicios (uno por línea o separados por coma)</span>
							<textarea
								className={textareaCls}
								rows={3}
								value={form.services}
								onChange={(e) => setField('services', e.target.value)}
							/>
						</label>
						{isVet && !form.open24Hours ? (
						<p className='text-sm text-muted-foreground mt-2.5 mb-2.5'>
							Los <strong>bloques de 30 min</strong> (panel del proveedor) se generan entre <strong>apertura
							y cierre de recepción</strong> que fijaste arriba, en hora Chile. No hace falta un segundo
							horario.
						</p>
						) : null}
						{isVet && form.open24Hours ? (
						<div className='mt-3'>
							<strong className='block mb-1'>Rango de bloques de agenda (citas, hora Chile)</strong>
							<p className='text-sm text-muted-foreground mb-2'>
									Con atención 24/7 indica una <strong>ventana</strong> concreta para ofrecer reservas por
									agenda (p. ej. 08:00–20:00). Lo puedes ajustar sin tocar el texto 24/7.
								</p>
								<div className='grid grid-cols-2 gap-3 max-sm:grid-cols-1'>
									<label className={fieldCls}>
										<span>Primera cita (HH:MM)</span>
										<input
											className={inputCls}
											type='time'
											step={1800}
											value={form.agendaSlotStart}
											onChange={(e) => setField('agendaSlotStart', e.target.value)}
										/>
									</label>
									<label className={fieldCls}>
										<span>Fin de citas (HH:MM, exclusivo del último bloque)</span>
										<input
											className={inputCls}
											type='time'
											step={1800}
											value={form.agendaSlotEnd}
											onChange={(e) => setField('agendaSlotEnd', e.target.value)}
										/>
									</label>
								</div>
							</div>
						) : null}
					</div>
				</fieldset>
			</div>

			<div className={panelHidden('ubicacion') ? 'hidden' : undefined}>
				<fieldset className='rounded-2xl border border-border bg-card shadow-sm m-0 overflow-hidden'>
					<legend className='sr-only'>Dirección</legend>
					<div className='px-5 py-3.5 border-b border-border bg-gradient-to-r from-muted/40 to-transparent dark:from-muted/20'>
						<span className='text-base font-bold text-foreground'>Dirección</span>
					</div>
					<div className='p-5'>
					<p className='text-sm text-muted-foreground mb-2.5'>Calle, comuna y ciudad para el mapa.</p>
					<div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
						<label className={fieldCls}>
							<span>Calle</span>
							<input className={inputCls} value={form.addressStreet} onChange={(e) => setField('addressStreet', e.target.value)} />
						</label>
						<label className={fieldCls}>
							<span>Ciudad</span>
							<input className={inputCls} value={form.addressCity} onChange={(e) => setField('addressCity', e.target.value)} />
						</label>
					</div>
					<label className={fieldCls}>
						<span>Comuna</span>
						<input className={inputCls} value={form.addressCommune} onChange={(e) => setField('addressCommune', e.target.value)} />
					</label>
					</div>
				</fieldset>
			</div>

			{isWalker ? (
				<div className={panelHidden('disponibilidad') ? 'hidden' : undefined}>
				<p className='text-sm text-muted-foreground mb-2.5'>
					Para aparecer en el buscador hace falta: comunas, tipos de mascota, al menos un día con horario y
					una tarifa o referencia.
				</p>
					<fieldset className='rounded-2xl border border-border bg-card shadow-sm m-0 overflow-hidden'>
						<legend className='sr-only'>Tarifa referencial (opcional)</legend>
						<div className='px-5 py-3.5 border-b border-border bg-gradient-to-r from-muted/40 to-transparent dark:from-muted/20'>
							<span className='text-base font-bold text-foreground'>Tarifa referencial (opcional)</span>
						</div>
						<div className='p-5'>
						<p className='text-sm text-muted-foreground mb-2.5'>Suma a la ficha pública; abajo, tarifas por tipo de servicio.</p>
						<div className='grid grid-cols-2 gap-3 max-sm:grid-cols-1'>
							<label className={fieldCls}>
								<span>Monto</span>
								<input className={inputCls} value={form.refAmount} onChange={(e) => setField('refAmount', e.target.value)} />
							</label>
							<label className={fieldCls}>
								<span>Unidad (ej. por_hora, consulta)</span>
								<input className={inputCls} value={form.refUnit} onChange={(e) => setField('refUnit', e.target.value)} />
							</label>
						</div>
						<label className={fieldCls}>
							<span>Moneda</span>
							<input className={inputCls} value={form.refCurrency} onChange={(e) => setField('refCurrency', e.target.value)} />
						</label>
						</div>
					</fieldset>

					<fieldset className='rounded-2xl border border-border bg-card shadow-sm m-0 mt-4 overflow-hidden'>
						<legend className='sr-only'>Zona, disponibilidad y precios</legend>
						<div className='px-5 py-3.5 border-b border-border bg-gradient-to-r from-muted/40 to-transparent dark:from-muted/20'>
							<span className='text-base font-bold text-foreground'>Zona, disponibilidad y precios</span>
						</div>
						<div className='p-5'>
							<label className={fieldCls}>
								<span>Comunas donde atiendes (separadas por coma)</span>
								<input
									className={inputCls}
									value={form.serviceCommunes}
									onChange={(e) => setField('serviceCommunes', e.target.value)}
									placeholder='Providencia, Las Condes'
								/>
							</label>
							<label className={fieldCls}>
								<span>Tipos de mascota (separados por coma)</span>
								<input
									className={inputCls}
									value={form.petTypes}
									onChange={(e) => setField('petTypes', e.target.value)}
									placeholder='perro, gato'
								/>
							</label>
							<div className='grid grid-cols-2 gap-3 max-sm:grid-cols-1'>
								<label className={fieldCls}>
									<span>Años de experiencia</span>
									<input
										className={inputCls}
										type='number'
										min='0'
										value={form.experienceYears}
										onChange={(e) => setField('experienceYears', e.target.value)}
									/>
								</label>
								<label className={fieldCls}>
									<span>Mascotas atendidas (texto)</span>
									<input className={inputCls} value={form.petsAttended} onChange={(e) => setField('petsAttended', e.target.value)} />
								</label>
							</div>

							<div className='flex flex-col gap-2 mt-3'>
								<strong className='font-bold'>Disponibilidad semanal</strong>
								{WEEK_DAYS.map((day) => {
									const row = form.weeklyAvailability[day];
									return (
										<div key={day} className='grid items-center gap-2 max-sm:grid-cols-1 grid-cols-[140px_1fr_auto_1fr]'>
											<label className='flex items-center gap-2.5 font-medium'>
												<input
													type='checkbox'
													checked={row.enabled}
													onChange={(e) => setWeeklyDay(day, { enabled: e.target.checked })}
												/>
												<span>{WEEK_DAY_LABELS[day]}</span>
											</label>
											<input
												className={inputCls}
												type='time'
												disabled={!row.enabled}
												value={row.start}
												onChange={(e) => setWeeklyDay(day, { start: e.target.value })}
											/>
											<span className='text-muted-foreground text-center max-sm:hidden'>—</span>
											<input
												className={inputCls}
												type='time'
												disabled={!row.enabled}
												value={row.end}
												onChange={(e) => setWeeklyDay(day, { end: e.target.value })}
											/>
										</div>
									);
								})}
							</div>

							<div className='mt-4 flex flex-col gap-2'>
								<strong>Tarifas (CLP u otra moneda)</strong>
								<label className={fieldCls}>
									<span>Moneda</span>
									<input className={inputCls} value={form.walkerCurrency} onChange={(e) => setField('walkerCurrency', e.target.value)} />
								</label>
								<div className='grid grid-cols-2 gap-3 max-sm:grid-cols-1'>
									<label className={fieldCls}>
										<span>Paseo 30 min</span>
										<input className={inputCls} value={form.walk30min} onChange={(e) => setField('walk30min', e.target.value)} />
									</label>
									<label className={fieldCls}>
										<span>Paseo 60 min</span>
										<input className={inputCls} value={form.walk60min} onChange={(e) => setField('walk60min', e.target.value)} />
									</label>
								</div>
								<div className='grid grid-cols-2 gap-3 max-sm:grid-cols-1'>
									<label className={fieldCls}>
										<span>Día completo</span>
										<input className={inputCls} value={form.dayCare} onChange={(e) => setField('dayCare', e.target.value)} />
									</label>
									<label className={fieldCls}>
										<span>Pernocta</span>
										<input className={inputCls} value={form.overnight} onChange={(e) => setField('overnight', e.target.value)} />
									</label>
					</div>
					</div>
				</div>
			</fieldset>
		</div>
	) : null}

			<div className={panelHidden('redes') ? 'hidden' : undefined}>
				<fieldset className='rounded-2xl border border-border bg-card shadow-sm m-0 overflow-hidden'>
					<legend className='sr-only'>Redes sociales</legend>
					<div className='px-5 py-3.5 border-b border-border bg-gradient-to-r from-muted/40 to-transparent dark:from-muted/20'>
						<span className='text-base font-bold text-foreground'>Redes sociales</span>
					</div>
					<div className='p-5 grid grid-cols-1 sm:grid-cols-2 gap-4'>
						<label className={fieldCls}>
							<span>Instagram</span>
							<input className={inputCls} value={form.socialInstagram} onChange={(e) => setField('socialInstagram', e.target.value)} />
						</label>
						<label className={fieldCls}>
							<span>Facebook</span>
							<input className={inputCls} value={form.socialFacebook} onChange={(e) => setField('socialFacebook', e.target.value)} />
						</label>
						<label className={fieldCls}>
							<span>Twitter / X</span>
							<input className={inputCls} value={form.socialTwitter} onChange={(e) => setField('socialTwitter', e.target.value)} />
						</label>
						<label className={fieldCls}>
							<span>Sitio web</span>
							<input className={inputCls} value={form.socialWebsite} onChange={(e) => setField('socialWebsite', e.target.value)} />
						</label>
					</div>
				</fieldset>
			</div>

			<div className='mt-3 mx-1 px-3 py-3 border border-border border-b-0 rounded-tl-2xl rounded-tr-2xl bg-white/95 dark:bg-card/95 backdrop-blur-sm sticky bottom-0 z-[3] shadow-[0_-8px_32px_-12px_rgba(15,23,42,0.12)]'>
				<button
					type='submit'
					className='inline-flex w-full h-11 items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground cursor-pointer hover:bg-primary/90 transition-colors disabled:opacity-65 disabled:cursor-not-allowed border-0 px-5 text-sm tracking-wide'
					disabled={saving}
				>
					{saving ? 'Guardando…' : 'Guardar cambios'}
				</button>
			</div>
				{message ? (
					<p className='text-sm text-green-700 dark:text-green-400'>{message}</p>
				) : null}
				{error ? (
					<p className='rounded-xl border border-destructive/35 bg-destructive/10 px-3.5 py-3 text-sm text-destructive mb-3'>
						{error}
					</p>
				) : null}
			</form>
		</div>
	);
}
