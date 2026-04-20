import { useEffect, useState } from 'react';
import { fetchPetPhotoBlobUrl } from '../services/pets';

/** Muestra foto de mascota vía API autenticada. */
export function PetPhoto({ petId, alt, className }) {
	const [src, setSrc] = useState(null);
	const [err, setErr] = useState(false);

	useEffect(() => {
		if (!petId) return;
		let cancelled = false;
		let objectUrl = null;
		(async () => {
			try {
				objectUrl = await fetchPetPhotoBlobUrl(petId);
				if (!cancelled) setSrc(objectUrl);
			} catch {
				if (!cancelled) setErr(true);
			}
		})();
		return () => {
			cancelled = true;
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
	}, [petId]);

	if (err || !src) return null;
	return <img src={src} alt={alt || 'Mascota'} className={className || 'pet-photo-thumb'} />;
}
