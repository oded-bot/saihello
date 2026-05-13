import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap, ZoomControl, Circle } from 'react-leaflet';
import L from 'leaflet';
import { ChevronLeft, X } from 'lucide-react';
import api from '../../utils/api';

function PinTeaserModal({ onClose, navigate }) {
  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-dark-card rounded-t-3xl w-full max-w-md p-6 shadow-2xl border-t border-dark-separator"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-3xl mb-2">👀</p>
            <h2 className="text-xl font-bold text-white">Wer steckt dahinter?</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-dark-elevated flex items-center justify-center mt-1">
            <X size={16} className="text-white/50" />
          </button>
        </div>

        <p className="text-white/60 text-sm leading-relaxed mb-6">
          Diese Pins zeigen, dass in deiner Nähe gerade etwas los ist. Sobald du ein Angebot einstellst oder eine Suche startest, werden dir echte Profile sichtbar — und du kannst direkt matchen.
        </p>

        <div className="flex gap-3">
          <button
            onClick={() => { onClose(); navigate('/offer'); }}
            className="flex-1 py-3.5 tinder-gradient text-white font-bold rounded-2xl text-sm active:scale-95 transition gradient-glow"
          >
            Einladung erstellen
          </button>
          <button
            onClick={() => { onClose(); navigate('/discover'); }}
            className="flex-1 py-3.5 glass text-white font-semibold rounded-2xl text-sm active:scale-95 transition border border-white/10"
          >
            Suche starten
          </button>
        </div>
      </div>
    </div>
  );
}

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

// Each heat point rendered as 3 concentric circles — radius scales with intensity
function HeatBlob({ lat, lng, intensity }) {
  const color = heatColor(intensity);
  // Higher intensity = larger visible footprint
  const scale = 0.5 + intensity * 0.8;
  const layers = [
    { radius: Math.round(200 * scale), fillOpacity: 0.06 },
    { radius: Math.round(100 * scale), fillOpacity: 0.15 },
    { radius: Math.round(50  * scale), fillOpacity: 0.42 + intensity * 0.30 },
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
  useEffect(() => { if (center) map.flyTo(center, 14); }, [center]);
  return null;
}

export default function HeatmapScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { lat, lng, query } = location.state || {};

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [showTeaser, setShowTeaser] = useState(false);

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
    <div className="relative w-full overflow-hidden" style={{ height: '100vh' }}>
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

          {/* Offer pins — clickable, open teaser */}
          {data.offerPins.map(pin => (
            <Marker
              key={`o-${pin.id}`}
              position={[pin.lat, pin.lng]}
              icon={offerIcon}
              eventHandlers={{ click: () => setShowTeaser(true) }}
            />
          ))}
          {/* Seeker pins — clickable, open teaser */}
          {data.seekerPins.map(pin => (
            <Marker
              key={`s-${pin.id}`}
              position={[pin.lat, pin.lng]}
              icon={seekerIcon}
              eventHandlers={{ click: () => setShowTeaser(true) }}
            />
          ))}
        </MapContainer>
      )}

      {/* Top info bar */}
      {data && !loading && !error && (
        <div className="fixed left-0 right-0 px-4 z-[9999]" style={{ top: 0, paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)' }}>
          <div className="rounded-2xl px-4 py-3 text-sm" style={{ background: 'rgba(10,10,14,0.95)', border: '1px solid rgba(124,58,237,0.3)' }}>
            <p className="font-semibold text-white truncate">🔥 {data.locationLabel}</p>
            <div className="flex gap-3 text-xs text-white/50 mt-0.5">
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
        style={{ bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}
      >
        <ChevronLeft size={18} />
        Zurück
      </button>

      {/* Legend */}
      {data && !loading && !error && (
        <div
          className="fixed right-4 z-[1001] bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow text-xs space-y-1"
          style={{ bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}
        >
          <p className="font-semibold text-gray-700 mb-1">Aktivität</p>
          {[['🟢', 'Ruhig'], ['🟡', 'Mäßig'], ['🟠', 'Belebt'], ['🔴', 'Sehr voll']].map(([dot, label]) => (
            <div key={label} className="flex items-center gap-1.5"><span>{dot}</span><span className="text-gray-600">{label}</span></div>
          ))}
        </div>
      )}

      {showTeaser && (
        <PinTeaserModal onClose={() => setShowTeaser(false)} navigate={navigate} />
      )}
    </div>
  );
}
