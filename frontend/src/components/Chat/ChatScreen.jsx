import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Send, Star, CheckCircle, PartyPopper, X, Ban, Camera } from 'lucide-react';
import api from '../../utils/api';
import useAuthStore from '../../context/authStore';
import useNotifications from '../../hooks/useNotifications';
import useLanguage from '../../hooks/useLanguage';
import toast from 'react-hot-toast';
import ImageLightbox from '../Shared/ImageLightbox';
import AudioBubble from './AudioBubble';
import AudioRecorder from './AudioRecorder';

export default function ChatScreen() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState([]);
  const [matchInfo, setMatchInfo] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');
  const [inviteSeats, setInviteSeats] = useState('1');
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [messageMenu, setMessageMenu] = useState(null); // {id, content, type, isMe}
  const [editingMessage, setEditingMessage] = useState(null); // {id, content}
  const [editText, setEditText] = useState('');
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const pollRef = useRef(null);
  const msgCountRef = useRef(0);
  const isAtBottomRef = useRef(true);
  const fileInputRef = useRef(null);

  const { setActiveChat, clearActiveChat } = useNotifications();
  const { t } = useLanguage();

  useEffect(() => {
    setActiveChat(matchId);
    loadChat();
    pollRef.current = setInterval(pollMessages, 2000);
    return () => {
      clearActiveChat();
      if (pollRef.current) clearInterval(pollRef.current);
      // Scroll nach oben beim Verlassen
      setTimeout(() => window.scrollTo(0, 0), 0);
    };
  }, [matchId]);

  useEffect(() => {
    if (messages.length > msgCountRef.current && isAtBottomRef.current) {
      scrollToBottom();
    }
    msgCountRef.current = messages.length;
  }, [messages]);

  function handleScroll() {
    const el = chatContainerRef.current;
    if (!el) return;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  }

  async function loadChat() {
    try {
      const [matchRes, msgRes] = await Promise.all([
        api.get(`/matching/matches/${matchId}`),
        api.get(`/chat/${matchId}/messages`),
      ]);
      setMatchInfo(matchRes.data);
      setMessages(msgRes.data);
      msgCountRef.current = msgRes.data.length;
      api.post(`/chat/${matchId}/read`).catch(() => {});
      setTimeout(() => scrollToBottom(), 100);
    } catch (err) {
      console.error('Chat laden Fehler:', err);
    } finally {
      setLoading(false);
    }
  }

  async function pollMessages() {
    try {
      const [msgRes, matchRes] = await Promise.all([
        api.get(`/chat/${matchId}/messages`),
        api.get(`/matching/matches/${matchId}`),
      ]);
      if (msgRes.data.length !== msgCountRef.current) {
        setMessages(msgRes.data);
        // Als gelesen markieren bei neuen Nachrichten
        api.post(`/chat/${matchId}/read`).catch(() => {});
      }
      setMatchInfo(matchRes.data);
    } catch (err) {}
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  async function handleSend(e) {
    e.preventDefault();
    const content = input.trim();
    if (!content || sending) return;
    setSending(true);
    setInput('');
    isAtBottomRef.current = true;
    try {
      await api.post(`/chat/${matchId}/messages`, { content });
      const { data } = await api.get(`/chat/${matchId}/messages`);
      setMessages(data);
    } catch (err) {
      setInput(content);
    } finally {
      setSending(false);
    }
  }

  // Bild senden
  async function handleImageSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    isAtBottomRef.current = true;
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const uploadRes = await api.post('/upload/table-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const imageUrl = uploadRes.data.url;
      // Nachricht mit Bild senden
      await api.post(`/chat/${matchId}/messages`, { content: imageUrl, message_type: 'image' });
      const { data } = await api.get(`/chat/${matchId}/messages`);
      setMessages(data);
    } catch (err) {
      toast.error(t('sendImageFailed'));
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  // Nachricht löschen
  async function handleDeleteMessage(msgId) {
    try {
      await api.delete(`/chat/${matchId}/messages/${msgId}`);
      setMessages(prev => prev.filter(m => m.id !== msgId));
      setMessageMenu(null);
    } catch (err) {
      toast.error(t('deleteFailed'));
    }
  }

  // Nachricht bearbeiten
  async function handleEditMessage() {
    if (!editingMessage || !editText.trim()) return;
    try {
      await api.patch(`/chat/${matchId}/messages/${editingMessage.id}`, { content: editText.trim() });
      setMessages(prev => prev.map(m => m.id === editingMessage.id ? { ...m, content: editText.trim(), is_edited: 1 } : m));
      setEditingMessage(null);
      setEditText('');
    } catch (err) {
      toast.error(t('editFailed'));
    }
  }

  // Long-Press Handler für Nachrichten
  const longPressTimerRef = useRef(null);

  function handleMessageLongPress(msg, isMe, e) {
    if (msg.message_type === 'system' || msg.message_type === 'invite') return;
    // Auch fremde Text-Nachrichten erlauben (zum Kopieren)
    // Position der Nachricht bestimmen
    let y = 0;
    if (e?.touches) {
      y = e.touches[0]?.clientY || 0;
    } else if (e?.clientY) {
      y = e.clientY;
    }
    setMessageMenu({ id: msg.id, content: msg.content, type: msg.message_type, isMe, y });
  }

  function onMsgTouchStart(msg, isMe, e) {
    if (msg.message_type === 'system' || msg.message_type === 'invite') return;
    const touch = e?.touches?.[0];
    longPressTimerRef.current = setTimeout(() => {
      handleMessageLongPress(msg, isMe, e);
      if (navigator.vibrate) navigator.vibrate(30);
    }, 500);
  }

  function onMsgTouchEnd() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function onMsgTouchMove() {
    // Abbrechen wenn User scrollt
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  // Audio: nach Senden Messages neu laden
  async function handleAudioSent() {
    isAtBottomRef.current = true;
    const { data } = await api.get(`/chat/${matchId}/messages`);
    setMessages(data);
  }

  // Einladung senden
  async function handleSendInvite() {
    try {
      await api.post(`/matching/matches/${matchId}/confirm`, {
        message: inviteMsg || undefined,
        seats: parseInt(inviteSeats) || 1,
      });
      toast.success(t('inviteSent'));
      setShowInviteDialog(false);
      setInviteMsg('');
      const [matchRes, msgRes] = await Promise.all([
        api.get(`/matching/matches/${matchId}`),
        api.get(`/chat/${matchId}/messages`),
      ]);
      setMatchInfo(matchRes.data);
      setMessages(msgRes.data);
      isAtBottomRef.current = true;
      setTimeout(() => scrollToBottom(), 200);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Fehler');
    }
  }

  // Einladung annehmen
  async function handleAcceptInvite() {
    try {
      await api.post(`/matching/matches/${matchId}/accept`);
      toast.success(t('inviteAccepted'));
      const [matchRes, msgRes] = await Promise.all([
        api.get(`/matching/matches/${matchId}`),
        api.get(`/chat/${matchId}/messages`),
      ]);
      setMatchInfo(matchRes.data);
      setMessages(msgRes.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Fehler');
    }
  }

  // Match ablehnen
  async function handleReject() {
    if (!confirm(t('rejectMatch'))) return;
    try {
      await api.post(`/matching/matches/${matchId}/reject`);
      toast(t('matchRejected'));
      navigate('/chat');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Fehler');
    }
  }

  const isOfferer = matchInfo?.offerer_id === user?.id;
  const partnerName = isOfferer ? matchInfo?.seeker_name : matchInfo?.offerer_name;
  const partnerPhoto = isOfferer ? matchInfo?.seeker_photo : matchInfo?.offerer_photo;
  const partnerVerified = isOfferer ? matchInfo?.seeker_verified : matchInfo?.offerer_verified;
  const status = matchInfo?.status;

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-white dark:bg-dark-bg flex items-center justify-center" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="w-8 h-8 tinder-gradient rounded-full animate-bounce" />
      </div>
    );
  }

  if (!matchInfo) {
    return (
      <div className="fixed inset-0 z-50 bg-white dark:bg-dark-bg flex flex-col items-center justify-center px-8">
        <p className="text-gray-500 text-center">{t('chatNotFound')}</p>
        <button onClick={() => navigate('/chat')} className="mt-4 text-tinder-pink font-medium">{t('back')}</button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-dark-bg flex flex-col fixed inset-0 z-50 dark-transition" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Header */}
      <div className="bg-white dark:bg-dark-card border-b border-gray-100 dark:border-dark-separator px-3 py-2 flex items-center gap-2 shrink-0 dark-transition">
        <button onClick={() => navigate('/chat')} className="text-tinder-pink p-1">
          <ChevronLeft size={22} />
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-tinder-pink to-tinder-orange flex items-center justify-center overflow-hidden shrink-0">
          {partnerPhoto ? (
            <img src={partnerPhoto} alt="" className="w-full h-full object-cover" onClick={() => setLightboxSrc(partnerPhoto)} />
          ) : (
            <span className="text-white text-sm font-bold">{partnerName?.charAt(0) || '?'}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-semibold text-gray-900 dark:text-white text-sm truncate">{partnerName}</span>
            {status === 'confirmed' && <CheckCircle size={12} className="text-tinder-green fill-tinder-green shrink-0" />}
          </div>
          <span className="text-[11px] text-gray-500 dark:text-gray-400">{matchInfo?.tent_name}</span>
        </div>

        {/* Anbieter-Buttons */}
        {isOfferer && status === 'active' && (
          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={handleReject}
              className="w-8 h-8 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center active:scale-90 transition"
              title="Match ablehnen"
            >
              <Ban size={14} className="text-red-500" />
            </button>
            <button
              onClick={() => setShowInviteDialog(true)}
              className="px-2.5 py-1 tinder-gradient text-white text-[11px] font-bold rounded-full flex items-center gap-1 active:scale-95 transition"
            >
              <PartyPopper size={12} />
              {t('invite')}
            </button>
          </div>
        )}

        {isOfferer && status === 'invited' && (
          <span className="text-[10px] text-tinder-orange bg-tinder-orange/10 px-2 py-1 rounded-full font-medium">{t('waiting')}</span>
        )}
      </div>

      {/* Bestätigt-Banner */}
      {status === 'confirmed' && (
        <div className="bg-tinder-green/10 border-b border-tinder-green/20 px-3 py-1.5 flex items-center gap-1.5 shrink-0">
          <CheckCircle size={14} className="text-tinder-green" />
          <span className="text-tinder-green text-xs font-medium">{t('inviteAcceptedBanner')}</span>
        </div>
      )}

      {/* Messages */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-3 flex flex-col justify-end"
        style={{ overscrollBehavior: 'contain' }}
      >
        <div className="space-y-2">
        {messages.length === 0 && (
          <div className="text-center py-10">
            <p className="text-gray-400 text-sm">{t('sayHi')}</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_id === user?.id;
          const isSystem = msg.message_type === 'system';
          const isInvite = msg.message_type === 'invite';
          const isImage = msg.message_type === 'image';
          const isAudio = msg.message_type === 'audio';

          // Einladungskarte
          if (isInvite) {
            return (
              <div key={msg.id} className="my-3">
                <div className="bg-gradient-to-br from-tinder-pink/10 to-tinder-orange/10 border-2 border-tinder-pink/20 rounded-2xl p-4 mx-2 shadow-sm">
                  <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line leading-relaxed">{msg.content}</p>

                  {!isOfferer && status === 'invited' && (
                    <button
                      onClick={handleAcceptInvite}
                      className="w-full mt-3 py-2.5 bg-tinder-green text-white font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition shadow-md"
                    >
                      <CheckCircle size={18} />
                      {t('acceptInvite')}
                    </button>
                  )}

                  {status === 'confirmed' && (
                    <div className="mt-3 py-2 bg-tinder-green/10 rounded-xl text-center">
                      <span className="text-tinder-green text-sm font-medium">{t('accepted')}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          }

          if (isSystem) {
            return (
              <div key={msg.id} className="text-center my-1">
                <span className="text-[10px] text-gray-400 bg-gray-50 dark:bg-dark-card px-2 py-0.5 rounded-full">{msg.content}</span>
              </div>
            );
          }

          // Bild-Bubble
          if (isImage) {
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[70%] rounded-2xl overflow-hidden ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                  onTouchStart={(e) => onMsgTouchStart(msg, isMe, e)}
                  onTouchEnd={onMsgTouchEnd}
                  onTouchMove={onMsgTouchMove}
                  onContextMenu={(e) => { e.preventDefault(); handleMessageLongPress(msg, isMe); }}
                >
                  <img
                    src={msg.content}
                    alt=""
                    className="w-full max-h-[300px] object-contain cursor-pointer bg-gray-100 dark:bg-dark-elevated"
                    onClick={() => setLightboxSrc(msg.content)}
                  />
                  <div className={`px-2 py-1 ${isMe ? 'bg-tinder-blue' : 'bg-tinder-gray dark:bg-dark-elevated'}`}>
                    <p className={`text-[9px] ${isMe ? 'text-white/40' : 'text-gray-400'}`}>
                      {msg.created_at ? new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </p>
                  </div>
                </div>
              </div>
            );
          }

          // Audio-Bubble
          if (isAudio) {
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[78%] px-3 py-2 rounded-2xl ${
                    isMe
                      ? 'bg-tinder-blue text-white rounded-br-sm'
                      : 'bg-tinder-gray dark:bg-dark-elevated text-gray-900 dark:text-white rounded-bl-sm'
                  }`}
                  onTouchStart={(e) => onMsgTouchStart(msg, isMe, e)}
                  onTouchEnd={onMsgTouchEnd}
                  onTouchMove={onMsgTouchMove}
                  onContextMenu={(e) => { e.preventDefault(); handleMessageLongPress(msg, isMe); }}
                >
                  <AudioBubble src={msg.content} isMe={isMe} />
                  <p className={`text-[9px] mt-0.5 ${isMe ? 'text-white/40' : 'text-gray-400'}`}>
                    {msg.created_at ? new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </p>
                </div>
              </div>
            );
          }

          // Text-Bubble (iMessage style)
          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'} relative`}
            >
              <div
                className={`max-w-[78%] px-3 py-2 rounded-2xl select-none ${
                  isMe
                    ? 'bg-tinder-blue text-white rounded-br-sm'
                    : 'bg-tinder-gray dark:bg-dark-elevated text-gray-900 dark:text-white rounded-bl-sm'
                }`}
                onTouchStart={(e) => onMsgTouchStart(msg, isMe, e)}
                onTouchEnd={onMsgTouchEnd}
                onTouchMove={onMsgTouchMove}
                onContextMenu={(e) => { e.preventDefault(); handleMessageLongPress(msg, isMe); }}
              >
                <p className="text-[14px] leading-snug break-words">{msg.content}</p>
                <div className={`flex items-center gap-1 mt-0.5 ${isMe ? 'justify-end' : ''}`}>
                  {msg.is_edited ? <span className={`text-[9px] italic ${isMe ? 'text-white/70' : 'text-gray-500'}`}>{t('edited')}</span> : null}
                  <p className={`text-[9px] ${isMe ? 'text-white/70' : 'text-gray-500'}`}>
                    {msg.created_at ? new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 dark:border-dark-separator px-3 py-2 shrink-0 bg-white dark:bg-dark-card dark-transition relative" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {/* Edit-Modus */}
        {editingMessage ? (
          <div className="flex items-center gap-2">
            <button onClick={() => { setEditingMessage(null); setEditText(''); }} className="text-gray-400 shrink-0"><X size={18} /></button>
            <input
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="flex-1 px-3 py-2 bg-gray-100 dark:bg-dark-elevated rounded-full text-sm text-gray-900 dark:text-white focus:outline-none"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleEditMessage(); }}
            />
            <button onClick={handleEditMessage} disabled={!editText.trim()} className="w-9 h-9 tinder-gradient rounded-full flex items-center justify-center disabled:opacity-30 shrink-0">
              <CheckCircle size={16} className="text-white" />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="w-9 h-9 rounded-full flex items-center justify-center text-tinder-pink active:scale-90 transition shrink-0 disabled:opacity-40"
            >
              <Camera size={20} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('message')}
              className="flex-1 px-3 py-2 bg-gray-100 dark:bg-dark-elevated rounded-full text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none dark-transition"
              maxLength={2000}
            />
            {input.trim() ? (
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className="w-9 h-9 tinder-gradient rounded-full flex items-center justify-center disabled:opacity-30 transition active:scale-90 shrink-0"
              >
                <Send size={16} className="text-white ml-0.5" />
              </button>
            ) : (
              <AudioRecorder matchId={matchId} onSent={handleAudioSent} />
            )}
          </form>
        )}
      </div>

      {/* Nachrichten-Menü (Long-Press) — direkt an der Nachricht */}
      {messageMenu && (
        <div className="fixed inset-0 z-[60]" onClick={() => setMessageMenu(null)}>
          <div className="fixed inset-0 bg-black/20" />
          <div
            className="absolute bg-white dark:bg-dark-card rounded-2xl shadow-2xl overflow-hidden min-w-[160px] z-10"
            style={{
              top: Math.min(messageMenu.y || 300, window.innerHeight - 120),
              right: messageMenu.isMe ? 16 : 'auto',
              left: messageMenu.isMe ? 'auto' : 16,
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Kopieren — nur bei Text */}
            {messageMenu.type === 'text' && (
              <button
                onClick={() => { navigator.clipboard?.writeText(messageMenu.content).then(() => toast(t('copied'))).catch(() => {}); setMessageMenu(null); }}
                className="w-full px-4 py-3 text-left text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-dark-elevated flex items-center gap-2.5 border-b border-gray-100 dark:border-dark-separator"
              >
                📋 {t('copy')}
              </button>
            )}
            {/* Bearbeiten — nur eigene Text */}
            {messageMenu.isMe && messageMenu.type === 'text' && (
              <button
                onClick={() => { setEditingMessage({ id: messageMenu.id }); setEditText(messageMenu.content); setMessageMenu(null); }}
                className="w-full px-4 py-3 text-left text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-dark-elevated flex items-center gap-2.5 border-b border-gray-100 dark:border-dark-separator"
              >
                ✏️ {t('edit')}
              </button>
            )}
            {/* Löschen — nur eigene */}
            {messageMenu.isMe && (
              <button
                onClick={() => handleDeleteMessage(messageMenu.id)}
                className="w-full px-4 py-3 text-left text-sm text-red-500 hover:bg-gray-50 dark:hover:bg-dark-elevated flex items-center gap-2.5"
              >
                🗑️ {t('delete')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Einladungs-Dialog */}
      {showInviteDialog && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end justify-center" onClick={() => setShowInviteDialog(false)}>
          <div className="max-w-md w-full bg-white dark:bg-dark-card rounded-t-3xl p-6 space-y-4 dark-transition" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('sendInvite')}</h3>
              <button onClick={() => setShowInviteDialog(false)} className="text-gray-400"><X size={20} /></button>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">{t('howManySeats')}</label>
              <input
                type="number" min={1} max={20} value={inviteSeats}
                onChange={(e) => setInviteSeats(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-elevated border border-gray-200 dark:border-dark-separator rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-tinder-pink"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">{t('personalMessage')}</label>
              <textarea
                value={inviteMsg}
                onChange={(e) => setInviteMsg(e.target.value)}
                placeholder={t('personalMessagePlaceholder')}
                rows={3} maxLength={500}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-elevated border border-gray-200 dark:border-dark-separator rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-tinder-pink resize-none placeholder-gray-400"
              />
            </div>

            <button
              onClick={handleSendInvite}
              className="w-full py-3.5 tinder-gradient text-white font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition shadow-lg"
            >
              <PartyPopper size={18} />
              {t('sendInvite')}
            </button>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}
    </div>
  );
}
