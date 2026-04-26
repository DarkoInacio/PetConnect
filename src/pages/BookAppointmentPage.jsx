import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { createSlotAppointment, fetchAvailableSlots } from '../services/appointments';
import { fetchProviderPublicProfile, getProviderProfilePath } from '../services/providers';
import { listPets } from '../services/pets';
import { formatTimeInChile } from '../constants/chileTime';
import { hasRole } from '../lib/userRoles';
import { ArrowRight, Calendar, Check, ChevronLeft, Clock, Moon, PawPrint, Stethoscope, Sun, Sunset } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CL_TZ } from '../constants/chileTime';

// ─── Date utilities ───────────────────────────────────────────────────────────
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

// ─── UI helpers ───────────────────────────────────────────────────────────────
function petEmoji(species) {
	const s = (species || '').toLowerCase();
	if (s.includes('perro') || s === 'dog') return '🐶';
	if (s.includes('gato') || s === 'cat') return '🐱';
	if (s.includes('conejo')) return '🐰';
	if (s.includes('ave') || s.includes('pájaro') || s.includes('loro')) return '🦜';
	if (s.includes('hámster') || s.includes('hamster')) return '🐹';
	if (s.includes('reptil') || s.includes('tortuga')) return '🦎';
	if (s.includes('pez') || s.includes('fish')) return '🐟';
	return '🐾';
}

function getDayParts(ymd) {
	const [y, m, d] = ymd.split('-').map(Number);
	const dt = new Date(y, m - 1, d, 12);
	const dayShort = new Intl.DateTimeFormat('es-CL', { weekday: 'short' }).format(dt).replace('.', '');
	const monthShort = new Intl.DateTimeFormat('es-CL', { month: 'short' }).format(dt).replace('.', '');
	return { dayShort, dayNum: d, monthShort };
}

function getSlotHour(slot) {
	const d = new Date(slot.startAt);
	if (Number.isNaN(d.getTime())) return 0;
	// hour12: false returns 0-23, avoids misreading "02:00 PM" as hour 2
	return parseInt(
		new Intl.DateTimeFormat('en-US', { timeZone: CL_TZ, hour: 'numeric', hour12: false }).format(d),
		10,
	);
}

const REASON_PRESETS = ['Consulta', 'Control', 'Vacuna', 'Dental', 'Urgencia'];
const DAYS_TO_SHOW = 21;

// ─── Sub-components ───────────────────────────────────────────────────────────
function Stepper({ step }) {
	return (
		<div className="flex items-center justify-center mb-8" aria-label="Progreso de reserva">
			<div className="flex flex-col items-center">
				<div
					className={cn(
						'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ring-4 ring-offset-2 transition-all',
						step > 1
							? 'bg-emerald-500 text-white ring-emerald-200 dark:ring-emerald-900'
							: 'bg-primary text-primary-foreground ring-primary/20'
					)}
				>
					{step > 1 ? <Check size={17} strokeWidth={2.5} /> : '1'}
				</div>
				<span
					className={cn(
						'text-xs font-bold mt-1.5 tracking-wide',
						step === 1 ? 'text-primary' : 'text-emerald-600 dark:text-emerald-400'
					)}
				>
					Datos
				</span>
			</div>
			<div
				className={cn(
					'h-px w-16 sm:w-28 mb-5 mx-2 transition-colors',
					step > 1 ? 'bg-emerald-400' : 'bg-border'
				)}
			/>
			<div className="flex flex-col items-center">
				<div
					className={cn(
						'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ring-4 ring-offset-2 transition-all',
						step === 2
							? 'bg-primary text-primary-foreground ring-primary/20'
							: 'bg-muted text-muted-foreground ring-transparent border-2 border-border'
					)}
				>
					2
				</div>
				<span
					className={cn(
						'text-xs font-bold mt-1.5 tracking-wide',
						step === 2 ? 'text-primary' : 'text-muted-foreground'
					)}
				>
					Confirmar
				</span>
			</div>
		</div>
	);
}

function FormCard({ sectionId, icon: Icon, iconLabel, title, subtitle, children }) {
	const titleId = `${sectionId}-title`;
	return (
		<section
			className="rounded-2xl border border-border bg-white dark:bg-card shadow-sm overflow-hidden"
			aria-labelledby={titleId}
		>
			<div className="flex items-start gap-4 px-5 sm:px-6 py-4 border-b border-border/60 bg-gradient-to-r from-muted/40 to-transparent dark:from-muted/20">
				<div
					className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary shrink-0"
					aria-hidden
				>
					<Icon size={20} strokeWidth={1.9} aria-label={iconLabel} />
				</div>
				<div className="min-w-0">
					<h2 id={titleId} className="m-0 text-[0.95rem] font-semibold text-foreground leading-snug">
						{title}
					</h2>
					{subtitle && <p className="m-0 mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
				</div>
			</div>
			<div className="px-5 sm:px-6 py-5">{children}</div>
		</section>
	);
}

function SummaryItem({ label, children }) {
	if (!children) return null;
	return (
		<div>
			<div className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground/60 mb-0.5">
				{label}
			</div>
			<div className="text-sm font-medium text-foreground">{children}</div>
		</div>
	);
}

function ErrorMsg({ children, className }) {
	if (!children) return null;
	return (
		<p
			className={cn(
				'rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive',
				className
			)}
			role="alert"
		>
			{children}
		</p>
	);
}

// ─── Main page ────────────────────────────────────────────────────────────────
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

	const [step, setStep] = useState(/** @type {1|2} */ (1));

	const [myPets, setMyPets] = useState([]);
	const [selectedPetId, setSelectedPetId] = useState('');
	const [petNombre, setPetNombre] = useState('');
	const [petEspecie, setPetEspecie] = useState('perro');
	const [servicio, setServicio] = useState('Consulta');

	const [submitting, setSubmitting] = useState(false);
	const [formError, setFormError] = useState('');
	const [formOk, setFormOk] = useState('');

	const dayScrollRef = useRef(null);
	const minDateYmd = toYmdLocal(new Date());

	/* Next 21 days for the scroll picker — computed once */
	const futureDays = useMemo(
		() => Array.from({ length: DAYS_TO_SHOW }, (_, i) => ymdAddDays(minDateYmd, i)),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[]
	);

	/* Scroll selected day pill into view */
	useEffect(() => {
		if (!dayScrollRef.current) return;
		const el = dayScrollRef.current.querySelector('[data-selected="true"]');
		if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
	}, [dateYmd]);

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
		if (!selectedSlot) return '';
		if (selectedSlot.clinicServiceId && typeof selectedSlot.clinicServiceId === 'object') {
			return selectedSlot.clinicServiceId.displayName || '';
		}
		const list = provider?.clinicServices;
		const svc = list?.find((c) => String(c.id) === effectiveClinicServiceId);
		return svc?.displayName || '';
	}, [selectedSlot, provider, effectiveClinicServiceId]);

	/* Slots grouped by time of day */
	const slotGroups = useMemo(() => {
		const groups = [
			{ id: 'morning', label: 'Mañana', Icon: Sun, slots: [] },
			{ id: 'afternoon', label: 'Tarde', Icon: Sunset, slots: [] },
			{ id: 'evening', label: 'Noche', Icon: Moon, slots: [] },
		];
		for (const s of slots) {
			const h = getSlotHour(s);
			if (h < 12) groups[0].slots.push(s);
			else if (h < 18) groups[1].slots.push(s);
			else groups[2].slots.push(s);
		}
		return groups.filter((g) => g.slots.length > 0);
	}, [slots]);

	/* Sidebar summary info */
	const singleLine = provider?.clinicServices?.length === 1 ? provider.clinicServices[0] : null;
	const effectiveLine = provider?.clinicServices?.find(
		(c) => String(c.id) === effectiveClinicServiceId
	);
	const summaryServiceName = singleLine?.displayName || effectiveLine?.displayName || '';
	const summaryServiceDuration = singleLine?.slotDurationMinutes || effectiveLine?.slotDurationMinutes || 30;

	// ─── Data loading ─────────────────────────────────────────────────────────
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

	// ─── Handlers ─────────────────────────────────────────────────────────────
	function goReview(e) {
		e?.preventDefault();
		setFormError('');
		if (needLinePick && !clinicServiceId) {
			setFormError('Elige la línea de atención para ver y reservar un horario.');
			return;
		}
		if (!dateYmd) { setFormError('Indica un día.'); return; }
		if (!selectedSlotId) { setFormError('Elige una franja entre las publicadas para ese día.'); return; }
		if (!myPets.length) { setFormError('Registra una mascota en tu cuenta para reservar.'); return; }
		if (!selectedPetId) { setFormError('Selecciona la mascota con la que es la cita.'); return; }
		if (!petNombre.trim() || !petEspecie.trim()) { setFormError('Indica nombre y especie de la mascota.'); return; }
		if (!servicio.trim()) { setFormError('Indica el motivo o servicio (ej. consulta).'); return; }
		setStep(2);
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	async function onConfirm(e) {
		e?.preventDefault();
		setFormError('');
		setFormOk('');
		if (!selectedSlotId) { setFormError('Selecciona un horario disponible.'); return; }
		if (!selectedPetId) { setFormError('Selecciona la mascota registrada.'); return; }
		setSubmitting(true);
		try {
			await createSlotAppointment({
				providerId,
				slotId: selectedSlotId,
				petId: selectedPetId,
				reason: servicio.trim()
			});
			setFormOk('El profesional revisará la solicitud y te confirmará pronto. Puedes ver el estado en «Mis reservas».');
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

	// ─── Guard states ─────────────────────────────────────────────────────────
	const shell = (content) => (
		<div className="mx-auto w-full max-w-[1200px] px-4 sm:px-5 pt-5 pb-[max(2rem,env(safe-area-inset-bottom,0px))]">
			{content}
		</div>
	);
	const backBtn = (to = '/') => (
		<Link
			to={to}
			className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline min-h-11 mb-4"
		>
			<ChevronLeft size={16} /> Volver
		</Link>
	);

	if (authLoading) return shell(<p className="text-muted-foreground animate-pulse">Cargando…</p>);
	if (!providerId) return shell(<>{backBtn()}<ErrorMsg>Falta providerId en la URL.</ErrorMsg></>);
	if (!user)
		return (
			<Navigate
				to="/login"
				replace
				state={{ from: `/agendar?providerId=${encodeURIComponent(providerId)}` }}
			/>
		);
	if (!hasRole(user, 'dueno'))
		return shell(
			<>
				{backBtn()}
				<ErrorMsg>Solo las cuentas con rol de dueño pueden agendar citas veterinarias.</ErrorMsg>
			</>
		);

	const profileLink = provider ? getProviderProfilePath(provider) : null;
	const nLines = provider?.clinicServices?.length ?? 0;
	const needLinePick = nLines > 1;
	const canShowSlots = nLines > 0 && (!needLinePick || (needLinePick && effectiveClinicServiceId));

	if (loadError || !provider)
		return shell(
			<>
				{backBtn('/')}
				<ErrorMsg>{loadError || 'Cargando…'}</ErrorMsg>
			</>
		);

	if (provider.providerType !== 'veterinaria') {
		const walkerPid = String(provider.id ?? provider._id ?? providerId ?? '');
		return shell(
			<>
				{backBtn('/')}
				<p className="text-muted-foreground">
					Este flujo es para veterinarias.{' '}
					<Link
						to={`/solicitar-servicio?providerId=${encodeURIComponent(walkerPid)}`}
						className="text-primary font-semibold"
					>
						Solicitar servicio (paseador/cuidador)
					</Link>
				</p>
			</>
		);
	}

	if (nLines === 0)
		return shell(
			<>
				{backBtn('/')}
				<h1 className="text-2xl font-bold text-foreground mb-3">Agendar cita</h1>
				<ErrorMsg>
					Esta clínica aún no publica líneas de atención. Intenta más tarde o contáctala por el
					teléfono visible en su ficha.
				</ErrorMsg>
			</>
		);

	// ─── Main render ──────────────────────────────────────────────────────────
	return (
		<div
			className={cn(
				'mx-auto w-full max-w-[1200px] px-4 sm:px-5 pt-5',
				step === 1
					? 'pb-40 lg:pb-[max(2rem,env(safe-area-inset-bottom,0px))]'
					: 'pb-[max(2rem,env(safe-area-inset-bottom,0px))]',
			)}
		>
			{/* Back link */}
			<Link
				to={profileLink || '/'}
				className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline min-h-11 mb-3"
			>
				<ChevronLeft size={16} />
				{profileLink ? 'Volver a la ficha' : 'Volver al mapa'}
			</Link>

			{/* Page header */}
			<header className="mb-7">
				<p className="text-[0.7rem] font-bold uppercase tracking-widest text-primary/70 mb-1.5">
					Veterinaria
				</p>
				<h1 className="text-[clamp(1.55rem,3vw,2rem)] font-bold tracking-tight text-foreground leading-tight mb-2">
					Reserva una cita para tu mascota
				</h1>
				<p className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-2">
					<strong className="text-foreground font-semibold">
						{provider.name} {provider.lastName}
					</strong>
					{profileLink && (
						<Link to={profileLink} className="text-primary font-semibold text-xs hover:underline">
							· Ver ficha completa
						</Link>
					)}
				</p>
			</header>

			{/* Stepper */}
			<Stepper step={step} />

			{/* ────── STEP 1 ────── */}
			{step === 1 && (
				<div className="lg:grid lg:grid-cols-5 lg:gap-8 lg:items-start">
					{/* ── Left: Form cards ── */}
					<div className="lg:col-span-3 flex flex-col gap-5">
						{/* 1. Línea de atención (solo si hay >1) */}
						{needLinePick && (
							<FormCard
								sectionId="service"
								icon={Stethoscope}
								iconLabel="Tipo de atención"
								title="Tipo de atención"
								subtitle="¿Qué servicio necesitas para tu mascota?"
							>
								<div className="flex flex-col gap-2" role="radiogroup" aria-label="Línea de atención">
									{provider.clinicServices.map((c) => {
										const isSelected = clinicServiceId === String(c.id);
										return (
											<button
												key={c.id}
												type="button"
												role="radio"
												aria-checked={isSelected}
												onClick={() => {
													setClinicServiceId(String(c.id));
													setSelectedSlotId('');
												}}
												className={cn(
													'flex items-center gap-3.5 w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all cursor-pointer',
													isSelected
														? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm'
														: 'border-border bg-background hover:border-primary/40 hover:bg-muted/40'
												)}
											>
												<div
													className={cn(
														'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
														isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/50'
													)}
												>
													{isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
												</div>
												<div className="min-w-0">
													<div className="font-semibold text-sm text-foreground">{c.displayName}</div>
													<div className="text-xs text-muted-foreground mt-0.5">
														{c.slotDurationMinutes || 30} minutos por turno
														{c.kind ? ` · ${c.kind}` : ''}
													</div>
												</div>
											</button>
										);
									})}
								</div>
							</FormCard>
						)}

						{/* Single-line info badge */}
						{!needLinePick && singleLine && (
							<div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-primary/8 dark:bg-primary/10 border border-primary/20">
								<Stethoscope size={16} className="text-primary shrink-0" />
								<span className="text-sm font-medium text-foreground">
									{singleLine.displayName}
									<span className="text-muted-foreground font-normal">
										{' '}· {singleLine.slotDurationMinutes || 30} min por turno
									</span>
								</span>
							</div>
						)}

						{/* 2. Fecha */}
						<FormCard
							sectionId="date"
							icon={Calendar}
							iconLabel="Selección de fecha"
							title="¿Qué día?"
							subtitle="Elige la fecha que más te acomoda"
						>
							{/* Horizontal day scroll */}
							<div
								ref={dayScrollRef}
								className="flex gap-2 overflow-x-auto pb-2.5 mb-4 -mx-1 px-1"
								role="group"
								aria-label="Selección rápida de fecha"
								style={{ scrollbarWidth: 'thin' }}
							>
								{futureDays.map((ymd) => {
									const { dayShort, dayNum, monthShort } = getDayParts(ymd);
									const isSelected = ymd === dateYmd;
									const isToday = ymd === minDateYmd;
									return (
										<button
											key={ymd}
											type="button"
											data-selected={isSelected}
											aria-pressed={isSelected}
											aria-label={`${isToday ? 'Hoy, ' : ''}${dayShort} ${dayNum} de ${monthShort}`}
											onClick={() => {
												setDateYmd(ymd);
												setSelectedSlotId('');
											}}
											className={cn(
												'flex flex-col items-center justify-center shrink-0 w-[3.4rem] py-2.5 rounded-xl border-2 transition-all cursor-pointer select-none',
												isSelected
													? 'border-primary bg-primary text-primary-foreground shadow-md'
													: 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-muted/50'
											)}
										>
											<span
												className={cn(
													'text-[0.58rem] font-bold uppercase tracking-wider leading-none',
													isSelected ? 'text-primary-foreground/75' : 'text-muted-foreground'
												)}
											>
												{isToday ? 'Hoy' : dayShort}
											</span>
											<span className="text-xl font-bold leading-snug mt-0.5">{dayNum}</span>
											<span
												className={cn(
													'text-[0.58rem] font-semibold uppercase leading-none',
													isSelected ? 'text-primary-foreground/75' : 'text-muted-foreground'
												)}
											>
												{monthShort}
											</span>
										</button>
									);
								})}
								{/* Extra date picker */}
								<label
									className="flex flex-col items-center justify-center shrink-0 w-[3.4rem] py-2.5 rounded-xl border-2 border-dashed border-border/70 bg-background text-muted-foreground hover:border-primary/40 hover:text-primary cursor-pointer transition-colors select-none"
									title="Elegir otra fecha"
								>
									<span className="text-[0.58rem] font-bold uppercase tracking-wider">Otra</span>
									<Calendar size={15} className="my-1" />
									<span className="text-[0.58rem] font-semibold">fecha</span>
									<input
										type="date"
										className="sr-only"
										min={minDateYmd}
										value={dateYmd}
										onChange={(e) => {
											if (e.target.value) {
												setDateYmd(e.target.value);
												setSelectedSlotId('');
											}
										}}
									/>
								</label>
							</div>

							{dateYmd && (
								<p className="text-sm font-semibold text-foreground capitalize flex items-center gap-1.5 m-0">
									<Calendar size={14} className="text-primary shrink-0" />
									{formatDayShort(dateYmd)}
								</p>
							)}
						</FormCard>

						{/* 3. Horario */}
						<FormCard
							sectionId="time"
							icon={Clock}
							iconLabel="Selección de horario"
							title="Elige tu hora"
							subtitle="Franjas disponibles publicadas por la clínica"
						>
							{needLinePick && !effectiveClinicServiceId && (
								<div className="text-center py-8 text-muted-foreground">
									<Stethoscope size={28} className="mx-auto mb-2.5 opacity-30" />
									<p className="text-sm">
										Primero elige una <strong>línea de atención</strong> arriba.
									</p>
								</div>
							)}

							{slotsLoading && (
								<div className="flex items-center justify-center gap-2.5 py-8 text-sm text-muted-foreground">
									<div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
									Cargando horarios disponibles…
								</div>
							)}

							{slotsError && !slotsLoading && <ErrorMsg>{slotsError}</ErrorMsg>}

							{!slotsLoading && canShowSlots && slots.length === 0 && !slotsError && (
								<div className="text-center py-8 px-4">
									<div className="text-4xl mb-3">🗓️</div>
									<p className="text-sm font-semibold text-foreground mb-1">
										Sin horarios disponibles este día
									</p>
									<p className="text-xs text-muted-foreground">
										Prueba con otra fecha o línea de atención
									</p>
								</div>
							)}

							{canShowSlots && slotGroups.length > 0 && (
								<div className="flex flex-col gap-6" role="listbox" aria-label="Horarios disponibles">
									{slotGroups.map(({ id, label, Icon, slots: groupSlots }) => (
										<div key={id}>
											<div className="flex items-center gap-1.5 mb-3">
												<Icon size={13} className="text-muted-foreground" />
												<span className="text-[0.7rem] font-bold uppercase tracking-widest text-muted-foreground">
													{label}
												</span>
												<Badge
													variant="secondary"
													className="text-[0.6rem] h-4 px-1.5 ml-0.5 font-bold"
												>
													{groupSlots.length}
												</Badge>
											</div>
											<div className="grid grid-cols-[repeat(auto-fill,minmax(7.2rem,1fr))] gap-2.5">
												{groupSlots.map((s) => {
													const isSel = selectedSlotId === String(s._id);
													return (
														<button
															key={String(s._id)}
															type="button"
															role="option"
															aria-selected={isSel}
															onClick={() => setSelectedSlotId(String(s._id))}
															className={cn(
																'rounded-xl border-2 py-3 px-2 text-sm font-bold text-center cursor-pointer transition-all min-h-[3.25rem]',
																isSel
																	? 'bg-primary text-primary-foreground border-primary shadow-md ring-2 ring-primary/20 ring-offset-2'
																	: 'bg-background border-border text-foreground hover:border-primary/50 hover:bg-muted/50 hover:shadow-sm'
															)}
														>
															{formatTimeInChile(s.startAt)}
															<span
																className={cn(
																	'block text-[0.72rem] font-medium mt-0.5',
																	isSel ? 'text-primary-foreground/70' : 'text-muted-foreground'
																)}
															>
																– {formatTimeInChile(s.endAt)}
															</span>
														</button>
													);
												})}
											</div>
										</div>
									))}
								</div>
							)}
						</FormCard>

						{/* 4. Tu mascota */}
						<FormCard
							sectionId="pet"
							icon={PawPrint}
							iconLabel="Datos de mascota"
							title="Tu mascota"
							subtitle="¿Con quién es la cita?"
						>
							{myPets.length === 0 ? (
								<div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-5 py-4 text-amber-800 dark:text-amber-300">
									<p className="font-semibold text-sm mb-1">No tienes mascotas registradas</p>
									<p className="text-xs opacity-90 mb-3">
										Registra tu primera mascota para poder agendar citas.
									</p>
									<Link
										to="/mascotas/nueva"
										className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 no-underline transition-colors"
									>
										<PawPrint size={13} /> Crear ficha de mascota
									</Link>
								</div>
							) : (
								<>
									<div
										className="flex flex-wrap gap-2.5 mb-5"
										role="radiogroup"
										aria-label="Seleccionar mascota"
									>
										{myPets.map((p) => {
											const isSelected = selectedPetId === String(p._id);
											return (
												<button
													key={String(p._id)}
													type="button"
													role="radio"
													aria-checked={isSelected}
													onClick={() => onSelectRegisteredPet(String(p._id))}
													className={cn(
														'flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 transition-all cursor-pointer text-left',
														isSelected
															? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm'
															: 'border-border bg-background hover:border-primary/40 hover:bg-muted/40'
													)}
												>
													<span className="text-[1.6rem] leading-none" aria-hidden>
														{petEmoji(p.species)}
													</span>
													<div>
														<div className="font-semibold text-sm text-foreground">
															{p.name}
														</div>
														<div className="text-xs text-muted-foreground capitalize">
															{p.species}
														</div>
													</div>
													{isSelected && (
														<Check
															size={14}
															className="text-primary ml-1 shrink-0"
															aria-hidden
														/>
													)}
												</button>
											);
										})}
									</div>

									{selectedPetId && (
										<div className="grid sm:grid-cols-2 gap-3">
											<div>
												<label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
													Nombre
												</label>
												<input
													value={petNombre}
													onChange={(e) => setPetNombre(e.target.value)}
													className="h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
													required
												/>
											</div>
											<div>
												<label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
													Especie
												</label>
												<input
													value={petEspecie}
													onChange={(e) => setPetEspecie(e.target.value)}
													placeholder="perro, gato…"
													className="h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
													required
												/>
											</div>
										</div>
									)}
								</>
							)}
						</FormCard>

						{/* 5. Motivo */}
						<FormCard
							sectionId="reason"
							icon={Stethoscope}
							iconLabel="Motivo de la cita"
							title="Motivo de la consulta"
							subtitle="Ayuda a la clínica a prepararse para tu visita"
						>
							<div className="flex flex-wrap gap-2 mb-3" role="group" aria-label="Motivos frecuentes">
								{REASON_PRESETS.map((preset) => (
									<button
										key={preset}
										type="button"
										onClick={() => setServicio(preset)}
										className={cn(
											'px-3.5 py-1.5 rounded-full text-xs font-semibold border-2 transition-all cursor-pointer',
											servicio === preset
												? 'bg-primary text-primary-foreground border-primary shadow-sm'
												: 'bg-background border-border text-foreground hover:border-primary/50 hover:bg-muted/50'
										)}
									>
										{preset}
									</button>
								))}
							</div>
							<input
								value={servicio}
								onChange={(e) => setServicio(e.target.value)}
								placeholder="O describe el motivo con tus palabras…"
								aria-label="Motivo de la consulta"
								className="h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
								required
							/>
						</FormCard>

				</div>

					{/* ── Right: Sticky summary sidebar (desktop) ── */}
					<aside className="hidden lg:block lg:col-span-2" aria-label="Resumen de tu reserva">
						<div className="sticky top-[5rem] rounded-2xl border border-border bg-card shadow-md overflow-hidden">
							<div className="px-5 py-4 border-b border-border bg-gradient-to-r from-muted/40 to-transparent dark:from-muted/20">
								<h3 className="text-[0.68rem] font-bold uppercase tracking-widest text-muted-foreground m-0">
									Resumen de tu reserva
								</h3>
							</div>

							<div className="px-5 py-5 flex flex-col gap-4 min-h-[10rem]">
								<SummaryItem label="Clínica">
									{provider.name} {provider.lastName}
								</SummaryItem>
								{summaryServiceName && (
									<SummaryItem label="Servicio">
										{summaryServiceName}
										<span className="text-xs text-muted-foreground font-normal ml-1.5">
											· {summaryServiceDuration} min
										</span>
									</SummaryItem>
								)}
								{dateYmd && (
									<SummaryItem label="Fecha">
										<span className="capitalize">{formatDayShort(dateYmd)}</span>
									</SummaryItem>
								)}
								{selectedSlot && (
									<SummaryItem label="Hora">
										{formatTimeInChile(selectedSlot.startAt)} –{' '}
										{formatTimeInChile(selectedSlot.endAt)}
									</SummaryItem>
								)}
								{petNombre && (
									<SummaryItem label="Mascota">
										<span className="flex items-center gap-1.5">
											<span aria-hidden>{petEmoji(petEspecie)}</span>
											{petNombre}
											<span className="text-muted-foreground font-normal capitalize">
												({petEspecie})
											</span>
										</span>
									</SummaryItem>
								)}
								{servicio && <SummaryItem label="Motivo">{servicio}</SummaryItem>}
								{!summaryServiceName && !selectedSlot && !petNombre && (
									<p className="text-xs text-muted-foreground text-center py-4 m-0">
										Completa los pasos para ver el resumen aquí.
									</p>
								)}
							</div>

							<div className="px-5 pb-5 pt-3 border-t border-border">
								{formError && (
									<p className="text-sm text-destructive mb-3 font-medium">{formError}</p>
								)}
								<Button
									className="w-full h-11 font-bold"
									onClick={goReview}
									disabled={myPets.length === 0}
								>
									Revisar y confirmar{' '}
									<ArrowRight size={16} className="ml-1.5" />
								</Button>
								{myPets.length === 0 && (
									<p className="text-xs text-center text-muted-foreground mt-2.5">
										<Link to="/mascotas/nueva" className="text-primary font-semibold">
											Registra una mascota
										</Link>{' '}
										para continuar
									</p>
								)}
							</div>
						</div>
					</aside>
				</div>
			)}

		{/* ────── Barra sticky inferior (móvil, step 1) ────── */}
		{step === 1 && (
			<div
				className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-card/95 dark:bg-card/98 backdrop-blur-md border-t border-border shadow-[0_-4px_24px_-6px_rgba(0,0,0,0.18)]"
				style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
				aria-label="Confirmar reserva"
			>
				{/* Mini resumen */}
				<div className="flex items-start gap-3 px-4 pt-3 pb-2.5">
					{/* Ícono */}
					<div className="shrink-0 w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mt-0.5">
						<Calendar size={17} className="text-primary" />
					</div>
					<div className="flex-1 min-w-0">
						{selectedSlot ? (
							<>
								<p className="text-[0.7rem] text-muted-foreground font-medium leading-none mb-0.5">
									Horario seleccionado
								</p>
								<p className="text-sm font-bold text-foreground leading-snug capitalize truncate">
									{dateYmd ? formatDayShort(dateYmd) : '—'} &middot;{' '}
									{formatTimeInChile(selectedSlot.startAt)} –{' '}
									{formatTimeInChile(selectedSlot.endAt)}
								</p>
								{petNombre && (
									<p className="text-xs text-muted-foreground truncate">
										<span aria-hidden>{petEmoji(petEspecie)}</span> {petNombre}
									</p>
								)}
							</>
						) : (
							<>
								<p className="text-[0.7rem] text-muted-foreground font-medium leading-none mb-0.5">
									Sin horario seleccionado
								</p>
								<p className="text-sm text-muted-foreground/70 leading-snug">
									Elige una franja horaria arriba para continuar
								</p>
							</>
						)}
					</div>
				</div>

				{/* Error */}
				{formError && (
					<p className="px-4 pb-1.5 text-xs text-destructive font-medium">{formError}</p>
				)}

				{/* Botón */}
				<div className="px-4 pb-1">
					{myPets.length === 0 ? (
						<div className="flex items-center gap-2 w-full h-11 px-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-semibold">
							<PawPrint size={14} />
							<span>
								Primero{' '}
								<Link to="/mascotas/nueva" className="underline font-bold">
									registra una mascota
								</Link>
							</span>
						</div>
					) : (
						<Button className="w-full h-11 font-bold" onClick={goReview}>
							Revisar y confirmar <ArrowRight size={16} className="ml-1.5" />
						</Button>
					)}
				</div>
			</div>
		)}

		{/* ────── STEP 2: Confirmar ────── */}
		{step === 2 && (
				<div className="max-w-lg mx-auto">
					{formOk ? (
						/* ── Success state ── */
						<div className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 p-8 sm:p-10 text-center">
							<div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mx-auto mb-5">
								<Check
									size={32}
									strokeWidth={2.5}
									className="text-emerald-600 dark:text-emerald-400"
								/>
							</div>
							<h2 className="text-xl font-bold text-foreground mb-2">¡Cita solicitada!</h2>
							<p className="text-sm text-muted-foreground mb-7 max-w-xs mx-auto">{formOk}</p>
							<div className="flex flex-col sm:flex-row gap-3 justify-center">
								<Link
									to="/cuenta/reservas"
									className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 no-underline transition-colors"
								>
									Ver en «Mis reservas»
								</Link>
								<Link
									to="/"
									className="inline-flex items-center justify-center h-11 px-5 rounded-xl border-2 border-border bg-background text-foreground font-semibold text-sm hover:bg-muted no-underline transition-colors"
								>
									Volver al mapa
								</Link>
							</div>
						</div>
					) : (
						/* ── Review card ── */
						<div className="rounded-2xl border border-border bg-white dark:bg-card shadow-md overflow-hidden">
							<div className="flex items-start gap-4 px-5 sm:px-6 py-4 border-b border-border/60 bg-gradient-to-r from-muted/40 to-transparent dark:from-muted/20">
								<div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary shrink-0">
									<Calendar size={20} strokeWidth={1.9} />
								</div>
								<div>
									<h2 className="m-0 text-[0.95rem] font-semibold text-foreground">
										Revisa y confirma tu cita
									</h2>
									<p className="m-0 mt-0.5 text-xs text-muted-foreground">
										La clínica revisará la solicitud y te confirmará
									</p>
								</div>
							</div>

							<dl className="divide-y divide-border px-5 sm:px-6">
								{[
									{ label: 'Clínica', value: `${provider.name} ${provider.lastName}` },
									{ label: 'Línea de atención', value: selectedLineName || summaryServiceName },
									{
										label: 'Fecha y hora',
										value: selectedSlot
											? `${formatDayShort(dateYmd)} · ${formatTimeInChile(selectedSlot.startAt)} – ${formatTimeInChile(selectedSlot.endAt)}`
											: formatDayShort(dateYmd)
									},
									{
										label: 'Mascota',
										value: petNombre
											? `${petEmoji(petEspecie)} ${petNombre} (${petEspecie})`
											: ''
									},
									{ label: 'Motivo / servicio', value: servicio },
								]
									.filter((r) => r.value)
									.map(({ label, value }) => (
										<div key={label} className="py-3.5">
											<dt className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground/60 mb-0.5">
												{label}
											</dt>
											<dd className="text-sm font-medium text-foreground m-0 capitalize-first">
												{value}
											</dd>
										</div>
									))}
							</dl>

							<div className="px-5 sm:px-6 py-5 border-t border-border bg-muted/20 dark:bg-muted/10">
								{!selectedSlot && (
									<ErrorMsg className="mb-3">
										Falta un horario. Vuelve atrás y elige un tramo.
									</ErrorMsg>
								)}
								{formError && <ErrorMsg className="mb-3">{formError}</ErrorMsg>}

								<div className="flex flex-col sm:flex-row gap-3">
									<button
										type="button"
										onClick={() => {
											setStep(1);
											setFormError('');
											window.scrollTo({ top: 0, behavior: 'smooth' });
										}}
										className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-xl border-2 border-border bg-background text-foreground text-sm font-semibold cursor-pointer hover:bg-muted transition-colors sm:w-auto"
									>
										<ChevronLeft size={16} /> Corregir datos
									</button>
									<Button
										className="h-11 text-sm font-bold flex-1"
										onClick={onConfirm}
										disabled={submitting || !selectedSlot}
									>
										{submitting ? (
											<span className="flex items-center gap-2">
												<span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
												Enviando…
											</span>
										) : (
											<span className="flex items-center gap-1.5">
												<Check size={16} /> Confirmar cita
											</span>
										)}
									</Button>
								</div>

								<p className="text-xs text-muted-foreground mt-3 text-center m-0">
									La solicitud queda pendiente hasta que la clínica la apruebe.
								</p>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
