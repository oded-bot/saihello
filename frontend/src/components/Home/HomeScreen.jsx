import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Search, PlusCircle, Star, TrendingUp, X, CalendarDays, MessageCircle } from 'lucide-react';
import useAuthStore from '../../context/authStore';
import useLanguage from '../../hooks/useLanguage';
import api from '../../utils/api';
import { FEATURES } from '../../config/features';
import { connectSocket } from '../../utils/socket';

const EVENT_TYPE_LABEL = {
  table:   'Platz & Tisch',
  street:  'Straßenfest',
  camping: 'Festival',
  mixed:   'Gemischt',
};

const GERMAN_STATES = new Set([
  'Bayern','NRW','Baden-Württemberg','Hamburg','Berlin','Brandenburg',
  'Bremen','Mecklenburg-Vorp.','Niedersachsen','Rheinland-Pfalz',
  'Sachsen','Sachsen-Anhalt','Schleswig-Holstein','Thüringen','Hessen','Saarland',
]);

function getCountry(ev) {
  if (!ev.state) return 'Sonstige';
  return GERMAN_STATES.has(ev.state) ? 'Deutschland' : ev.state;
}

function groupByCountry(events) {
  const map = new Map();
  events.forEach(ev => {
    const country = getCountry(ev);
    if (!map.has(country)) map.set(country, []);
    map.get(country).push(ev);
  });
  // Deutschland first, then alphabetical
  const sorted = [...map.entries()].sort(([a], [b]) => {
    if (a === 'Deutschland') return -1;
    if (b === 'Deutschland') return 1;
    return a.localeCompare(b, 'de');
  });
  return sorted;
}

function NextEventModal({ onClose, events, loading, onSelectEvent }) {
  const [search, setSearch] = useState('');
  const filtered = search.trim()
    ? events.filter(ev => ev.name.toLowerCase().includes(search.toLowerCase()) || (ev.city || '').toLowerCase().includes(search.toLowerCase()))
    : events;
  const groups = groupByCountry(filtered);

  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/60" onClick={onClose}>
      <div className="bg-white dark:bg-dark-card rounded-t-3xl w-full max-w-md shadow-2xl" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)' }} onClick={e => e.stopPropagation()}>
        <div className="px-6 pt-6 pb-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">📅 Nächste Events</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-dark-elevated flex items-center justify-center">
              <X size={16} className="text-gray-500" />
            </button>
          </div>
          <input
            type="text"
            placeholder="Event oder Stadt suchen..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-2 bg-gray-100 dark:bg-dark-elevated rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
          />
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="overflow-y-auto max-h-[65vh] px-6 pb-4">
            {groups.length === 0 && <p className="text-center text-gray-400 text-sm py-8">Keine Events gefunden</p>}
            {groups.map(([country, evs]) => (
              <div key={country} className="mb-4">
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">{country}</p>
                <div className="space-y-2">
                  {evs.map(ev => (
                    <button
                      key={ev.id}
                      onClick={() => onSelectEvent(ev.id)}
                      className="w-full flex items-center gap-3 bg-gray-50 dark:bg-dark-elevated rounded-2xl p-3 text-left active:scale-[0.98] transition-transform"
                    >
                      <span className="text-2xl">{ev.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{ev.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{ev.date_text} · {ev.city}</p>
                      </div>
                      <span className="text-[10px] font-semibold text-tinder-pink bg-pink-50 dark:bg-pink-900/20 px-2 py-0.5 rounded-full shrink-0">
                        {EVENT_TYPE_LABEL[ev.event_type] || ev.event_type}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
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
  const [showNextEventModal, setShowNextEventModal] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);

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

  async function loadUpcomingEvents() {
    setEventsLoading(true);
    try {
      const { data } = await api.get('/events');
      setUpcomingEvents(data);
    } catch (err) {}
    finally { setEventsLoading(false); }
  }

  async function loadLeaderboard() {
    try {
      const { data } = await api.get('/leaderboard');
      setLeaderboard(data);
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

        {/* 1. Platz anbieten — volle Breite */}
        <button
          onClick={() => navigate('/offer')}
          className="w-full rounded-2xl p-5 text-left flex items-center gap-4 active:scale-[0.98] transition-transform shadow-lg"
          style={{ backgroundColor: '#334155' }}
        >
          <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center shrink-0">
            <PlusCircle size={30} className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{t('offerPlace')}</h3>
            <p className="text-white/70 text-sm">{t('offerPlaceDesc')}</p>
          </div>
        </button>

        {/* 2–4 Karten + optionaler About-yesterday-Streifen links */}
        <div className="flex gap-3">

          {/* About yesterday — senkrechter Streifen links */}
          {FEATURES.yesterday && !FEATURES.preEventMode && (
            <button
              onClick={() => navigate('/yesterday')}
              className="rounded-2xl shadow-lg flex items-center justify-center active:scale-95 transition-transform shrink-0"
              style={{ backgroundColor: '#0ea5e9', width: '52px' }}
            >
              <span
                className="text-white font-bold text-xs tracking-widest select-none"
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', letterSpacing: '0.12em' }}
              >
                About yesterday
              </span>
            </button>
          )}

          {/* Rechte Spalte: Platz finden, Chats, Life Feed */}
          <div className="flex-1 flex flex-col gap-4">

            {/* Platz finden */}
            <button
              onClick={() => navigate('/discover')}
              className="w-full tinder-gradient rounded-2xl p-5 text-left flex items-center gap-4 active:scale-[0.98] transition-transform shadow-lg"
            >
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center shrink-0">
                <Search size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{t('findPlace')}</h3>
                <p className="text-white/70 text-xs">{t('findPlaceDesc')}</p>
              </div>
            </button>

            {/* Chats */}
            <button
              onClick={() => navigate('/chat')}
              className="w-full rounded-2xl p-5 text-left flex items-center gap-4 active:scale-[0.98] transition-transform shadow-lg"
              style={{ backgroundColor: '#0284c7' }}
            >
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center shrink-0">
                <MessageCircle size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{t('chat')}</h3>
                <p className="text-white/70 text-xs">Deine Gespräche &amp; Einladungen</p>
              </div>
            </button>

            {/* Life Feed */}
            {FEATURES.lifeFeed && !FEATURES.preEventMode && (
              <button
                onClick={() => navigate('/feed')}
                className="w-full rounded-2xl p-5 text-left flex items-center gap-4 active:scale-[0.98] transition-transform shadow-lg"
                style={{ backgroundColor: '#7c3aed' }}
              >
                <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center shrink-0">
                  <span className="text-2xl">🎥</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-white">Life Feed</h3>
                  <p className="text-white/70 text-xs">Aktuelle Feier-Momente entdecken</p>
                </div>
              </button>
            )}

          </div>
        </div>

      </div>

      {showNextEventModal && (
        <NextEventModal
          onClose={() => setShowNextEventModal(false)}
          events={upcomingEvents}
          loading={eventsLoading}
          onSelectEvent={(id) => { setShowNextEventModal(false); navigate(`/tracker?event=${id}`); }}
        />
      )}}

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="mt-8 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🏆</span>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Top 10 Gastgeber</h2>
          </div>
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow overflow-hidden">
            {leaderboard.map((entry, i) => (
              <div
                key={entry.id}
                className={`flex items-center gap-3 px-4 py-3 ${i < leaderboard.length - 1 ? 'border-b border-gray-100 dark:border-dark-separator' : ''}`}
              >
                <span className={`w-6 text-center font-bold text-sm ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-600' : 'text-gray-400'}`}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                </span>
                {entry.photo_1 ? (
                  <img src={entry.photo_1} className="w-9 h-9 rounded-full object-cover" alt="" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center text-base">
                    {entry.emoji || entry.display_name?.[0] || '👤'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{entry.display_name}</p>
                  <p className="text-xs text-gray-400">@{entry.username}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm text-tinder-pink">{entry.confirmed_count}</p>
                  <p className="text-xs text-gray-400">Einladungen</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nächstes Event — kompakt, unter Leaderboard */}
      {FEATURES.nextEvent && (
        <button
          onClick={() => { setShowNextEventModal(true); if (!upcomingEvents.length) loadUpcomingEvents(); }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left active:scale-[0.98] transition-transform mb-6"
          style={{ backgroundColor: '#f59e0b' }}
        >
          <CalendarDays size={18} className="text-white shrink-0" />
          <span className="text-sm text-white font-medium">Nächste Events</span>
          <span className="ml-auto text-xs text-white/70">→</span>
        </button>
      )}
    </div>
  );
}
