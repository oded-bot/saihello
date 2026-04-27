import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap, ZoomControl, Circle } from 'react-leaflet';
import L from 'leaflet';
import { ChevronLeft } from 'lucide-react';
import api from '../../utils/api';
import BottomNav from '../Shared/BottomNav';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const offerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const seekerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

function heatColor(intensity) {
  if (intensity >= 0.75) return '#ef4444';
  if (intensity >= 0.55) return '#f97316';
  if (intensity >= 0.35) return '#eab308';
  return '#22c55e';
}

// Each heat point rendered as 4 concentric circles fading outward — mimics Gaussian blur
function HeatBlob({ lat, lng, intensity }) {
  const color = heatColor(intensity);
  const layers = [
    { radius: 350, fillOpacity: 0.05 },
    { radius: 240, fillOpacity: 0.10 },
    { radius: 150, fillOpacity: 0.18 },
    { radius: 75,  fillOpacity: 0.30 + intensity * 0.25 },
  ];
  return layers.map((l, i) => (
    <Circle
      key={i}
      center={[lat, lng]}
      radius={l.radius}
      pathOptions={{ fillColor: color, fillOpacity: l.fillOpacity, stroke: false }}
      interactive={false}
    />
  ));
}

function HeatLayer({ points }) {
  if (!points || points.length === 0) return null;
  return points.map(([lat, lng, intensity], i) => (
    <HeatBlob key={i} lat={lat} lng={lng} intensity={intensity} />
  ));
}

function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, 16); }, [center]);
  return null;
}

export default function HeatmapScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { lat, lng, query } = location.state || {};

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const params = lat && lng
          ? `lat=${lat}&lng=${lng}`
          : `query=${encodeURIComponent(query || '')}`;
        const res = await api.get(`/map/heatmap?${params}`);
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Laden fehlgeschlagen');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const defaultCenter = data
    ? [data.centerLat, data.centerLng]
    : lat && lng
    ? [parseFloat(lat), parseFloat(lng)]
    : [48.1351, 11.582];

  return (
    <div className="relative w-full overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>
      {loading ? (
        <div className="flex flex-col items-center justify-center h-full bg-gray-50 gap-3">
          <div className="w-10 h-10 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Heatmap wird geladen…</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-full bg-gray-50 gap-3 px-6 text-center">
          <p className="text-4xl">😕</p>
          <p className="text-gray-700 font-medium">{error}</p>
          <button onClick={() => navigate(-1)} className="mt-2 text-orange-500 font-medium text-sm">Zurück</button>
        </div>
      ) : (
        <MapContainer
          center={defaultCenter}
          zoom={15}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <ZoomControl position="bottomright" />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <RecenterMap center={[data.centerLat, data.centerLng]} />
          <HeatLayer points={data.heatPoints} />

          {/* Non-clickable offer pins */}
          {data.offerPins.map(pin => (
            <Marker key={`o-${pin.id}`} position={[pin.lat, pin.lng]} icon={offerIcon} interactive={false} />
          ))}
          {/* Non-clickable seeker pins */}
          {data.seekerPins.map(pin => (
            <Marker key={`s-${pin.id}`} position={[pin.lat, pin.lng]} icon={seekerIcon} interactive={false} />
          ))}
        </MapContainer>
      )}

      {/* Top info bar */}
      {data && !loading && !error && (
        <div className="fixed left-0 right-0 px-4 z-[9999]" style={{ top: 0, paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)' }}>
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-3 shadow text-sm">
            <p className="font-semibold text-gray-900 truncate">🔥 {data.locationLabel}</p>
            <div className="flex gap-3 text-xs text-gray-500 mt-0.5">
              <span>{data.heatPoints.length} Aktivitätspunkte</span>
              {data.offerPins.length > 0 && <span>🔵 {data.offerPins.length} Angebote</span>}
              {data.seekerPins.length > 0 && <span>🔴 {data.seekerPins.length} Suchende</span>}
            </div>
          </div>
        </div>
      )}

      {/* Zurück button */}
      <button
        onClick={() => navigate(-1)}
        className="fixed left-4 z-[1001] flex items-center gap-1 bg-white/90 backdrop-blur-sm text-gray-700 rounded-xl px-3 py-2 shadow text-sm font-medium"
        style={{ bottom: 'calc(56px + env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        <ChevronLeft size={18} />
        Zurück
      </button>

      {/* Legend */}
      {data && !loading && !error && (
        <div
          className="fixed right-4 z-[1001] bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow text-xs space-y-1"
          style={{ bottom: 'calc(56px + env(safe-area-inset-bottom, 0px) + 12px)' }}
        >
          <p className="font-semibold text-gray-700 mb-1">Aktivität</p>
          {[['🟢', 'Ruhig'], ['🟡', 'Mäßig'], ['🟠', 'Belebt'], ['🔴', 'Sehr voll']].map(([dot, label]) => (
            <div key={label} className="flex items-center gap-1.5"><span>{dot}</span><span className="text-gray-600">{label}</span></div>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
