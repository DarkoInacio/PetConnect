import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, PawPrint } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { setStoredAuthToken } from '../services/api';
import { registerProviderFormData } from '../services/authForms';
import { Button } from '@/components/ui/button';

const PROVIDER_OPTIONS = [
	{
		type: 'veterinaria',
		title: 'Veterinaria o clínica',
		subtitle: 'Citas, agenda y ficha clínica en el mapa.',
		hint: 'Necesitas domicilio y datos de registro profesional.'
	},
	{
		type: 'paseador',
		title: 'Paseador',
		subtitle: 'Servicio de paseo de mascotas.',
		hint: 'Indica comunas, tarifas y disponibilidad.'
	},
	{
		type: 'cuidador',
		title: 'Cuidador a domicilio',
		subtitle: 'Cuidado o alojamiento temporal.',
		hint: 'Indica comunas, tarifas y disponibilidad.'
	}
];

export function RegisterProviderPage() {
	const { refreshUser } = useAuth();
	const navigate = useNavigate();
	const [step, setStep] = useState('elegir');
	const [providerType, setProviderType] = useState('veterinaria');
	const [name, setName] = useState('');
	const [lastName, setLastName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
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

	function pickProviderType(t) {
		setProviderType(t);
		setStep('formulario');
	}

	const inputClass =
		'h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors';
	const fieldClass = 'flex flex-col gap-1.5';

	if (step === 'elegir') {
		return (
			<div className="flex flex-col items-center justify-center min-h-[min(calc(100dvh-3.25rem),900px)] py-8 px-4">
				<div className="w-full max-w-[min(45rem,100%)] flex flex-col gap-3">
					<Link
						className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline min-h-11 mb-4"
						to="/"
					>
						← Volver al mapa
					</Link>
					<section className="w-full rounded-2xl border border-t-4 border-t-primary border-border bg-card shadow-lg px-6 py-8 sm:px-8">
						<div className="flex items-center gap-2 mb-2">
							<PawPrint className="size-4 text-primary" aria-hidden="true" />
							<span className="text-[0.7rem] font-bold uppercase tracking-widest text-primary/70">
								Proveedores
							</span>
						</div>
						<h1 className="text-[clamp(1.4rem,2.5vw,1.75rem)] font-bold tracking-tight text-foreground mb-1.5">
							Elige tu tipo de servicio
						</h1>
						<p className="text-sm text-muted-foreground mb-6">
							Así te pedimos los datos adecuados. Tu cuenta quedará{' '}
							<strong>en revisión</strong> hasta que un administrador la apruebe.
						</p>
						<div className="flex flex-col gap-3">
							{PROVIDER_OPTIONS.map((opt) => (
								<button
									type="button"
									key={opt.type}
									className="flex flex-col gap-1 text-left w-full rounded-xl border border-border bg-background p-4 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
									onClick={() => pickProviderType(opt.type)}
								>
									<strong className="text-sm font-semibold text-foreground">{opt.title}</strong>
									<span className="text-sm text-muted-foreground">{opt.subtitle}</span>
									<small className="text-xs text-muted-foreground">{opt.hint}</small>
								</button>
							))}
						</div>
						<div className="relative my-5 flex items-center gap-3 before:flex-1 before:border-t before:border-border after:flex-1 after:border-t after:border-border">
							<span className="text-xs text-muted-foreground">o</span>
						</div>
						<div className="flex flex-col gap-1.5 text-center">
							<p className="text-sm text-muted-foreground">
								¿Eres dueño de una mascota?{' '}
								<Link to="/registro" className="text-sm text-primary font-semibold hover:underline">
									Regístrate aquí
								</Link>
							</p>
							<p className="text-sm text-muted-foreground">
								¿Ya tienes cuenta?{' '}
								<Link to="/login" className="text-sm text-primary font-semibold hover:underline">
									Iniciar sesión
								</Link>
							</p>
						</div>
					</section>
				</div>
			</div>
		);
	}

	const tipoLabel = PROVIDER_OPTIONS.find((o) => o.type === providerType)?.title || providerType;

	return (
		<div className="flex flex-col items-center justify-center min-h-[min(calc(100dvh-3.25rem),900px)] py-8 px-4">
			<div className="w-full max-w-[min(45rem,100%)] flex flex-col gap-3">
				<Link
					className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline min-h-11 mb-4"
					to="/"
				>
					← Volver al mapa
				</Link>
				<section className="w-full rounded-2xl border border-t-4 border-t-primary border-border bg-card shadow-lg px-6 py-8 sm:px-8">
					<button
						type="button"
						className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline mb-4"
						onClick={() => setStep('elegir')}
					>
						← Elegir otro tipo de proveedor
					</button>
					<div className="flex items-center gap-2 mb-2">
						<PawPrint className="size-4 text-primary" aria-hidden="true" />
						<span className="text-[0.7rem] font-bold uppercase tracking-widest text-primary/70">
							Alta de proveedor
						</span>
					</div>
					<h1 className="text-[clamp(1.4rem,2.5vw,1.75rem)] font-bold tracking-tight text-foreground mb-1.5">
						Registro de proveedor
					</h1>
					<p className="text-sm text-muted-foreground mb-6">
						Tipo seleccionado:{' '}
						<strong className="text-foreground">{tipoLabel}</strong>
						{' — '}Tu solicitud se revisa antes de publicar el perfil.
					</p>
					<form className="flex flex-col gap-4" onSubmit={onSubmit}>
						<div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
							<div className={fieldClass}>
								<label htmlFor="prov-name" className="text-sm font-semibold text-foreground">
									Nombre
								</label>
								<input
									id="prov-name"
									className={inputClass}
									value={name}
									onChange={(e) => setName(e.target.value)}
									required
								/>
							</div>
							<div className={fieldClass}>
								<label htmlFor="prov-lastName" className="text-sm font-semibold text-foreground">
									Apellido
								</label>
								<input
									id="prov-lastName"
									className={inputClass}
									value={lastName}
									onChange={(e) => setLastName(e.target.value)}
									required
								/>
							</div>
						</div>
						<div className={fieldClass}>
							<label htmlFor="prov-email" className="text-sm font-semibold text-foreground">
								Correo
							</label>
							<input
								id="prov-email"
								className={inputClass}
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
							/>
						</div>
						<div className={fieldClass}>
							<label htmlFor="prov-phone" className="text-sm font-semibold text-foreground">
								Teléfono
							</label>
							<input
								id="prov-phone"
								className={inputClass}
								value={phone}
								onChange={(e) => setPhone(e.target.value)}
								required
							/>
						</div>
						<div className={fieldClass}>
							<label htmlFor="prov-password" className="text-sm font-semibold text-foreground">
								Contraseña
							</label>
							<div className="relative">
								<input
									id="prov-password"
									className={`${inputClass} pr-10`}
									type={showPassword ? 'text' : 'password'}
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
									minLength={6}
								/>
								<button
									type="button"
									aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
									className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors"
									onClick={() => setShowPassword((v) => !v)}
								>
									{showPassword ? (
										<EyeOff className="size-4" aria-hidden="true" />
									) : (
										<Eye className="size-4" aria-hidden="true" />
									)}
								</button>
							</div>
						</div>

						{providerType === 'veterinaria' ? (
							<>
								<div className={fieldClass}>
									<label htmlFor="prov-street" className="text-sm font-semibold text-foreground">
										Calle
									</label>
									<input
										id="prov-street"
										className={inputClass}
										value={addressStreet}
										onChange={(e) => setAddressStreet(e.target.value)}
										required
									/>
								</div>
								<div className={fieldClass}>
									<label htmlFor="prov-commune" className="text-sm font-semibold text-foreground">
										Comuna
									</label>
									<input
										id="prov-commune"
										className={inputClass}
										value={addressCommune}
										onChange={(e) => setAddressCommune(e.target.value)}
										required
									/>
								</div>
								<div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
									<div className={fieldClass}>
										<label htmlFor="prov-lat" className="text-sm font-semibold text-foreground">
											Lat{' '}
											<span className="font-normal text-muted-foreground">(opcional)</span>
										</label>
										<input
											id="prov-lat"
											className={inputClass}
											value={addressLat}
											onChange={(e) => setAddressLat(e.target.value)}
										/>
									</div>
									<div className={fieldClass}>
										<label htmlFor="prov-lng" className="text-sm font-semibold text-foreground">
											Lng{' '}
											<span className="font-normal text-muted-foreground">(opcional)</span>
										</label>
										<input
											id="prov-lng"
											className={inputClass}
											value={addressLng}
											onChange={(e) => setAddressLng(e.target.value)}
										/>
									</div>
								</div>
								<div className={fieldClass}>
									<label htmlFor="prov-license" className="text-sm font-semibold text-foreground">
										Número de registro / licencia
									</label>
									<input
										id="prov-license"
										className={inputClass}
										value={licenseNumber}
										onChange={(e) => setLicenseNumber(e.target.value)}
										required
									/>
								</div>
								<div className={fieldClass}>
									<label htmlFor="prov-specialties" className="text-sm font-semibold text-foreground">
										Especialidades{' '}
										<span className="font-normal text-muted-foreground">(separadas por coma)</span>
									</label>
									<input
										id="prov-specialties"
										className={inputClass}
										value={specialties}
										onChange={(e) => setSpecialties(e.target.value)}
										required
									/>
								</div>
							</>
						) : (
							<>
								<div className={fieldClass}>
									<label htmlFor="prov-communes" className="text-sm font-semibold text-foreground">
										Comunas de servicio{' '}
										<span className="font-normal text-muted-foreground">(separadas por coma)</span>
									</label>
									<input
										id="prov-communes"
										className={inputClass}
										value={serviceCommunes}
										onChange={(e) => setServiceCommunes(e.target.value)}
										required
									/>
								</div>
								<div className={fieldClass}>
									<label htmlFor="prov-petTypes" className="text-sm font-semibold text-foreground">
										Tipos de mascota{' '}
										<span className="font-normal text-muted-foreground">(separados por coma)</span>
									</label>
									<input
										id="prov-petTypes"
										className={inputClass}
										value={petTypes}
										onChange={(e) => setPetTypes(e.target.value)}
										required
									/>
								</div>
								<div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
									<div className={fieldClass}>
										<label htmlFor="prov-rate" className="text-sm font-semibold text-foreground">
											Tarifa referencia (monto)
										</label>
										<input
											id="prov-rate"
											className={inputClass}
											value={referenceRateAmount}
											onChange={(e) => setReferenceRateAmount(e.target.value)}
											required
										/>
									</div>
									<div className={fieldClass}>
										<label htmlFor="prov-unit" className="text-sm font-semibold text-foreground">
											Unidad
										</label>
										<input
											id="prov-unit"
											className={inputClass}
											value={referenceRateUnit}
											onChange={(e) => setReferenceRateUnit(e.target.value)}
											required
										/>
									</div>
								</div>
								<div className={fieldClass}>
									<label htmlFor="prov-currency" className="text-sm font-semibold text-foreground">
										Moneda
									</label>
									<input
										id="prov-currency"
										className={inputClass}
										value={referenceRateCurrency}
										onChange={(e) => setReferenceRateCurrency(e.target.value)}
									/>
								</div>
							</>
						)}

						<div className={fieldClass}>
							<label htmlFor="prov-photos" className="text-sm font-semibold text-foreground">
								Fotos del local o servicio{' '}
								<span className="font-normal text-muted-foreground">(máx. 3, opcional)</span>
							</label>
							<input
								id="prov-photos"
								className={inputClass}
								type="file"
								accept="image/*"
								multiple
								onChange={(e) => setPhotos(Array.from(e.target.files || []).slice(0, 3))}
							/>
						</div>

						{error ? (
							<p
								className="rounded-xl border border-destructive/35 bg-destructive/10 px-3.5 py-3 text-sm text-destructive"
								role="alert"
								aria-live="assertive"
							>
								{error}
							</p>
						) : null}

						<Button
							type="submit"
							className="h-11 w-full rounded-xl font-bold"
							disabled={submitting}
						>
							{submitting ? 'Enviando…' : 'Enviar solicitud'}
						</Button>
					</form>
				</section>
			</div>
		</div>
	);
}
