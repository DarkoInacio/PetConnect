import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { createSlotAppointment, fetchAvailableSlots } from '../services/appointments';
import { createLegacyCita } from '../services/citas';
import { fetchProviderPublicProfile, getProviderProfilePath } from '../services/providers';
import { listPets } from '../services/pets';
import { formatInChile, formatTimeInChile } from '../constants/chileTime';

function toYmdLocal(d) {
	const pad = (n) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function BookAppointmentPage() {
	const { user, loading: authLoading } = useAuth();
	const [searchParams] = useSearchParams();
	const providerId = searchParams.get('providerId');

	const [provider, setProvider] = useState(null);
	const [loadError, setLoadError] = useState('');
	const [dateYmd, setDateYmd] = useState(() => toYmdLocal(new Date()));
	const [slots, setSlots] = useState([]);
	const [slotsLoading, setSlotsLoading] = useState(false);
	const [selectedSlotId, setSelectedSlotId] = useState('');

	const [myPets, setMyPets] = useState([]);
	const [selectedPetId, setSelectedPetId] = useState('');
	const [petNombre, setPetNombre] = useState('');
	const [petEspecie, setPetEspecie] = useState('perro');
	const [servicio, setServicio] = useState('Consulta');
	const [notas, setNotas] = useState('');

	const [legacyFecha, setLegacyFecha] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [formError, setFormError] = useState('');
	const [formOk, setFormOk] = useState('');

	const defaultLegacyDatetime = useMemo(() => {
		const t = new Date();
		t.setDate(t.getDate() + 1);
		t.setHours(10, 0, 0, 0);
		const pad = (n) => String(n).padStart(2, '0');
		return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}T${pad(t.getHours())}:${pad(t.getMinutes())}`;
	}, []);

	useEffect(() => {
		setLegacyFecha((prev) => prev || defaultLegacyDatetime);
	}, [defaultLegacyDatetime]);

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
		if (!providerId || !user || user.role !== 'dueno') return;
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
		setSlotsLoading(true);
		try {
			const data = await fetchAvailableSlots(providerId, dateYmd);
			setSlots(Array.isArray(data.slots) ? data.slots : []);
			setSelectedSlotId('');
		} catch {
			setSlots([]);
		} finally {
			setSlotsLoading(false);
		}
	}, [providerId, dateYmd]);

	useEffect(() => {
		if (!providerId || provider?.providerType !== 'veterinaria') return;
		loadSlots();
	}, [providerId, provider?.providerType, dateYmd, loadSlots]);

	if (authLoading) {
		return (
			<div className='page'>
				<p>Cargando…</p>
			</div>
		);
	}

	if (!providerId) {
		return (
			<div className='page'>
				<Link className='back-link' to='/'>
					Volver
				</Link>
				<p className='error'>Falta providerId en la URL.</p>
			</div>
		);
	}

	if (!user) {
		return (
			<Navigate
				to='/login'
				replace
				state={{ from: `/agendar?providerId=${encodeURIComponent(providerId)}` }}
			/>
		);
	}

	if (user.role !== 'dueno') {
		return (
			<div className='page'>
				<Link className='back-link' to='/'>
					Volver
				</Link>
				<p className='error'>Solo los dueños pueden agendar citas veterinarias.</p>
			</div>
		);
	}

	const profileLink = provider ? getProviderProfilePath(provider) : null;

	async function onSubmitSlot(e) {
		e.preventDefault();
		setFormError('');
		setFormOk('');
		if (!selectedSlotId) {
			setFormError('Selecciona un horario disponible.');
			return;
		}
		if (!selectedPetId) {
			setFormError('Selecciona una mascota registrada (el backend exige petId para reservar un bloque).');
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
			setFormOk('Cita agendada. Revisa «Mis reservas».');
			await loadSlots();
		} catch (err) {
			setFormError(err.response?.data?.message || 'No se pudo reservar el horario.');
		} finally {
			setSubmitting(false);
		}
	}

	async function onSubmitLegacy(e) {
		e.preventDefault();
		setFormError('');
		setFormOk('');
		if (!petNombre.trim() || !petEspecie.trim()) {
			setFormError('Indica nombre y especie de la mascota (o elige una registrada).');
			return;
		}
		setSubmitting(true);
		try {
			await createLegacyCita({
				proveedorId: providerId,
				mascota: { nombre: petNombre.trim(), especie: petEspecie.trim() },
				servicio: servicio.trim(),
				fecha: new Date(legacyFecha).toISOString(),
				notas: notas.trim() || undefined
			});
			setFormOk('Solicitud de cita registrada. Revisa «Mis reservas».');
		} catch (err) {
			setFormError(err.response?.data?.message || 'No se pudo crear la cita.');
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
			<div className='page'>
				<Link className='back-link' to='/'>
					Volver
				</Link>
				<p className='error'>{loadError || 'Cargando…'}</p>
			</div>
		);
	}

	if (provider.providerType !== 'veterinaria') {
		return (
			<div className='page'>
				<Link className='back-link' to='/'>
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

	const hasSlots = slots.length > 0;

	return (
		<div className='page book-appt-page'>
			<Link className='back-link' to='/'>
				Volver al mapa
			</Link>
			<h1>Agendar cita</h1>
			<p>
				<strong>
					{provider.name} {provider.lastName}
				</strong>
				{profileLink ? (
					<>
						{' · '}
						<Link to={profileLink}>Ver perfil</Link>
					</>
				) : null}
			</p>

			<section className='edit-fieldset book-section'>
				<h2 className='book-section-title'>Datos de la mascota y servicio</h2>
				{myPets.length > 0 ? (
					<label className='edit-field'>
						<span>Mascota registrada</span>
						<select value={selectedPetId} onChange={(e) => onSelectRegisteredPet(e.target.value)} required>
							<option value=''>Selecciona…</option>
							{myPets.map((p) => (
								<option key={String(p._id)} value={String(p._id)}>
									{p.name} ({p.species})
								</option>
							))}
						</select>
					</label>
				) : (
					<p className='warn-banner'>
						No tienes mascotas activas registradas.{' '}
						<Link to='/mascotas/nueva'>Crea una ficha</Link> para poder reservar un bloque de agenda.
					</p>
				)}
				<label className='edit-field'>
					<span>Nombre mascota</span>
					<input value={petNombre} onChange={(e) => setPetNombre(e.target.value)} required />
				</label>
				<label className='edit-field'>
					<span>Especie (valor interno: perro, gato, etc.)</span>
					<input value={petEspecie} onChange={(e) => setPetEspecie(e.target.value)} required />
				</label>
				<label className='edit-field'>
					<span>Servicio / motivo</span>
					<input value={servicio} onChange={(e) => setServicio(e.target.value)} required />
				</label>
			</section>

			{hasSlots ? (
				<section className='edit-fieldset book-section'>
					<h2 className='book-section-title'>Horarios publicados por el profesional</h2>
					<label className='edit-field'>
						<span>Día</span>
						<input type='date' value={dateYmd} onChange={(e) => setDateYmd(e.target.value)} />
					</label>
					{slotsLoading ? <p>Cargando horarios…</p> : null}
					{!slotsLoading && slots.length === 0 ? (
						<p className='muted'>No hay bloques libres ese día. Prueba otra fecha o usa el formulario alternativo abajo.</p>
					) : null}
					{slots.length > 0 ? (
						<ul className='slot-list'>
							{slots.map((s) => (
								<li key={String(s._id)}>
									<label className='check-row'>
										<input
											type='radio'
											name='slot'
											value={String(s._id)}
											checked={selectedSlotId === String(s._id)}
											onChange={() => setSelectedSlotId(String(s._id))}
										/>
										<span>
											{formatInChile(s.startAt)} — {formatTimeInChile(s.endAt)}
										</span>
									</label>
								</li>
							))}
						</ul>
					) : null}
					<form onSubmit={onSubmitSlot}>
						<button
							type='submit'
							className='save-profile-btn'
							disabled={submitting || !selectedSlotId || myPets.length === 0 || !selectedPetId}
						>
							{submitting ? 'Reservando…' : 'Confirmar horario seleccionado'}
						</button>
					</form>
				</section>
			) : null}

			<section className='edit-fieldset book-section'>
				<h2 className='book-section-title'>
					{hasSlots ? 'Alternativa: cita por fecha (sin bloque de agenda)' : 'Pedir cita con fecha y hora'}
				</h2>
				<p className='hint muted'>
					Úsalo si el centro aún no publica bloques o no hay disponibilidad en la fecha elegida.
				</p>
				<form className='book-legacy-form' onSubmit={onSubmitLegacy}>
					<label className='edit-field'>
						<span>Fecha y hora</span>
						<input
							type='datetime-local'
							value={legacyFecha}
							onChange={(e) => setLegacyFecha(e.target.value)}
							required
						/>
					</label>
					<label className='edit-field'>
						<span>Notas (opcional)</span>
						<textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} />
					</label>
					<button type='submit' className='save-profile-btn' disabled={submitting}>
						{submitting ? 'Enviando…' : 'Enviar solicitud de cita'}
					</button>
				</form>
			</section>

			{formOk ? <p className='review-success'>{formOk}</p> : null}
			{formError ? <p className='error'>{formError}</p> : null}
		</div>
	);
}
