import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { upgradeToProviderFormData } from '../services/authForms';
import { hasRole } from '../lib/userRoles';

const OPTIONS = [
	{ type: 'paseador', title: 'Paseador', subtitle: 'Paseo y movilidad de mascotas' },
	{ type: 'cuidador', title: 'Cuidador', subtitle: 'Cuidado o alojamiento' },
	{ type: 'veterinaria', title: 'Veterinaria o clínica', subtitle: 'Citas, agenda y ficha (requiere más datos)' }
];

function hasProveedor(user) {
	return hasRole(user, 'proveedor');
}

function hasDueno(user) {
	return hasRole(user, 'dueno');
}

export function OfferProviderServicesPage() {
	const { user, loading, refreshUser } = useAuth();
	const navigate = useNavigate();
	const [step, setStep] = useState('elegir');
	const [providerType, setProviderType] = useState('paseador');
	const [name, setName] = useState('');
	const [lastName, setLastName] = useState('');
	const [phone, setPhone] = useState('');
	const [addressStreet, setAddressStreet] = useState('');
	const [addressCommune, setAddressCommune] = useState('');
	const [addressLat, setAddressLat] = useState('');
	const [addressLng, setAddressLng] = useState('');
	const [licenseNumber, setLicenseNumber] = useState('');
	const [specialties, setSpecialties] = useState('');
	const [serviceCommunes, setServiceCommunes] = useState('');
	const [petTypes, setPetTypes] = useState('');
	const [referenceRateAmount, setReferenceRateAmount] = useState('');
	const [referenceRateUnit, setReferenceRateUnit] = useState('por_hora');
	const [referenceRateCurrency, setReferenceRateCurrency] = useState('CLP');
	const [photos, setPhotos] = useState([]);
	const [error, setError] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [msg, setMsg] = useState('');

	useEffect(() => {
		if (user) {
			setName(user.name || '');
			setLastName(user.lastName || '');
			setPhone(user.phone || '');
		}
	}, [user]);

	if (loading) {
		return (
			<div className="page">
				<div className="page-surface" role="status">
					<p className="muted">Cargando…</p>
				</div>
			</div>
		);
	}

	if (!user) {
		return <Navigate to="/login" replace state={{ from: '/cuenta/ofrecer-servicios' }} />;
	}
	if (!hasDueno(user)) {
		return (
			<div className="page">
				<Link className="back-link" to="/">
					Inicio
				</Link>
				<div className="page-surface">
					<p className="error">Solo aplica a cuentas de dueño.</p>
				</div>
			</div>
		);
	}
	if (hasProveedor(user)) {
		return (
			<div className="page provider-edit-page">
				<Link className="back-link" to="/cuenta/perfil">
					← Mi perfil
				</Link>
				<div className="page-surface">
					<p>
						Tu cuenta ya incluye <strong>perfil de proveedor</strong> (mismo inicio de sesión).{' '}
						{user.status === 'en_revision'
							? 'Está en revisión por un administrador; aún no aparece público como servicio.'
							: null}
					</p>
					<p className="muted" style={{ marginTop: 8 }}>
						<Link to="/proveedor">Panel de proveedor</Link> · <Link to="/proveedor/mi-perfil">Editar ficha</Link>
					</p>
				</div>
			</div>
		);
	}

	async function onSubmit(e) {
		e.preventDefault();
		setError('');
		setMsg('');
		setSubmitting(true);
		try {
			const fd = new FormData();
			fd.append('name', name.trim());
			fd.append('lastName', lastName.trim());
			fd.append('phone', phone.trim());
			fd.append('providerType', providerType);
			if (providerType === 'veterinaria') {
				fd.append('addressStreet', addressStreet.trim());
				fd.append('addressCommune', addressCommune.trim());
				if (addressLat.trim()) fd.append('addressLat', addressLat.trim());
				if (addressLng.trim()) fd.append('addressLng', addressLng.trim());
				fd.append('licenseNumber', licenseNumber.trim());
				fd.append('specialties', specialties.trim());
			} else {
				fd.append('serviceCommunes', serviceCommunes.trim());
				fd.append('petTypes', petTypes.trim());
				fd.append('referenceRateAmount', referenceRateAmount.trim());
				fd.append('referenceRateUnit', referenceRateUnit.trim());
				fd.append('referenceRateCurrency', referenceRateCurrency.trim());
			}
			for (const f of photos) {
				fd.append('photos', f);
			}
			const data = await upgradeToProviderFormData(fd);
			setMsg(data?.message || 'Solicitud enviada.');
			await refreshUser();
			navigate('/proveedor', { replace: true });
		} catch (err) {
			setError(err.response?.data?.message || 'No se pudo enviar la solicitud.');
		} finally {
			setSubmitting(false);
		}
	}

	if (step === 'elegir') {
		return (
			<div className="auth-page register-provider-page owner-hub-section">
				<Link className="back-link" to="/cuenta/perfil">
					← Volver a mi perfil
				</Link>
				<div className="page-surface page-surface--wide">
					<header className="page-hero" style={{ marginBottom: '1rem' }}>
						<h1>Ofrecer servicios</h1>
						<p>
							Usa el <strong>mismo correo y contraseña</strong> que como dueño. Añadimos el rol
							proveedor a tu cuenta; un admin debe aprobarlo. No necesitas otra pantalla de registro.
						</p>
					</header>
					<div className="provider-pick-grid" style={{ marginTop: 16 }}>
						{OPTIONS.map((opt) => (
							<button
								type="button"
								key={opt.type}
								className="provider-pick-card"
								onClick={() => {
									setProviderType(opt.type);
									setStep('formulario');
								}}
							>
								<strong>{opt.title}</strong>
								<div className="muted" style={{ fontSize: '0.9rem', marginTop: 6 }}>
									{opt.subtitle}
								</div>
							</button>
						))}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="auth-page register-provider-page owner-hub-section">
			<button type="button" className="back-link" onClick={() => setStep('elegir')}>
				← Elegir otro tipo
			</button>
			<div className="page-surface page-surface--wide">
				<header className="page-hero" style={{ marginBottom: '1rem' }}>
					<h1>Datos de tu servicio ({providerType})</h1>
					<p className="muted">Revisa nombre y teléfono. Tu correo de acceso no cambia.</p>
				</header>
				{msg ? <p className="review-success">{msg}</p> : null}
				<form className="auth-form" onSubmit={onSubmit}>
					<label className="auth-field">
						<span>Nombre</span>
						<input value={name} onChange={(e) => setName(e.target.value)} required />
					</label>
					<label className="auth-field">
						<span>Apellido</span>
						<input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
					</label>
					<label className="auth-field">
						<span>Teléfono (obligatorio para proveedores)</span>
						<input value={phone} onChange={(e) => setPhone(e.target.value)} required />
					</label>
					{providerType === 'veterinaria' ? (
						<>
							<label className="auth-field">
								<span>Calle y número (domicilio comercial)</span>
								<input
									value={addressStreet}
									onChange={(e) => setAddressStreet(e.target.value)}
									required
								/>
							</label>
							<label className="auth-field">
								<span>Comuna</span>
								<input
									value={addressCommune}
									onChange={(e) => setAddressCommune(e.target.value)}
									required
								/>
							</label>
							<label className="auth-field">
								<span>Lat (opcional)</span>
								<input value={addressLat} onChange={(e) => setAddressLat(e.target.value)} />
							</label>
							<label className="auth-field">
								<span>Lng (opcional)</span>
								<input value={addressLng} onChange={(e) => setAddressLng(e.target.value)} />
							</label>
							<label className="auth-field">
								<span>N.º de registro profesional</span>
								<input
									value={licenseNumber}
									onChange={(e) => setLicenseNumber(e.target.value)}
									required
								/>
							</label>
							<label className="auth-field">
								<span>Especialidades (al menos una, separadas por coma)</span>
								<input
									value={specialties}
									onChange={(e) => setSpecialties(e.target.value)}
									required
								/>
							</label>
						</>
					) : (
						<>
							<label className="auth-field">
								<span>Comunas donde atiendes (separadas por coma)</span>
								<input
									value={serviceCommunes}
									onChange={(e) => setServiceCommunes(e.target.value)}
									required
								/>
							</label>
							<label className="auth-field">
								<span>Tipos de mascota (separados por coma)</span>
								<input value={petTypes} onChange={(e) => setPetTypes(e.target.value)} required />
							</label>
							<label className="auth-field">
								<span>Tarifa referencial (monto, ej. 15000)</span>
								<input
									value={referenceRateAmount}
									onChange={(e) => setReferenceRateAmount(e.target.value)}
									required
								/>
							</label>
							<label className="auth-field">
								<span>Unidad (ej. por_hora, por_paseo)</span>
								<input
									value={referenceRateUnit}
									onChange={(e) => setReferenceRateUnit(e.target.value)}
									required
								/>
							</label>
						</>
					)}
					<label className="auth-field">
						<span>Fotos (opcional, hasta 3)</span>
						<input
							type="file"
							accept="image/*"
							multiple
							onChange={(e) => {
								const list = e.target.files ? Array.from(e.target.files).slice(0, 3) : [];
								setPhotos(list);
							}}
						/>
					</label>
					{error ? (
						<p className="error" role="alert">
							{error}
						</p>
					) : null}
					<button type="submit" className="auth-submit" disabled={submitting}>
						{submitting ? 'Enviando…' : 'Enviar solicitud'}
					</button>
				</form>
			</div>
		</div>
	);
}
