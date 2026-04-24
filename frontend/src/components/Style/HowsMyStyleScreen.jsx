import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, ThumbsUp, X, Check } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

// ── Tutorial Modal ─────────────────────────────────────────────────
function TutorialModal({ onClose, onDontShow }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
      <div className="bg-white dark:bg-dark-card rounded-t-3xl w-full max-w-md p-6 shadow-2xl" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Show Us Your Style</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-dark-elevated flex items-center justify-center">
            <X size={16} className="text-gray-500" />
          </button>
        </div>
        <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
          <div className="flex items-center gap-3 bg-gray-50 dark:bg-dark-elevated rounded-2xl px-4 py-3">
            <span className="text-2xl shrink-0">👈</span>
            <p><span className="font-semibold text-gray-900 dark:text-white">Wischen nach links</span> — Foto überspringen, nächstes anzeigen.</p>
          </div>
          <div className="flex items-center gap-3 bg-gray-50 dark:bg-dark-elevated rounded-2xl px-4 py-3">
            <span className="text-2xl shrink-0">👍</span>
            <p><span className="font-semibold text-gray-900 dark:text-white">Daumen-hoch antippen</span> — Der Nutzer bekommt eine positive Bewertung von dir.</p>
          </div>
          <div className="flex items-center gap-3 bg-gray-50 dark:bg-dark-elevated rounded-2xl px-4 py-3">
            <span className="text-2xl shrink-0">🤩</span>
            <p><span className="font-semibold text-gray-900 dark:text-white">Sterne-Emoji antippen</span> — Super-Reaktion! Hast du einen freien Tisch und passt der Nutzer zu dir, kannst du ihn direkt einladen.</p>
          </div>
          <div className="flex items-center gap-3 bg-gray-50 dark:bg-dark-elevated rounded-2xl px-4 py-3">
            <span className="text-2xl shrink-0">📸</span>
            <p><span className="font-semibold text-gray-900 dark:text-white">Shoot Photo!</span> — Mach ein Foto von dir und stell es in den Feed.</p>
          </div>
        </div>
        <button
          onClick={onDontShow}
          className="mt-5 w-full py-2.5 rounded-xl border border-gray-200 dark:border-dark-separator text-gray-400 text-sm active:scale-95 transition"
        >
          Nicht mehr anzeigen
        </button>
        <button
          onClick={onClose}
          className="mt-2 w-full py-2.5 rounded-xl bg-tinder-pink text-white font-semibold text-sm active:scale-95 transition"
        >
          Los geht's!
        </button>
      </div>
    </div>
  );
}

// ── Single photo card ──────────────────────────────────────────────
function PhotoCard({ photo, dragOffset, isDragging, onTouchStart, onTouchMove, onTouchEnd }) {
  const rotation = dragOffset.x * 0.08;
  const absX = Math.abs(dragOffset.x);
  const absY = Math.abs(dragOffset.y);
  const showLike  = dragOffset.x > 40 && absX > absY;
  const showSkip  = dragOffset.x < -40 && absX > absY;
  const showSuper = dragOffset.y < -40 && absY > absX;

  return (
    <div
      className="relative w-full rounded-3xl overflow-hidden shadow-xl select-none"
      style={{
        aspectRatio: '3/4',
        transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${rotation}deg)`,
        transition: isDragging ? 'none' : 'transform 0.3s ease',
        touchAction: 'none',
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {photo.is_placeholder ? (
        <div className="w-full h-full bg-green-500 flex items-center justify-center">
          <span className="text-white font-black" style={{ fontSize: '8rem', lineHeight: 1 }}>
            {photo.placeholder_number}
          </span>
        </div>
      ) : (
        <img src={photo.photo_url} alt="" className="w-full h-full object-cover" draggable={false} />
      )}

      {photo.like_count > 0 && (
        <div className="absolute top-3 right-3 bg-black/50 rounded-full px-2.5 py-1.5 flex items-center gap-1">
          <span className="text-lg">👍</span>
          {photo.like_count > 1 && <span className="text-white text-xs font-bold">{photo.like_count}</span>}
        </div>
      )}
      {photo.super_count > 0 && (
        <div className="absolute top-3 left-3 bg-black/50 rounded-full px-2.5 py-1.5 flex items-center gap-1">
          <span className="text-lg">🤩</span>
          {photo.super_count > 1 && <span className="text-white text-xs font-bold">{photo.super_count}</span>}
        </div>
      )}

      {showLike && (
        <div className="absolute inset-0 flex items-center justify-start pl-6 pointer-events-none">
          <div className="border-4 border-green-400 rounded-2xl px-4 py-2 rotate-[-15deg]">
            <span className="text-green-400 font-black text-3xl">👍</span>
          </div>
        </div>
      )}
      {showSkip && (
        <div className="absolute inset-0 flex items-center justify-end pr-6 pointer-events-none">
          <div className="border-4 border-red-400 rounded-2xl px-4 py-2 rotate-[15deg]">
            <X size={36} className="text-red-400" strokeWidth={3} />
          </div>
        </div>
      )}
      {showSuper && (
        <div className="absolute inset-0 flex items-start justify-center pt-8 pointer-events-none">
          <div className="border-4 border-blue-400 rounded-2xl px-4 py-2">
            <span className="text-blue-400 font-black text-3xl">🤩</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Super-invite modal ─────────────────────────────────────────────
function SuperInviteModal({ uploaderInfo, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
      <div className="bg-white dark:bg-dark-card rounded-3xl p-6 w-full max-w-sm shadow-2xl">
        <div className="text-center mb-4">
          <span className="text-5xl">🤩</span>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-2">Super Style!</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Alle Bedingungen erfüllt — du kannst <strong>{uploaderInfo.name}</strong> direkt an deinen Tisch einladen!
          </p>
        </div>
        {uploaderInfo.photo && (
          <div className="flex justify-center mb-4">
            <img src={uploaderInfo.photo} alt="" className="w-20 h-20 rounded-full object-cover border-4 border-blue-400" />
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl bg-gray-100 dark:bg-dark-elevated text-gray-600 dark:text-gray-300 font-semibold active:scale-95 transition">
            Nicht jetzt
          </button>
          <button onClick={onConfirm} className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold active:scale-95 transition">
            Einladen! 🎉
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Invite card ────────────────────────────────────────────────────
function InviteCard({ invite, onAccept, onReject }) {
  const [loading, setLoading] = useState(false);
  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-dark-separator">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-purple-500 shrink-0">
          {invite.sender_photo
            ? <img src={invite.sender_photo} alt="" className="w-full h-full object-cover" />
            : <span className="flex items-center justify-center h-full text-white text-xl font-bold">{invite.sender_name?.charAt(0)}</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-semibold text-gray-900 dark:text-white">{invite.sender_name}</span>
            <span className="text-gray-400 text-sm">{invite.sender_age}</span>
            <span className="ml-1">🤩</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            📍 {invite.tent_name} · 📅 {invite.date} · 🕐 {invite.time_from}–{invite.time_until}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          disabled={loading}
          onClick={async () => { setLoading(true); await onAccept(invite.id, invite.match_id); setLoading(false); }}
          className="flex-1 py-2.5 rounded-xl bg-tinder-green text-white font-semibold text-sm flex items-center justify-center gap-1.5 active:scale-95 transition disabled:opacity-50"
        >
          <Check size={16} /> Annehmen
        </button>
        <button
          disabled={loading}
          onClick={async () => { setLoading(true); await onReject(invite.id); setLoading(false); }}
          className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-dark-elevated text-gray-600 dark:text-gray-300 font-semibold text-sm flex items-center justify-center gap-1.5 active:scale-95 transition disabled:opacity-50"
        >
          <X size={16} /> Ablehnen
        </button>
      </div>
    </div>
  );
}

// ── Main Screen ────────────────────────────────────────────────────
export default function HowsMyStyleScreen() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('feed');
  const [photos, setPhotos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [superInviteModal, setSuperInviteModal] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const touchStart = useRef({ x: 0, y: 0 });
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [showTutorial, setShowTutorial] = useState(
    localStorage.getItem('hideStyleTutorial_v2') !== 'true'
  );

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [photosRes, invitesRes] = await Promise.all([
        api.get('/style/photos'),
        api.get('/style/invites/pending'),
      ]);
      setPhotos(photosRes.data);
      setCurrentIndex(0);
      setPendingInvites(invitesRes.data);
    } catch {
      toast.error('Laden fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  }

  function onTouchStart(e) {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
    setIsDragging(true);
  }
  function onTouchMove(e) {
    const t = e.touches[0];
    setDragOffset({ x: t.clientX - touchStart.current.x, y: t.clientY - touchStart.current.y });
  }
  async function onTouchEnd() {
    setIsDragging(false);
    const { x, y } = dragOffset;
    setDragOffset({ x: 0, y: 0 });
    const THRESHOLD = 80;
    const absX = Math.abs(x), absY = Math.abs(y);
    let reaction = null;
    if (absY > THRESHOLD && absY > absX && y < 0) reaction = 'super';
    else if (absX > THRESHOLD && x > 0) reaction = 'like';
    else if (absX > THRESHOLD && x < 0) reaction = 'skip';
    if (reaction) await doReact(reaction);
  }

  async function doReact(reaction) {
    const photo = photos[currentIndex];
    if (!photo) return;
    try {
      const { data } = await api.post(`/style/photos/${photo.id}/react`, { reaction });
      setCurrentIndex(prev => prev + 1);
      if (reaction === 'super' && data.superInviteEligible) {
        setSuperInviteModal({ photo, uploaderInfo: data.uploaderInfo });
      }
    } catch {
      toast.error('Fehler bei der Bewertung');
    }
  }

  async function handleFileSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = '';
    setUploading(true);
    const formData = new FormData();
    formData.append('photo', file);
    try {
      await api.post('/style/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Foto hochgeladen! 📸');
      loadData();
    } catch {
      toast.error('Upload fehlgeschlagen');
    } finally {
      setUploading(false);
    }
  }

  async function handleSuperInvite() {
    try {
      await api.post('/style/super-invite', { photoId: superInviteModal.photo.id });
      toast.success('Direkt-Einladung gesendet! 🎉');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Fehler');
    } finally {
      setSuperInviteModal(null);
    }
  }

  async function handleAcceptInvite(inviteId, matchId) {
    try {
      await api.post(`/style/super-invite/${inviteId}/accept`);
      toast.success('Einladung angenommen!');
      setPendingInvites(prev => prev.filter(i => i.id !== inviteId));
      navigate(`/chat/${matchId}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Fehler');
    }
  }

  async function handleRejectInvite(inviteId) {
    try {
      await api.post(`/style/super-invite/${inviteId}/reject`);
      toast('Einladung abgelehnt');
      setPendingInvites(prev => prev.filter(i => i.id !== inviteId));
    } catch {
      toast.error('Fehler');
    }
  }

  const currentPhoto = photos[currentIndex];
  const allDone = !loading && currentIndex >= photos.length;

  return (
    <div className="flex flex-col h-full px-4 pt-5 pb-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <button onClick={() => navigate('/home')} className="w-9 h-9 bg-gray-100 dark:bg-dark-card rounded-full flex items-center justify-center active:scale-90 transition">
          <ArrowLeft size={18} className="text-gray-600 dark:text-gray-300" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Show Us Your Style</h1>
        </div>
      </div>

      {/* Shoot Photo! – an Stelle der bisherigen Tabs */}
      <div className="mb-4 shrink-0">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full py-2.5 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-1.5 active:scale-95 transition disabled:opacity-60"
          style={{ backgroundColor: '#38bdf8' }}
        >
          <Camera size={16} />
          {uploading ? 'Hochladen…' : 'Shoot Photo!'}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelected} />
      </div>

      {/* Feed Tab */}
      {tab === 'feed' && (
        <div className="flex-1 flex flex-col items-center justify-center">
          {loading ? (
            <span className="text-4xl animate-bounce">📸</span>
          ) : allDone ? (
            <div className="text-center">
              <span className="text-6xl">✨</span>
              <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 mt-4">Alle Fotos gesehen!</p>
              <p className="text-gray-400 text-sm mt-1">Schau später nochmal vorbei.</p>
              <button onClick={loadData} className="mt-6 px-6 py-2.5 rounded-full bg-tinder-pink text-white font-semibold active:scale-95 transition">
                Neu laden
              </button>
            </div>
          ) : (
            <div className="w-full max-w-sm">

              <PhotoCard
                photo={currentPhoto}
                dragOffset={dragOffset}
                isDragging={isDragging}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
              />
              <div className="flex justify-center gap-8 mt-5">
                <button onClick={() => doReact('like')} className="w-16 h-16 rounded-full bg-white dark:bg-dark-card shadow-lg flex items-center justify-center active:scale-90 transition border border-gray-200 dark:border-dark-separator">
                  <ThumbsUp size={26} className="text-green-500" />
                </button>
                <button onClick={() => doReact('super')} className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 shadow-lg flex items-center justify-center active:scale-90 transition text-2xl">
                  🤩
                </button>
              </div>
              {/* Tabs – unterhalb der Icons */}
              <div className="flex gap-2 mt-4">
                <button onClick={() => setTab('feed')} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${tab === 'feed' ? 'bg-tinder-pink text-white' : 'bg-gray-100 dark:bg-dark-card text-gray-500 dark:text-gray-400'}`}>
                  Style-Feed
                </button>
                <button onClick={() => setTab('invites')} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition relative ${tab === 'invites' ? 'bg-tinder-pink text-white' : 'bg-gray-100 dark:bg-dark-card text-gray-500 dark:text-gray-400'}`}>
                  Einladungen
                  {pendingInvites.length > 0 && tab !== 'invites' && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-tinder-pink rounded-full flex items-center justify-center text-[10px] font-bold text-white">{pendingInvites.length}</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Invites Tab */}
      {tab === 'invites' && (
        <>
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-3">
            {pendingInvites.length === 0 ? (
              <div className="text-center py-20">
                <span className="text-5xl">🎉</span>
                <p className="text-lg font-semibold text-gray-600 dark:text-gray-400 mt-4">Keine Einladungen</p>
                <p className="text-gray-400 text-sm mt-1">Lade ein Foto hoch und lass dich entdecken!</p>
              </div>
            ) : (
              pendingInvites.map(invite => (
                <InviteCard key={invite.id} invite={invite} onAccept={handleAcceptInvite} onReject={handleRejectInvite} />
              ))
            )}
          </div>
          {/* Tabs – unterhalb der Liste */}
          <div className="flex gap-2 mt-4 shrink-0">
            <button onClick={() => setTab('feed')} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${tab === 'feed' ? 'bg-tinder-pink text-white' : 'bg-gray-100 dark:bg-dark-card text-gray-500 dark:text-gray-400'}`}>
              Style-Feed
            </button>
            <button onClick={() => setTab('invites')} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition relative ${tab === 'invites' ? 'bg-tinder-pink text-white' : 'bg-gray-100 dark:bg-dark-card text-gray-500 dark:text-gray-400'}`}>
              Einladungen
              {pendingInvites.length > 0 && tab !== 'invites' && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-tinder-pink rounded-full flex items-center justify-center text-[10px] font-bold text-white">{pendingInvites.length}</span>
              )}
            </button>
          </div>
        </>
      )}

      {/* Tutorial Modal */}
      {showTutorial && (
        <TutorialModal
          onClose={() => setShowTutorial(false)}
          onDontShow={() => {
            localStorage.setItem('hideStyleTutorial_v2', 'true');
            setShowTutorial(false);
          }}
        />
      )}

      {/* Super-invite modal */}
      {superInviteModal && (
        <SuperInviteModal
          uploaderInfo={superInviteModal.uploaderInfo}
          onConfirm={handleSuperInvite}
          onClose={() => setSuperInviteModal(null)}
        />
      )}
    </div>
  );
}
