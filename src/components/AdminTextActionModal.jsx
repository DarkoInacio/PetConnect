/**
 * Modal para acciones de administración con texto (rechazo obligatorio, suspensión opcional).
 */
export function AdminTextActionModal({
	open,
	title,
	description,
	textareaLabel,
	placeholder,
	required,
	maxLength = 2000,
	confirmLabel,
	cancelLabel = 'Cancelar',
	submitting,
	errorText,
	value,
	onChange,
	onClose,
	onSubmit
}) {
	if (!open) return null;

	return (
		<div
			className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4"
			role="presentation"
			onClick={onClose}
		>
			<div
				className="bg-card rounded-2xl border border-border shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
				role="dialog"
				aria-modal="true"
				aria-labelledby="admin-modal-title"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="p-5 sm:p-6 flex flex-col gap-3">
					<h3 id="admin-modal-title" className="text-lg font-bold text-foreground m-0">
						{title}
					</h3>
					{description ? <p className="text-sm text-muted-foreground m-0">{description}</p> : null}
					<label className="flex flex-col gap-1.5 text-sm">
						<span className="font-semibold text-foreground">{textareaLabel}</span>
						<textarea
							className="w-full min-h-[7rem] rounded-xl border border-input bg-background px-3 py-2.5 text-sm font-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							placeholder={placeholder}
							value={value}
							maxLength={maxLength}
							onChange={(e) => onChange(e.target.value)}
							aria-required={required}
						/>
						<span className="text-xs text-muted-foreground text-right tabular-nums">
							{value.length}/{maxLength}
						</span>
					</label>
					{errorText ? (
						<p className="rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive m-0">
							{errorText}
						</p>
					) : null}
					<div className="flex flex-wrap gap-2 justify-end pt-1">
						<button
							type="button"
							className="h-10 px-4 rounded-xl border border-border bg-background text-sm font-semibold hover:bg-muted/60 cursor-pointer"
							onClick={onClose}
							disabled={submitting}
						>
							{cancelLabel}
						</button>
						<button
							type="button"
							className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 disabled:opacity-60 cursor-pointer border-0"
							onClick={onSubmit}
							disabled={submitting}
						>
							{submitting ? 'Procesando…' : confirmLabel}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
