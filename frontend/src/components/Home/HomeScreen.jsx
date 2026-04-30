import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Search, PlusCircle, Star, TrendingUp, X, CalendarDays } from 'lucide-react';
import useAuthStore from '../../context/authStore';
import useLanguage from '../../hooks/useLanguage';
import api from '../../utils/api';
import { FEATURES } from '../../config/features';
import { connectSocket } from '../../utils/socket';

const NEXT_EVENTS = [
  { emoji: '🍺', name: 'Oktoberfest', date: '18. Sep – 4. Okt 2027', city: 'München' },
  { emoji: '🎭', name: 'Kölner Karneval', date: '8. – 12. Feb 2027', city: 'Köln' },
  { emoji: '🎉', name: 'Mardi Gras', date: '16. Feb 2027', city: 'New Orleans' },
];

function NextEventModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/60" onClick={onClose}>
      <div className="bg-white dark:bg-dark-card rounded-t-3xl w-full max-w-md p-6 shadow-2xl" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">📅 Nächste Events</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-dark-elevated flex items-center justify-center">
            <X size={16} className="text-gray-500" />
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">ServusWiesn ist dabei — sei es auch.</p>
        <div className="space-y-3">
          {NEXT_EVENTS.map(ev => (
            <div key={ev.name} className="flex items-center gap-4 bg-gray-50 dark:bg-dark-elevated rounded-2xl p-4">
              <span className="text-3xl">{ev.emoji}</span>
              <div className="flex-1">
                <p className="font-bold text-gray-900 dark:text-white text-sm">{ev.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{ev.date} · {ev.city}</p>
              </div>
              <span className="text-xs font-semibold text-tinder-pink bg-pink-50 dark:bg-pink-900/20 px-3 py-1 rounded-full">Bald</span>
            </div>
          ))}
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
  const [showNextEventModal, setShowNextEventModal] = useState(false);
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

        {/* 1. Nächstes Event — volle Breite */}
        {FEATURES.nextEvent && (
          <button
            onClick={() => setShowNextEventModal(true)}
            className="w-full rounded-2xl p-5 text-left flex items-center gap-4 active:scale-[0.98] transition-transform shadow-lg"
            style={{ backgroundColor: '#0f766e' }}
          >
            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center shrink-0">
              <CalendarDays size={30} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Nächstes Event</h3>
              <p className="text-white/70 text-sm">Schau, wo ServusWiesn als Nächstes dabei ist</p>
            </div>
          </button>
        )}

        {/* 2–4 Karten + optionaler About-yesterday-Streifen links */}
        <div className="flex gap-3">

          {/* About yesterday — senkrechter Streifen links */}
          {FEATURES.yesterday && (
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

          {/* Rechte Spalte: Platz finden, Platz anbieten, Life Feed */}
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

            {/* Platz anbieten */}
            <button
              onClick={() => navigate('/offer')}
              className="w-full bg-gray-500 dark:bg-gray-600 rounded-2xl p-5 text-left flex items-center gap-4 active:scale-[0.98] transition-transform shadow-lg dark-transition"
            >
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
                <PlusCircle size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{t('offerPlace')}</h3>
                <p className="text-white/50 text-xs">{t('offerPlaceDesc')}</p>
              </div>
            </button>

            {/* Life Feed */}
            {FEATURES.lifeFeed && (
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

      {showNextEventModal && <NextEventModal onClose={() => setShowNextEventModal(false)} />}

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="mt-8 mb-6">
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
    </div>
  );
}
