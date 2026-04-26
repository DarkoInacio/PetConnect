import { useState } from 'react';
import { REPORT_REASON_OPTIONS, reportReview } from '../services/reviews';

/**
 * @param {{ open: boolean, reviewId: string | null, onClose: () => void, onDone?: (msg: string) => void }} props
 */
export function ReviewReportModal({ open, reviewId, onClose, onDone }) {
	const [reason, setReason] = useState('lenguaje_ofensivo');
	const [otherText, setOtherText] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState('');

	if (!open) return null;

	async function onSubmit(e) {
		e.preventDefault();
		if (!reviewId) return;
		setSubmitting(true);
		setError('');
		try {
			const res = await reportReview(reviewId, {
				reason,
				otherText: reason === 'otro' ? otherText : undefined
			});
			const msg = res.message || 'Reporte enviado.';
			onDone?.(msg);
			setOtherText('');
			onClose();
		} catch (err) {
			setError(err.response?.data?.message || 'No se pudo enviar el reporte.');
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div
			className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
			role="presentation"
			onClick={onClose}
		>
			<div
				className="bg-card rounded-xl p-6 max-w-md w-full mx-4 shadow-xl"
				role="dialog"
				aria-modal="true"
				aria-labelledby="report-modal-title"
				onClick={(e) => e.stopPropagation()}
			>
				<h3 id="report-modal-title" className="text-lg font-bold text-foreground mb-1">
					Reportar reseña
				</h3>
				<p className="text-muted-foreground text-sm mb-3">Indica el motivo. Revisaremos el caso.</p>
				<form onSubmit={onSubmit} className="flex flex-col gap-3">
					<label className="flex flex-col gap-1.5 text-sm">
						<span>Motivo</span>
						<select
							className="h-10 w-full rounded-xl border border-input bg-background px-3 py-2.5 font-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							value={reason}
							onChange={(e) => setReason(e.target.value)}
						>
							{REPORT_REASON_OPTIONS.map((o) => (
								<option key={o.value} value={o.value}>
									{o.label}
								</option>
							))}
						</select>
					</label>
					{reason === 'otro' ? (
						<label className="flex flex-col gap-1.5 text-sm">
							<span>Detalle (obligatorio)</span>
							<textarea
								className="w-full rounded-xl border border-input bg-background px-3 py-2.5 font-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								value={otherText}
								onChange={(e) => setOtherText(e.target.value)}
								rows={3}
								maxLength={300}
								placeholder="Describe el problema"
							/>
						</label>
					) : null}
					{error ? (
						<p className="rounded-xl border border-destructive/35 bg-destructive/10 px-3.5 py-3 text-sm text-destructive">
							{error}
						</p>
					) : null}
					<div className="flex gap-2 justify-end mt-2">
						<button
							type="button"
							className="px-2.5 py-1 text-[0.82rem] rounded-lg border border-border bg-white dark:bg-card cursor-pointer font-semibold disabled:opacity-60"
							onClick={onClose}
							disabled={submitting}
						>
							Cancelar
						</button>
						<button
							type="submit"
							className="rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground cursor-pointer hover:bg-primary/90 disabled:opacity-65 disabled:cursor-not-allowed border-0"
							disabled={submitting}
						>
							{submitting ? 'Enviando…' : 'Enviar reporte'}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
