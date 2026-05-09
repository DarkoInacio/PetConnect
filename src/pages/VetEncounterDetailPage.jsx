import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ChevronLeft, Calendar, Pill, Bell, Paperclip } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { hasRole } from '../lib/userRoles';
import { getVetClinicalEncounterDetail, downloadVetEncounterAttachmentBlob } from '../services/vet';
import { cn } from '../lib/utils';

const PAGE_CLS =
	'mx-auto w-full max-w-3xl px-4 sm:px-5 pt-6 pb-[max(2rem,env(safe-area-inset-bottom,0px))]';
const BACK_LINK_CLS =
	'inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline min-h-11 mb-4';
const ERROR_CLS = 'rounded-xl border border-destructive/35 bg-destructive/10 px-3.5 py-3 text-sm text-destructive';
const CARD_CLS = 'rounded-2xl border border-border bg-card shadow-sm p-5 sm:p-6';

const ENCOUNTER_TYPE_COLORS = {
	consulta: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300',
	vacuna: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
	vacunacion: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
	otro: 'bg-muted text-muted-foreground'
};

function encounterTypeColor(type) {
	const key = (type || '').toLowerCase();
	return ENCOUNTER_TYPE_COLORS[key] || 'bg-muted text-muted-foreground';
}

function downloadBlob(blob, filename) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

function DetailField({ label, value }) {
	if (!value) return null;
	return (
		<div className="flex flex-col gap-1">
			<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
			<p className="text-sm text-foreground m-0 leading-relaxed">{value}</p>
		</div>
	);
}

export function VetEncounterDetailPage() {
	const { petId, encounterId } = useParams();
	const { user, loading: authLoading } = useAuth();
	const [enc, setEnc] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [downloadErr, setDownloadErr] = useState('');

	useEffect(() => {
		if (authLoading || !user || !petId || !encounterId) return;
		if (!hasRole(user, 'proveedor') || user.providerType !== 'veterinaria') return;

		const c = new AbortController();
		(async () => {
			try {
				setLoading(true);
				setError('');
				const data = await getVetClinicalEncounterDetail(petId, encounterId, c.signal);
				setEnc(data.encounter || null);
			} catch (err) {
				if (err.name === 'CanceledError' || err.name === 'AbortError') return;
				setError(err.response?.data?.message || 'No se pudo cargar la atención.');
				setEnc(null);
			} finally {
				setLoading(false);
			}
		})();
		return () => c.abort();
	}, [authLoading, user, petId, encounterId]);

	if (authLoading || loading) {
		return (
			<div className={PAGE_CLS}>
				<div className={cn(CARD_CLS, 'animate-pulse')} role="status">
					<p className="text-muted-foreground m-0">Cargando…</p>
				</div>
			</div>
		);
	}

	if (!user) {
		return <Navigate to="/login" replace />;
	}

	if (!hasRole(user, 'proveedor') || user.providerType !== 'veterinaria') {
		return (
			<div className={PAGE_CLS}>
				<p className={ERROR_CLS}>Solo veterinarias pueden ver este detalle.</p>
			</div>
		);
	}

	if (error || !enc) {
		return (
			<div className={PAGE_CLS}>
				<Link className={BACK_LINK_CLS} to={`/proveedor/pacientes/${petId}/ficha`}>
					<ChevronLeft className="w-4 h-4" aria-hidden /> Ficha del paciente
				</Link>
				<p className={ERROR_CLS}>{error || 'No encontrada.'}</p>
			</div>
		);
	}

	async function onDownloadAtt(i, label) {
		setDownloadErr('');
		try {
			const blob = await downloadVetEncounterAttachmentBlob(petId, encounterId, i);
			downloadBlob(blob, label || `adjunto-${i + 1}`);
		} catch (err) {
			setDownloadErr(err.response?.data?.message || 'No se pudo descargar.');
		}
	}

	const meds = Array.isArray(enc.medications) ? enc.medications : [];

	return (
		<div className={PAGE_CLS}>
			<Link className={BACK_LINK_CLS} to={`/proveedor/pacientes/${petId}/ficha`}>
				<ChevronLeft className="w-4 h-4" aria-hidden /> Tu historial con esta mascota
			</Link>

			<div className={cn(CARD_CLS, 'mb-4')}>
				<div className="flex items-start gap-4">
					<div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 shrink-0">
						<Calendar className="w-6 h-6 text-primary" aria-hidden />
					</div>
					<div className="flex-1 min-w-0">
						<p className="text-[0.7rem] font-bold uppercase tracking-widest text-primary/70 mb-1.5">
							Tu registro clínico
						</p>
						<time
							className="text-[clamp(1.1rem,2vw,1.35rem)] font-bold text-foreground block leading-tight"
							dateTime={enc.occurredAt}
						>
							{new Date(enc.occurredAt).toLocaleString('es-CL', { dateStyle: 'full', timeStyle: 'short' })}
						</time>
						<div className="mt-2">
							<span
								className={cn(
									'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold capitalize',
									encounterTypeColor(enc.type)
								)}
							>
								{enc.type}
							</span>
						</div>
					</div>
				</div>
			</div>

			<div className={cn(CARD_CLS, 'mb-4')}>
				<h2 className="text-sm font-bold text-foreground mb-4">Detalle</h2>
				<div className="flex flex-col gap-4">
					<DetailField label="Motivo" value={enc.motivo} />
					<DetailField label="Diagnóstico" value={enc.diagnostico} />
					<DetailField label="Tratamiento" value={enc.tratamiento} />
					<DetailField label="Observaciones" value={enc.observaciones} />
				</div>
			</div>

			{meds.length > 0 ? (
				<section className={cn(CARD_CLS, 'mb-4')} aria-labelledby="vet-med-heading">
					<div className="flex items-center gap-2 mb-4">
						<Pill className="w-4 h-4 text-primary" aria-hidden />
						<h2 id="vet-med-heading" className="text-sm font-bold text-foreground m-0">
							Medicación
						</h2>
					</div>
					<ul className="list-none p-0 m-0 flex flex-col gap-2" role="list">
						{meds.map((m, idx) => (
							<li key={idx} className="rounded-xl border border-border bg-background px-4 py-3">
								<p className="text-sm font-semibold text-foreground m-0">{m.name || m.nombre || '—'}</p>
								{(m.dose || m.dosis) ? (
									<p className="text-xs text-muted-foreground m-0 mt-0.5">{m.dose || m.dosis}</p>
								) : null}
							</li>
						))}
					</ul>
				</section>
			) : null}

			{enc.proximoControl?.fecha ? (
				<div className={cn(CARD_CLS, 'mb-4')}>
					<div className="flex items-center gap-2 mb-3">
						<Bell className="w-4 h-4 text-primary" aria-hidden />
						<h2 className="text-sm font-bold text-foreground m-0">Próximo control</h2>
					</div>
					<time className="text-sm font-medium text-foreground block" dateTime={enc.proximoControl.fecha}>
						{new Date(enc.proximoControl.fecha).toLocaleDateString('es-CL', { dateStyle: 'long' })}
					</time>
					{enc.proximoControl.motivo ? (
						<p className="text-sm text-muted-foreground m-0 mt-1">{enc.proximoControl.motivo}</p>
					) : null}
				</div>
			) : null}

			{Array.isArray(enc.attachments) && enc.attachments.length > 0 ? (
				<section className={cn(CARD_CLS, 'mb-4')} aria-labelledby="vet-att-heading">
					<div className="flex items-center gap-2 mb-4">
						<Paperclip className="w-4 h-4 text-primary" aria-hidden />
						<h2 id="vet-att-heading" className="text-sm font-bold text-foreground m-0">
							Adjuntos
						</h2>
					</div>
					<ul className="list-none p-0 m-0 flex flex-col gap-2" role="list">
						{enc.attachments.map((a, i) => (
							<li key={i}>
								<button
									type="button"
									className="flex items-center gap-3 w-full rounded-xl border border-border bg-background px-4 py-3 text-left hover:bg-muted transition-colors cursor-pointer group"
									onClick={() => onDownloadAtt(a.index != null ? a.index : i, a.name)}
								>
									<Paperclip className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-primary" aria-hidden />
									<span className="text-sm font-medium text-primary group-hover:underline truncate">
										{a.name || `Archivo ${i + 1}`}
									</span>
								</button>
							</li>
						))}
					</ul>
				</section>
			) : null}

			{downloadErr ? (
				<p className={ERROR_CLS} role="alert">
					{downloadErr}
				</p>
			) : null}
		</div>
	);
}
