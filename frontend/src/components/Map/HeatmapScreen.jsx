import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents, ZoomControl, Circle } from 'react-leaflet';
import L from 'leaflet';
import { ChevronLeft, X } from 'lucide-react';
import api from '../../utils/api';

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function PinTeaserModal({ onClose, navigate }) {
  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl p-6 shadow-2xl"
        style={{ background: 'rgba(18,10,35,0.98)', border: '1px solid rgba(124,58,237,0.3)', paddingBottom: 'calc(env(safe-area-inset-bottom, 34px) + 50px)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-3xl mb-2">👀</p>
            <h2 className="text-xl font-bold text-white">Wer steckt dahinter?</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <X size={16} className="text-white/50" />
          </button>
        </div>

        <p className="text-white/60 text-sm leading-relaxed mb-6">
          Diese Pins zeigen gerade andere User in deiner Nähe. Sobald du ein Angebot aufgibst oder eine Suche startest, werden die Profile sichtbar - und du kannst direkt matchen. Let's go!
        </p>

        <div className="flex gap-3">
          <button
            onClick={() => { onClose(); navigate('/offer', { state: { returnToMap: true } }); }}
            className="flex-1 py-3.5 text-white font-bold rounded-2xl text-sm"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}
          >
            Einladung erstellen
          </button>
          <button
            onClick={() => { onClose(); navigate('/discover'); }}
            className="flex-1 py-3.5 text-white font-semibold rounded-2xl text-sm"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}
          >
            Suche starten
          </button>
        </div>
      </div>
    </div>
  );
}

function PinProfileModal({ pin, onClose, navigate }) {
  const genderLabel = { m: 'Männlich', f: 'Weiblich', d: 'Divers' };
  const p = pin.profile;
  const isOffer = pin.type === 'offer';

  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl p-6 shadow-2xl"
        style={{ background: 'rgba(18,10,35,0.98)', border: '1px solid rgba(124,58,237,0.3)', paddingBottom: 'calc(env(safe-area-inset-bottom, 34px) + 50px)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />

        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-4">
            {p.photo ? (
              <img src={p.photo} className="w-16 h-16 rounded-full object-cover border-2 border-violet-500/40" alt="" />
            ) : (
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white" style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}>
                {p.emoji || p.displayName?.[0]}
              </div>
            )}
            <div>
              <h3 className="font-bold text-lg text-white">{p.displayName}</h3>
              <p className="text-sm text-white/50">{p.age} · {genderLabel[p.gender] || p.gender}</p>
              {p.isVerified && <span className="text-xs text-violet-400 font-medium">✓ Verifiziert</span>}
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 text-2xl leading-none">×</button>
        </div>

        <div className="text-sm text-white/60 space-y-1.5 mb-4 rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <p><span className="text-white/80 font-medium">{isOffer ? 'Ort:' : 'Sucht bei:'}</span> {pin.locationText}</p>
          <p><span className="text-white/80 font-medium">Datum:</span> {pin.date}</p>
          <p><span className="text-white/80 font-medium">Zeit:</span> {pin.timeFrom} – {pin.timeUntil}</p>
          {isOffer
            ? <p><span className="text-white/80 font-medium">Verfügbare Plätze:</span> {pin.availableSeats}</p>
            : <p><span className="text-white/80 font-medium">Sucht:</span> {pin.seatsNeeded} Platz/Plätze</p>
          }
        </div>

        {p.bio && <p className="text-sm text-white/50 rounded-xl p-3 mb-4 italic" style={{ background: 'rgba(255,255,255,0.04)' }}>"{p.bio}"</p>}

        <button
          onClick={() => { onClose(); navigate('/map', { state: { lat: pin.lat, lng: pin.lng } }); }}
          className="w-full py-3.5 text-white font-bold rounded-2xl text-sm"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}
        >
          Auf der Karte entdecken
        </button>
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
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const seekerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

function createPinIcon(type, emoji, photoUrl) {
  const color = type === 'offer' ? 'grey' : 'violet';
  const markerImg = `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`;

  if (emoji) {
    return L.divIcon({
      className: '',
      html: `<div style="position:relative;display:inline-block;">
        <img src="${markerImg}" style="width:25px;height:41px;display:block;" />
        <span style="position:absolute;bottom:-28px;left:50%;transform:translateX(-50%);font-size:28px;line-height:1;white-space:nowrap;">${emoji}</span>
      </div>`,
      iconSize: [25, 60], iconAnchor: [12, 41], popupAnchor: [1, -34],
    });
  }

  if (photoUrl) {
    const fullUrl = photoUrl.startsWith('http') ? photoUrl : `${window.location.origin}${photoUrl}`;
    return L.divIcon({
      className: '',
      html: `<div style="position:relative;display:inline-block;">
        <img src="${markerImg}" style="width:25px;height:41px;display:block;" />
        <img src="${fullUrl}" style="position:absolute;bottom:-22px;left:50%;transform:translateX(-50%);width:26px;height:26px;border-radius:50%;border:2px solid white;object-fit:cover;box-shadow:0 1px 3px rgba(0,0,0,0.4);" />
      </div>`,
      iconSize: [25, 60], iconAnchor: [12, 41], popupAnchor: [1, -34],
    });
  }

  return type === 'offer' ? offerIcon : seekerIcon;
}

function heatColor(intensity) {
  if (intensity >= 0.75) return '#ef4444';
  if (intensity >= 0.55) return '#f97316';
  if (intensity >= 0.35) return '#eab308';
  return '#22c55e';
}

function HeatBlob({ lat, lng, intensity }) {
  const color = heatColor(intensity);
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

// Lauscht auf Kartenbewegungen — löst Re-Fetch aus wenn > 15 km vom letzten Fetch-Zentrum
function MapPanWatcher({ fetchCenterRef, onRefetch }) {
  useMapEvents({
    moveend: (e) => {
      const { lat, lng } = e.target.getCenter();
      const { lat: fcLat, lng: fcLng } = fetchCenterRef.current;
      if (haversineKm(fcLat, fcLng, lat, lng) > 15) {
        onRefetch(lat, lng);
      }
    },
  });
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
  const [selectedPin, setSelectedPin] = useState(null);

  // Speichert das Zentrum des letzten API-Abrufs
  const fetchCenterRef = useRef({ lat: parseFloat(lat) || 48.1374, lng: parseFloat(lng) || 11.5755 });

  useEffect(() => {
    async function load() {
      try {
        const params = lat && lng
          ? `lat=${lat}&lng=${lng}`
          : `query=${encodeURIComponent(query || '')}`;
        const res = await api.get(`/map/heatmap?${params}`);
        setData(res.data);
        fetchCenterRef.current = { lat: res.data.centerLat, lng: res.data.centerLng };
      } catch (err) {
        setError(err.response?.data?.error || 'Laden fehlgeschlagen');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Re-Fetch nur für Pins (heatPoints bleiben erhalten)
  const handleRefetch = useCallback(async (newLat, newLng) => {
    try {
      const res = await api.get(`/map/heatmap?lat=${newLat}&lng=${newLng}`);
      fetchCenterRef.current = { lat: newLat, lng: newLng };
      setData(prev => ({
        ...prev,
        offerPins: res.data.offerPins,
        seekerPins: res.data.seekerPins,
      }));
    } catch {
      // Stille — kein Fehler anzeigen bei Hintergrund-Refresh
    }
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
            url={`https://api.maptiler.com/maps/streets-v2-dark/{z}/{x}/{y}.png?key=${import.meta.env.VITE_MAPTILER_KEY}`}
            attribution='&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            tileSize={512}
            zoomOffset={-1}
          />
          <RecenterMap center={[data.centerLat, data.centerLng]} />
          <HeatLayer points={data.heatPoints} />
          <MapPanWatcher fetchCenterRef={fetchCenterRef} onRefetch={handleRefetch} />

          {data.offerPins.map(pin => (
            <Marker
              key={`o-${pin.id}`}
              position={[pin.lat, pin.lng]}
              icon={data.isActive && pin.profile
                ? createPinIcon('offer', pin.profile.emoji, pin.profile.photo)
                : offerIcon}
              eventHandlers={{ click: () => data.isActive ? setSelectedPin(pin) : setShowTeaser(true) }}
            />
          ))}
          {data.seekerPins.map(pin => (
            <Marker
              key={`s-${pin.id}`}
              position={[pin.lat, pin.lng]}
              icon={data.isActive && pin.profile
                ? createPinIcon('seeker', pin.profile.emoji, pin.profile.photo)
                : seekerIcon}
              eventHandlers={{ click: () => data.isActive ? setSelectedPin(pin) : setShowTeaser(true) }}
            />
          ))}
        </MapContainer>
      )}

      {data && !loading && !error && (
        <div className="fixed left-0 right-0 px-4 z-[9999]" style={{ top: 0, paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)' }}>
          <div className="rounded-2xl px-4 py-3 text-sm" style={{ background: 'rgba(10,10,14,0.95)', border: '1px solid rgba(124,58,237,0.3)' }}>
            <p className="font-semibold text-white truncate">🔥 {data.locationLabel}</p>
            <div className="flex gap-3 text-xs text-white/50 mt-0.5">
              <span>{data.heatPoints.length} Aktivitätspunkte</span>
              {data.offerPins.length > 0 && <span>⚫ {data.offerPins.length} Angebote</span>}
              {data.seekerPins.length > 0 && <span>🟣 {data.seekerPins.length} Suchende</span>}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => navigate(-1)}
        className="fixed left-4 z-[1001] flex items-center gap-1 bg-white/90 backdrop-blur-sm text-gray-700 rounded-xl px-3 py-2 shadow text-sm font-medium"
        style={{ bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}
      >
        <ChevronLeft size={18} />
        Zurück
      </button>

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

      {selectedPin && (
        <PinProfileModal
          pin={selectedPin}
          onClose={() => setSelectedPin(null)}
          navigate={navigate}
        />
      )}
    </div>
  );
}
