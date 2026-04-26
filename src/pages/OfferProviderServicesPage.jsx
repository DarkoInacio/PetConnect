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

const FIELD_CLS = 'flex flex-col gap-1.5';
const FIELD_LABEL_CLS = 'text-sm font-semibold text-foreground';
const INPUT_CLS = 'h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors';

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
			<div className="w-full">
				<div className="rounded-2xl border border-border bg-card shadow-sm p-6" role="status">
					<p className="text-muted-foreground m-0 animate-pulse">Cargando…</p>
				</div>
			</div>
		);
	}

	if (!user) {
		return <Navigate to="/login" replace state={{ from: '/cuenta/ofrecer-servicios' }} />;
	}
	if (!hasDueno(user)) {
		return (
			<div className="w-full">
				<div className="rounded-2xl border border-border bg-card shadow-sm p-6">
					<p className="rounded-xl border border-destructive/35 bg-destructive/10 px-3.5 py-3 text-sm text-destructive m-0">
						Solo aplica a cuentas de dueño.
					</p>
				</div>
			</div>
		);
	}
	if (hasProveedor(user)) {
		return (
			<div className="w-full">
				<Link className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline min-h-11 mb-4" to="/cuenta/perfil">
					← Mi perfil
				</Link>
				<div className="rounded-2xl border border-border bg-card shadow-sm p-6">
					<p className="text-foreground m-0">
						Tu cuenta ya incluye <strong>perfil de proveedor</strong> (mismo inicio de sesión).{' '}
						{user.status === 'en_revision'
							? 'Está en revisión por un administrador; aún no aparece público como servicio.'
							: null}
					</p>
					<p className="text-muted-foreground text-sm mt-2 m-0">
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
			<div className="w-full flex flex-col gap-5">
				<div className="rounded-2xl border border-border bg-card shadow-sm">
					<div className="px-5 py-4 border-b border-border bg-gradient-to-r from-muted/40 to-transparent dark:from-muted/20">
						<p className="text-[0.7rem] font-bold uppercase tracking-widest text-primary/70 mb-0.5">Proveedor</p>
						<h1 className="text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold tracking-tight text-foreground">Ofrecer servicios</h1>
					</div>
					<div className="p-5 sm:p-6">
						<p className="text-muted-foreground text-[0.95rem] max-w-[52ch] m-0">
							Usa el <strong>mismo correo y contraseña</strong> que como dueño. Añadimos el rol
							proveedor a tu cuenta; un admin debe aprobarlo.
						</p>
						<div className="grid grid-cols-1 gap-3 mt-5 sm:grid-cols-3">
							{OPTIONS.map((opt) => (
								<button
									type="button"
									key={opt.type}
									className="text-left flex flex-col gap-1 px-4 py-4 border-2 border-border rounded-2xl bg-background cursor-pointer font-[inherit] transition-all hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10"
									onClick={() => {
										setProviderType(opt.type);
										setStep('formulario');
									}}
								>
									<strong className="text-base text-foreground">{opt.title}</strong>
									<span className="text-muted-foreground text-[0.88rem] mt-0.5">
										{opt.subtitle}
									</span>
								</button>
							))}
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full flex flex-col gap-5">
			<button
				type="button"
				className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline min-h-11 self-start bg-transparent border-none font-[inherit] cursor-pointer p-0"
				onClick={() => setStep('elegir')}
			>
				← Elegir otro tipo
			</button>

			<div className="rounded-2xl border border-border bg-card shadow-sm">
				<div className="px-5 py-4 border-b border-border bg-gradient-to-r from-muted/40 to-transparent dark:from-muted/20">
					<p className="text-[0.7rem] font-bold uppercase tracking-widest text-primary/70 mb-0.5">
						{providerType.charAt(0).toUpperCase() + providerType.slice(1)}
					</p>
					<h1 className="text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold tracking-tight text-foreground">Datos de tu servicio</h1>
				</div>

				<form className="p-5 sm:p-6 flex flex-col gap-5" onSubmit={onSubmit}>
					{msg ? (
						<p className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 px-3.5 py-3 text-sm text-emerald-700 dark:text-emerald-400 m-0">
							{msg}
						</p>
					) : null}

					<div>
						<p className="text-[0.7rem] font-bold uppercase tracking-widest text-muted-foreground mb-3">Datos personales</p>
						<p className="text-[0.85rem] text-muted-foreground mb-4 m-0">Revisa nombre y teléfono. Tu correo de acceso no cambia.</p>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className={FIELD_CLS}>
								<label htmlFor="f-name" className={FIELD_LABEL_CLS}>Nombre</label>
								<input
									id="f-name"
									className={INPUT_CLS}
									value={name}
									onChange={(e) => setName(e.target.value)}
									required
								/>
							</div>
							<div className={FIELD_CLS}>
								<label htmlFor="f-lastName" className={FIELD_LABEL_CLS}>Apellido</label>
								<input
									id="f-lastName"
									className={INPUT_CLS}
									value={lastName}
									onChange={(e) => setLastName(e.target.value)}
									required
								/>
							</div>
						</div>
						<div className={`${FIELD_CLS} mt-4`}>
							<label htmlFor="f-phone" className={FIELD_LABEL_CLS}>Teléfono (obligatorio para proveedores)</label>
							<input
								id="f-phone"
								className={INPUT_CLS}
								value={phone}
								onChange={(e) => setPhone(e.target.value)}
								required
							/>
						</div>
					</div>

					<div className="border-t border-border pt-5">
						<p className="text-[0.7rem] font-bold uppercase tracking-widest text-muted-foreground mb-4">
							{providerType === 'veterinaria' ? 'Datos de la clínica' : 'Datos del servicio'}
						</p>
						<div className="flex flex-col gap-4">
							{providerType === 'veterinaria' ? (
								<>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
										<div className={FIELD_CLS}>
											<label htmlFor="f-street" className={FIELD_LABEL_CLS}>Calle y número (domicilio comercial)</label>
											<input
												id="f-street"
												className={INPUT_CLS}
												value={addressStreet}
												onChange={(e) => setAddressStreet(e.target.value)}
												required
											/>
										</div>
										<div className={FIELD_CLS}>
											<label htmlFor="f-commune" className={FIELD_LABEL_CLS}>Comuna</label>
											<input
												id="f-commune"
												className={INPUT_CLS}
												value={addressCommune}
												onChange={(e) => setAddressCommune(e.target.value)}
												required
											/>
										</div>
									</div>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
										<div className={FIELD_CLS}>
											<label htmlFor="f-lat" className={FIELD_LABEL_CLS}>Lat (opcional)</label>
											<input
												id="f-lat"
												className={INPUT_CLS}
												value={addressLat}
												onChange={(e) => setAddressLat(e.target.value)}
											/>
										</div>
										<div className={FIELD_CLS}>
											<label htmlFor="f-lng" className={FIELD_LABEL_CLS}>Lng (opcional)</label>
											<input
												id="f-lng"
												className={INPUT_CLS}
												value={addressLng}
												onChange={(e) => setAddressLng(e.target.value)}
											/>
										</div>
									</div>
									<div className={FIELD_CLS}>
										<label htmlFor="f-license" className={FIELD_LABEL_CLS}>N.º de registro profesional</label>
										<input
											id="f-license"
											className={INPUT_CLS}
											value={licenseNumber}
											onChange={(e) => setLicenseNumber(e.target.value)}
											required
										/>
									</div>
									<div className={FIELD_CLS}>
										<label htmlFor="f-specialties" className={FIELD_LABEL_CLS}>Especialidades (al menos una, separadas por coma)</label>
										<input
											id="f-specialties"
											className={INPUT_CLS}
											value={specialties}
											onChange={(e) => setSpecialties(e.target.value)}
											required
										/>
									</div>
								</>
							) : (
								<>
									<div className={FIELD_CLS}>
										<label htmlFor="f-communes" className={FIELD_LABEL_CLS}>Comunas donde atiendes (separadas por coma)</label>
										<input
											id="f-communes"
											className={INPUT_CLS}
											value={serviceCommunes}
											onChange={(e) => setServiceCommunes(e.target.value)}
											required
										/>
									</div>
									<div className={FIELD_CLS}>
										<label htmlFor="f-pets" className={FIELD_LABEL_CLS}>Tipos de mascota (separados por coma)</label>
										<input
											id="f-pets"
											className={INPUT_CLS}
											value={petTypes}
											onChange={(e) => setPetTypes(e.target.value)}
											required
										/>
									</div>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
										<div className={FIELD_CLS}>
											<label htmlFor="f-rate" className={FIELD_LABEL_CLS}>Tarifa referencial (monto, ej. 15000)</label>
											<input
												id="f-rate"
												className={INPUT_CLS}
												value={referenceRateAmount}
												onChange={(e) => setReferenceRateAmount(e.target.value)}
												required
											/>
										</div>
										<div className={FIELD_CLS}>
											<label htmlFor="f-unit" className={FIELD_LABEL_CLS}>Unidad (ej. por_hora, por_paseo)</label>
											<input
												id="f-unit"
												className={INPUT_CLS}
												value={referenceRateUnit}
												onChange={(e) => setReferenceRateUnit(e.target.value)}
												required
											/>
										</div>
									</div>
								</>
							)}
						</div>
					</div>

					<div className="border-t border-border pt-5">
						<div className={FIELD_CLS}>
							<label htmlFor="f-photos" className={FIELD_LABEL_CLS}>Fotos (opcional, hasta 3)</label>
							<input
								id="f-photos"
								className="text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-foreground hover:file:bg-accent"
								type="file"
								accept="image/*"
								multiple
								onChange={(e) => {
									const list = e.target.files ? Array.from(e.target.files).slice(0, 3) : [];
									setPhotos(list);
								}}
							/>
						</div>
					</div>

					{error ? (
						<p className="rounded-xl border border-destructive/35 bg-destructive/10 px-3.5 py-3 text-sm text-destructive m-0" role="alert">
							{error}
						</p>
					) : null}

					<div className="flex items-center justify-end pt-1">
						<button
							type="submit"
							className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 font-bold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
							disabled={submitting}
						>
							{submitting ? 'Enviando…' : 'Enviar solicitud'}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
