import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ChevronLeft, Calendar, User, Pill, Bell, Paperclip } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { downloadEncounterAttachmentBlob, getClinicalEncounterDetail } from '../services/pets';
import { cn } from '../lib/utils';

const PAGE_CLS = 'mx-auto w-full max-w-3xl px-4 sm:px-5 pt-6 pb-[max(2rem,env(safe-area-inset-bottom,0px))]';
const BACK_LINK_CLS = 'inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline min-h-11 mb-4';
const ERROR_CLS = 'rounded-xl border border-destructive/35 bg-destructive/10 px-3.5 py-3 text-sm text-destructive';
const CARD_CLS = 'rounded-2xl border border-border bg-card shadow-sm p-5 sm:p-6';

const ENCOUNTER_TYPE_COLORS = {
	consulta: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300',
	vacunacion: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
	cirugia: 'bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300',
	emergencia: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300',
	control: 'bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300',
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

export function PetEncounterDetailPage() {
	const { petId, encounterId } = useParams();
	const { user, loading: authLoading } = useAuth();
	const [enc, setEnc] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	useEffect(() => {
		if (authLoading || !user || !petId || !encounterId) return;
		const c = new AbortController();
		(async () => {
			try {
				setLoading(true);
				const data = await getClinicalEncounterDetail(petId, encounterId, c.signal);
				setEnc(data.encounter || null);
			} catch (err) {
				if (err.name === 'CanceledError' || err.name === 'AbortError') return;
				setError(err.response?.data?.message || 'No se pudo cargar la atención.');
			} finally {
				setLoading(false);
			}
		})();
		return () => c.abort();
	}, [authLoading, user, petId, encounterId]);

	if (authLoading || loading) {
		return (
			<div className={PAGE_CLS}>
				<div className={cn(CARD_CLS, 'animate-pulse')} role="status" aria-live="polite">
					<p className="text-muted-foreground m-0">Cargando atención…</p>
				</div>
			</div>
		);
	}

	if (!user) {
		return <Navigate to='/login' replace />;
	}

	if (!['dueno', 'proveedor'].includes(user.role)) {
		return (
			<div className={PAGE_CLS}>
				<p className={ERROR_CLS} role="alert">No autorizado.</p>
			</div>
		);
	}

	if (error || !enc) {
		return (
			<div className={PAGE_CLS}>
				<Link className={BACK_LINK_CLS} to={`/mascotas/${petId}/ficha`}>
					<ChevronLeft className="w-4 h-4" aria-hidden="true" /> Historial
				</Link>
				<p className={ERROR_CLS} role="alert">{error || 'No encontrada.'}</p>
			</div>
		);
	}

	const vet = enc.providerId;
	const vetName = vet ? `${vet.name || ''} ${vet.lastName || ''}`.trim() : '';

	async function onDownloadAtt(i, originalName) {
		try {
			const blob = await downloadEncounterAttachmentBlob(petId, encounterId, i);
			downloadBlob(blob, originalName || `adjunto-${i + 1}`);
		} catch (err) {
			setError(err.response?.data?.message || 'No se pudo descargar.');
		}
	}

	return (
		<div className={PAGE_CLS}>
			<Link className={BACK_LINK_CLS} to={`/mascotas/${petId}/ficha`}>
				<ChevronLeft className="w-4 h-4" aria-hidden="true" /> Historial clínico
			</Link>

			{/* Header de la atención */}
			<div className={cn(CARD_CLS, 'mb-4')}>
				<div className="flex items-start gap-4">
					<div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 shrink-0">
						<Calendar className="w-6 h-6 text-primary" aria-hidden="true" />
					</div>
					<div className="flex-1 min-w-0">
						<p className="text-[0.7rem] font-bold uppercase tracking-widest text-primary/70 mb-1.5">Atención clínica</p>
						<time
							className="text-[clamp(1.1rem,2vw,1.35rem)] font-bold text-foreground block leading-tight"
							dateTime={enc.occurredAt}
						>
							{new Date(enc.occurredAt).toLocaleString('es-CL', { dateStyle: 'full', timeStyle: 'short' })}
						</time>
						<div className="mt-2">
							<span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold capitalize', encounterTypeColor(enc.type))}>
								{enc.type}
							</span>
						</div>
					</div>
				</div>
			</div>

			{/* Detalles clínicos */}
			<div className={cn(CARD_CLS, 'mb-4')}>
				<h2 className="text-sm font-bold text-foreground mb-4">Detalles de la atención</h2>
				<div className="flex flex-col gap-4">
					<DetailField label="Motivo de consulta" value={enc.motivo} />
					<DetailField label="Diagnóstico" value={enc.diagnostico} />
					<DetailField label="Tratamiento" value={enc.tratamiento} />
					<DetailField label="Observaciones" value={enc.observaciones} />
				</div>
			</div>

			{/* Profesional */}
			{vetName && (
				<div className={cn(CARD_CLS, 'mb-4')}>
					<div className="flex items-center gap-3">
						<div className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted shrink-0">
							<User className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
						</div>
						<div>
							<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Profesional</p>
							<p className="text-sm font-medium text-foreground m-0">{vetName}</p>
						</div>
					</div>
				</div>
			)}

			{/* Medicación */}
			{Array.isArray(enc.medications) && enc.medications.length > 0 && (
				<section className={cn(CARD_CLS, 'mb-4')} aria-labelledby="medications-heading">
					<div className="flex items-center gap-2 mb-4">
						<Pill className="w-4 h-4 text-primary" aria-hidden="true" />
						<h2 id="medications-heading" className="text-sm font-bold text-foreground m-0">Medicación</h2>
					</div>
					<ul className="list-none p-0 m-0 flex flex-col gap-2" role="list">
						{enc.medications.map((m, idx) => (
							<li key={idx} className="flex items-start gap-3 rounded-xl border border-border bg-background px-4 py-3">
								<div className="flex-1 min-w-0">
									<p className="text-sm font-semibold text-foreground m-0">{m.nombre}</p>
									{(m.dosis || m.frecuencia) && (
										<p className="text-xs text-muted-foreground m-0 mt-0.5">
											{[m.dosis, m.frecuencia].filter(Boolean).join(' · ')}
										</p>
									)}
								</div>
							</li>
						))}
					</ul>
				</section>
			)}

			{/* Próximo control */}
			{enc.proximoControl?.fecha && (
				<div className={cn(CARD_CLS, 'mb-4')}>
					<div className="flex items-center gap-2 mb-3">
						<Bell className="w-4 h-4 text-primary" aria-hidden="true" />
						<h2 className="text-sm font-bold text-foreground m-0">Próximo control</h2>
					</div>
					<div className="flex flex-col gap-0.5">
						<time className="text-sm font-medium text-foreground" dateTime={enc.proximoControl.fecha}>
							{new Date(enc.proximoControl.fecha).toLocaleDateString('es-CL', { dateStyle: 'long' })}
						</time>
						{enc.proximoControl.motivo && (
							<p className="text-sm text-muted-foreground m-0">{enc.proximoControl.motivo}</p>
						)}
					</div>
				</div>
			)}

			{/* Adjuntos */}
			{Array.isArray(enc.attachments) && enc.attachments.length > 0 && (
				<section className={cn(CARD_CLS, 'mb-4')} aria-labelledby="attachments-heading">
					<div className="flex items-center gap-2 mb-4">
						<Paperclip className="w-4 h-4 text-primary" aria-hidden="true" />
						<h2 id="attachments-heading" className="text-sm font-bold text-foreground m-0">Archivos adjuntos</h2>
					</div>
					<ul className="list-none p-0 m-0 flex flex-col gap-2" role="list">
						{enc.attachments.map((a, i) => (
							<li key={i}>
								<button
									type='button'
									className="flex items-center gap-3 w-full rounded-xl border border-border bg-background px-4 py-3 text-left hover:bg-muted transition-colors cursor-pointer group"
									onClick={() => onDownloadAtt(i, a.originalName)}
								>
									<Paperclip className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" aria-hidden="true" />
									<span className="text-sm font-medium text-primary group-hover:underline truncate">
										{a.originalName || `Archivo ${i + 1}`}
									</span>
								</button>
							</li>
						))}
					</ul>
				</section>
			)}

			{/* Comentarios posteriores */}
			{Array.isArray(enc.retractionComments) && enc.retractionComments.length > 0 && (
				<section className={CARD_CLS} aria-labelledby="comments-heading">
					<h2 id="comments-heading" className="text-sm font-bold text-foreground mb-4">Comentarios posteriores</h2>
					<ul className="list-none p-0 m-0 flex flex-col gap-3" role="list">
						{enc.retractionComments.map((r, idx) => (
							<li key={idx} className="rounded-xl border border-border bg-background px-4 py-3">
								<p className="text-xs font-semibold text-muted-foreground mb-1">{r.signerName || 'Profesional'}</p>
								<p className="text-sm text-foreground m-0">{r.text}</p>
							</li>
						))}
					</ul>
				</section>
			)}

			{error && (
				<p className={cn(ERROR_CLS, 'mt-4')} role="alert" aria-live="assertive">{error}</p>
			)}
		</div>
	);
}
