import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Flame, MessageCircle } from 'lucide-react';
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
        <div className="space-y-3">
          {matches.map((match) => (
            <button
              key={match.id}
              onClick={() => navigate(`/chat/${match.id}`)}
              className="w-full bg-white dark:bg-dark-card rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-gray-100 dark:border-dark-separator active:bg-gray-50 dark:active:bg-dark-elevated transition text-left dark-transition"
            >
              {/* Avatar */}
              <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 overflow-hidden ${
                match.swipe_direction === 'superlike'
                  ? 'ring-[3px] ring-tinder-cyan ring-offset-2 ring-offset-white dark:ring-offset-dark-card'
                  : 'bg-gradient-to-br from-tinder-pink to-tinder-orange'
              }`}>
                {match.partner_photo ? (
                  <img src={match.partner_photo} alt="" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <span className="text-white text-lg font-bold bg-gradient-to-br from-tinder-pink to-tinder-orange w-full h-full flex items-center justify-center rounded-full">
                    {match.partner_name?.charAt(0) || '?'}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 dark:text-white">{match.partner_name}</span>
                  {match.partner_verified && <Star size={12} className="text-tinder-yellow fill-tinder-yellow" />}
                  <span className="text-gray-400 text-sm">{match.partner_age}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <Flame size={12} className="text-tinder-orange" />
                  <span>{match.tent_name}</span>
                  <span>·</span>
                  <span>{new Date(match.date).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}</span>
                </div>
                {match.last_message && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">{match.last_message}</p>
                )}
              </div>

              {/* Unread Badge */}
              <div className="shrink-0 flex flex-col items-end gap-1">
                {match.unread_count > 0 && (
                  <div className="w-6 h-6 tinder-gradient rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-white">{match.unread_count}</span>
                  </div>
                )}
                <span className="text-xs text-gray-400">
                  {match.status === 'confirmed' ? t('confirmed') : t('active')}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
