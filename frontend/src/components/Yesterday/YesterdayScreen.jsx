import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronDown, ChevronUp, MapPin, ThumbsUp, X, CheckCircle, Camera, Heart, MessageCircle, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { requestPushPermission, isPushActive } from '../../utils/pushNotifications';
import HintBubble from '../Shared/HintBubble';

// ─── Comment Panel — identisch zum Life Feed ──────────────────────────────────
function CommentPanel({ photoId, onClose, onCountChange }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    api.get(`/yesterday/photos/${photoId}/comments`)
      .then(r => { setComments(r.data); onCountChange(r.data.length); })
      .catch(() => toast.error('Kommentare laden fehlgeschlagen'))
      .finally(() => setLoading(false));
  }, [photoId]);

  async function submit() {
    if (!text.trim()) return;
    setSending(true);
    try {
      const res = await api.post(`/yesterday/photos/${photoId}/comments`, { text });
      const updated = [...comments, res.data];
      setComments(updated);
      onCountChange(updated.length);
      setText('');
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch {
      toast.error('Kommentar fehlgeschlagen');
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <span className="text-white font-semibold text-sm">Kommentare</span>
        <button onClick={onClose}><X size={18} className="text-white/50" /></button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {loading && <p className="text-white/40 text-sm text-center py-4">Laden…</p>}
        {!loading && comments.length === 0 && (
          <p className="text-white/40 text-sm text-center py-4">Noch keine Kommentare. Sei der Erste!</p>
        )}
        {comments.map(c => (
          <div key={c.id} className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs flex-shrink-0">
              {c.photo ? <img src={c.photo} className="w-7 h-7 rounded-full object-cover" alt="" /> : (c.emoji || '👤')}
            </div>
            <div>
              <span className="text-white/60 text-xs font-semibold mr-1">{c.display_name}</span>
              <span className="text-white text-sm">{c.text}</span>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 px-4 py-3 border-t border-white/10">
        <input
          className="flex-1 bg-white/10 text-white placeholder-white/30 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
          placeholder="Kommentar schreiben…"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          maxLength={300}
        />
        <button onClick={submit} disabled={sending || !text.trim()}
          className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}>
          <Send size={16} color="white" />
        </button>
      </div>
    </>
  );
}

// ─── Photo Slideshow ───────────────────────────────────────────────────────────
function PhotoSlideshow({ photos, startIndex, onClose, fileInputRef, uploading, onPhotoUpdate }) {
  const [index, setIndex] = useState(startIndex);
  const [showComments, setShowComments] = useState(false);
  const touchStartRef = useRef(null);

  const photo = photos[index];
  if (!photo) return null;

  function goNext() { setIndex(i => (i + 1) % photos.length); setShowComments(false); }
  function goPrev() { if (index > 0) { setIndex(i => i - 1); setShowComments(false); } }

  // Touch: wischen links/rechts oder oben/unten
  function handleTouchStart(e) {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  function handleTouchEnd(e) {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    if (Math.abs(dx) < 40 && Math.abs(dy) < 40) return;
    if (Math.abs(dx) >= Math.abs(dy)) {
      if (dx < 0) goNext(); else goPrev();
    }
  }

  // Klick-Hälften für Desktop: linke Hälfte = zurück, rechte = weiter
  function handleImageClick(e) {
    if (showComments) return;
    const x = e.clientX;
    const w = e.currentTarget.offsetWidth;
    if (x < w * 0.4) goPrev(); else if (x > w * 0.6) goNext();
  }

  async function handleLike() {
    try {
      const { data } = await api.post(`/yesterday/photos/${photo.id}/like`);
      onPhotoUpdate(photo.id, { my_like: data.liked ? 1 : 0, like_count: data.count });
    } catch {
      toast.error('Like fehlgeschlagen');
    }
  }

  function handleCommentCountChange(count) {
    onPhotoUpdate(photo.id, { comment_count: count });
  }

  function formatTime(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }
  function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
  }

  return (
    <div
      className="fixed inset-0 bg-black flex flex-col"
      style={{ zIndex: 100001, paddingTop: 'env(safe-area-inset-top)' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="absolute top-0 inset-x-0 z-10 flex items-center gap-3 px-4 py-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)', background: 'linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, transparent 100%)' }}>
        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-black/40">
          <X size={20} className="text-white" />
        </button>
        <div className="flex-1 flex items-center gap-2">
          {photo.avatar
            ? <img src={photo.avatar} className="w-8 h-8 rounded-full object-cover" alt="" />
            : <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center text-sm">{photo.emoji || '👤'}</div>
          }
          <div>
            <p className="text-white text-xs font-semibold leading-tight">{photo.display_name}</p>
            <p className="text-white/50 text-[10px]">{formatDate(photo.created_at)} · {formatTime(photo.created_at)}</p>
          </div>
        </div>
        <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-black/40 disabled:opacity-50">
          {uploading
            ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <Camera size={17} className="text-white" />
          }
        </button>
        <p className="text-white/40 text-xs w-8 text-right">{index + 1}/{photos.length}</p>
      </div>

      {/* Bild + Klick-Navigation */}
      <div className="absolute inset-0 cursor-pointer" onClick={handleImageClick}>
        <img src={photo.file_path} alt="" className="w-full h-full object-cover" />
      </div>

      {/* Dot-Indikatoren oben */}
      {photos.length > 1 && (
        <div className="absolute top-0 inset-x-0 z-20 flex gap-1 px-4" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4px)' }}>
          {photos.map((_, i) => (
            <div key={i} className={`flex-1 h-0.5 rounded-full transition-all ${i === index ? 'bg-white' : 'bg-white/30'}`} />
          ))}
        </div>
      )}

      {/* Bottom Control Bar — 1:1 Life-Feed-Stil */}
      {!showComments && (
        <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '448px', paddingBottom: 'env(safe-area-inset-bottom, 0px)', zIndex: 40 }}>
          <div style={{ margin: '0 12px 8px', borderRadius: 16, background: 'rgba(30,15,50,0.98)', border: '1.5px solid rgba(124,58,237,0.70)', boxShadow: '0 0 24px rgba(124,58,237,0.22)', display: 'flex', alignItems: 'center', height: 56, padding: '0 6px' }}>
            {/* Zurück */}
            <button onClick={goPrev} disabled={index === 0}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'none', border: 'none', cursor: 'pointer', color: index === 0 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.75)', padding: 0 }}>
              <ChevronDown size={20} strokeWidth={2} />
              <span style={{ fontSize: 10, marginTop: 1, fontWeight: 500 }}>Zurück</span>
            </button>
            {/* Like */}
            <button onClick={handleLike}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <Heart size={20} color={photo.my_like ? '#EC4899' : 'rgba(255,255,255,0.75)'} fill={photo.my_like ? '#EC4899' : 'none'} strokeWidth={2} />
              <span style={{ fontSize: 10, marginTop: 1, fontWeight: 500, color: photo.my_like ? '#EC4899' : 'rgba(255,255,255,0.75)' }}>{photo.like_count || 0}</span>
            </button>
            {/* Kommentare */}
            <button onClick={() => setShowComments(s => !s)}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: showComments ? 'white' : 'rgba(255,255,255,0.75)' }}>
              {showComments ? (
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #7C3AED, #EC4899)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MessageCircle size={17} color="white" strokeWidth={2.5} />
                </div>
              ) : (
                <>
                  <MessageCircle size={20} strokeWidth={1.5} />
                  <span style={{ fontSize: 10, marginTop: 1, fontWeight: 500 }}>{photo.comment_count || 0}</span>
                </>
              )}
            </button>
            {/* Foto hochladen */}
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.75)', padding: 0 }}>
              {uploading
                ? <div style={{ width: 20, height: 20, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                : <Camera size={20} strokeWidth={1.5} />
              }
              <span style={{ fontSize: 10, marginTop: 1, fontWeight: 500 }}>Upload</span>
            </button>
            {/* Weiter */}
            <button onClick={goNext}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.75)', padding: 0 }}>
              <ChevronUp size={20} strokeWidth={2} />
              <span style={{ fontSize: 10, marginTop: 1, fontWeight: 500 }}>Weiter</span>
            </button>
          </div>
        </div>
      )}

      {/* Kommentar-Panel — Life-Feed-Stil mit korrektem Container */}
      {showComments && (
        <div className="absolute inset-0 flex flex-col justify-end" style={{ zIndex: 60 }}
          onClick={() => setShowComments(false)}>
          <div
            className="rounded-t-3xl flex flex-col"
            style={{ background: 'rgba(10,10,14,0.97)', border: '1px solid rgba(124,58,237,0.3)', maxHeight: '70%' }}
            onClick={e => e.stopPropagation()}
          >
            <CommentPanel
              photoId={photo.id}
              onClose={() => setShowComments(false)}
              onCountChange={handleCommentCountChange}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function YesterdayScreen() {
  const navigate = useNavigate();
  const [locations, setLocations] = useState([]);
  const [feed, setFeed] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settingPin, setSettingPin] = useState(null);
  const [activeTab, setActiveTab] = useState('locations');
  const [swipingId, setSwipingId] = useState(null);
  const [likingId, setLikingId] = useState(null);
  const [showPushBanner, setShowPushBanner] = useState(false);
  const [slideshowIndex, setSlideshowIndex] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const hasPinnedLocation = locations.some(l => l.pinned);

  useEffect(() => {
    loadAll();
    isPushActive().then(active => setShowPushBanner(!active));
  }, []);

  // Diashow direkt starten wenn Bilder-Tab aktiv und Fotos vorhanden
  useEffect(() => {
    if (activeTab === 'photos' && photos.length > 0) {
      setSlideshowIndex(0);
    } else if (activeTab !== 'photos') {
      setSlideshowIndex(null);
    }
  }, [activeTab, photos.length]);

  async function loadAll() {
    setLoading(true);
    try {
      const [locRes, feedRes, photoRes] = await Promise.all([
        api.get('/yesterday/locations'),
        api.get('/yesterday/feed'),
        api.get('/yesterday/photos'),
      ]);
      setLocations(locRes.data);
      setFeed(feedRes.data);
      setPhotos(photoRes.data);
      if (feedRes.data.length > 0) setActiveTab('feed');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSetPin(loc) {
    setSettingPin(loc.lat + ',' + loc.lng);
    try {
      await api.post('/yesterday/pin', { lat: loc.lat, lng: loc.lng });
      const [feedRes, locRes, photoRes] = await Promise.all([
        api.get('/yesterday/feed'),
        api.get('/yesterday/locations'),
        api.get('/yesterday/photos'),
      ]);
      setFeed(feedRes.data);
      setLocations(locRes.data);
      setPhotos(photoRes.data);
      if (feedRes.data.length > 0) setActiveTab('feed');
    } catch (err) {
      console.error(err);
    } finally {
      setSettingPin(null);
    }
  }

  async function handleLike(userId) {
    if (likingId === userId) return;
    setLikingId(userId);
    try {
      const { data } = await api.post(`/yesterday/feed/${userId}/like`);
      setFeed(prev => prev.filter(u => u.userId !== userId));
      if (data.mutualMatch && data.chatId) {
        toast.success('Match! 🎉 Ihr habt euch beide geliked.');
        navigate(`/yesterday/chat/${data.chatId}`);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Like fehlgeschlagen');
    } finally {
      setLikingId(null);
    }
  }

  async function handlePass(userId) {
    setSwipingId(userId);
    setTimeout(async () => {
      try {
        await api.post(`/yesterday/feed/${userId}/pass`);
        setFeed(prev => prev.filter(u => u.userId !== userId));
      } catch (err) {
        console.error(err);
      } finally {
        setSwipingId(null);
      }
    }, 300);
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      await api.post('/yesterday/photos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const res = await api.get('/yesterday/photos');
      setPhotos(res.data);
      toast.success('Foto hochgeladen!');
      setActiveTab('photos');
      setSlideshowIndex(0);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload fehlgeschlagen');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
  }

  const pinnedCount = locations.filter(l => l.pinned).length;

  return (
    <div className="fixed inset-0 bg-gray-50 dark:bg-dark-bg z-[100] flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>

      {/* Einziges File Input — immer gerendert */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-dark-card border-b border-gray-100 dark:border-dark-separator">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-dark-elevated">
          <ChevronLeft size={20} className="text-gray-600 dark:text-gray-300" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-gray-900 dark:text-white">About yesterday</h1>
          <p className="text-xs text-gray-400">Letzte 7 Tage</p>
        </div>
        {activeTab === 'photos' && hasPinnedLocation && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-tinder-pink disabled:opacity-50"
          >
            {uploading
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Camera size={17} className="text-white" />
            }
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-white dark:bg-dark-card border-b border-gray-100 dark:border-dark-separator">
        {[
          { key: 'locations', label: 'Meine Orte', badge: pinnedCount > 0 ? pinnedCount : null },
          { key: 'feed', label: 'Feed', badge: feed.length > 0 ? feed.length : null },
          { key: 'photos', label: 'Bilder', badge: photos.length > 0 ? photos.length : null },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3 text-xs font-semibold relative transition-colors ${
              activeTab === tab.key
                ? 'text-tinder-pink border-b-2 border-tinder-pink'
                : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            {tab.label}
            {tab.badge != null && (
              <span className="ml-1 inline-flex items-center justify-center min-w-[16px] h-4 bg-tinder-pink text-white text-[9px] font-bold rounded-full px-1">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Push-Banner */}
      {showPushBanner && (typeof Notification === 'undefined' || Notification.permission !== 'denied') && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-violet-50 dark:bg-violet-900/20 border-b border-violet-100 dark:border-violet-800/30">
          <span className="text-lg">🔔</span>
          <p className="flex-1 text-xs text-violet-700 dark:text-violet-300">Benachrichtigungen aktivieren und Match-Anfragen sofort erhalten</p>
          <button
            onClick={async () => {
              if (!('PushManager' in window)) {
                toast('Auf Safari: App zum Home-Bildschirm hinzufügen, dann funktionieren Benachrichtigungen.', { icon: '📱', duration: 5000 });
                return;
              }
              const ok = await requestPushPermission();
              if (ok) { toast.success('Benachrichtigungen aktiviert!'); setShowPushBanner(false); }
              else toast.error('Benachrichtigungen blockiert. Bitte in den Browser-Einstellungen erlauben.');
            }}
            className="shrink-0 bg-violet-600 text-white text-xs font-semibold px-3 py-1.5 rounded-xl active:scale-95 transition"
          >
            Aktivieren
          </button>
          <button onClick={() => setShowPushBanner(false)} className="text-violet-400">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto relative">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-tinder-pink border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* LOCATIONS TAB */}
            {activeTab === 'locations' && (
              <div className="p-4 space-y-3">
                {locations.length === 0 ? (
                  <div className="text-center py-12">
                    <MapPin size={36} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 text-sm font-medium">Keine Aktivität der letzten 7 Tage gefunden</p>
                    <p className="text-gray-400 text-xs mt-1">Erstelle ein Angebot oder suche einen Platz</p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-gray-400 mb-2">Wähle einen Ort und setze einen Pin – andere User, die dort ebenfalls waren und ebenfalls einen Pin gesetzt haben, erscheinen in deinem Feed.</p>
                    {locations.map((loc, i) => (
                      <div key={i} style={{ position: 'relative' }} className="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-sm flex items-center gap-3">
                        {i === 0 && !loc.pinned && (
                          <HintBubble
                            id="yesterday_pin"
                            text="Setze einen Pin für diesen Ort — so siehst du, wer gestern ebenfalls dort war."
                            position="bottom"
                            delay={700}
                          />
                        )}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${loc.pinned ? 'bg-tinder-pink/10' : 'bg-gray-100 dark:bg-dark-elevated'}`}>
                          <MapPin size={18} className={loc.pinned ? 'text-tinder-pink' : 'text-gray-400'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                            {loc.label || `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`}
                          </p>
                          <p className="text-xs text-gray-400">{formatDate(loc.activity_date)}</p>
                        </div>
                        {loc.pinned ? (
                          <div className="flex items-center gap-1 text-tinder-pink text-xs font-semibold">
                            <CheckCircle size={14} />
                            <span>Gepinnt</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleSetPin(loc)}
                            disabled={settingPin === loc.lat + ',' + loc.lng}
                            className="bg-tinder-pink text-white text-xs font-semibold px-3 py-1.5 rounded-xl active:scale-95 transition disabled:opacity-60"
                          >
                            {settingPin === loc.lat + ',' + loc.lng ? '...' : 'Pin setzen'}
                          </button>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* FEED TAB */}
            {activeTab === 'feed' && (
              <div className="p-4 space-y-3">
                {feed.length === 0 ? (
                  <div className="text-center py-12">
                    <ThumbsUp size={36} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 text-sm font-medium">Noch niemand in deinem Feed</p>
                    <p className="text-gray-400 text-xs mt-1">Setze einen Pin, um Personen zu entdecken, die ebenfalls dort waren</p>
                  </div>
                ) : (
                  feed.map(user => (
                    <div
                      key={user.userId}
                      className={`bg-white dark:bg-dark-card rounded-2xl shadow-sm overflow-hidden transition-all duration-300 ${swipingId === user.userId ? '-translate-x-full opacity-0' : ''}`}
                    >
                      <div className="flex items-center gap-3 p-4">
                        {user.photo ? (
                          <img src={user.photo} className="w-14 h-14 rounded-full object-cover shrink-0" alt="" />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center text-2xl shrink-0">
                            {user.emoji || user.displayName?.[0] || '👤'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-gray-900 dark:text-white">{user.displayName}</p>
                          {user.sharedLocation && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full mt-0.5 mb-0.5"
                              style={{ background: 'rgba(236,72,153,0.12)', color: '#EC4899' }}>
                              📍 {user.sharedLocation}
                            </span>
                          )}
                          {user.age && <p className="text-xs text-gray-400">{user.age} Jahre</p>}
                          {user.bio && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{user.bio}</p>}
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          <button
                            onClick={() => handleLike(user.userId)}
                            disabled={likingId === user.userId}
                            className="w-10 h-10 rounded-full bg-tinder-pink flex items-center justify-center shadow active:scale-90 transition disabled:opacity-60"
                          >
                            {likingId === user.userId
                              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              : <ThumbsUp size={18} className="text-white" />
                            }
                          </button>
                          <button
                            onClick={() => handlePass(user.userId)}
                            className="w-10 h-10 rounded-full bg-gray-100 dark:bg-dark-elevated flex items-center justify-center active:scale-90 transition"
                          >
                            <X size={18} className="text-gray-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* BILDER TAB */}
            {activeTab === 'photos' && (
              <>
                {!hasPinnedLocation ? (
                  <div className="text-center py-12">
                    <Camera size={36} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 text-sm font-medium">Kein Pin gesetzt</p>
                    <p className="text-gray-400 text-xs mt-1">Setze zuerst einen Pin unter "Meine Orte"</p>
                  </div>
                ) : photos.length === 0 ? (
                  <div className="text-center py-12">
                    <Camera size={36} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 text-sm font-medium">Noch keine Bilder</p>
                    <p className="text-gray-400 text-xs mt-1">Lade das erste Foto von diesem Abend hoch</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-4 bg-tinder-pink text-white text-sm font-semibold px-5 py-2 rounded-xl active:scale-95 transition"
                    >
                      Foto hochladen
                    </button>
                  </div>
                ) : (
                  // Diashow startet automatisch via useEffect
                  <div className="flex items-center justify-center h-40">
                    <div className="w-6 h-6 border-2 border-tinder-pink border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                {/* Diashow — via Portal in document.body, außerhalb des Stacking Contexts */}
                {slideshowIndex !== null && ReactDOM.createPortal(
                  <PhotoSlideshow
                    photos={photos}
                    startIndex={slideshowIndex}
                    onClose={() => setActiveTab(feed.length > 0 ? 'feed' : 'locations')}
                    fileInputRef={fileInputRef}
                    uploading={uploading}
                    onPhotoUpdate={(photoId, updates) =>
                      setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, ...updates } : p))
                    }
                  />,
                  document.body
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
