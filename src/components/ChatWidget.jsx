import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { resetChatSession, sendChatMessage } from '../services/chat';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';

const MAX_INPUT_LENGTH = 800;

const DISCLAIMER_TEXT = 'Esta orientación es informativa. Consulta a un veterinario.';

const FIDU_INTRO = `Hola, soy Vetto, estoy aquí para acompañarte mientras cuidas a tu compañero.
Puedes contarme con calma lo que te pasa, sin buscar un guion: como te salga, aunque sea a medias.
Cuando quieras, dime qué mascota es, qué notas y, si hace sentido, desde hace cuánto.`;

function plainChatText(text) {
	return String(text).replace(/\*\*/g, '');
}

function stripLegalDisclaimerFromBody(text) {
	if (!text) return '';
	let s = String(text);
	if (s.includes(DISCLAIMER_TEXT)) {
		s = s.split(DISCLAIMER_TEXT).join('');
	}
	return plainChatText(s.replace(/\n{3,}/g, '\n\n').trim());
}

function normalizeHistoryForApi(messages) {
	const src = Array.isArray(messages) ? messages : [];
	return src
		.map((m) => ({
			role: m?.role === 'user' ? 'user' : 'assistant',
			content: String(m?.content ?? '').slice(0, 1200)
		}))
		.filter((m) => m.content.trim() !== '');
}

function normalizeUrgency(u) {
	if (u === 'rojo' || u === 'amarillo' || u === 'verde') return u;
	return 'verde';
}

const URGENCY_STYLES = {
	rojo: 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
	amarillo: 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
	verde: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
};

export function ChatWidget() {
	const navigate = useNavigate();
	const { user } = useAuth();

	const [open, setOpen] = useState(false);
	const [input, setInput] = useState('');
	const [loading, setLoading] = useState(false);
	const [urgencyLevel, setUrgencyLevel] = useState('verde');
	const [actions, setActions] = useState([]);

	const [messages, setMessages] = useState(() => [{ role: 'assistant', content: FIDU_INTRO }]);

	const bodyRef = useRef(null);
	const textareaRef = useRef(null);

	const charsLeft = MAX_INPUT_LENGTH - input.length;

	const urgencyLabel = useMemo(() => {
		if (urgencyLevel === 'rojo') return 'Indicador: rojo — prioriza atención veterinaria pronto.';
		if (urgencyLevel === 'amarillo') return 'Indicador: amarillo — conviene valorar cita o seguimiento.';
		return 'Indicador: verde — situación leve; igual, si dudas, pregunta a tu veterinario.';
	}, [urgencyLevel]);

	useEffect(() => {
		if (!open) return;
		const el = bodyRef.current;
		if (!el) return;
		el.scrollTop = el.scrollHeight;
	}, [open, messages, loading]);

	useEffect(() => {
		if (open && textareaRef.current) {
			textareaRef.current.focus();
		}
	}, [open]);

	// Limpieza automática al cerrar sesión (requisito HU-25).
	useEffect(() => {
		if (user) return;
		setMessages([{ role: 'assistant', content: FIDU_INTRO }]);
		setUrgencyLevel('verde');
		setActions([]);
		setInput('');
		setLoading(false);
	}, [user]);

	useEffect(() => {
		const el = textareaRef.current;
		if (!el) return;
		el.style.height = 'auto';
		el.style.height = Math.min(el.scrollHeight, 120) + 'px';
	}, [input]);

	async function handleSend() {
		const text = input.trim();
		if (!text || loading) return;

		const nextUser = { role: 'user', content: text };
		const history = normalizeHistoryForApi(messages);
		setMessages((prev) => [...prev, nextUser]);
		setInput('');
		setLoading(true);

		try {
			const resp = await sendChatMessage({
				message: text,
				history
			});

			setUrgencyLevel(normalizeUrgency(resp?.urgencyLevel));
			setActions(Array.isArray(resp?.actions) ? resp.actions : []);

			const raw = resp?.message || 'No pude generar una respuesta. Intenta nuevamente.';
			const content = stripLegalDisclaimerFromBody(raw);
			setMessages((prev) => [...prev, { role: 'assistant', content }]);
		} catch {
			setMessages((prev) => [
				...prev,
				{
					role: 'assistant',
					content: 'Ahora no pude conectarme al chat. Reintenta en un momento.'
				}
			]);
		} finally {
			setLoading(false);
		}
	}

	function handleKeyDown(e) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	}

	function closeAndForget() {
		setMessages([{ role: 'assistant', content: FIDU_INTRO }]);
		setUrgencyLevel('verde');
		setActions([]);
		setOpen(false);
	}

	async function startNewChat() {
		setLoading(true);
		try {
			const resp = await resetChatSession({ history: normalizeHistoryForApi(messages) });
			const rawWelcome = resp?.message || FIDU_INTRO;
			setMessages([{ role: 'assistant', content: stripLegalDisclaimerFromBody(rawWelcome) }]);
			setUrgencyLevel('verde');
			setActions(Array.isArray(resp?.actions) ? resp.actions : []);
		} catch {
			setMessages([{ role: 'assistant', content: FIDU_INTRO }]);
		} finally {
			setLoading(false);
		}
	}

	function runAction(action) {
		if (!action) return;
		if (action.type === 'link' && action.href) {
			navigate(action.href);
			setOpen(false);
			return;
		}
	}

	return (
		<>
			{open ? (
				<section
					className="fixed right-[18px] bottom-[86px] z-[9999] flex w-[min(380px,calc(100vw-36px))] h-[min(520px,calc(100vh-140px))] flex-col overflow-hidden rounded-2xl border border-black/8 bg-white shadow-[0_18px_48px_rgba(0,0,0,0.22)] dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_18px_48px_rgba(0,0,0,0.6)]"
					role="dialog"
					aria-label="Chat con Vetto — orientación veterinaria"
				>
					{/* Header */}
					<header className="flex items-center justify-between gap-3 bg-slate-900 px-3.5 py-3 text-white dark:bg-slate-950">
						<div className="grid gap-0.5">
							<strong className="text-sm leading-tight">Vetto</strong>
							<span className="text-xs opacity-85">
								Orientación para tu mascota{user ? ' · Conectado' : ''}
							</span>
						</div>
						<div className="flex flex-wrap items-center justify-end gap-1.5">
							<button
								className="cursor-pointer rounded-[10px] border-none bg-white/12 px-2.5 py-1.5 text-xs text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60 hover:bg-white/20"
								onClick={startNewChat}
								type="button"
								disabled={loading}
							>
								Nueva charla
							</button>
							<button
								className="cursor-pointer rounded-[10px] border-none bg-white/12 px-2.5 py-1.5 text-xs text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60 hover:bg-white/20"
								onClick={closeAndForget}
								type="button"
								title="Cierra y borra esta conversación en este dispositivo"
							>
								Cerrar
							</button>
						</div>
					</header>

					{/* Urgency indicator */}
					<div
						className={cn(
							'border-b border-black/6 px-3.5 py-2.5 text-[13px] dark:border-white/8',
							URGENCY_STYLES[urgencyLevel]
						)}
						role="status"
					>
						{urgencyLabel}
						{!user ? (
							<div className="mt-1.5 opacity-90">
								¿Quieres guardar tu historial?{' '}
								<button
									type="button"
									className="inline-flex cursor-pointer items-center rounded-full border-none bg-blue-600 px-2.5 py-1 text-xs text-white transition-colors hover:bg-blue-700"
									onClick={() => {
										navigate('/registro');
										setOpen(false);
									}}
								>
									Registrarse
								</button>
							</div>
						) : null}
					</div>

					{/* Messages body */}
					<div
						className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain scroll-smooth bg-slate-50 p-3 dark:bg-slate-800/50"
						ref={bodyRef}
					>
						{messages.map((m, idx) => {
							const isUser = m.role === 'user';
							return (
								<div
									key={idx}
									className={cn('mb-2.5 flex max-w-full items-end gap-2', isUser ? 'justify-end' : 'justify-start')}
								>
									{!isUser ? (
										<img
											src="/chatbot-avatar.png"
											alt="Vetto"
											title="Vetto"
											className="h-10 w-10 shrink-0 rounded-full border border-black/10 bg-white object-cover shadow-sm dark:border-white/12"
											loading="lazy"
											decoding="async"
										/>
									) : null}
									<div
										className={cn(
											'max-w-[88%] rounded-2xl px-3 py-2.5 text-[13px] leading-snug whitespace-pre-wrap',
											isUser
												? 'rounded-tr-[6px] bg-slate-900 text-white dark:bg-slate-700'
												: 'rounded-tl-[6px] border border-black/6 bg-white text-slate-900 dark:border-white/8 dark:bg-slate-800 dark:text-slate-100'
										)}
									>
										{m.role === 'assistant' ? stripLegalDisclaimerFromBody(m.content) : m.content}
									</div>
								</div>
							);
						})}
						{loading ? (
							<div
								className="mr-auto mb-2.5 max-w-[88%] rounded-2xl rounded-tl-[6px] border border-black/6 bg-white px-3 py-2.5 text-[13px] text-slate-500 dark:border-white/8 dark:bg-slate-800 dark:text-slate-400"
								aria-live="polite"
							>
								...
							</div>
						) : null}
					</div>

					{/* Suggested actions */}
					{actions?.length ? (
						<div
							className="flex flex-wrap gap-2 border-t border-black/6 bg-white px-3 py-2.5 dark:border-white/8 dark:bg-slate-900"
							aria-label="Acciones sugeridas"
						>
							{actions.map((a) => (
								<button
									key={a.id}
									type="button"
									className={cn(
										'cursor-pointer rounded-full px-2.5 py-2 text-xs transition-colors',
										a.id === 'buscar_urgencia'
											? 'border-none bg-blue-600 text-white hover:bg-blue-700'
											: 'border border-black/14 bg-white text-slate-900 hover:bg-slate-50 dark:border-white/12 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700'
									)}
									onClick={() => runAction(a)}
								>
									{a.label}
								</button>
							))}
						</div>
					) : null}

					{/* Legal disclaimer */}
					<p
						className="m-0 border-t border-black/5 bg-slate-50 px-3 py-1.5 text-[10px] leading-snug text-slate-400 dark:border-white/5 dark:bg-slate-800/50 dark:text-slate-500"
						role="note"
					>
						{DISCLAIMER_TEXT}
					</p>

					{/* Input form */}
					<form
						className="flex items-end gap-2 border-t border-black/6 bg-white px-3 py-2.5 dark:border-white/8 dark:bg-slate-900"
						onSubmit={(e) => {
							e.preventDefault();
							handleSend();
						}}
					>
						<div className="flex min-w-0 flex-1 flex-col">
							<textarea
								ref={textareaRef}
								value={input}
								onChange={(e) => setInput(e.target.value)}
								onKeyDown={handleKeyDown}
								placeholder="Escribe lo que te pasa… (Enter para enviar, Shift+Enter para nueva línea)"
								disabled={loading}
								maxLength={MAX_INPUT_LENGTH}
								aria-label="Mensaje para Vetto"
								className="box-border min-h-[42px] max-h-[120px] w-full resize-none overflow-y-auto overscroll-contain rounded-xl border border-black/14 bg-transparent px-3 py-2.5 font-[inherit] text-[13px] leading-relaxed text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40 dark:border-white/12 dark:text-slate-100 dark:placeholder:text-slate-500"
							/>
							{input.length > MAX_INPUT_LENGTH * 0.8 ? (
								<span
									className={cn(
										'pt-0.5 pr-1 text-right text-[10px] leading-none',
										charsLeft < 50 ? 'text-red-500' : 'text-slate-400'
									)}
								>
									{charsLeft}
								</span>
							) : null}
						</div>
						<button
							className="min-w-[72px] flex-shrink-0 self-end cursor-pointer rounded-xl border-none bg-slate-900 px-3 py-2.5 text-[13px] whitespace-nowrap text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600"
							type="submit"
							disabled={loading || !input.trim()}
						>
							{loading ? 'Enviando…' : 'Enviar'}
						</button>
					</form>
				</section>
			) : null}

			{/* FAB button */}
			<button
				type="button"
				aria-label={open ? 'Cerrar chat' : 'Abrir chat con Vetto'}
				onClick={() => setOpen((v) => !v)}
				className="fixed right-[18px] bottom-[18px] z-[9999] grid h-14 w-14 cursor-pointer place-items-center overflow-hidden rounded-full border-none bg-slate-900 text-white shadow-[0_12px_28px_rgba(0,0,0,0.25)] transition-transform hover:scale-105 hover:shadow-[0_16px_36px_rgba(0,0,0,0.3)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-400/70 focus-visible:ring-offset-2 dark:bg-slate-700 dark:hover:bg-slate-600"
			>
				{open ? (
					<span className="text-2xl leading-none" aria-hidden>
						×
					</span>
				) : (
					<img
						src="/chat-fab-icon.png"
						alt=""
						aria-hidden
						className="h-full w-full object-cover"
						loading="lazy"
						decoding="async"
					/>
				)}
			</button>
		</>
	);
}
