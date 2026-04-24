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
		<div className="report-modal-backdrop" role="presentation" onClick={onClose}>
			<div
				className="report-modal"
				role="dialog"
				aria-modal="true"
				aria-labelledby="report-modal-title"
				onClick={(e) => e.stopPropagation()}
			>
				<h3 id="report-modal-title">Reportar reseña</h3>
				<p className="muted text-sm">Indica el motivo. Revisaremos el caso.</p>
				<form onSubmit={onSubmit} className="review-form">
					<label className="review-field">
						<span>Motivo</span>
						<select value={reason} onChange={(e) => setReason(e.target.value)}>
							{REPORT_REASON_OPTIONS.map((o) => (
								<option key={o.value} value={o.value}>
									{o.label}
								</option>
							))}
						</select>
					</label>
					{reason === 'otro' ? (
						<label className="review-field">
							<span>Detalle (obligatorio)</span>
							<textarea
								value={otherText}
								onChange={(e) => setOtherText(e.target.value)}
								rows={3}
								maxLength={300}
								placeholder="Describe el problema"
							/>
						</label>
					) : null}
					{error ? <p className="error review-msg">{error}</p> : null}
					<div className="report-modal-actions">
						<button type="button" className="btn-sm" onClick={onClose} disabled={submitting}>
							Cancelar
						</button>
						<button type="submit" className="review-submit" disabled={submitting}>
							{submitting ? 'Enviando…' : 'Enviar reporte'}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
