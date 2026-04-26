import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { createClinicalEncounter } from '../services/vet';
import { hasRole } from '../lib/userRoles';
import { Stethoscope, Save } from 'lucide-react';
import { getPet } from '../services/pets';
import { fetchProviderBookings } from '../services/bookings';
import { formatChileDateTimeRange } from '../constants/chileTime';

const ENCOUNTER_TYPES = [
	{ value: 'consulta', label: 'Consulta' },
	{ value: 'vacuna', label: 'Vacuna' },
	{ value: 'otro', label: 'Otro' }
];

export function VetClinicalPage() {
	const { user, loading: authLoading } = useAuth();
	const [searchParams] = useSearchParams();
	const appointmentId = searchParams.get('appointmentId') || '';
	const petId = searchParams.get('petId') || '';

	const [type, setType] = useState('consulta');
	const [motivo, setMotivo] = useState('');
	const [diagnostico, setDiagnostico] = useState('');
	const [tratamiento, setTratamiento] = useState('');
	const [observaciones, setObservaciones] = useState('');
	const [files, setFiles] = useState([]);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');
	const [ok, setOk] = useState('');
	const [ctxLoading, setCtxLoading] = useState(false);
	const [ctxErr, setCtxErr] = useState('');
	const [pet, setPet] = useState(null);
	const [appt, setAppt] = useState(null);

	const pageClass =
		'mx-auto w-full max-w-[1200px] px-4 py-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]';
	const backLinkClass =
		'inline-flex items-center gap-0.5 min-h-11 mb-2 px-0.5 py-0.5 text-primary font-semibold rounded-sm hover:text-primary/80 hover:underline';
	const errorClass =
		'rounded-xl border border-destructive/35 bg-destructive/10 px-3.5 py-3 text-sm text-destructive mb-3';
	const inputCls =
		'h-10 w-full rounded-xl border border-input bg-background px-3 py-2.5 font-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
	const textareaCls =
		'w-full min-h-[6.5rem] resize-y rounded-xl border border-input bg-background px-3 py-2.5 font-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

	const apptLabel = useMemo(() => {
		if (!appt) return null;
		return formatChileDateTimeRange(appt.startAt, appt.endAt);
	}, [appt]);

	if (authLoading) {
		return (
			<div className={pageClass}>
				<p>Cargando…</p>
			</div>
		);
	}

	if (!user) {
		return <Navigate to='/login' replace state={{ from: '/proveedor/atencion-clinica' }} />;
	}

	if (!hasRole(user, 'proveedor') || user.providerType !== 'veterinaria') {
		return (
			<div className={pageClass}>
				<Link className={backLinkClass} to='/proveedor'>
					Panel
				</Link>
				<p className={errorClass}>
					Solo veterinarias aprobadas pueden registrar atenciones clínicas.
				</p>
			</div>
		);
	}

	useEffect(() => {
		if (!appointmentId || !petId) return;
		if (!user || !hasRole(user, 'proveedor') || user.providerType !== 'veterinaria') return;

		const c = new AbortController();
		(async () => {
			setCtxLoading(true);
			setCtxErr('');
			try {
				const [petRes, bookingsRes] = await Promise.all([
					getPet(petId, c.signal).catch(() => null),
					fetchProviderBookings(c.signal).catch(() => null)
				]);
				setPet(petRes?.pet || null);
				const items = Array.isArray(bookingsRes?.items) ? bookingsRes.items : [];
				const row = items.find((x) => String(x.id ?? x._id ?? '') === String(appointmentId));
				setAppt(row || null);
			} catch (e) {
				if (e?.name === 'AbortError') return;
				setCtxErr('No se pudo cargar el contexto de la cita/mascota.');
			} finally {
				setCtxLoading(false);
			}
		})();
		return () => c.abort();
	}, [appointmentId, petId, user]);

	async function onSubmit(e) {
		e.preventDefault();
		setError('');
		setOk('');
		if (!appointmentId || !petId) {
			setError('Faltan appointmentId y petId en la URL.');
			return;
		}
		if (!motivo.trim()) {
			setError('El motivo es obligatorio.');
			return;
		}
		setSaving(true);
		try {
			await createClinicalEncounter(
				petId,
				{
					appointmentId,
					type,
					motivo: motivo.trim(),
					diagnostico: diagnostico.trim(),
					tratamiento: tratamiento.trim(),
					observaciones: observaciones.trim()
				},
				files
			);
			setOk('Atención registrada.');
			setFiles([]);
		} catch (err) {
			setError(err.response?.data?.message || 'No se pudo registrar.');
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className={pageClass}>
			<Link className={backLinkClass} to='/proveedor'>
				Panel proveedor
			</Link>
			<div className="mx-auto w-full max-w-4xl rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
				<div className="flex items-center gap-2 px-5 py-4 border-b border-border bg-gradient-to-r from-muted/40 to-transparent dark:from-muted/20">
					<Stethoscope className="w-4 h-4 text-primary/70 shrink-0" aria-hidden />
					<span className="text-[0.7rem] font-bold uppercase tracking-widest text-primary/70">Registro clínico</span>
				</div>
				<div className="px-5 py-5">
					<h1 className="text-[clamp(1.4rem,2.4vw,1.75rem)] font-bold tracking-tight text-foreground mb-1.5">
						Atención asociada a una cita
					</h1>
					<p className="m-0 text-sm text-muted-foreground max-w-[64ch]">
						Esta pantalla se abre desde el panel en una cita confirmada o completada, con mascota vinculada.
					</p>

					<div className="mt-4 grid gap-2">
						{ctxErr ? (
							<p className={errorClass} role="alert">
								{ctxErr}
							</p>
						) : null}
						{ctxLoading ? <p className="text-sm text-muted-foreground">Cargando detalles…</p> : null}

						<div className="flex flex-wrap gap-2 text-xs">
							<span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-3 py-1 font-semibold text-foreground/80">
								Cita: <span className="ml-1">{apptLabel || '—'}</span>
							</span>
							<span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-3 py-1 font-semibold text-foreground/80">
								Mascota:{' '}
								<span className="ml-1">
									{pet?.name ? String(pet.name) : '—'}
									{pet?.species ? ` (${pet.species})` : ''}
								</span>
							</span>
						</div>

						<details className="text-xs text-muted-foreground">
							<summary className="cursor-pointer select-none hover:text-foreground">Ver IDs técnicos</summary>
							<div className="mt-1 flex flex-wrap gap-2">
								<span className="inline-flex items-center rounded-full border border-border bg-muted/20 px-3 py-1 font-mono">
									appointmentId: {appointmentId || '—'}
								</span>
								<span className="inline-flex items-center rounded-full border border-border bg-muted/20 px-3 py-1 font-mono">
									petId: {petId || '—'}
								</span>
							</div>
						</details>
					</div>

					<form onSubmit={onSubmit} className="mt-5 grid gap-4">
						<div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
							<label className="grid gap-1.5 text-sm">
								<span className="font-semibold text-foreground">Tipo</span>
								<select
									value={type}
									onChange={(e) => setType(e.target.value)}
									className={inputCls}
									disabled={saving}
								>
									{ENCOUNTER_TYPES.map((t) => (
										<option key={t.value} value={t.value}>
											{t.label}
										</option>
									))}
								</select>
							</label>

							<label className="grid gap-1.5 text-sm">
								<span className="font-semibold text-foreground">Adjuntos (máx. 3)</span>
								<input
									type="file"
									multiple
									accept="image/jpeg,image/png,application/pdf"
									onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 3))}
									disabled={saving}
									className="h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm file:mr-3 file:h-8 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-foreground hover:file:bg-muted/70"
								/>
							</label>
						</div>

						<label className="grid gap-1.5 text-sm">
							<span className="font-semibold text-foreground">Motivo / anamnesis</span>
							<textarea
								className={textareaCls}
								rows={4}
								value={motivo}
								onChange={(e) => setMotivo(e.target.value)}
								required
								disabled={saving}
							/>
						</label>

						<div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
							<label className="grid gap-1.5 text-sm">
								<span className="font-semibold text-foreground">Diagnóstico</span>
								<textarea
									className={textareaCls}
									rows={3}
									value={diagnostico}
									onChange={(e) => setDiagnostico(e.target.value)}
									disabled={saving}
								/>
							</label>
							<label className="grid gap-1.5 text-sm">
								<span className="font-semibold text-foreground">Tratamiento</span>
								<textarea
									className={textareaCls}
									rows={3}
									value={tratamiento}
									onChange={(e) => setTratamiento(e.target.value)}
									disabled={saving}
								/>
							</label>
						</div>

						<label className="grid gap-1.5 text-sm">
							<span className="font-semibold text-foreground">Observaciones</span>
							<textarea
								className={textareaCls}
								rows={3}
								value={observaciones}
								onChange={(e) => setObservaciones(e.target.value)}
								disabled={saving}
							/>
						</label>

						{error ? <p className={errorClass} role="alert">{error}</p> : null}
						{ok ? (
							<p className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
								{ok}
							</p>
						) : null}

						<div className="flex flex-wrap items-center gap-2 pt-1">
							<button
								type="submit"
								disabled={saving}
								className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-65 disabled:cursor-not-allowed"
							>
								<Save className="h-4 w-4" aria-hidden />
								{saving ? 'Guardando…' : 'Registrar atención'}
							</button>
							<span className="text-xs text-muted-foreground">
								Se validará en el servidor que la cita sea tuya, confirmada/completada y dentro del plazo.
							</span>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
}
