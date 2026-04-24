import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Send, Check, X, Flame, MessageCircle, Star, ArrowLeft, Clock } from 'lucide-react';
import api from '../../utils/api';
import useLanguage from '../../hooks/useLanguage';
import toast from 'react-hot-toast';
import ImageLightbox from '../Shared/ImageLightbox';

function PersonCard({ person, onConnect, connectsLeft, sent, onImageTap }) {
  const { t } = useLanguage();
  const [message, setMessage] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (sending) return;
    setSending(true);
    try {
      await onConnect(person.user_id, message);
      setShowInput(false);
      setMessage('');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-dark-separator dark-transition">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-tinder-pink to-tinder-orange flex items-center justify-center shrink-0 overflow-hidden cursor-pointer active:scale-95 transition">
          {person.photo_1 ? (
            <img
              src={person.photo_1}
              alt=""
              className="w-full h-full object-cover"
              onClick={() => onImageTap && onImageTap(person.photo_1)}
              onTouchEnd={(e) => { e.preventDefault(); onImageTap && onImageTap(person.photo_1); }}
            />
          ) : (
            <span className="text-white text-lg font-bold">
              {person.display_name?.charAt(0) || '?'}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 dark:text-white">{person.display_name}</span>
            {person.is_verified ? <Star size={12} className="text-tinder-yellow fill-tinder-yellow" /> : null}
            <span className="text-gray-400 text-sm">{person.age}</span>
          </div>
          {person.bio && (
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">{person.bio}</p>
          )}
        </div>

        {/* Connect Button */}
        {!showInput && !sent && (
          <button
            onClick={() => {
              if (connectsLeft <= 0) {
                toast.error(t('dailyLimit'));
                return;
              }
              setShowInput(true);
            }}
            disabled={connectsLeft <= 0}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
              connectsLeft > 0
                ? 'bg-tinder-cyan text-white active:scale-95'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            {t('connect')}
          </button>
        )}
        {sent && (
          <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-200 dark:bg-gray-700 text-gray-400">
            {t('connectSent')}
          </span>
        )}
      </div>

      {/* Message Input */}
      {showInput && (
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            placeholder={t('shortMessage')}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={300}
            className="flex-1 px-3 py-2 bg-gray-50 dark:bg-dark-elevated border border-gray-200 dark:border-dark-separator rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-tinder-cyan"
          />
          <button
            onClick={handleSend}
            disabled={sending}
            className="px-3 py-2 bg-tinder-cyan text-white rounded-xl active:scale-95 transition disabled:opacity-50"
          >
            <Send size={16} />
          </button>
          <button
            onClick={() => { setShowInput(false); setMessage(''); }}
            className="px-2 py-2 text-gray-400 active:scale-95 transition"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

function RequestCard({ request, onAccept, onReject, onImageTap }) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);

  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-dark-separator dark-transition">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div
          className="w-14 h-14 rounded-full bg-gradient-to-br from-tinder-pink to-tinder-orange flex items-center justify-center shrink-0 overflow-hidden cursor-pointer active:scale-95 transition"
        >
          {request.photo_1 ? (
            <img
              src={request.photo_1}
              alt=""
              className="w-full h-full object-cover"
              onClick={() => onImageTap && onImageTap(request.photo_1)}
              onTouchEnd={(e) => { e.preventDefault(); onImageTap && onImageTap(request.photo_1); }}
            />
          ) : (
            <span className="text-white text-lg font-bold">
              {request.display_name?.charAt(0) || '?'}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 dark:text-white">{request.display_name}</span>
            {request.is_verified ? <Star size={12} className="text-tinder-yellow fill-tinder-yellow" /> : null}
            <span className="text-gray-400 text-sm">{request.age}</span>
          </div>
          {request.message && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">"{request.message}"</p>
          )}
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(request.created_at).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={async () => {
            setLoading(true);
            await onAccept(request.id);
            setLoading(false);
          }}
          disabled={loading}
          className="flex-1 py-2 bg-tinder-green text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition disabled:opacity-50"
        >
          <Check size={16} />
          {t('accept')}
        </button>
        <button
          onClick={async () => {
            setLoading(true);
            await onReject(request.id);
            setLoading(false);
          }}
          disabled={loading}
          className="flex-1 py-2 bg-gray-100 dark:bg-dark-elevated text-gray-600 dark:text-gray-300 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition disabled:opacity-50"
        >
          <X size={16} />
          {t('reject')}
        </button>
      </div>
    </div>
  );
}

function SentCard({ request, onImageTap }) {
  const { t } = useLanguage();
  const statusLabels = {
    pending: t('waiting'),
    accepted: t('accepted'),
    rejected: t('waiting'),
  };
  const statusColors = {
    pending: 'text-tinder-yellow',
    accepted: 'text-tinder-green',
    rejected: 'text-tinder-yellow', // Sender erfährt nicht ob abgelehnt
  };

  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-dark-separator dark-transition">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div
          className="w-14 h-14 rounded-full bg-gradient-to-br from-tinder-pink to-tinder-orange flex items-center justify-center shrink-0 overflow-hidden cursor-pointer active:scale-95 transition"
        >
          {request.photo_1 ? (
            <img
              src={request.photo_1}
              alt=""
              className="w-full h-full object-cover"
              onClick={() => onImageTap && onImageTap(request.photo_1)}
              onTouchEnd={(e) => { e.preventDefault(); onImageTap && onImageTap(request.photo_1); }}
            />
          ) : (
            <span className="text-white text-lg font-bold">
              {request.display_name?.charAt(0) || '?'}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 dark:text-white">{request.display_name}</span>
            {request.is_verified ? <Star size={12} className="text-tinder-yellow fill-tinder-yellow" /> : null}
            <span className="text-gray-400 text-sm">{request.age}</span>
          </div>
          {request.message && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">"{request.message}"</p>
          )}
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(request.created_at).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Status */}
        <div className="flex items-center gap-1">
          {request.status === 'accepted' ? (
            <Check size={14} className="text-tinder-green" />
          ) : (
            <Clock size={14} className={statusColors[request.status] || 'text-gray-400'} />
          )}
          <span className={`text-xs font-semibold ${statusColors[request.status] || 'text-gray-400'}`}>
            {statusLabels[request.status] || 'Wartet...'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ConnectScreen() {
  const [tab, setTab] = useState('people'); // 'people' | 'requests' | 'sent'
  const [people, setPeople] = useState([]);
  const [requests, setRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [sentIds, setSentIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [connectsLeft, setConnectsLeft] = useState(1);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [peopleRes, requestsRes, sentRes, statusRes] = await Promise.all([
        api.get('/connect/people'),
        api.get('/connect/requests'),
        api.get('/connect/sent'),
        api.get('/connect/status'),
      ]);
      setPeople(peopleRes.data);
      setRequests(requestsRes.data);
      setSentRequests(sentRes.data);
      setConnectsLeft(statusRes.data.remaining);
    } catch (err) {
      toast.error(t('loadFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect(receiverId, message) {
    try {
      await api.post('/connect/request', { receiverId, message: message || undefined });
      toast.success(t('connectRequestSent'));
      setConnectsLeft((prev) => Math.max(0, prev - 1));
      setSentIds((prev) => new Set([...prev, receiverId]));
    } catch (err) {
      const msg = err.response?.data?.error || t('requestFailed');
      toast.error(msg);
      if (err.response?.status === 403) {
        setConnectsLeft(0);
        toast.error(t('dailyLimit'));
      }
    }
  }

  async function handleAccept(requestId) {
    try {
      const { data } = await api.post(`/connect/requests/${requestId}/accept`);
      toast.success(t('connected'));
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      toast.error(err.response?.data?.error || t('acceptFailed'));
    }
  }

  async function handleReject(requestId) {
    try {
      await api.post(`/connect/requests/${requestId}/reject`);
      toast(t('requestRejected'));
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      toast.error(err.response?.data?.error || t('rejectFailed'));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Flame size={32} className="text-tinder-cyan animate-bounce" fill="currentColor" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/home')} className="w-9 h-9 bg-gray-100 dark:bg-dark-card rounded-full flex items-center justify-center active:scale-90 transition">
          <ArrowLeft size={18} className="text-gray-600 dark:text-gray-300" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('directConnect')}</h1>
          <p className="text-xs text-gray-400">{t('connectDesc')}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('people')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${
            tab === 'people'
              ? 'bg-tinder-cyan text-white'
              : 'bg-gray-100 dark:bg-dark-card text-gray-500 dark:text-gray-400'
          }`}
        >
          <Users size={14} className="inline mr-1.5 -mt-0.5" />
          {t('people')}
        </button>
        <button
          onClick={() => setTab('requests')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition relative ${
            tab === 'requests'
              ? 'bg-tinder-cyan text-white'
              : 'bg-gray-100 dark:bg-dark-card text-gray-500 dark:text-gray-400'
          }`}
        >
          <MessageCircle size={14} className="inline mr-1.5 -mt-0.5" />
          {t('requests')}
          {requests.length > 0 && tab !== 'requests' && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-tinder-pink rounded-full flex items-center justify-center text-[10px] font-bold text-white">
              {requests.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('sent')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${
            tab === 'sent'
              ? 'bg-tinder-cyan text-white'
              : 'bg-gray-100 dark:bg-dark-card text-gray-500 dark:text-gray-400'
          }`}
        >
          <Send size={14} className="inline mr-1.5 -mt-0.5" />
          {t('sent')}
        </button>
      </div>

      {/* Connect Status */}
      {tab === 'people' && (
        <div className={`mb-3 px-3 py-2 rounded-xl text-xs font-medium ${
          connectsLeft > 0
            ? 'bg-tinder-cyan/10 text-tinder-cyan'
            : 'bg-gray-100 dark:bg-dark-elevated text-gray-400'
        }`}>
          {connectsLeft > 0
            ? `${connectsLeft} ${connectsLeft === 1 ? t('connectsAvailable') : t('connectsAvailablePlural')}`
            : t('limitReached')}
        </div>
      )}

      {/* Content */}
      {tab === 'people' && (
        people.length === 0 ? (
          <div className="text-center py-20">
            <Users size={48} className="text-gray-200 dark:text-gray-700 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400">{t('noPeople')}</h3>
            <p className="text-gray-400 text-sm mt-2">{t('checkBackLaterShort')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {people.map((person) => (
              <PersonCard
                key={person.user_id}
                person={person}
                onConnect={handleConnect}
                connectsLeft={connectsLeft}
                sent={sentIds.has(person.user_id)}
                onImageTap={setLightboxSrc}
              />
            ))}
          </div>
        )
      )}

      {tab === 'requests' && (
        requests.length === 0 ? (
          <div className="text-center py-20">
            <MessageCircle size={48} className="text-gray-200 dark:text-gray-700 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400">{t('noRequests')}</h3>
            <p className="text-gray-400 text-sm mt-2">{t('requestsAppearHere')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                onAccept={handleAccept}
                onReject={handleReject}
                onImageTap={setLightboxSrc}
              />
            ))}
          </div>
        )
      )}

      {tab === 'sent' && (
        sentRequests.length === 0 ? (
          <div className="text-center py-20">
            <Send size={48} className="text-gray-200 dark:text-gray-700 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400">{t('noSentRequests')}</h3>
            <p className="text-gray-400 text-sm mt-2">{t('sentRequestsAppear')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sentRequests.map((request) => (
              <SentCard key={request.id} request={request} onImageTap={setLightboxSrc} />
            ))}
          </div>
        )
      )}

      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </div>
  );
}
