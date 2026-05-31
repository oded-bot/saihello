import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Flame, Clock } from 'lucide-react';
import api from '../../utils/api';
import useLanguage from '../../hooks/useLanguage';

export default function MatchesScreen() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    loadMatches();
  }, []);

  async function loadMatches() {
    try {
      const { data } = await api.get('/matching/matches');
      setMatches(data);
    } catch (err) {
      // stille
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Flame size={32} className="text-tinder-pink animate-bounce" fill="currentColor" />
      </div>
    );
  }

  function formatExpiry(expiresAt) {
    if (!expiresAt) return null;
    const exp = new Date(expiresAt);
    const now = new Date();
    const diffMs = exp - now;
    if (diffMs <= 0) return 'Abgelaufen';
    const diffH = Math.floor(diffMs / 3600000);
    const diffM = Math.floor((diffMs % 3600000) / 60000);
    if (diffH > 0) return `Läuft ab in ${diffH}h ${diffM}min`;
    return `Läuft ab in ${diffM} Min`;
  }

  const pendingMatches = matches.filter(m => m.status === 'pending' || m.status === 'active');
  const confirmedMatches = matches.filter(m => m.status === 'confirmed');

  function MatchCard({ match }) {
    const isPending = match.status === 'pending' || match.status === 'active';
    const iAmSeeker = match.my_role === 'seeker';
    const expiryLabel = formatExpiry(match.expires_at);

    return (
      <button
        key={match.id}
        onClick={() => navigate(`/chat/${match.id}`)}
        className={`w-full rounded-2xl p-4 flex items-center gap-4 shadow-sm border transition text-left dark-transition ${
          isPending
            ? 'bg-white/5 border-violet-500/30 dark:bg-dark-card'
            : 'bg-white dark:bg-dark-card border-gray-100 dark:border-dark-separator active:bg-gray-50 dark:active:bg-dark-elevated'
        }`}
      >
        <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 overflow-hidden bg-gradient-to-br from-tinder-pink to-tinder-orange">
          {match.partner_photo ? (
            <img src={match.partner_photo} alt="" className="w-full h-full object-cover rounded-full" />
          ) : (
            <span className="text-white text-lg font-bold w-full h-full flex items-center justify-center rounded-full">
              {match.partner_name?.charAt(0) || '?'}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 dark:text-white">{match.partner_name}</span>
            {match.partner_verified && <Star size={12} className="text-tinder-yellow fill-tinder-yellow" />}
          </div>
          {isPending ? (
            <p className="text-xs mt-1 leading-relaxed text-white/50">
              {iAmSeeker
                ? 'Like raus 💛 — warte ob sie zurückliken.'
                : 'Hat dein Angebot geliked 💛 — magst du zurück?'}
            </p>
          ) : (
            <>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                <Flame size={12} className="text-tinder-orange" />
                <span>{match.location_text}</span>
                {match.date && <><span>·</span><span>{new Date(match.date).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}</span></>}
              </div>
              {match.last_message && (
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">{match.last_message}</p>
              )}
            </>
          )}
        </div>

        <div className="shrink-0 flex flex-col items-end gap-1">
          {match.unread_count > 0 && (
            <div className="w-6 h-6 tinder-gradient rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-white">{match.unread_count}</span>
            </div>
          )}
          {isPending && expiryLabel ? (
            <div className="flex items-center gap-1 text-orange-400/80">
              <Clock size={10} />
              <span className="text-[10px] font-medium">{expiryLabel}</span>
            </div>
          ) : (
            <span className="text-xs text-gray-400">{t('confirmed')}</span>
          )}
        </div>
      </button>
    );
  }

  return (
    <div className="px-5 pt-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t('matchesTitle')}</h1>

      {matches.length === 0 ? (
        <div className="text-center py-20">
          <Flame size={48} className="text-gray-200 dark:text-gray-700 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400">{t('noMatches')}</h3>
          <p className="text-gray-400 text-sm mt-2">{t('swipeMore')}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {pendingMatches.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Ausstehende Anfragen</p>
              <div className="space-y-3">
                {pendingMatches.map(m => <MatchCard key={m.id} match={m} />)}
              </div>
            </div>
          )}
          {confirmedMatches.length > 0 && (
            <div>
              {pendingMatches.length > 0 && <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Chats</p>}
              <div className="space-y-3">
                {confirmedMatches.map(m => <MatchCard key={m.id} match={m} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
