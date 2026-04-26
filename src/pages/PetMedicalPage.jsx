import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ChevronLeft, Stethoscope, FileDown, Calendar, ChevronRight, ClipboardList } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { downloadMedicalPdfBlob, getMedicalSummary, listClinicalEncounters } from '../services/pets';
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

function buildMedicalPdfFileName(petName) {
	const d = new Date();
	const yy = String(d.getFullYear()).slice(-2);
	const mm = String(d.getMonth() + 1).padStart(2, '0');
	const dd = String(d.getDate()).padStart(2, '0');
	const base = (petName || 'mascota')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-zA-Z0-9]+/g, '-')
		.replace(/--+/g, '-')
		.replace(/^-|-$/g, '') || 'mascota';
	return `${base}-${yy}${mm}${dd}.pdf`;
}

export function PetMedicalPage() {
	const { petId } = useParams();
	const { user, loading: authLoading } = useAuth();
	const [summary, setSummary] = useState(null);
	const [encounters, setEncounters] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [pdfLoading, setPdfLoading] = useState(false);

	useEffect(() => {
		if (authLoading || !user || user.role !== 'dueno' || !petId) return;
		const c = new AbortController();
		(async () => {
			try {
				setLoading(true);
				const [s, e] = await Promise.all([
					getMedicalSummary(petId, c.signal),
					listClinicalEncounters(petId, {}, c.signal)
				]);
				setSummary(s);
				setEncounters(Array.isArray(e.encounters) ? e.encounters : []);
			} catch (err) {
				if (err.name === 'CanceledError' || err.name === 'AbortError') return;
				setError(err.response?.data?.message || 'No se pudo cargar el historial.');
			} finally {
				setLoading(false);
			}
		})();
		return () => c.abort();
	}, [authLoading, user, petId]);

	if (authLoading || loading) {
		return (
			<div className={PAGE_CLS}>
				<div className={cn(CARD_CLS, 'animate-pulse')} role="status" aria-live="polite">
					<p className="text-muted-foreground m-0">Cargando historial…</p>
				</div>
			</div>
		);
	}

	if (!user) {
		return <Navigate to='/login' replace state={{ from: `/mascotas/${petId}/ficha` }} />;
	}

	if (user.role !== 'dueno') {
		return (
			<div className={PAGE_CLS}>
				<Link className={BACK_LINK_CLS} to='/'>
					<ChevronLeft className="w-4 h-4" aria-hidden="true" /> Inicio
				</Link>
				<p className={ERROR_CLS} role="alert">Solo dueños.</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className={PAGE_CLS}>
				<Link className={BACK_LINK_CLS} to={`/mascotas/${petId}`}>
					<ChevronLeft className="w-4 h-4" aria-hidden="true" /> Ficha de la mascota
				</Link>
				<p className={ERROR_CLS} role="alert">{error}</p>
			</div>
		);
	}

	const p = summary?.pet;

	async function onExportPdf() {
		setPdfLoading(true);
		try {
			const blob = await downloadMedicalPdfBlob(petId);
			downloadBlob(blob, buildMedicalPdfFileName(p?.name));
		} catch (err) {
			setError(err.response?.data?.message || 'No se pudo generar el PDF.');
		} finally {
			setPdfLoading(false);
		}
	}

	return (
		<div className={PAGE_CLS}>
			<Link className={BACK_LINK_CLS} to={`/mascotas/${petId}`}>
				<ChevronLeft className="w-4 h-4" aria-hidden="true" /> Ficha de la mascota
			</Link>

			{/* Header */}
			<header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
				<div className="min-w-0">
					<p className="text-[0.7rem] font-bold uppercase tracking-widest text-primary/70 mb-1.5">Historial clínico</p>
					<h1 className="text-[clamp(1.4rem,2.5vw,2rem)] font-bold tracking-tight text-foreground leading-tight">
						{p ? p.name : 'Mascota'}
					</h1>
					{p && (
						<p className="text-sm text-muted-foreground mt-1 mb-0 capitalize">
							{p.species} · {p.status === 'deceased' ? 'fallecida' : 'activa'}
						</p>
					)}
				</div>
				<button
					type='button'
					className="inline-flex items-center justify-center gap-2 self-start h-11 rounded-xl border border-border bg-background px-5 text-sm font-bold text-foreground hover:bg-muted transition-colors disabled:opacity-65 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
					disabled={pdfLoading}
					onClick={onExportPdf}
				>
					<FileDown className="w-4 h-4" aria-hidden="true" />
					{pdfLoading ? 'Generando…' : 'Descargar PDF'}
				</button>
			</header>

			{/* Resumen estadístico */}
			{summary?.summary && (
				<div className={cn(CARD_CLS, 'mb-4')}>
					<div className="flex items-center gap-2 mb-4">
						<Stethoscope className="w-4 h-4 text-primary" aria-hidden="true" />
						<h2 className="text-sm font-bold text-foreground m-0">Resumen</h2>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div className="flex flex-col gap-0.5">
							<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Atenciones</span>
							<span className="text-2xl font-bold text-foreground">{summary.summary.totalEncounters ?? 0}</span>
						</div>
						{summary.summary.lastVisitAt && (
							<div className="flex flex-col gap-0.5">
								<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Última visita</span>
								<span className="text-sm font-medium text-foreground">
									{new Date(summary.summary.lastVisitAt).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })}
								</span>
							</div>
						)}
					</div>
				</div>
			)}

			{/* Lista de atenciones */}
			<section aria-labelledby="encounters-heading">
				<div className="flex items-center gap-2 mb-3">
					<ClipboardList className="w-4 h-4 text-primary" aria-hidden="true" />
					<h2 id="encounters-heading" className="text-sm font-bold text-foreground m-0">Atenciones registradas</h2>
				</div>

				{encounters.length === 0 ? (
					<div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 p-12 text-center">
						<Stethoscope className="w-10 h-10 text-muted-foreground/50" aria-hidden="true" />
						<div>
							<p className="font-semibold text-foreground mb-1">Sin atenciones registradas</p>
							<p className="text-sm text-muted-foreground m-0">Las atenciones clínicas aparecerán aquí cuando un veterinario las registre.</p>
						</div>
					</div>
				) : (
					<ul className="list-none p-0 m-0 flex flex-col gap-3" role="list">
						{encounters.map((row) => (
							<li key={String(row.id)} className="m-0 p-0">
								<Link
									to={`/mascotas/${petId}/atencion/${row.id}`}
									className="flex items-center gap-4 rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-all p-4 no-underline group"
									aria-label={`Ver atencion del ${new Date(row.occurredAt).toLocaleDateString('es-CL')}`}
								>
									<div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 shrink-0">
										<Calendar className="w-5 h-5 text-primary" aria-hidden="true" />
									</div>
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2 mb-0.5 flex-wrap">
											<span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold capitalize', encounterTypeColor(row.type))}>
												{row.type}
											</span>
											<time className="text-xs text-muted-foreground" dateTime={row.occurredAt}>
												{new Date(row.occurredAt).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })}
											</time>
										</div>
										{row.motivo && (
											<p className="text-sm text-foreground m-0 truncate">
												{row.motivo.slice(0, 100)}{row.motivo.length > 100 ? '…' : ''}
											</p>
										)}
										{row.veterinaria && (
											<p className="text-xs text-muted-foreground m-0">{row.veterinaria}</p>
										)}
									</div>
									<ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" aria-hidden="true" />
								</Link>
							</li>
						))}
					</ul>
				)}
			</section>
		</div>
	);
}
