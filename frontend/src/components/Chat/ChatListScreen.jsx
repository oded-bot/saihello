import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Flame, Star, Trash2, MapPin } from 'lucide-react';
import api from '../../utils/api';
import useLanguage from '../../hooks/useLanguage';
import toast from 'react-hot-toast';

export default function ChatListScreen() {
  const [matches, setMatches] = useState([]);
  const [yesterdayChats, setYesterdayChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteMenu, setDeleteMenu] = useState(null);
  const longPressRef = useRef(null);
  const { t, lang } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const [matchRes, ydRes] = await Promise.all([
        api.get('/matching/matches'),
        api.get('/yesterday/requests').catch(() => ({ data: [] })),
      ]);
      setMatches(matchRes.data);
      setYesterdayChats((ydRes.data || []).filter(r => r.status === 'accepted'));
    } catch (err) {
      // stille
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteChat(matchId) {
    try {
      await api.post(`/matching/matches/${matchId}/cancel`);
      setMatches(prev => prev.filter(m => m.id !== matchId));
      setDeleteMenu(null);
      toast.success(t('chatDeleted'));
    } catch (err) {
      toast.error(t('deleteFailed'));
    }
  }

  function onChatTouchStart(match, e) {
    longPressRef.current = setTimeout(() => {
      setDeleteMenu({ id: match.id, name: match.partner_name, y: e.touches?.[0]?.clientY || 300 });
      if (navigator.vibrate) navigator.vibrate(30);
    }, 500);
  }

  function onChatTouchEnd() {
    if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; }
  }

  function onChatTouchMove() {
    if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; }
  }

  function formatEventDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  function eventMeta(match) {
    if (match.status === 'pending') return null;
    const parts = [
      match.location_text,
      formatEventDate(match.date),
      match.time_from ? match.time_from.slice(0, 5) : null,
    ].filter(Boolean);
    return parts.length ? parts.join(' · ') : null;
  }

  function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('now');
    if (mins < 60) return lang === 'en' ? `${mins}m ago` : `vor ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return lang === 'en' ? `${hours}h ago` : `vor ${hours}h`;
    const days = Math.floor(hours / 24);
    return lang === 'en' ? `${days}d ago` : `vor ${days}d`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Flame size={32} className="text-tinder-pink animate-bounce" fill="currentColor" />
      </div>
    );
  }

  const requests = matches.filter(m => m.status === 'pending');
  const chats = matches.filter(m => m.status !== 'pending');
  const hasAnything = matches.length > 0 || yesterdayChats.length > 0;

  const renderMatchRow = (match) => (
    <button
      key={match.id}
      onClick={() => { if (!deleteMenu) navigate(`/chat/${match.id}`); }}
      onTouchStart={(e) => onChatTouchStart(match, e)}
      onTouchEnd={onChatTouchEnd}
      onTouchMove={onChatTouchMove}
      onContextMenu={(e) => { e.preventDefault(); setDeleteMenu({ id: match.id, name: match.partner_name, y: e.clientY || 300 }); }}
      className="w-full px-5 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-dark-elevated transition text-left select-none"
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-gray-900 dark:text-white text-[15px]">{match.partner_name}</span>
            {match.partner_verified && <Star size={12} className="text-tinder-yellow fill-tinder-yellow" />}
          </div>
          <span className="text-xs text-gray-400">{timeAgo(match.last_message_at || match.created_at)}</span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-sm truncate max-w-[200px] text-gray-500 dark:text-gray-400">
            {match.status === 'pending'
              ? (match.my_role === 'offerer' ? '👋 Möchte deinen Platz' : 'Anfrage gesendet…')
              : (match.last_message ? match.last_message : t('newMatch'))}
          </p>
          {match.unread_count > 0 && (
            <div className="w-5 h-5 tinder-gradient rounded-full flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-white">{match.unread_count}</span>
            </div>
          )}
        </div>
        {eventMeta(match) && (
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 truncate flex items-center gap-1">
            <MapPin size={10} className="shrink-0" />
            {eventMeta(match)}
          </p>
        )}
      </div>
    </button>
  );

  const renderYesterdayRow = (chat) => (
    <button
      key={chat.id}
      onClick={() => navigate(`/yesterday/chat/${chat.chatId}`)}
      className="w-full px-5 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-dark-elevated transition text-left"
    >
      <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 overflow-hidden bg-gradient-to-br from-violet-400 to-pink-400">
        {chat.otherUser?.photo ? (
          <img src={chat.otherUser.photo} alt="" className="w-full h-full object-cover rounded-full" />
        ) : (
          <span className="text-white text-lg font-bold">
            {chat.otherUser?.displayName?.charAt(0) || '?'}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-gray-900 dark:text-white text-[15px]">{chat.otherUser?.displayName}</span>
          <span className="text-xs text-gray-400">{timeAgo(chat.createdAt)}</span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">About yesterday · Match</p>
      </div>
    </button>
  );

  return (
    <div className="pt-8">
      <div className="px-5 mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('chats')}</h1>
      </div>

      {!hasAnything ? (
        <div className="text-center py-20 px-8">
          <MessageCircle size={48} className="text-gray-200 dark:text-gray-700 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400">{t('noChats')}</h3>
          <p className="text-gray-400 text-sm mt-2">{t('findMatchToChat')}</p>
        </div>
      ) : (
        <div>
          {/* Anfragen */}
          {requests.length > 0 && (
            <div>
              <div className="px-5 py-2 bg-violet-50 dark:bg-violet-900/20 border-b border-violet-100 dark:border-violet-800/30 flex items-center gap-2">
                <span className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wide">Anfragen</span>
                <span className="w-5 h-5 bg-violet-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{requests.length}</span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-dark-separator">
                {requests.map(renderMatchRow)}
              </div>
            </div>
          )}

          {/* Platz-Chats */}
          {chats.length > 0 && (
            <div>
              <div className="px-5 py-2 bg-gray-50 dark:bg-dark-elevated border-b border-gray-100 dark:border-dark-separator">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Chats</span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-dark-separator">
                {chats.map(renderMatchRow)}
              </div>
            </div>
          )}

          {/* Yesterday-Chats */}
          {yesterdayChats.length > 0 && (
            <div>
              <div className="px-5 py-2 bg-green-50 dark:bg-green-900/20 border-b border-green-100 dark:border-green-800/30 flex items-center gap-2">
                <span className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wide">About yesterday</span>
                <span className="w-5 h-5 bg-green-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{yesterdayChats.length}</span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-dark-separator">
                {yesterdayChats.map(renderYesterdayRow)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lösch-Menü */}
      {deleteMenu && (
        <div className="fixed inset-0 z-[60]" onClick={() => setDeleteMenu(null)}>
          <div className="fixed inset-0 bg-black/20" />
          <div
            className="absolute bg-white dark:bg-dark-card rounded-2xl shadow-2xl overflow-hidden min-w-[200px] z-10 mx-4"
            style={{ top: Math.min(deleteMenu.y || 300, window.innerHeight - 100), left: 16, right: 16 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-gray-100 dark:border-dark-separator">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{deleteMenu.name}</p>
            </div>
            <button
              onClick={() => handleDeleteChat(deleteMenu.id)}
              className="w-full px-4 py-3 text-left text-sm text-red-500 hover:bg-gray-50 dark:hover:bg-dark-elevated flex items-center gap-2.5"
            >
              <Trash2 size={16} />
              {t('deleteChat')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
