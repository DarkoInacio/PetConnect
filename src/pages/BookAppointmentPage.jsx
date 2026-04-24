import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { createSlotAppointment, fetchAvailableSlots } from '../services/appointments';
import { fetchProviderPublicProfile, getProviderProfilePath } from '../services/providers';
import { listPets } from '../services/pets';
import { formatTimeInChile } from '../constants/chileTime';
import { hasRole } from '../lib/userRoles';
import { Calendar, Check, ChevronLeft, Clock, PawPrint, Stethoscope } from 'lucide-react';

function toYmdLocal(d) {
	const pad = (n) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function ymdAddDays(ymd, add) {
	if (!ymd) return ymd;
	const p = ymd.split('-').map(Number);
	const dt = new Date(p[0], p[1] - 1, p[2], 12, 0, 0, 0);
	dt.setDate(dt.getDate() + add);
	return toYmdLocal(dt);
}

function ydParts(ymd) {
	const p = ymd.split('-').map(Number);
	return [p[0], p[1], p[2]];
}

function formatDayShort(ymd) {
	if (!ymd) return '';
	const [y, m, d] = ydParts(ymd);
	const dt = new Date(y, m - 1, d, 12, 0, 0, 0);
	if (Number.isNaN(dt.getTime())) return ymd;
	return new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }).format(dt);
}

export function BookAppointmentPage() {
	const { user, loading: authLoading } = useAuth();
	const [searchParams] = useSearchParams();
	const providerId = searchParams.get('providerId');

	const [provider, setProvider] = useState(null);
	const [loadError, setLoadError] = useState('');
	const [dateYmd, setDateYmd] = useState(() => toYmdLocal(new Date()));
	const [clinicServiceId, setClinicServiceId] = useState('');
	const [slots, setSlots] = useState([]);
	const [slotsLoading, setSlotsLoading] = useState(false);
	const [slotsError, setSlotsError] = useState('');
	const [selectedSlotId, setSelectedSlotId] = useState('');

	/** 1: elegir; 2: repasar; tras enviar ok queda 2 y formOk se muestra */
	const [step, setStep] = useState(/** @type {1|2} */ 1);

	const [myPets, setMyPets] = useState([]);
	const [selectedPetId, setSelectedPetId] = useState('');
	const [petNombre, setPetNombre] = useState('');
	const [petEspecie, setPetEspecie] = useState('perro');
	const [servicio, setServicio] = useState('Consulta');

	const [submitting, setSubmitting] = useState(false);
	const [formError, setFormError] = useState('');
	const [formOk, setFormOk] = useState('');

	const minDateYmd = toYmdLocal(new Date());
	const tomorrowYmd = ymdAddDays(minDateYmd, 1);

	/** Línea efectiva sin carrera con useEffect: con una sola línea aplica al instante. */
	const effectiveClinicServiceId = useMemo(() => {
		const list = provider?.clinicServices;
		if (!Array.isArray(list) || list.length === 0) return '';
		if (list.length === 1) return String(list[0].id);
		return clinicServiceId && String(clinicServiceId).trim() ? String(clinicServiceId) : '';
	}, [provider, clinicServiceId]);

	const selectedSlot = useMemo(
		() => slots.find((s) => String(s._id) === String(selectedSlotId)) || null,
		[slots, selectedSlotId]
	);

	const selectedLineName = useMemo(() => {
		if (!selectedSlot) return '—';
		if (selectedSlot.clinicServiceId && typeof selectedSlot.clinicServiceId === 'object') {
			return selectedSlot.clinicServiceId.displayName || '—';
		}
		const list = provider?.clinicServices;
		const id = list?.find((c) => String(c.id) === effectiveClinicServiceId);
		return id?.displayName || '—';
	}, [selectedSlot, provider, effectiveClinicServiceId]);

	useEffect(() => {
		if (!providerId) return;
		const c = new AbortController();
		(async () => {
			try {
				setLoadError('');
				const data = await fetchProviderPublicProfile(providerId, c.signal);
				setProvider(data.proveedor || null);
			} catch (err) {
				if (err.name === 'CanceledError' || err.name === 'AbortError') return;
				setLoadError(err.response?.data?.message || 'No se pudo cargar el proveedor.');
				setProvider(null);
			}
		})();
		return () => c.abort();
	}, [providerId]);

	useEffect(() => {
		if (!provider?.clinicServices?.length) return;
		/* Sólo resetea si el valor guardado ya no existe (cambio de clínica) */
		if (provider.clinicServices.length > 1) {
			setClinicServiceId((prev) => {
				if (prev && provider.clinicServices.some((c) => String(c.id) === prev)) return prev;
				return '';
			});
		} else {
			setClinicServiceId('');
		}
	}, [provider]);

	useEffect(() => {
		if (!providerId || !user || !hasRole(user, 'dueno')) return;
		const c = new AbortController();
		(async () => {
			try {
				const data = await listPets({ forAgenda: true }, c.signal);
				setMyPets(Array.isArray(data.pets) ? data.pets : []);
			} catch {
				setMyPets([]);
			}
		})();
		return () => c.abort();
	}, [providerId, user]);

	const loadSlots = useCallback(async () => {
		if (!providerId || !dateYmd) return;
		if (provider?.providerType === 'veterinaria') {
			if (!Array.isArray(provider.clinicServices) || provider.clinicServices.length === 0) {
				setSlots([]);
				return;
			}
			if (provider.clinicServices.length > 1 && !effectiveClinicServiceId) {
				setSlots([]);
				return;
			}
		}
		const opt =
			provider?.providerType === 'veterinaria' && effectiveClinicServiceId
				? { clinicServiceId: effectiveClinicServiceId }
				: undefined;
		if (provider?.providerType === 'veterinaria' && !opt?.clinicServiceId) {
			setSlots([]);
			return;
		}
		setSlotsLoading(true);
		setSlotsError('');
		try {
			const data = await fetchAvailableSlots(providerId, dateYmd, opt);
			setSlots(Array.isArray(data.slots) ? data.slots : []);
			setSelectedSlotId('');
		} catch (err) {
			const msg = err.response?.data?.message || 'No se pudieron cargar los horarios.';
			setSlotsError(msg);
			setSlots([]);
		} finally {
			setSlotsLoading(false);
		}
	}, [providerId, dateYmd, provider, effectiveClinicServiceId]);

	useEffect(() => {
		if (!providerId || provider?.providerType !== 'veterinaria') return;
		loadSlots();
	}, [providerId, provider?.providerType, dateYmd, loadSlots]);

	if (authLoading) {
		return (
			<div className="page">
				<p>Cargando…</p>
			</div>
		);
	}

	if (!providerId) {
		return (
			<div className="page">
				<Link className="back-link" to="/">
					Volver
				</Link>
				<p className="error">Falta providerId en la URL.</p>
			</div>
		);
	}

	if (!user) {
		return (
			<Navigate
				to="/login"
				replace
				state={{ from: `/agendar?providerId=${encodeURIComponent(providerId)}` }}
			/>
		);
	}

	if (!hasRole(user, 'dueno')) {
		return (
			<div className="page">
				<Link className="back-link" to="/">
					Volver
				</Link>
				<p className="error">Solo las cuentas con rol de dueño pueden agendar citas veterinarias.</p>
			</div>
		);
	}

	const profileLink = provider ? getProviderProfilePath(provider) : null;
	const nLines = provider?.clinicServices?.length ?? 0;
	const needLinePick = nLines > 1;
	const canShowSlots = nLines > 0 && (!needLinePick || (needLinePick && effectiveClinicServiceId));

	function goReview(e) {
		e.preventDefault();
		setFormError('');
		if (needLinePick && !clinicServiceId) {
			setFormError('Elige la línea de atención para ver y reservar un horario.');
			return;
		}
		if (!dateYmd) {
			setFormError('Indica un día.');
			return;
		}
		if (!selectedSlotId) {
			setFormError('Elige una franja entre las publicadas para ese día.');
			return;
		}
		if (!myPets.length) {
			setFormError('Registra una mascota en tu cuenta para reservar.');
			return;
		}
		if (!selectedPetId) {
			setFormError('Selecciona la mascota con la que es la cita.');
			return;
		}
		if (!petNombre.trim() || !petEspecie.trim()) {
			setFormError('Indica nombre y especie de la mascota.');
			return;
		}
		if (!servicio.trim()) {
			setFormError('Indica el motivo o servicio (ej. consulta).');
			return;
		}
		setStep(2);
	}

	async function onConfirm(e) {
		e.preventDefault();
		setFormError('');
		setFormOk('');
		if (!selectedSlotId) {
			setFormError('Selecciona un horario disponible.');
			return;
		}
		if (!selectedPetId) {
			setFormError('Selecciona la mascota registrada.');
			return;
		}
		setSubmitting(true);
		try {
			await createSlotAppointment({
				providerId,
				slotId: selectedSlotId,
				petId: selectedPetId,
				reason: servicio.trim()
			});
			setFormOk('Cita solicitada. El profesional la confirmará; mira el estado en «Mis reservas».');
			setStep(2);
			await loadSlots();
		} catch (err) {
			setFormError(err.response?.data?.message || 'No se pudo reservar el horario.');
		} finally {
			setSubmitting(false);
		}
	}

	function onSelectRegisteredPet(id) {
		setSelectedPetId(id);
		const p = myPets.find((x) => String(x._id) === id);
		if (p) {
			setPetNombre(p.name || '');
			setPetEspecie(p.species || 'perro');
		}
	}

	if (loadError || !provider) {
		return (
			<div className="page">
				<Link className="back-link" to="/">
					Volver
				</Link>
				<p className="error">{loadError || 'Cargando…'}</p>
			</div>
		);
	}

	if (provider.providerType !== 'veterinaria') {
		return (
			<div className="page">
				<Link className="back-link" to="/">
					Volver
				</Link>
				<p>
					Este flujo es para veterinarias.{' '}
					<Link to={`/solicitar-servicio?providerId=${encodeURIComponent(providerId)}`}>
						Solicitar servicio (paseador/cuidador)
					</Link>
				</p>
			</div>
		);
	}

	if (nLines === 0) {
		return (
			<div className="page book-appt-page">
				<Link className="back-link" to="/">
					Volver al mapa
				</Link>
				<h1>Agendar cita</h1>
				<p className="error">
					Esta clínica aún no publica líneas de atención. Intenta más tarde o contáctala por el teléfono
					visible en su ficha.
				</p>
			</div>
		);
	}

	return (
		<div className="page book-appt-page">
			<Link className="back-link" to="/">
				Volver al mapa
			</Link>

			<header className="book-appt-hero">
				<div className="book-appt-hero__titles">
					<p className="book-appt-kicker">Veterinaria</p>
					<h1 className="book-appt-title">Agendar cita</h1>
					<p className="book-appt-clinic">
						<strong>
							{provider.name} {provider.lastName}
						</strong>
						{profileLink ? (
							<>
								{' '}
								<Link to={profileLink} className="book-appt-clinic-link">
									Ver ficha
								</Link>
							</>
						) : null}
					</p>
				</div>
			</header>
			<p className="book-appt-lede muted">
				Elige un día y una <strong>franja publicada</strong> de la clínica; luego indica a qué mascota
				atienden.
			</p>

			<nav className="book-stepper" aria-label="Progreso de reserva" aria-hidden={false}>
				<ol>
					<li
						className={
							step === 1 ? 'book-stepper__item book-stepper__item--active' : 'book-stepper__item book-stepper__item--done'
						}
					>
						<span className="book-stepper__num" aria-hidden>
							1
						</span>
						<span>Datos</span>
					</li>
					<li
						className={
							step === 2 ? 'book-stepper__item book-stepper__item--active' : 'book-stepper__item book-stepper__item--todo'
						}
					>
						<span className="book-stepper__num" aria-hidden>
							2
						</span>
						<span>Confirmar</span>
					</li>
				</ol>
			</nav>

			{step === 1 ? (
				<div className="book-appt-form">
					<section className="book-card" aria-labelledby="book-schedule-heading">
						<div className="book-card__head">
							<span className="book-card__icon" aria-hidden>
								<Stethoscope size={20} strokeWidth={1.9} />
							</span>
							<div>
								<h2 id="book-schedule-heading" className="book-card__title">
									Día y franja
								</h2>
								<p className="book-card__sub muted">Solo ves lo que la clínica ofrece en su agenda</p>
							</div>
						</div>
						<div className="book-card__body">
							{needLinePick ? (
								<label className="edit-field book-field-tight">
									<span>
										<Calendar className="book-field-icon" size={16} /> Línea de atención
									</span>
									<select
										value={clinicServiceId}
										onChange={(e) => {
											setClinicServiceId(e.target.value);
											setSelectedSlotId('');
										}}
										required
									>
										<option value="">Elige profesional o servicio…</option>
										{provider.clinicServices.map((c) => (
											<option key={c.id} value={String(c.id)}>
												{c.displayName}
												{c.kind ? ` (${c.kind})` : ''} · {c.slotDurationMinutes || 30} min
											</option>
										))}
									</select>
								</label>
							) : (
								<p className="book-line-badge">
									<Stethoscope size={16} className="book-line-badge__i" />
									<span>
										{provider.clinicServices[0].displayName} · {provider.clinicServices[0].slotDurationMinutes || 30} min
									</span>
								</p>
							)}

							<div className="book-date-row">
								<label className="edit-field book-date-input-wrap">
									<span>
										<Calendar className="book-field-icon" size={16} /> Día
									</span>
									<input
										type="date"
										className="book-date-input"
										value={dateYmd}
										min={minDateYmd}
										onChange={(e) => {
											setDateYmd(e.target.value);
											setSelectedSlotId('');
										}}
									/>
								</label>
								<div className="book-date-chips" role="group" aria-label="Día rápido">
									<button
										type="button"
										className={`book-date-chip${dateYmd === minDateYmd ? ' book-date-chip--on' : ''}`}
										onClick={() => {
											setDateYmd(minDateYmd);
											setSelectedSlotId('');
										}}
									>
										Hoy
									</button>
									<button
										type="button"
										className={`book-date-chip${dateYmd === tomorrowYmd ? ' book-date-chip--on' : ''}`}
										onClick={() => {
											setDateYmd(tomorrowYmd);
											setSelectedSlotId('');
										}}
									>
										Mañana
									</button>
								</div>
							</div>
							{dateYmd ? (
								<p className="book-day-pill" aria-live="polite">
									{formatDayShort(dateYmd)}
								</p>
							) : null}

							{!canShowSlots && needLinePick ? (
								<p className="book-empty-hint muted" role="status">
									Elige una <strong>línea de atención</strong> arriba para ver las franjas disponibles.
								</p>
							) : null}

							{slotsError ? (
								<p className="error" role="alert">
									{slotsError}
								</p>
							) : null}
							{slotsLoading ? (
								<p className="muted" role="status">
									<Clock size={16} className="book-inline-icon" /> Cargando franjas publicadas…
								</p>
							) : null}
							{!slotsLoading && canShowSlots && slots.length === 0 && !slotsError ? (
								<div className="book-slots-empty muted" role="status">
									<p className="book-slots-empty__t">No hay franjas libres para este día en esta línea</p>
									<p className="book-slots-empty__d">Puedes probar otra fecha o otra línea, si aplica.</p>
								</div>
							) : null}

							{canShowSlots && slots.length > 0 ? (
								<div className="book-slots-wrap">
									<p className="book-slots-title" id="book-slots-label">
										<Clock size={16} className="book-inline-icon" aria-hidden />
										Elegir hora
									</p>
									<div
										className="book-slot-grid"
										role="listbox"
										aria-labelledby="book-slots-label"
									>
										{slots.map((s) => {
											const isSel = selectedSlotId === String(s._id);
											return (
												<button
													key={String(s._id)}
													type="button"
													role="option"
													aria-selected={isSel}
													aria-pressed={isSel}
													className={`book-slot-btn${isSel ? ' book-slot-btn--on' : ''}`}
													onClick={() => setSelectedSlotId(String(s._id))}
												>
													<span className="book-slot-time">
														{formatTimeInChile(s.startAt)} <span className="book-slot-dash">–</span>{' '}
														{formatTimeInChile(s.endAt)}
													</span>
												</button>
											);
										})}
									</div>
								</div>
							) : null}
						</div>
					</section>

					<section className="book-card" aria-labelledby="book-pet-heading">
						<div className="book-card__head">
							<span className="book-card__icon" aria-hidden>
								<PawPrint size={20} strokeWidth={1.9} />
							</span>
							<div>
								<h2 id="book-pet-heading" className="book-card__title">
									Tu mascota
								</h2>
								<p className="book-card__sub muted">Datos con los que se registra la cita</p>
							</div>
						</div>
						<div className="book-card__body">
							{myPets.length > 0 ? (
								<label className="edit-field book-field-tight">
									<span>Mascota registrada</span>
									<select value={selectedPetId} onChange={(e) => onSelectRegisteredPet(e.target.value)} required>
										<option value="">Selecciona…</option>
										{myPets.map((p) => (
											<option key={String(p._id)} value={String(p._id)}>
												{p.name} ({p.species})
											</option>
										))}
									</select>
								</label>
							) : (
								<p className="warn-banner book-warn-compact">
									Regístrate una mascota para reservar. <Link to="/mascotas/nueva">Crear ficha</Link>
								</p>
							)}
							<label className="edit-field">
								<span>Nombre de la mascota</span>
								<input value={petNombre} onChange={(e) => setPetNombre(e.target.value)} required />
							</label>
							<label className="edit-field">
								<span>Especie (ej. perro, gato)</span>
								<input value={petEspecie} onChange={(e) => setPetEspecie(e.target.value)} required />
							</label>
							<label className="edit-field book-field-tight">
								<span>
									<Stethoscope className="book-field-icon" size={16} /> Motivo o servicio
								</span>
								<input
									placeholder="Ej. consulta, control, vacuna"
									value={servicio}
									onChange={(e) => setServicio(e.target.value)}
									required
								/>
							</label>
						</div>
					</section>
					<div className="book-appt-form__footer">
					{formError ? (
						<p className="error book-form-error" role="alert">
							{formError}
						</p>
					) : null}
					<div className="book-cta-wrap">
						<button
							type="button"
							className="book-cta-btn save-profile-btn"
							onClick={goReview}
							disabled={myPets.length === 0}
						>
							Revisar y continuar
						</button>
					</div>
					</div>
				</div>
			) : (
				<div className="book-appt-confirm-wrap">
				<section className="book-card book-confirm" aria-label="Resumen y confirmación">
					{formOk ? (
						<div className="book-confirm-done" role="status">
							<div className="book-confirm-success">
								<Check className="book-confirm-tick" size={32} strokeWidth={2.2} />
								<p className="review-success book-confirm-oktext">{formOk}</p>
							</div>
							<Link to="/mis-reservas" className="book-cta-btn save-profile-btn" style={{ textAlign: 'center' }}>
								Ver en «Mis reservas»
							</Link>
						</div>
					) : (
						<>
							<div className="book-card__head book-confirm__head">
								<span className="book-card__icon" aria-hidden>
									<Calendar size={20} />
								</span>
								<div>
									<h2 className="book-card__title">Revisa y confirma</h2>
									<p className="book-card__sub muted">La clínica recibirá la solicitud y te confirmará luego</p>
								</div>
							</div>
							<dl className="book-confirm-dl">
								<div>
									<dt>Clínica</dt>
									<dd>
										{provider.name} {provider.lastName}
									</dd>
								</div>
								<div>
									<dt>Línea de atención</dt>
									<dd>{selectedLineName}</dd>
								</div>
								<div>
									<dt>Horario</dt>
									<dd>
										{formatDayShort(dateYmd)} · {selectedSlot ? formatTimeInChile(selectedSlot.startAt) : '—'}
										{selectedSlot ? (
											<>
												{' '}
												– {formatTimeInChile(selectedSlot.endAt)} (Chile)
											</>
										) : null}
									</dd>
								</div>
								<div>
									<dt>Mascota</dt>
									<dd>
										{petNombre.trim()} <span className="muted">({petEspecie.trim()})</span>
									</dd>
								</div>
								<div>
									<dt>Motivo / servicio</dt>
									<dd>{servicio.trim()}</dd>
								</div>
							</dl>
							{!selectedSlot ? <p className="error">Falta un horario. Vuelve atrás y elige un tramo.</p> : null}
							{formError ? <p className="error">{formError}</p> : null}
							<div className="book-confirm-actions">
								<button
									type="button"
									className="book-btn-ghost"
									onClick={() => {
										setStep(1);
										setFormError('');
									}}
								>
									<ChevronLeft size={18} />
									Corregir
								</button>
								<button
									type="button"
									className="book-cta-btn save-profile-btn"
									onClick={onConfirm}
									disabled={submitting || !selectedSlot}
								>
									{submitting ? 'Enviando…' : 'Confirmar cita'}
								</button>
							</div>
						</>
					)}
				</section>
				</div>
			)}
		</div>
	);
}
