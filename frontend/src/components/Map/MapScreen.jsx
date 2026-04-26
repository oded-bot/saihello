import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import { ChevronLeft } from 'lucide-react';
import api from '../../utils/api';
import useAuthStore from '../../context/authStore';
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

const ownPinIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const seekerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

function createPinIcon(baseIcon, emoji, photoUrl) {
  const color = baseIcon === ownPinIcon ? 'green' : baseIcon === seekerIcon ? 'red' : 'blue';
  const markerImg = `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`;

  if (emoji) {
    return L.divIcon({
      className: '',
      html: `
        <div style="position:relative;display:inline-block;">
          <img src="${markerImg}" style="width:25px;height:41px;display:block;" />
          <span style="position:absolute;bottom:-28px;left:50%;transform:translateX(-50%);font-size:28px;line-height:1;white-space:nowrap;">${emoji}</span>
        </div>`,
      iconSize: [25, 60],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
    });
  }

  if (photoUrl) {
    const fullUrl = photoUrl.startsWith('http') ? photoUrl : `${window.location.origin}${photoUrl}`;
    return L.divIcon({
      className: '',
      html: `
        <div style="position:relative;display:inline-block;">
          <img src="${markerImg}" style="width:25px;height:41px;display:block;" />
          <img src="${fullUrl}"
               style="position:absolute;bottom:-22px;left:50%;transform:translateX(-50%);width:26px;height:26px;border-radius:50%;border:2px solid white;object-fit:cover;box-shadow:0 1px 3px rgba(0,0,0,0.4);" />
        </div>`,
      iconSize: [25, 60],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
    });
  }

  return baseIcon;
}

function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, 15); }, [center]);
  return null;
}

function PinPopup({ pin, onLike, onSuperLike, onClose, isOffer }) {
  const p = pin.profile;
  const genderLabel = { m: 'Männlich', f: 'Weiblich', d: 'Divers' };

  return (
    <div className="fixed inset-0 z-[1003] flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white w-full max-w-md rounded-t-3xl p-6 shadow-2xl"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 34px) + 50px)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-4">
            {p.photo ? (
              <img src={p.photo} className="w-16 h-16 rounded-full object-cover" alt={p.displayName} />
            ) : (
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-900">
                {p.displayName?.[0]}
              </div>
            )}
            <div>
              <h3 className="font-bold text-lg text-gray-900">{p.displayName}</h3>
              <p className="text-sm text-gray-500">{p.age} · {genderLabel[p.gender] || p.gender}</p>
              {p.isVerified && <span className="text-xs text-blue-600 font-medium">Verifiziert</span>}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none">×</button>
        </div>

        <div className="text-sm text-gray-600 space-y-1 mb-4">
          <p>
            <span className="font-medium">{isOffer ? 'Ort:' : 'Sucht bei:'}</span>{' '}
            {pin.locationText || `${pin.lat?.toFixed(4)}, ${pin.lng?.toFixed(4)}`}
          </p>
          <p><span className="font-medium">Datum:</span> {pin.date}</p>
          <p><span className="font-medium">Zeit:</span> {pin.timeFrom} – {pin.timeUntil}</p>
          {isOffer && <p><span className="font-medium">Verfügbare Plätze:</span> {pin.availableSeats}</p>}
          {!isOffer && <p><span className="font-medium">Sucht:</span> {pin.seatsNeeded} Platz/Plätze</p>}
        </div>

        {p.bio && <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 mb-4 italic">"{p.bio}"</p>}

        <div className="flex gap-3">
          <button onClick={() => onLike(pin)} className="flex-1 bg-green-500 text-white py-3 rounded-xl font-semibold text-sm">
            Like
          </button>
          <button onClick={() => onSuperLike(pin)} className="flex-1 bg-blue-900 text-white py-3 rounded-xl font-semibold text-sm">
            Super Like
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MapScreen() {
  const user = useAuthStore(s => s.user);
  const location = useLocation();
  const navState = location.state;
  const navigate = useNavigate();
  const [pins, setPins] = useState([]);
  const [myStatus, setMyStatus] = useState(null);
  const [myItem, setMyItem] = useState(null);
  const [selectedPin, setSelectedPin] = useState(null);
  const [center, setCenter] = useState(navState?.lat ? [navState.lat, navState.lng] : null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [ownPinPopup, setOwnPinPopup] = useState(false);
  const [viewMode, setViewMode] = useState('map');
  const [feedItems, setFeedItems] = useState([]);
  const [feedLoading, setFeedLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [offerRes, searchRes] = await Promise.allSettled([
        api.get('/tables/offers/mine'),
        api.get('/seeker/my'),
      ]);

      const offers = offerRes.status === 'fulfilled' ? offerRes.value.data : [];
      const search = searchRes.status === 'fulfilled' ? searchRes.value.data : null;

      const activeOffer = Array.isArray(offers) ? offers.find(o => o.status === 'active') : null;
      const activeSearch = search;

      if (activeOffer) {
        setMyStatus('offer');
        setMyItem(activeOffer);
        const pinsRes = await api.get('/map/seeker-pins');
        setPins(pinsRes.data);
      } else if (activeSearch) {
        setMyStatus('search');
        setMyItem(activeSearch);
        const pinsRes = await api.get('/map/offer-pins');
        setPins(pinsRes.data);
      } else {
        setMyStatus(null);
        setMyItem(null);
        setPins([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(pos => {
      if (!navState?.lat) {
        setCenter([pos.coords.latitude, pos.coords.longitude]);
      }
    });
  }, []);

  const handleLike = async (pin) => {
    try {
      if (myStatus === 'offer') {
        await api.post('/matching/invite-seeker', { seekerUserId: pin.userId, direction: 'like' });
      } else if (myStatus === 'search') {
        await api.post('/matching/swipe', { offerId: pin.id, direction: 'like' });
      } else {
        return;
      }
      setSelectedPin(null);
      setFeedback('Like gesendet!');
      setTimeout(() => setFeedback(''), 2000);
      loadData();
    } catch (err) {
      setFeedback(err.response?.data?.error || 'Fehler');
      setTimeout(() => setFeedback(''), 2000);
    }
  };

  const handleSuperLike = async (pin) => {
    try {
      if (myStatus === 'offer') {
        await api.post('/matching/invite-seeker', { seekerUserId: pin.userId, direction: 'superlike' });
      } else if (myStatus === 'search') {
        await api.post('/matching/swipe', { offerId: pin.id, direction: 'superlike' });
      } else {
        return;
      }
      setSelectedPin(null);
      setFeedback('Super Like gesendet!');
      setTimeout(() => setFeedback(''), 2000);
      loadData();
    } catch (err) {
      setFeedback(err.response?.data?.error || 'Fehler');
      setTimeout(() => setFeedback(''), 2000);
    }
  };

  const handleDeleteOwnItem = async () => {
    try {
      if (myStatus === 'offer') {
        await api.delete('/tables/offers/' + myItem.id);
      } else {
        await api.delete('/seeker/my');
      }
      setOwnPinPopup(false);
      setFeedback('Gelöscht!');
      setTimeout(() => setFeedback(''), 2000);
      loadData();
    } catch (err) {
      setFeedback(err.response?.data?.error || 'Fehler beim Löschen');
      setTimeout(() => setFeedback(''), 2000);
    }
  };

  const loadFeed = async () => {
    setFeedLoading(true);
    try {
      const endpoint = myStatus === 'offer' ? '/map/seeker-feed' : '/map/offer-feed';
      const res = await api.get(endpoint);
      setFeedItems(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setFeedLoading(false);
    }
  };

  const handleFeedLike = async (item, type) => {
    try {
      if (myStatus === 'offer') {
        await api.post('/matching/invite-seeker', { seekerUserId: item.userId, direction: type });
      } else {
        await api.post('/matching/swipe', { offerId: item.id, direction: type });
      }
      setFeedItems(prev => prev.filter(f => f.id !== item.id));
      setFeedback(type === 'like' ? 'Like gesendet!' : 'Super Like gesendet!');
      setTimeout(() => setFeedback(''), 2000);
    } catch (err) {
      setFeedback(err.response?.data?.error || 'Fehler');
      setTimeout(() => setFeedback(''), 2000);
    }
  };

  const defaultCenter = center || [48.1351, 11.5820];
  const genderLabel = { m: 'Männlich', f: 'Weiblich', d: 'Divers' };

  if (viewMode === 'feed' && (myStatus === 'search' || myStatus === 'offer')) {
    return (
      <div className="flex flex-col w-full bg-gray-50" style={{ height: 'calc(100vh - 64px)' }}>
        <div className="flex bg-white border-b border-gray-200 px-4 pt-3 pb-0 gap-0 shrink-0" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)' }}>
          <button
            onClick={() => setViewMode('map')}
            className="flex-1 py-2 text-sm font-semibold text-gray-400 border-b-2 border-transparent"
          >Karte</button>
          <button
            onClick={() => { setViewMode('feed'); loadFeed(); }}
            className="flex-1 py-2 text-sm font-semibold text-blue-900 border-b-2 border-blue-900"
          >Feed</button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {feedLoading ? (
            <div className="text-center text-gray-400 text-sm mt-8">Laden...</div>
          ) : feedItems.length === 0 ? (
            <div className="text-center text-gray-400 text-sm mt-8">
              <p className="text-2xl mb-2">🔍</p>
              <p>Keine passenden Einträge gefunden.</p>
              <p className="text-xs mt-1">Kriterien anpassen oder später nochmal versuchen.</p>
            </div>
          ) : feedItems.map(item => (
            <div key={item.id} className="bg-white rounded-2xl shadow p-4">
              <div className="flex items-center gap-3 mb-3">
                {item.profile.photo ? (
                  <img src={item.profile.photo} className="w-12 h-12 rounded-full object-cover" alt="" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-xl font-bold text-blue-900">
                    {item.profile.displayName?.[0] || '?'}
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 text-sm">{item.profile.displayName}</p>
                    {item.profile.isVerified && <span className="text-xs text-blue-600 font-medium">✓</span>}
                  </div>
                  <p className="text-xs text-gray-500">{item.profile.age} · {genderLabel[item.profile.gender] || item.profile.gender}</p>
                </div>
                {item.distanceKm != null && (
                  <span className="text-xs font-semibold text-blue-900 bg-blue-50 px-2 py-1 rounded-full">
                    {item.distanceKm < 1 ? (item.distanceKm * 1000).toFixed(0) + ' m' : item.distanceKm.toFixed(1) + ' km'}
                  </span>
                )}
              </div>

              <div className="text-xs text-gray-600 space-y-0.5 mb-3">
                <p><span className="font-medium">Ort:</span> {item.locationText || item.lat?.toFixed(4) + ', ' + item.lng?.toFixed(4)}</p>
                <p><span className="font-medium">Datum:</span> {item.date} · {item.timeFrom}–{item.timeUntil}</p>
                {myStatus === 'search'
                  ? <p><span className="font-medium">Verfügbare Plätze:</span> {item.availableSeats}</p>
                  : <p><span className="font-medium">Sucht:</span> {item.seatsNeeded} Platz/Plätze</p>
                }
              </div>

              {item.profile.bio && (
                <p className="text-xs text-gray-500 italic bg-gray-50 rounded-xl px-3 py-2 mb-3">"{item.profile.bio}"</p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handleFeedLike(item, 'like')}
                  className="flex-1 bg-green-500 text-white py-2 rounded-xl text-sm font-semibold"
                >Like</button>
                <button
                  onClick={() => handleFeedLike(item, 'superlike')}
                  className="flex-1 bg-blue-900 text-white py-2 rounded-xl text-sm font-semibold"
                >Super Like</button>
              </div>
            </div>
          ))}
        </div>

        {feedback && (
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1002] bg-black/80 text-white px-6 py-3 rounded-2xl text-sm font-medium">
            {feedback}
          </div>
        )}

        <BottomNav />
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>
      <MapContainer
        center={defaultCenter}
        zoom={14}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <ZoomControl position="bottomright" />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {center && <RecenterMap center={center} />}
        {pins.map(pin => (
          <Marker
            key={pin.id}
            position={[pin.lat, pin.lng]}
            icon={createPinIcon(pin.isOwn ? ownPinIcon : (myStatus === 'search' ? offerIcon : seekerIcon), pin.profile?.emoji, pin.profile?.photo)}
            eventHandlers={{ click: () => { if (pin.isOwn) setOwnPinPopup(true); else setSelectedPin(pin); } }}
          />
        ))}
      </MapContainer>

      {/* Top overlay */}
      <div className="fixed left-0 right-0 px-4 z-[9999] space-y-2" style={{ top: 0, paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)' }}>
        {(myStatus === 'search' || myStatus === 'offer') && (
          <div className="flex bg-white/90 backdrop-blur-sm rounded-2xl shadow overflow-hidden">
            <button className="flex-1 py-2 text-sm font-semibold text-blue-900 border-b-2 border-blue-900">Karte</button>
            <button
              onClick={() => { setViewMode('feed'); loadFeed(); }}
              className="flex-1 py-2 text-sm font-semibold text-gray-400"
            >Feed</button>
          </div>
        )}
        {loading ? (
          <div className="bg-white rounded-2xl px-4 py-3 shadow text-sm text-gray-500 text-center">Laden...</div>
        ) : myStatus ? (
          <div className="bg-white rounded-2xl px-4 py-3 shadow overflow-hidden">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500 font-medium">
                  {myStatus === 'offer' ? 'Dein aktives Angebot' : 'Deine aktive Suche'}
                </p>
                <p className="text-sm font-semibold text-blue-900 truncate">
                  {myItem?.location_text || `${myItem?.location_lat?.toFixed(4)}, ${myItem?.location_lng?.toFixed(4)}`}
                </p>
                <p className="text-xs text-gray-500">{myItem?.date} · {myItem?.time_from}–{myItem?.time_until}</p>
              </div>
              <div className="text-right flex-shrink-0 w-20">
                <p className="text-2xl font-bold text-blue-900">{pins.filter(p => !p.isOwn).length}</p>
                <p className="text-xs text-gray-500 leading-tight">
                  {myStatus === 'offer' ? 'Suchende in der Nähe' : 'Angebote in der Nähe'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl px-4 py-3 shadow text-center">
            <p className="text-sm text-gray-600 mb-3">Was möchtest du tun?</p>
            <div className="flex gap-2">
              <button onClick={() => navigate('/offer')}
                className="flex-1 bg-blue-900 text-white py-2 rounded-xl text-sm font-semibold">
                Platz anbieten
              </button>
              <button onClick={() => navigate('/discover')}
                className="flex-1 border border-blue-900 text-blue-900 py-2 rounded-xl text-sm font-semibold">
                Platz suchen
              </button>
            </div>
          </div>
        )}
      </div>

      {feedback && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1002] bg-black/80 text-white px-6 py-3 rounded-2xl text-sm font-medium">
          {feedback}
        </div>
      )}

      {ownPinPopup && myItem && (
        <div className="fixed inset-0 z-[1003] flex items-end justify-center bg-black/40" onClick={() => setOwnPinPopup(false)}>
          <div className="bg-white w-full max-w-md rounded-t-3xl p-6 shadow-2xl" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 34px) + 50px)' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-blue-900">
                {myStatus === 'offer' ? 'Dein Angebot' : 'Deine Suche'}
              </h3>
              <button onClick={() => setOwnPinPopup(false)} className="text-gray-400 text-2xl leading-none">×</button>
            </div>
            <div className="text-sm text-gray-600 space-y-1 mb-6">
              <p><span className="font-medium">Ort:</span> {myItem.location_text || `${myItem.location_lat?.toFixed(5)}, ${myItem.location_lng?.toFixed(5)}`}</p>
              <p><span className="font-medium">Datum:</span> {myItem.date}</p>
              <p><span className="font-medium">Zeit:</span> {myItem.time_from} – {myItem.time_until}</p>
              {myStatus === 'offer' && <p><span className="font-medium">Plätze:</span> {myItem.available_seats}</p>}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate(myStatus === 'offer' ? '/offer' : '/discover')}
                className="flex-1 border border-blue-900 text-blue-900 py-3 rounded-xl font-semibold text-sm"
              >
                Neu erstellen
              </button>
              <button
                onClick={handleDeleteOwnItem}
                className="flex-1 bg-red-500 text-white py-3 rounded-xl font-semibold text-sm"
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedPin && (
        <PinPopup
          pin={selectedPin}
          isOffer={myStatus === 'search'}
          onClose={() => setSelectedPin(null)}
          onLike={handleLike}
          onSuperLike={handleSuperLike}
        />
      )}

      <button
        onClick={() => navigate(-1)}
        className="fixed left-4 z-[1001] flex items-center gap-1 bg-white/90 backdrop-blur-sm text-gray-700 rounded-xl px-3 py-2 shadow text-sm font-medium"
        style={{ bottom: 'calc(56px + env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        <ChevronLeft size={18} />
        Zurück
      </button>

      <BottomNav />
    </div>
  );
}
