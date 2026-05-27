import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, PlusCircle, Star, TrendingUp, X, Navigation, Map } from 'lucide-react';
import useAuthStore from '../../context/authStore';
import HostProfileModal from '../Leaderboard/HostProfileModal';
import useLanguage from '../../hooks/useLanguage';
import api from '../../utils/api';
import { FEATURES } from '../../config/features';
import { connectSocket } from '../../utils/socket';


function HeatLocationModal({ onClose, onConfirm }) {
  const [query, setQuery] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [checking, setChecking] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [geocodeConfirm, setGeocodeConfirm] = useState(null); // { displayName, lat, lng }

  function handleGps() {
    if (!navigator.geolocation) { setGpsError('GPS nicht verfügbar'); return; }
    setGpsLoading(true);
    setGpsError('');
    navigator.geolocation.getCurrentPosition(
      pos => { setGpsLoading(false); onConfirm({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
      () => { setGpsLoading(false); setGpsError('Standort nicht verfügbar. Bitte Zugriff erlauben.'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleCheck() {
    if (!query.trim()) return;
    setChecking(true);
    setLocationError('');
    try {
      const res = await api.get('/tables/geocode-check', { params: { q: query.trim() } });
      const { status, lat, lng, displayName } = res.data;
      if (status === 'ok') {
        onConfirm({ lat, lng, query: displayName || query.trim() });
      } else if (status === 'needs_confirm') {
        setGeocodeConfirm({ displayName, lat, lng });
      } else {
        setLocationError('Ort nicht gefunden. Bitte genauer eingeben (z.B. "Marienplatz München").');
      }
    } catch {
      setLocationError('Ort konnte nicht geprüft werden. Bitte erneut versuchen.');
    } finally {
      setChecking(false);
    }
  }

  if (geocodeConfirm) {
    return (
      <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/80" onClick={onClose}>
        <div className="bg-dark-card rounded-t-3xl w-full max-w-md p-6 shadow-2xl border-t border-dark-separator" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)' }} onClick={e => e.stopPropagation()}>
          <p className="text-2xl mb-3">📍</p>
          <h3 className="text-lg font-bold text-white mb-2">Meintest du diesen Ort?</h3>
          <p className="text-sm text-white/70 mb-6 leading-relaxed">{geocodeConfirm.displayName}</p>
          <div className="flex gap-3">
            <button
              onClick={() => onConfirm({ lat: geocodeConfirm.lat, lng: geocodeConfirm.lng, query: geocodeConfirm.displayName })}
              className="flex-1 py-3 rounded-2xl text-white font-bold text-sm tinder-gradient"
            >
              Ja, das stimmt
            </button>
            <button
              onClick={() => setGeocodeConfirm(null)}
              className="flex-1 py-3 rounded-2xl font-semibold text-sm text-white/70"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              Nein, neu eingeben
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/80" onClick={onClose}>
      <div className="bg-dark-card rounded-t-3xl w-full max-w-md p-6 shadow-2xl border-t border-dark-separator" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-white">🔥 Wo ist was los?</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-dark-elevated flex items-center justify-center">
            <X size={16} className="text-white/50" />
          </button>
        </div>
        <p className="text-sm text-white/40 mb-5">Wo soll die Heatmap angezeigt werden?</p>

        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setLocationError(''); }}
              placeholder="z.B. Marienplatz München…"
              className="flex-1 border border-dark-separator rounded-xl px-4 py-3 text-sm bg-dark-elevated text-white focus:outline-none focus:border-app-violet focus:ring-1 focus:ring-app-violet/30 placeholder-white/25"
              onKeyDown={e => e.key === 'Enter' && handleCheck()}
            />
            <button
              onClick={handleCheck}
              disabled={!query.trim() || checking}
              className="tinder-gradient text-white px-4 rounded-xl font-semibold text-sm disabled:opacity-40 flex items-center gap-1"
            >
              {checking ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Los'}
            </button>
          </div>

          {locationError && (
            <p className="text-xs text-red-400">{locationError}</p>
          )}

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-dark-separator" />
            <span className="text-xs text-white/25">oder</span>
            <div className="flex-1 h-px bg-dark-separator" />
          </div>

          <button
            onClick={handleGps}
            disabled={gpsLoading}
            className="w-full flex items-center justify-center gap-2 border-2 border-app-violet text-app-neon py-3 rounded-xl text-sm font-semibold active:scale-95 transition disabled:opacity-60"
          >
            {gpsLoading
              ? <div className="w-4 h-4 border-2 border-app-violet border-t-transparent rounded-full animate-spin" />
              : <Navigation size={16} />}
            Aktueller Standort
          </button>

          {gpsError && <p className="text-xs text-red-400 text-center">{gpsError}</p>}
        </div>
      </div>
    </div>
  );
}

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ offers: 0, matches: 0 });
  const [pendingInvites, setPendingInvites] = useState(0);
  const [showHeatModal, setShowHeatModal] = useState(false);
  const location = useLocation();
  useEffect(() => { setShowHeatModal(false); }, [location.pathname]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [selectedHost, setSelectedHost] = useState(null);
  const [myRank, setMyRank] = useState(null);

  useEffect(() => {
    loadStats();
    loadLeaderboard();
    if (FEATURES.howsMyStyle) loadPendingInvites();

    const socket = connectSocket();
    if (socket) {
      socket.on('leaderboard_update', setLeaderboard);
      return () => socket.off('leaderboard_update', setLeaderboard);
    }
  }, []);

  async function loadStats() {
    try {
      const [offersRes, matchesRes] = await Promise.all([
        api.get('/tables/offers/mine'),
        api.get('/matching/matches'),
      ]);
      setStats({
        offers: offersRes.data.filter(o => o.status === 'active').length,
        matches: matchesRes.data.length,
      });
    } catch (err) {}
  }

  async function loadLeaderboard() {
    try {
      const [lbRes, rankRes] = await Promise.all([
        api.get('/leaderboard'),
        api.get('/leaderboard/my-rank'),
      ]);
      setLeaderboard(lbRes.data);
      setMyRank(rankRes.data);
    } catch (err) {}
  }

  async function loadPendingInvites() {
    try {
      const { data } = await api.get('/style/invites/pending');
      setPendingInvites(data.length);
    } catch (err) {}
  }

  return (
    <div className="px-4 pt-12 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-black text-white">
            {t('greeting')}{user?.displayName ? `, ${user.displayName}` : ''}!
          </h1>
          <p className="text-white/40 text-sm mt-0.5">{t('findPlaceOnWiesn')}</p>
        </div>
        <button
          onClick={() => navigate('/profile')}
          className="w-12 h-12 rounded-2xl overflow-hidden shadow-lg active:scale-90 transition"
          style={{ border: '2px solid rgba(124,58,237,0.6)' }}
        >
          {user?.photo ? (
            <img src={user.photo} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full tinder-gradient flex items-center justify-center">
              <span className="text-white font-bold text-lg">{user?.displayName?.charAt(0) || '?'}</span>
            </div>
          )}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button onClick={() => navigate('/offer')} className="glass rounded-2xl p-4 text-left active:scale-95 transition">
          <TrendingUp size={18} className="text-app-neon mb-2" />
          <p className="text-2xl font-black text-white">{stats.offers}</p>
          <p className="text-xs text-white/40">{t('activeOffers')}</p>
        </button>
        <button onClick={() => navigate('/matches')} className="glass rounded-2xl p-4 text-left active:scale-95 transition">
          <Star size={18} className="text-tinder-yellow mb-2" />
          <p className="text-2xl font-black text-white">{stats.matches}</p>
          <p className="text-xs text-white/40">{t('yourMatches')}</p>
        </button>
      </div>

      {/* Action Cards */}
      <div className="space-y-3">

        <div className="flex gap-3">
          {/* About yesterday */}
          {FEATURES.yesterday && (
            <button
              onClick={() => navigate('/yesterday')}
              className="rounded-2xl flex items-center justify-center active:scale-95 transition-transform shrink-0"
              style={{ background: 'linear-gradient(180deg, #166534 0%, #4ADE80 35%, #15803D 50%, #86EFAC 70%, #166534 100%)', width: '52px' }}
            >
              <span
                className="text-white font-bold text-xs tracking-widest select-none"
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', letterSpacing: '0.12em' }}
              >
                About yesterday
              </span>
            </button>
          )}

          <div className="flex-1 flex flex-col gap-3">

            {/* Platz anbieten + Platz finden: gleiche Höhe via Grid */}
            <div className="grid gap-3" style={{ gridTemplateRows: '1fr 1fr' }}>

            {/* Platz anbieten */}
            <div
              onClick={() => navigate('/offer')}
              className="w-full h-full rounded-2xl p-5 flex items-center gap-4 min-h-[100px] cursor-pointer active:scale-95 transition-transform"
              style={{ background: 'linear-gradient(135deg, #374151 0%, #9CA3AF 40%, #D1D5DB 52%, #9CA3AF 65%, #374151 100%)' }}
            >
              <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                <PlusCircle size={22} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-white">{t('offerPlace')}</h3>
                <p className="text-white/60 text-xs">{t('offerPlaceDesc')}</p>
              </div>
            </div>

            {/* Platz finden */}
            <div
              className="w-full h-full rounded-2xl p-5 flex items-center gap-4 min-h-[100px]"
              style={{ background: 'linear-gradient(135deg, #4C1D95 0%, #7C3AED 35%, #A78BFA 52%, #EC4899 70%, #831843 100%)' }}
            >
              <div
                onClick={() => navigate('/discover')}
                className="w-11 h-11 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center shrink-0 cursor-pointer active:scale-90 transition"
              >
                <Search size={22} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-white">{t('findPlace')}</h3>
                <p className="text-white/60 text-xs">{t('findPlaceDesc')}</p>
              </div>
              <div
                onClick={() => navigate('/map', { state: { mode: 'seek' } })}
                className="shrink-0 flex flex-col items-center gap-1 bg-black/20 hover:bg-black/30 rounded-xl px-3 py-2 transition cursor-pointer active:scale-90"
              >
                <Map size={16} className="text-white/80" />
                <span className="text-[10px] text-white/70 font-medium">Karte</span>
              </div>
            </div>
            </div>{/* end equal-height grid */}

            {/* Where's the heat */}
            <button
              onClick={() => setShowHeatModal(true)}
              className="w-full rounded-2xl p-5 text-left flex items-center gap-4 active:scale-[0.98] transition-transform"
              style={{ background: 'linear-gradient(135deg, #92400E 0%, #F59E0B 35%, #FCD34D 52%, #EF4444 70%, #7F1D1D 100%)' }}
            >
              <div className="w-11 h-11 bg-white/15 rounded-xl flex items-center justify-center shrink-0 text-xl">
                🔥
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Wo ist was los?</h3>
                <p className="text-white/60 text-xs">Zeig mir die heiße Zone</p>
              </div>
            </button>

            {/* Life Feed */}
            {FEATURES.lifeFeed && (
              <button
                onClick={() => navigate('/feed')}
                className="w-full rounded-2xl p-5 text-left flex items-center gap-4 active:scale-[0.98] transition"
                style={{ background: 'linear-gradient(135deg, #7F1D1D 0%, #B91C1C 35%, #F87171 52%, #B91C1C 70%, #7F1D1D 100%)' }}
              >
                <div className="w-11 h-11 bg-white/15 rounded-xl flex items-center justify-center shrink-0">
                  <span className="text-xl">🎥</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Life Feed</h3>
                  <p className="text-white/60 text-xs">Aktuelle Momente entdecken</p>
                </div>
              </button>
            )}

          </div>
        </div>
      </div>

      {showHeatModal && (
        <HeatLocationModal
          onClose={() => setShowHeatModal(false)}
          onConfirm={({ lat, lng, query }) => {
            setShowHeatModal(false);
            navigate('/heatmap', { state: { lat, lng, query } });
          }}
        />
      )}

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="mt-8 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🏆</span>
            <h2 className="text-base font-bold text-white">Top {leaderboard.length} Member — meiste Matches</h2>
          </div>
          <div className="glass rounded-2xl overflow-hidden">
            {leaderboard.map((entry, i) => {
              const isPublic = entry.top10_public === 1;
              return (
                <div
                  key={entry.id}
                  onClick={() => isPublic && setSelectedHost(entry.id)}
                  className={`flex items-center gap-3 px-4 py-3 ${i < leaderboard.length - 1 ? 'border-b border-dark-separator' : ''} ${isPublic ? 'active:bg-white/5 cursor-pointer' : ''}`}
                >
                  <span className={`w-6 text-center font-bold text-sm ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-white/50' : i === 2 ? 'text-amber-500' : 'text-white/30'}`}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                  </span>
                  {entry.photo_1 ? (
                    <img src={entry.photo_1} className="w-9 h-9 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-base" style={{ background: 'linear-gradient(135deg, #0891B2, #06B6D4)' }}>
                      {entry.emoji || entry.display_name?.[0] || '👤'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-white truncate">{entry.display_name}</p>
                    <p className="text-xs text-white/30">@{entry.username}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="font-bold text-sm text-app-pink">{entry.confirmed_matches}</p>
                      <p className="text-xs text-white/30">Matches</p>
                    </div>
                    {isPublic && (
                      <span className="bg-tinder-cyan/20 text-tinder-cyan text-xs font-semibold px-2.5 py-1 rounded-lg shrink-0 border border-tinder-cyan/30">
                        Profil
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedHost && (
        <HostProfileModal userId={selectedHost} onClose={() => setSelectedHost(null)} />
      )}
    </div>
  );
}
