import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { setStoredAuthToken } from '../services/api';
import { registerProviderFormData } from '../services/authForms';

export function RegisterProviderPage() {
	const { refreshUser } = useAuth();
	const navigate = useNavigate();
	const [providerType, setProviderType] = useState('veterinaria');
	const [name, setName] = useState('');
	const [lastName, setLastName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
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

	async function onSubmit(e) {
		e.preventDefault();
		setError('');
		setSubmitting(true);
		try {
			const fd = new FormData();
			fd.append('name', name.trim());
			fd.append('lastName', lastName.trim());
			fd.append('email', email.trim());
			fd.append('password', password);
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
			const data = await registerProviderFormData(fd);
			setStoredAuthToken(data.token);
			await refreshUser();
			navigate('/proveedor', { replace: true });
		} catch (err) {
			setError(err.response?.data?.message || 'No se pudo enviar la solicitud.');
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className='page auth-page register-provider-page'>
			<Link className='back-link' to='/'>
				Volver al mapa
			</Link>
			<section className='auth-card wide-card'>
				<h1>Registro proveedor</h1>
				<p className='muted'>Tu cuenta quedará en revisión hasta que un administrador apruebe el perfil.</p>
				<form className='auth-form' onSubmit={onSubmit}>
					<label className='auth-field'>
						<span>Tipo</span>
						<select value={providerType} onChange={(e) => setProviderType(e.target.value)}>
							<option value='veterinaria'>Veterinaria</option>
							<option value='paseador'>Paseador</option>
							<option value='cuidador'>Cuidador</option>
						</select>
					</label>
					<div className='edit-row-2'>
						<label className='auth-field'>
							<span>Nombre</span>
							<input value={name} onChange={(e) => setName(e.target.value)} required />
						</label>
						<label className='auth-field'>
							<span>Apellido</span>
							<input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
						</label>
					</div>
					<label className='auth-field'>
						<span>Correo</span>
						<input type='email' value={email} onChange={(e) => setEmail(e.target.value)} required />
					</label>
					<label className='auth-field'>
						<span>Teléfono</span>
						<input value={phone} onChange={(e) => setPhone(e.target.value)} required />
					</label>
					<label className='auth-field'>
						<span>Contraseña</span>
						<input type='password' value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
					</label>

					{providerType === 'veterinaria' ? (
						<>
							<label className='auth-field'>
								<span>Calle</span>
								<input value={addressStreet} onChange={(e) => setAddressStreet(e.target.value)} required />
							</label>
							<label className='auth-field'>
								<span>Comuna</span>
								<input value={addressCommune} onChange={(e) => setAddressCommune(e.target.value)} required />
							</label>
							<div className='edit-row-2'>
								<label className='auth-field'>
									<span>Lat (opcional)</span>
									<input value={addressLat} onChange={(e) => setAddressLat(e.target.value)} />
								</label>
								<label className='auth-field'>
									<span>Lng (opcional)</span>
									<input value={addressLng} onChange={(e) => setAddressLng(e.target.value)} />
								</label>
							</div>
							<label className='auth-field'>
								<span>Número de registro / licencia</span>
								<input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} required />
							</label>
							<label className='auth-field'>
								<span>Especialidades (separadas por coma)</span>
								<input value={specialties} onChange={(e) => setSpecialties(e.target.value)} required />
							</label>
						</>
					) : (
						<>
							<label className='auth-field'>
								<span>Comunas de servicio (coma)</span>
								<input value={serviceCommunes} onChange={(e) => setServiceCommunes(e.target.value)} required />
							</label>
							<label className='auth-field'>
								<span>Tipos de mascota (coma)</span>
								<input value={petTypes} onChange={(e) => setPetTypes(e.target.value)} required />
							</label>
							<div className='edit-row-2'>
								<label className='auth-field'>
									<span>Tarifa referencia (monto)</span>
									<input value={referenceRateAmount} onChange={(e) => setReferenceRateAmount(e.target.value)} required />
								</label>
								<label className='auth-field'>
									<span>Unidad</span>
									<input value={referenceRateUnit} onChange={(e) => setReferenceRateUnit(e.target.value)} required />
								</label>
							</div>
							<label className='auth-field'>
								<span>Moneda</span>
								<input value={referenceRateCurrency} onChange={(e) => setReferenceRateCurrency(e.target.value)} />
							</label>
						</>
					)}

					<label className='auth-field'>
						<span>Fotos del local o servicio (máx. 3, opcional)</span>
						<input
							type='file'
							accept='image/*'
							multiple
							onChange={(e) => setPhotos(Array.from(e.target.files || []).slice(0, 3))}
						/>
					</label>

					<button type='submit' className='auth-submit' disabled={submitting}>
						{submitting ? 'Enviando…' : 'Enviar solicitud'}
					</button>
					{error ? <p className='error'>{error}</p> : null}
				</form>
			</section>
		</div>
	);
}
