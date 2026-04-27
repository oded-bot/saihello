import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Search, PlusCircle, Star, TrendingUp, Sparkles, X, HelpCircle, Navigation, MapPin } from 'lucide-react';
import useAuthStore from '../../context/authStore';
import useLanguage from '../../hooks/useLanguage';
import api from '../../utils/api';
import { FEATURES } from '../../config/features';

function HowItWorksModal({ onClose, onDontShow }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-dark-card rounded-t-3xl w-full max-w-md p-6 pb-10 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Wie funktioniert Servus Wiesn?</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-dark-elevated flex items-center justify-center">
            <X size={16} className="text-gray-500" />
          </button>
        </div>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
          <div className="flex gap-3">
            <span className="text-xl shrink-0">🍺</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white mb-0.5">Platz anbieten</p>
              <p>Du hast noch freie Plätze am Tisch? Erstelle ein Angebot mit Zelt, Datum und Uhrzeit, und mache ein Foto von dir oder eurer Tischgruppe – und finde passende Mitbesucher.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-xl shrink-0">🔍</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white mb-0.5">Platz finden</p>
              <p>Swipe durch verfügbare Tische, und mache ein Foto von dir oder eurer Gruppe. Gefällt dir ein Angebot, wische nach rechts. Der Anbieter entscheidet, ob er dich einlädt.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-xl shrink-0">✅</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white mb-0.5">Match & Chat</p>
              <p>Nimmst du eine Einladung an, ist der Platz gesichert. Im Chat klärt ihr danach die Details.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-xl shrink-0">⭐</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white mb-0.5">Show Us Your Style</p>
              <p>Lade ein Foto von dir hoch und lass dich entdecken. Wer deinen Style mit 🤩 bewertet, einen freien Tisch hat und zu dir passt, kann dich direkt einladen – ohne normales Matching.</p>
            </div>
          </div>
        </div>
        <button
          onClick={onDontShow}
          className="mt-6 w-full py-2.5 rounded-xl border border-gray-200 dark:border-dark-separator text-gray-400 text-sm active:scale-95 transition"
        >
          Nicht mehr zeigen
        </button>
      </div>
    </div>
  );
}

function HeatLocationModal({ onClose, onConfirm }) {
  const [query, setQuery] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');

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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-dark-card rounded-t-3xl w-full max-w-md p-6 pb-10 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">🔥 Where's the heat?</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-dark-elevated flex items-center justify-center">
            <X size={16} className="text-gray-500" />
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Wo soll die Heatmap angezeigt werden?</p>

        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="z.B. Marienplatz München, Times Square…"
              className="flex-1 border border-gray-200 dark:border-dark-separator rounded-xl px-4 py-3 text-sm bg-gray-50 dark:bg-dark-elevated text-gray-900 dark:text-white focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400/30 placeholder-gray-400"
              onKeyDown={e => e.key === 'Enter' && query.trim() && onConfirm({ query: query.trim() })}
            />
            <button
              onClick={() => query.trim() && onConfirm({ query: query.trim() })}
              disabled={!query.trim()}
              className="bg-orange-500 text-white px-4 rounded-xl font-semibold text-sm disabled:opacity-40"
            >
              Los
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200 dark:bg-dark-separator" />
            <span className="text-xs text-gray-400">oder</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-dark-separator" />
          </div>

          <button
            onClick={handleGps}
            disabled={gpsLoading}
            className="w-full flex items-center justify-center gap-2 border-2 border-orange-400 text-orange-500 py-3 rounded-xl text-sm font-semibold active:scale-95 transition disabled:opacity-60"
          >
            {gpsLoading
              ? <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
              : <Navigation size={16} />}
            Aktueller Standort
          </button>

          {gpsError && <p className="text-xs text-red-500 text-center">{gpsError}</p>}
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
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showHeatModal, setShowHeatModal] = useState(false);
  const hideHowItWorks = localStorage.getItem('hideHowItWorks') === 'true';

  useEffect(() => {
    loadStats();
    if (FEATURES.howsMyStyle) loadPendingInvites();
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

  async function loadPendingInvites() {
    try {
      const { data } = await api.get('/style/invites/pending');
      setPendingInvites(data.length);
    } catch (err) {}
  }

  return (
    <div className="px-5 pt-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('greeting')}{user?.displayName ? `, ${user.displayName}` : ''}!
          </h1>
          <p className="text-gray-400 text-sm mt-1">{t('findPlaceOnWiesn')}</p>
        </div>
        <button
          onClick={() => navigate('/profile')}
          className="w-14 h-14 tinder-gradient rounded-full flex items-center justify-center shadow-lg active:scale-90 transition"
        >
          <Flame size={26} className="text-white" fill="white" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <button onClick={() => navigate('/offer')} className="bg-gray-200 dark:bg-gray-600 rounded-2xl p-4 text-left active:scale-95 transition dark-transition">
          <TrendingUp size={20} className="text-tinder-pink mb-2" />
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.offers}</p>
          <p className="text-xs text-gray-500 dark:text-gray-300">{t('activeOffers')}</p>
        </button>
        <button onClick={() => navigate('/matches')} className="bg-gray-200 dark:bg-gray-600 rounded-2xl p-4 text-left active:scale-95 transition dark-transition">
          <Star size={20} className="text-tinder-yellow mb-2" />
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.matches}</p>
          <p className="text-xs text-gray-500 dark:text-gray-300">{t('yourMatches')}</p>
        </button>
      </div>

      {/* Action Cards */}
      <div className="space-y-4">
        <button
          onClick={() => navigate('/discover')}
          className="w-full tinder-gradient rounded-2xl p-5 text-left flex items-center gap-4 active:scale-[0.98] transition-transform shadow-lg"
        >
          <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center shrink-0">
            <Search size={28} className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{t('findPlace')}</h3>
            <p className="text-white/70 text-sm">{t('findPlaceDesc')}</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/offer')}
          className="w-full bg-gray-500 dark:bg-gray-600 rounded-2xl p-5 text-left flex items-center gap-4 active:scale-[0.98] transition-transform shadow-lg dark-transition"
        >
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
            <PlusCircle size={28} className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{t('offerPlace')}</h3>
            <p className="text-white/50 text-sm">{t('offerPlaceDesc')}</p>
          </div>
        </button>

        {FEATURES.howsMyStyle && (
          <button
            onClick={() => navigate('/style')}
            className="w-full rounded-2xl p-5 text-left flex items-center gap-4 active:scale-[0.98] transition-transform shadow-lg relative"
            style={{ backgroundColor: '#38bdf8' }}
          >
            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center shrink-0">
              <Sparkles size={28} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white">Show Us Your Style</h3>
              <p className="text-white/70 text-sm">Zeig deinen Look – werde entdeckt!</p>
            </div>
            {pendingInvites > 0 && (
              <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shrink-0">
                <span className="text-xs font-bold" style={{ color: '#38bdf8' }}>{pendingInvites}</span>
              </div>
            )}
          </button>
        )}

        <button
          onClick={() => setShowHeatModal(true)}
          className="w-full rounded-2xl p-5 text-left flex items-center gap-4 active:scale-[0.98] transition-transform shadow-lg"
          style={{ backgroundColor: '#f97316' }}
        >
          <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center shrink-0 text-3xl">
            🔥
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Where's the heat?</h3>
            <p className="text-white/70 text-sm">Zeig mir, wo gerade was los ist</p>
          </div>
        </button>

        {!hideHowItWorks && (
          <button
            onClick={() => setShowHowItWorks(true)}
            className="w-full rounded-2xl p-5 text-left flex items-center gap-4 active:scale-[0.98] transition-transform shadow-lg"
            style={{ backgroundColor: '#4ade80' }}
          >
            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center shrink-0">
              <HelpCircle size={28} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">How ServusWiesn Works</h3>
              <p className="text-white/70 text-sm">Kurze Erklärung der App-Funktionen</p>
            </div>
          </button>
        )}
      </div>

      {showHowItWorks && (
        <HowItWorksModal
          onClose={() => setShowHowItWorks(false)}
          onDontShow={() => {
            localStorage.setItem('hideHowItWorks', 'true');
            setShowHowItWorks(false);
          }}
        />
      )}

      {showHeatModal && (
        <HeatLocationModal
          onClose={() => setShowHeatModal(false)}
          onConfirm={({ lat, lng, query }) => {
            setShowHeatModal(false);
            navigate('/heatmap', { state: { lat, lng, query } });
          }}
        />
      )}
    </div>
  );
}
