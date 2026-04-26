import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useMatch } from 'react-router-dom';
import { ChevronLeft, PawPrint } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { PET_SPECIES, PET_SEX } from '../constants/pets';
import { createPet, getPet, updatePet } from '../services/pets';
import { PetPhoto } from '../components/PetPhoto';

const PAGE_CLS = 'mx-auto w-full max-w-2xl px-4 sm:px-5 pt-6 pb-[max(2rem,env(safe-area-inset-bottom,0px))]';
const BACK_LINK_CLS = 'inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline min-h-11 mb-4';
const ERROR_CLS = 'rounded-xl border border-destructive/35 bg-destructive/10 px-3.5 py-3 text-sm text-destructive';
const LABEL_CLS = 'text-sm font-semibold text-foreground';
const INPUT_CLS = 'h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors';
const SELECT_CLS = 'h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors';
const FIELD_CLS = 'flex flex-col gap-1.5';

function toInputDate(d) {
	if (!d) return '';
	try {
		const x = new Date(d);
		if (Number.isNaN(x.getTime())) return '';
		return x.toISOString().slice(0, 10);
	} catch {
		return '';
	}
}

export function PetFormPage() {
	const { user, loading: authLoading } = useAuth();
	const { petId } = useParams();
	const isNew = Boolean(useMatch('/mascotas/nueva'));
	const navigate = useNavigate();

	const [loading, setLoading] = useState(!isNew);
	const [error, setError] = useState('');
	const [name, setName] = useState('');
	const [species, setSpecies] = useState('perro');
	const [breed, setBreed] = useState('');
	const [birthDate, setBirthDate] = useState('');
	const [sex, setSex] = useState('macho');
	const [color, setColor] = useState('');
	const [foto, setFoto] = useState(null);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (isNew || !petId || authLoading || !user || user.role !== 'dueno') return;
		const c = new AbortController();
		(async () => {
			try {
				setLoading(true);
				const data = await getPet(petId, c.signal);
				const p = data.pet;
				if (!p) return;
				setName(p.name || '');
				setSpecies(p.species || 'perro');
				setBreed(p.breed || '');
				setBirthDate(toInputDate(p.birthDate));
				setSex(p.sex || 'macho');
				setColor(p.color || '');
			} catch (err) {
				if (err.name === 'CanceledError' || err.name === 'AbortError') return;
				setError(err.response?.data?.message || 'No se pudo cargar la mascota.');
			} finally {
				setLoading(false);
			}
		})();
		return () => c.abort();
	}, [isNew, petId, authLoading, user]);

	if (authLoading) {
		return (
			<div className={PAGE_CLS}>
				<div className="rounded-2xl border border-border bg-card shadow-sm p-5 sm:p-6" role="status" aria-live="polite">
					<p className="text-muted-foreground m-0">Cargando…</p>
				</div>
			</div>
		);
	}

	if (!user) {
		return <Navigate to='/login' replace state={{ from: isNew ? '/mascotas/nueva' : `/mascotas/${petId}/edit` }} />;
	}

	if (user.role !== 'dueno') {
		return (
			<div className={PAGE_CLS}>
				<Link className={BACK_LINK_CLS} to='/'>
					<ChevronLeft className="w-4 h-4" aria-hidden="true" /> Inicio
				</Link>
				<p className={ERROR_CLS} role="alert">Solo dueños pueden gestionar mascotas.</p>
			</div>
		);
	}

	async function onSubmit(e) {
		e.preventDefault();
		setError('');
		setSaving(true);
		try {
			if (isNew) {
				await createPet({
					name: name.trim(),
					species,
					breed: breed.trim(),
					birthDate: birthDate.trim() || null,
					sex,
					color: color.trim(),
					fotoFile: foto || undefined
				});
				navigate('/cuenta/mascotas');
			} else {
				await updatePet(
					petId,
					{
						name: name.trim(),
						species,
						breed: breed.trim(),
						birthDate: birthDate.trim() || null,
						sex,
						color: color.trim()
					},
					foto || undefined
				);
				navigate(`/mascotas/${petId}`);
			}
		} catch (err) {
			setError(err.response?.data?.message || 'No se pudo guardar.');
		} finally {
			setSaving(false);
		}
	}

	if (!isNew && loading) {
		return (
			<div className={PAGE_CLS}>
				<div className="rounded-2xl border border-border bg-card shadow-sm p-5 sm:p-6" role="status" aria-live="polite">
					<p className="text-muted-foreground m-0">Cargando mascota…</p>
				</div>
			</div>
		);
	}

	return (
		<div className={PAGE_CLS}>
			<Link className={BACK_LINK_CLS} to={isNew ? '/cuenta/mascotas' : `/mascotas/${petId}`}>
				<ChevronLeft className="w-4 h-4" aria-hidden="true" />
				Volver
			</Link>

			<header className="mb-6">
				<p className="text-[0.7rem] font-bold uppercase tracking-widest text-primary/70 mb-1.5">Mascotas</p>
				<h1 className="text-[clamp(1.4rem,2.5vw,2rem)] font-bold tracking-tight text-foreground leading-tight">
					{isNew ? 'Registrar mascota' : 'Editar mascota'}
				</h1>
				<p className="text-sm text-muted-foreground mt-1 mb-0">
					{isNew ? 'Completa los datos básicos de tu compañero.' : 'Actualiza la información de tu mascota.'}
				</p>
			</header>

			<form className="rounded-2xl border border-border bg-card shadow-sm p-5 sm:p-6 flex flex-col gap-5" onSubmit={onSubmit}>
				{/* Foto preview si es edición */}
				{!isNew && petId && (
					<div className="flex items-center gap-4 pb-4 border-b border-border">
						<div className="w-20 h-20 rounded-xl overflow-hidden border border-border bg-muted shrink-0">
							<PetPhoto petId={petId} alt={name} className="w-full h-full object-cover" />
						</div>
						<div>
							<p className="font-semibold text-foreground text-sm mb-0.5">{name || 'Sin nombre'}</p>
							<p className="text-xs text-muted-foreground m-0 capitalize">{species}</p>
						</div>
					</div>
				)}

				{/* Datos principales: grid 2 columnas */}
				<fieldset className="border-none p-0 m-0 flex flex-col gap-4">
					<legend className="text-sm font-bold text-foreground mb-1 flex items-center gap-2">
						<PawPrint className="w-4 h-4 text-primary" aria-hidden="true" />
						Datos principales
					</legend>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className={FIELD_CLS}>
							<label htmlFor="pet-name" className={LABEL_CLS}>Nombre <span className="text-destructive">*</span></label>
							<input
								id="pet-name"
								className={INPUT_CLS}
								value={name}
								onChange={(e) => setName(e.target.value)}
								required
								placeholder="Ej: Max"
							/>
						</div>
						<div className={FIELD_CLS}>
							<label htmlFor="pet-species" className={LABEL_CLS}>Especie <span className="text-destructive">*</span></label>
							<select
								id="pet-species"
								className={SELECT_CLS}
								value={species}
								onChange={(e) => setSpecies(e.target.value)}
								required
							>
								{PET_SPECIES.map((o) => (
									<option key={o.value} value={o.value}>{o.label}</option>
								))}
							</select>
						</div>
						<div className={FIELD_CLS}>
							<label htmlFor="pet-sex" className={LABEL_CLS}>Sexo <span className="text-destructive">*</span></label>
							<select
								id="pet-sex"
								className={SELECT_CLS}
								value={sex}
								onChange={(e) => setSex(e.target.value)}
								required
							>
								{PET_SEX.map((o) => (
									<option key={o.value} value={o.value}>{o.label}</option>
								))}
							</select>
						</div>
						<div className={FIELD_CLS}>
							<label htmlFor="pet-breed" className={LABEL_CLS}>Raza <span className="text-muted-foreground font-normal text-xs">(opcional)</span></label>
							<input
								id="pet-breed"
								className={INPUT_CLS}
								value={breed}
								onChange={(e) => setBreed(e.target.value)}
								placeholder="Ej: Labrador"
							/>
						</div>
					</div>
				</fieldset>

				{/* Datos adicionales */}
				<fieldset className="border-none p-0 m-0 flex flex-col gap-4 pt-4 border-t border-border">
					<legend className="text-sm font-bold text-foreground mb-1">Datos adicionales</legend>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className={FIELD_CLS}>
							<label htmlFor="pet-birth" className={LABEL_CLS}>Fecha de nacimiento <span className="text-muted-foreground font-normal text-xs">(opcional)</span></label>
							<input
								id="pet-birth"
								className={INPUT_CLS}
								type='date'
								value={birthDate}
								onChange={(e) => setBirthDate(e.target.value)}
							/>
						</div>
						<div className={FIELD_CLS}>
							<label htmlFor="pet-color" className={LABEL_CLS}>Color <span className="text-muted-foreground font-normal text-xs">(opcional)</span></label>
							<input
								id="pet-color"
								className={INPUT_CLS}
								value={color}
								onChange={(e) => setColor(e.target.value)}
								placeholder="Ej: Dorado"
							/>
						</div>
					</div>
					<div className={FIELD_CLS}>
						<label htmlFor="pet-photo" className={LABEL_CLS}>Foto <span className="text-muted-foreground font-normal text-xs">(opcional, JPG/PNG)</span></label>
						<input
							id="pet-photo"
							className="text-sm text-foreground file:mr-3 file:h-9 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:text-sm file:font-semibold file:text-foreground hover:file:bg-muted/70 cursor-pointer"
							type='file'
							accept='image/jpeg,image/png'
							onChange={(e) => setFoto(e.target.files?.[0] || null)}
						/>
					</div>
				</fieldset>

				{error ? <p className={ERROR_CLS} role="alert">{error}</p> : null}

				<div className="flex items-center gap-3 pt-2 border-t border-border">
					<button
						type='submit'
						className="inline-flex items-center justify-center h-11 rounded-xl bg-primary px-6 font-bold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-65 disabled:cursor-not-allowed cursor-pointer"
						disabled={saving}
					>
						{saving ? 'Guardando…' : isNew ? 'Registrar mascota' : 'Guardar cambios'}
					</button>
					<Link
						to={isNew ? '/cuenta/mascotas' : `/mascotas/${petId}`}
						className="inline-flex items-center justify-center h-11 rounded-xl border border-border bg-background px-5 text-sm font-semibold text-foreground hover:bg-muted no-underline transition-colors"
					>
						Cancelar
					</Link>
				</div>
			</form>
		</div>
	);
}
