import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Navigation, Type } from 'lucide-react';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function LocationPicker({ onLocationChange }) {
  const [mode, setMode] = useState('text');
  const [text, setText] = useState('');
  const [gpsCoords, setGpsCoords] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [defaultCenter] = useState([48.1351, 11.5820]);

  useEffect(() => {
    if (mode === 'text') {
      onLocationChange({ locationText: text || null, locationLat: null, locationLng: null });
    } else if (mode === 'gps') {
      onLocationChange({
        locationText: gpsCoords ? `${gpsCoords.lat.toFixed(5)}, ${gpsCoords.lng.toFixed(5)}` : null,
        locationLat: gpsCoords?.lat ?? null,
        locationLng: gpsCoords?.lng ?? null,
      });
    }
  }, [mode, text, gpsCoords]);

  function handleGetGps() {
    if (!navigator.geolocation) {
      setGpsError('GPS nicht verfügbar auf diesem Gerät.');
      return;
    }
    setGpsLoading(true);
    setGpsError('');
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsLoading(false);
      },
      err => {
        setGpsError('Standort konnte nicht ermittelt werden. Bitte Zugriff erlauben.');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Ort</label>

      {/* Toggle */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-dark-separator">
        <button
          type="button"
          onClick={() => setMode('text')}
          className={`flex-1 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${mode === 'text' ? 'bg-tinder-pink text-white' : 'bg-white dark:bg-dark-elevated text-gray-600 dark:text-gray-300'}`}
        >
          <Type size={14} />
          Ort eingeben
        </button>
        <button
          type="button"
          onClick={() => { setMode('gps'); if (!gpsCoords) handleGetGps(); }}
          className={`flex-1 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${mode === 'gps' ? 'bg-tinder-pink text-white' : 'bg-white dark:bg-dark-elevated text-gray-600 dark:text-gray-300'}`}
        >
          <Navigation size={14} />
          Mein Standort
        </button>
      </div>

      {mode === 'text' ? (
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="z.B. Augustiner am Dom, Hauptbahnhof München..."
          className="w-full border border-gray-200 dark:border-dark-separator rounded-xl px-4 py-3 text-sm bg-gray-50 dark:bg-dark-elevated text-gray-900 dark:text-white focus:outline-none focus:border-tinder-pink focus:ring-1 focus:ring-tinder-pink/30 placeholder-gray-400"
        />
      ) : (
        <div className="space-y-2">
          {gpsLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
              <div className="w-4 h-4 border-2 border-tinder-pink border-t-transparent rounded-full animate-spin" />
              Standort wird ermittelt...
            </div>
          )}
          {gpsError && (
            <p className="text-sm text-red-500">{gpsError}</p>
          )}
          {gpsCoords && !gpsLoading && (
            <>
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 font-medium">
                <MapPin size={14} />
                Standort ermittelt
              </div>
              <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-dark-separator" style={{ height: 200 }}>
                <MapContainer
                  center={[gpsCoords.lat, gpsCoords.lng]}
                  zoom={16}
                  scrollWheelZoom={false}
                  zoomControl={true}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />
                  <Marker position={[gpsCoords.lat, gpsCoords.lng]} />
                </MapContainer>
              </div>
              <button
                type="button"
                onClick={handleGetGps}
                className="text-xs text-tinder-pink font-medium"
              >
                Neu ermitteln
              </button>
            </>
          )}
          {!gpsCoords && !gpsLoading && !gpsError && (
            <button
              type="button"
              onClick={handleGetGps}
              className="w-full py-3 border border-tinder-pink text-tinder-pink rounded-xl text-sm font-medium flex items-center justify-center gap-2"
            >
              <Navigation size={16} />
              GPS-Standort abrufen
            </button>
          )}
        </div>
      )}
    </div>
  );
}
