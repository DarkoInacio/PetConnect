import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { WEEK_DAYS, WEEK_DAY_LABELS } from '../constants/providerWeek';
import { getProviderProfilePath, updateMyProviderProfile } from '../services/providers';

function emptyWeekly() {
	return Object.fromEntries(
		WEEK_DAYS.map((d) => [d, { enabled: false, start: '09:00', end: '18:00' }])
	);
}

function weeklyFromApi(raw) {
	const out = emptyWeekly();
	if (!Array.isArray(raw)) return out;
	for (const row of raw) {
		if (!row || !WEEK_DAYS.includes(row.day)) continue;
		const r0 = Array.isArray(row.ranges) ? row.ranges[0] : null;
		out[row.day] = {
			enabled: row.enabled !== false,
			start: r0?.start || '09:00',
			end: r0?.end || '18:00'
		};
	}
	return out;
}

function userToForm(user) {
	const pp = user?.providerProfile || {};
	const addr = pp.address || {};
	const wt = pp.walkerTariffs || {};
	const sm = pp.socialMedia || {};
	return {
		phone: user?.phone || '',
		description: pp.description || '',
		schedule: pp.schedule || '',
		services: Array.isArray(pp.services) ? pp.services.join('\n') : '',
		publicSlug: pp.publicSlug || '',
		isPublished: pp.isPublished !== false,
		operationalStatus: pp.operationalStatus || 'abierto',
		addressStreet: addr.street || '',
		addressCommune: addr.commune || '',
		addressCity: addr.city || '',
		addressLat: addr.coordinates?.lat != null ? String(addr.coordinates.lat) : '',
		addressLng: addr.coordinates?.lng != null ? String(addr.coordinates.lng) : '',
		socialInstagram: sm.instagram || '',
		socialFacebook: sm.facebook || '',
		socialTwitter: sm.twitter || '',
		socialWebsite: sm.website || '',
		serviceCommunes: Array.isArray(pp.serviceCommunes) ? pp.serviceCommunes.join(', ') : '',
		petTypes: Array.isArray(pp.petTypes) ? pp.petTypes.join(', ') : '',
		experienceYears: pp.experienceYears != null ? String(pp.experienceYears) : '',
		petsAttended: pp.petsAttended || '',
		weeklyAvailability: weeklyFromApi(pp.weeklyAvailability),
		walk30min: wt.walk30min != null ? String(wt.walk30min) : '',
		walk60min: wt.walk60min != null ? String(wt.walk60min) : '',
		dayCare: wt.dayCare != null ? String(wt.dayCare) : '',
		overnight: wt.overnight != null ? String(wt.overnight) : '',
		walkerCurrency: wt.currency || 'CLP',
		refAmount: pp.referenceRate?.amount != null ? String(pp.referenceRate.amount) : '',
		refUnit: pp.referenceRate?.unit || '',
		refCurrency: pp.referenceRate?.currency || 'CLP'
	};
}

export function ProviderMiPerfilPage() {
	const { user, loading, refreshUser } = useAuth();
	const [form, setForm] = useState(null);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState('');
	const [error, setError] = useState('');

	useEffect(() => {
		if (user?.role === 'proveedor') {
			setForm(userToForm(user));
		}
	}, [user]);

	if (!loading && (!user || user.role !== 'proveedor')) {
		return <Navigate to='/login' replace state={{ from: '/proveedor/mi-perfil' }} />;
	}

	if (loading || !form) {
		return (
			<div className='page'>
				<p>Cargando perfil…</p>
			</div>
		);
	}

	const isWalker = user.providerType === 'paseador' || user.providerType === 'cuidador';

	function setField(key, value) {
		setForm((f) => ({ ...f, [key]: value }));
	}

	function setWeeklyDay(day, patch) {
		setForm((f) => ({
			...f,
			weeklyAvailability: {
				...f.weeklyAvailability,
				[day]: { ...f.weeklyAvailability[day], ...patch }
			}
		}));
	}

	async function onSubmit(e) {
		e.preventDefault();
		setError('');
		setMessage('');
		setSaving(true);
		try {
			const body = {
				phone: form.phone.trim(),
				description: form.description.trim(),
				schedule: form.schedule.trim(),
				services: form.services
					.split(/[\n,]+/)
					.map((s) => s.trim())
					.filter(Boolean),
				publicSlug: form.publicSlug.trim() ? form.publicSlug.trim() : null,
				isPublished: Boolean(form.isPublished),
				operationalStatus: form.operationalStatus,
				address: {
					street: form.addressStreet.trim(),
					commune: form.addressCommune.trim(),
					city: form.addressCity.trim()
				},
				socialMedia: {
					instagram: form.socialInstagram.trim(),
					facebook: form.socialFacebook.trim(),
					twitter: form.socialTwitter.trim(),
					website: form.socialWebsite.trim()
				}
			};

			const lat = form.addressLat.trim();
			const lng = form.addressLng.trim();
			if (lat !== '' && lng !== '') {
				body.address.coordinates = { lat: Number(lat), lng: Number(lng) };
			}

			if (isWalker) {
				body.serviceCommunes = form.serviceCommunes
					.split(',')
					.map((s) => s.trim())
					.filter(Boolean);
				body.petTypes = form.petTypes
					.split(',')
					.map((s) => s.trim())
					.filter(Boolean);
				if (form.experienceYears.trim() !== '') {
					body.experienceYears = Number(form.experienceYears);
				}
				if (form.petsAttended.trim()) {
					body.petsAttended = form.petsAttended.trim();
				}
				body.weeklyAvailability = WEEK_DAYS.map((day) => {
					const row = form.weeklyAvailability[day];
					const enabled = Boolean(row?.enabled);
					const ranges =
						enabled && row.start && row.end
							? [{ start: row.start.trim(), end: row.end.trim() }]
							: [];
					return { day, enabled, ranges };
				});

				const wt = {};
				if (form.walk30min.trim() !== '') wt.walk30min = Number(form.walk30min);
				if (form.walk60min.trim() !== '') wt.walk60min = Number(form.walk60min);
				if (form.dayCare.trim() !== '') wt.dayCare = Number(form.dayCare);
				if (form.overnight.trim() !== '') wt.overnight = Number(form.overnight);
				if (Object.keys(wt).length > 0) {
					wt.currency = form.walkerCurrency.trim() || 'CLP';
					body.walkerTariffs = wt;
				}
			}

			if (form.refAmount.trim() !== '') {
				body.referenceRate = {
					amount: Number(form.refAmount),
					unit: form.refUnit.trim() || 'por_servicio',
					currency: form.refCurrency.trim() || 'CLP'
				};
			}

			const res = await updateMyProviderProfile(body);
			setMessage(res.message || 'Guardado.');
			await refreshUser();
		} catch (err) {
			setError(err.response?.data?.message || 'No se pudo guardar el perfil.');
		} finally {
			setSaving(false);
		}
	}

	const userId = user._id || user.id;
	const previewPath =
		user.providerType && form.publicSlug.trim()
			? getProviderProfilePath({
					id: userId,
					providerType: user.providerType,
					publicSlug: form.publicSlug.trim()
				})
			: userId
				? getProviderProfilePath({ id: userId, providerType: user.providerType })
				: null;

	return (
		<div className='page provider-edit-page'>
			<Link className='back-link' to='/'>
				Volver al mapa
			</Link>
			<h1>Mi perfil proveedor</h1>
			<p className='muted'>
				Tipo: <strong>{user.providerType}</strong>
			</p>
			{user.status && user.status !== 'aprobado' ? (
				<p className='warn-banner'>Estado de cuenta: {user.status}.</p>
			) : null}
			{previewPath ? (
				<p>
					<Link to={previewPath}>Ir al perfil público</Link>
				</p>
			) : null}

			<form className='provider-edit-form' onSubmit={onSubmit}>
				<fieldset className='edit-fieldset'>
					<legend>Visibilidad</legend>
					<label className='check-row'>
						<input
							type='checkbox'
							checked={form.isPublished}
							onChange={(e) => setField('isPublished', e.target.checked)}
						/>
						<span>Perfil publicado (visible en mapa y URLs públicas)</span>
					</label>
					<p className='hint muted'>
						{isWalker
							? 'Para publicar como paseador/cuidador el backend exige comunas, tipos de mascota, disponibilidad semanal con horarios y al menos una tarifa.'
							: null}
					</p>
					<label className='edit-field'>
						<span>Slug público (URL amigable)</span>
						<input
							type='text'
							value={form.publicSlug}
							onChange={(e) => setField('publicSlug', e.target.value)}
							placeholder='ej. maria-paseos'
							autoComplete='off'
						/>
					</label>
					<label className='edit-field'>
						<span>Estado operativo</span>
						<select
							value={form.operationalStatus}
							onChange={(e) => setField('operationalStatus', e.target.value)}
						>
							<option value='abierto'>Abierto</option>
							<option value='temporalmente_cerrado'>Temporalmente cerrado</option>
						</select>
					</label>
				</fieldset>

				<fieldset className='edit-fieldset'>
					<legend>Contacto y descripción</legend>
					<label className='edit-field'>
						<span>Teléfono</span>
						<input value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
					</label>
					<label className='edit-field'>
						<span>Descripción</span>
						<textarea
							rows={4}
							value={form.description}
							onChange={(e) => setField('description', e.target.value)}
						/>
					</label>
					<label className='edit-field'>
						<span>Horarios (texto libre)</span>
						<input value={form.schedule} onChange={(e) => setField('schedule', e.target.value)} />
					</label>
					<label className='edit-field'>
						<span>Servicios (uno por línea o separados por coma)</span>
						<textarea
							rows={3}
							value={form.services}
							onChange={(e) => setField('services', e.target.value)}
						/>
					</label>
				</fieldset>

				<fieldset className='edit-fieldset'>
					<legend>Dirección</legend>
					<p className='hint muted'>
						Si no indicas lat/lng, el servidor intentará geocodificar calle, comuna y ciudad.
					</p>
					<label className='edit-field'>
						<span>Calle</span>
						<input value={form.addressStreet} onChange={(e) => setField('addressStreet', e.target.value)} />
					</label>
					<label className='edit-field'>
						<span>Comuna</span>
						<input value={form.addressCommune} onChange={(e) => setField('addressCommune', e.target.value)} />
					</label>
					<label className='edit-field'>
						<span>Ciudad</span>
						<input value={form.addressCity} onChange={(e) => setField('addressCity', e.target.value)} />
					</label>
					<div className='edit-row-2'>
						<label className='edit-field'>
							<span>Latitud (opcional)</span>
							<input value={form.addressLat} onChange={(e) => setField('addressLat', e.target.value)} />
						</label>
						<label className='edit-field'>
							<span>Longitud (opcional)</span>
							<input value={form.addressLng} onChange={(e) => setField('addressLng', e.target.value)} />
						</label>
					</div>
				</fieldset>

				<fieldset className='edit-fieldset'>
					<legend>Tarifa referencial (opcional)</legend>
					<p className='hint muted'>Visible en búsquedas; complementa las tarifas detalladas de paseador/cuidador.</p>
					<div className='edit-row-2'>
						<label className='edit-field'>
							<span>Monto</span>
							<input value={form.refAmount} onChange={(e) => setField('refAmount', e.target.value)} />
						</label>
						<label className='edit-field'>
							<span>Unidad (ej. por_hora, consulta)</span>
							<input value={form.refUnit} onChange={(e) => setField('refUnit', e.target.value)} />
						</label>
					</div>
					<label className='edit-field'>
						<span>Moneda</span>
						<input value={form.refCurrency} onChange={(e) => setField('refCurrency', e.target.value)} />
					</label>
				</fieldset>

				<fieldset className='edit-fieldset'>
					<legend>Redes</legend>
					<label className='edit-field'>
						<span>Instagram</span>
						<input value={form.socialInstagram} onChange={(e) => setField('socialInstagram', e.target.value)} />
					</label>
					<label className='edit-field'>
						<span>Facebook</span>
						<input value={form.socialFacebook} onChange={(e) => setField('socialFacebook', e.target.value)} />
					</label>
					<label className='edit-field'>
						<span>Twitter / X</span>
						<input value={form.socialTwitter} onChange={(e) => setField('socialTwitter', e.target.value)} />
					</label>
					<label className='edit-field'>
						<span>Sitio web</span>
						<input value={form.socialWebsite} onChange={(e) => setField('socialWebsite', e.target.value)} />
					</label>
				</fieldset>

				{isWalker ? (
					<fieldset className='edit-fieldset'>
						<legend>Paseador / cuidador (HU-10)</legend>
						<label className='edit-field'>
							<span>Comunas donde atiendes (separadas por coma)</span>
							<input
								value={form.serviceCommunes}
								onChange={(e) => setField('serviceCommunes', e.target.value)}
								placeholder='Providencia, Las Condes'
							/>
						</label>
						<label className='edit-field'>
							<span>Tipos de mascota (separados por coma)</span>
							<input
								value={form.petTypes}
								onChange={(e) => setField('petTypes', e.target.value)}
								placeholder='perro, gato'
							/>
						</label>
						<div className='edit-row-2'>
							<label className='edit-field'>
								<span>Años de experiencia</span>
								<input
									type='number'
									min='0'
									value={form.experienceYears}
									onChange={(e) => setField('experienceYears', e.target.value)}
								/>
							</label>
							<label className='edit-field'>
								<span>Mascotas atendidas (texto)</span>
								<input value={form.petsAttended} onChange={(e) => setField('petsAttended', e.target.value)} />
							</label>
						</div>

						<div className='weekly-grid'>
							<strong className='weekly-title'>Disponibilidad semanal</strong>
							{WEEK_DAYS.map((day) => {
								const row = form.weeklyAvailability[day];
								return (
									<div key={day} className='weekly-row'>
										<label className='check-row'>
											<input
												type='checkbox'
												checked={row.enabled}
												onChange={(e) => setWeeklyDay(day, { enabled: e.target.checked })}
											/>
											<span>{WEEK_DAY_LABELS[day]}</span>
										</label>
										<input
											type='time'
											disabled={!row.enabled}
											value={row.start}
											onChange={(e) => setWeeklyDay(day, { start: e.target.value })}
										/>
										<span className='weekly-sep'>—</span>
										<input
											type='time'
											disabled={!row.enabled}
											value={row.end}
											onChange={(e) => setWeeklyDay(day, { end: e.target.value })}
										/>
									</div>
								);
							})}
						</div>

						<div className='tariffs-block'>
							<strong>Tarifas (CLP u otra moneda)</strong>
							<label className='edit-field'>
								<span>Moneda</span>
								<input value={form.walkerCurrency} onChange={(e) => setField('walkerCurrency', e.target.value)} />
							</label>
							<div className='edit-row-2'>
								<label className='edit-field'>
									<span>Paseo 30 min</span>
									<input value={form.walk30min} onChange={(e) => setField('walk30min', e.target.value)} />
								</label>
								<label className='edit-field'>
									<span>Paseo 60 min</span>
									<input value={form.walk60min} onChange={(e) => setField('walk60min', e.target.value)} />
								</label>
							</div>
							<div className='edit-row-2'>
								<label className='edit-field'>
									<span>Día completo</span>
									<input value={form.dayCare} onChange={(e) => setField('dayCare', e.target.value)} />
								</label>
								<label className='edit-field'>
									<span>Pernocta</span>
									<input value={form.overnight} onChange={(e) => setField('overnight', e.target.value)} />
								</label>
							</div>
						</div>
					</fieldset>
				) : null}

				<button type='submit' className='save-profile-btn' disabled={saving}>
					{saving ? 'Guardando…' : 'Guardar cambios'}
				</button>
				{message ? <p className='review-success'>{message}</p> : null}
				{error ? <p className='error'>{error}</p> : null}
			</form>
		</div>
	);
}
