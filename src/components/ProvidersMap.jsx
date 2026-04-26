import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { Link } from 'react-router-dom';
import { resolveBackendAssetUrl } from '../services/api';
import { getProviderProfilePath } from '../services/providers';

function svgMedicalCross() {
	// SVG simple y nítido (sin assets externos).
	return `
		<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
			<path fill="currentColor" d="M10 3a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v6h6a2 2 0 0 1 2 2h0a2 2 0 0 1-2 2h-6v6a2 2 0 0 1-2 2h0a2 2 0 0 1-2-2v-6H4a2 2 0 0 1-2-2h0a2 2 0 0 1 2-2h6V3Z"/>
		</svg>
	`;
}

function svgPaw() {
	return `
		<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
			<path fill="currentColor" d="M7.2 12.4c-1.1 0-2.1-1.2-2.1-2.7S6.1 7 7.2 7s2.1 1.2 2.1 2.7-1 2.7-2.1 2.7Zm9.6 0c-1.1 0-2.1-1.2-2.1-2.7S15.7 7 16.8 7s2.1 1.2 2.1 2.7-1 2.7-2.1 2.7ZM10.2 11.1c-1.1 0-2.1-1.3-2.1-2.9S9.1 5.3 10.2 5.3s2.1 1.3 2.1 2.9-1 2.9-2.1 2.9Zm3.6 0c-1.1 0-2.1-1.3-2.1-2.9S12.7 5.3 13.8 5.3s2.1 1.3 2.1 2.9-1 2.9-2.1 2.9Zm-1.8 12c-2.5 0-5.6-1.9-5.6-4.4 0-2.2 2.3-3.6 5.6-3.6s5.6 1.4 5.6 3.6c0 2.5-3.1 4.4-5.6 4.4Z"/>
		</svg>
	`;
}

function iconByType(type) {
	const glyph = type === 'medical_cross' ? svgMedicalCross() : svgPaw();
	return L.divIcon({
		className: 'provider-marker',
		html: `<div class="provider-marker-inner">${glyph}</div>`,
		iconSize: [34, 34],
		iconAnchor: [17, 34],
		popupAnchor: [0, -30]
	});
}

const userLocationIcon = L.divIcon({
	className: 'user-loc-marker',
	html: '<div class="user-loc-dot" title="Tu ubicación"></div>',
	iconSize: [20, 20],
	iconAnchor: [10, 10]
});

function RecenterMap({ center }) {
	const map = useMap();
	useEffect(() => {
		map.setView([center.lat, center.lng], map.getZoom(), { animate: true });
	}, [center, map]);
	return null;
}

export function ProvidersMap({ center, markers, userPosition, selectedProviderId, onSelectProvider }) {
	const mapRef = useRef(null);
	const markerRefs = useRef({});

	const selectedMarker = useMemo(
		() => markers.find((m) => String(m.id) === String(selectedProviderId)),
		[markers, selectedProviderId]
	);

	useEffect(() => {
		if (!selectedMarker || !mapRef.current) return;
		const map = mapRef.current;
		map.setView([selectedMarker.coordinates.lat, selectedMarker.coordinates.lng], 15, { animate: true });
		const marker = markerRefs.current[selectedMarker.id];
		if (marker) marker.openPopup();
	}, [selectedMarker]);

	return (
		<MapContainer
			center={[center.lat, center.lng]}
			zoom={13}
			scrollWheelZoom
			style={{ height: '100%', width: '100%' }}
			whenCreated={(map) => {
				mapRef.current = map;
			}}
		>
			<TileLayer
				attribution='&copy; OpenStreetMap contributors'
				url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
			/>
			<RecenterMap center={center} />

			{userPosition ? (
				<Marker position={[userPosition.lat, userPosition.lng]} icon={userLocationIcon}>
					<Popup>
						<small>Tu ubicación aproximada (referencia)</small>
					</Popup>
				</Marker>
			) : null}

			<MarkerClusterGroup chunkedLoading>
				{markers.map((provider) => (
					<Marker
						key={provider.id}
						position={[provider.coordinates.lat, provider.coordinates.lng]}
						icon={iconByType(provider.markerType)}
						opacity={provider.opacity ?? 1}
						ref={(ref) => {
							if (ref) markerRefs.current[provider.id] = ref;
						}}
						eventHandlers={{
							click: () => onSelectProvider(provider.id)
						}}
					>
						<Popup>
							<div className="min-w-[170px] flex flex-col gap-1.5">
								{provider.profileImage ? (
									<img
										src={resolveBackendAssetUrl(provider.profileImage)}
										alt={provider.fullName}
										className="w-full h-[100px] object-cover rounded-lg"
									/>
								) : null}
								<strong>{provider.fullName}</strong>
								<p>
									{provider.rating != null ? `${provider.rating.toFixed(1)} (${provider.ratingCount || 0})` : 'Sin calificaciones'}
								</p>
								<Link className="text-primary font-semibold" to={getProviderProfilePath(provider)}>
									Ver perfil
								</Link>
							</div>
						</Popup>
					</Marker>
				))}
			</MarkerClusterGroup>
		</MapContainer>
	);
}
