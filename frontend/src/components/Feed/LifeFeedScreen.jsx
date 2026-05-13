import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Heart, MessageCircle, Send, X, ChevronUp, ChevronDown } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { connectSocket, getSocket } from '../../utils/socket';

// ─── Comment Panel ────────────────────────────────────────────────────────────

function CommentPanel({ videoId, onClose, onCountChange, liveComment }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    api.get(`/feed/${videoId}/comments`)
      .then(r => { setComments(r.data); onCountChange(r.data.length); })
      .catch(() => toast.error('Kommentare laden fehlgeschlagen'))
      .finally(() => setLoading(false));
  }, [videoId]);

  // Append live comment from socket (deduplicate by id)
  useEffect(() => {
    if (!liveComment) return;
    setComments(prev => {
      if (prev.some(c => c.id === liveComment.id)) return prev;
      const updated = [...prev, liveComment];
      onCountChange(updated.length);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      return updated;
    });
  }, [liveComment]);

  async function submit() {
    if (!text.trim()) return;
    setSending(true);
    try {
      const res = await api.post(`/feed/${videoId}/comment`, { text });
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
          <button
            onClick={submit}
            disabled={sending || !text.trim()}
            className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}
          >
            <Send size={16} color="white" />
          </button>
        </div>
    </>
  );
}

// ─── Floating Comment Overlay (TikTok-Live-Stil) ─────────────────────────────

function FloatingCommentOverlay({ comments }) {
  if (comments.length === 0) return null;
  return (
    <div style={{
      position: 'fixed',
      bottom: '90px',
      left: '12px',
      zIndex: 9999,
      pointerEvents: 'none',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      maxWidth: '80vw',
    }}>
      {comments.map(c => (
        <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', animation: 'floatCommentIn 0.35s ease-out both' }}>
          <div style={{
            width: 24, height: 24, borderRadius: '50%',
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, flexShrink: 0, color: 'white',
          }}>
            {c.photo ? <img src={c.photo} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} alt="" /> : (c.emoji || '👤')}
          </div>
          <div style={{
            background: 'rgba(0,0,0,0.6)',
            borderRadius: 20,
            padding: '4px 12px',
            color: 'white',
            fontSize: 13,
            fontWeight: 400,
            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
          }}>
            <span style={{ fontWeight: 600, marginRight: 6, opacity: 0.8 }}>{c.display_name}</span>
            {c.text}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Video Item ───────────────────────────────────────────────────────────────

function VideoItem({ video, isActive, onSwipeUp, onSwipeDown }) {
  const videoRef = useRef(null);
  const touchStartRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive) videoRef.current.play().catch(() => {});
    else { videoRef.current.pause(); videoRef.current.currentTime = 0; }
  }, [isActive]);

  function handleTouchStart(e) {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  function handleTouchEnd(e) {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    if (Math.abs(dy) > Math.abs(dx) && dy < -60) { onSwipeUp(); return; }
    if (Math.abs(dy) > Math.abs(dx) && dy > 60)  { onSwipeDown(); return; }
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <video
        ref={videoRef}
        src={video.video_url}
        className="w-full h-full object-cover"
        loop={false}
        playsInline
        onEnded={onSwipeUp}
      />
      {/* Bottom info overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pb-6 bg-gradient-to-t from-black/70 to-transparent pointer-events-none">
        <div className="flex items-center gap-2 mb-1">
          {video.uploader_photo ? (
            <img src={video.uploader_photo} className="w-8 h-8 rounded-full object-cover border border-white/30" alt="" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-base">
              {video.uploader_emoji || '👤'}
            </div>
          )}
          <span className="text-white font-semibold text-sm">{video.display_name}</span>
        </div>
        {video.caption && <p className="text-white/80 text-sm">{video.caption}</p>}
      </div>
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function LifeFeedScreen() {
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [caption, setCaption] = useState('');
  const [showComments, setShowComments] = useState(false);
  const fileInputRef = useRef(null);
  const selectedFileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  // Per-video interaction state (keyed by index, reset on navigation)
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [liveComment, setLiveComment] = useState(null);

  // Floating comment overlay state
  const [historicalComments, setHistoricalComments] = useState([]);
  const [visibleComments, setVisibleComments] = useState([]);
  const replayTimerRef = useRef(null);
  const tickCountRef = useRef(0);

  const currentVideo = videos[currentIndex];
  const activeVideoIdRef = useRef(null);

  // Effect 1: Reset state + load comments when video changes
  useEffect(() => {
    if (!currentVideo) return;
    setLiked(!!currentVideo.my_like);
    setLikeCount(currentVideo.like_count || 0);
    setCommentCount(currentVideo.comment_count || 0);
    setShowComments(false);
    setLiveComment(null);
    setHistoricalComments([]);
    setVisibleComments([]);

    api.get(`/feed/${currentVideo.id}/comments`)
      .then(r => { if (r.data.length > 0) setHistoricalComments(r.data); })
      .catch(err => console.error('Kommentare laden fehlgeschlagen:', err));
  }, [currentIndex, currentVideo?.id]);

  // Effect 2: Start replay loop when historicalComments are available
  useEffect(() => {
    if (historicalComments.length === 0) return;
    if (replayTimerRef.current) clearInterval(replayTimerRef.current);
    tickCountRef.current = 0;
    setVisibleComments([]);

    function tick() {
      const idx = tickCountRef.current % historicalComments.length;
      tickCountRef.current += 1;
      const comment = historicalComments[idx];
      const key = `${comment.id}_${tickCountRef.current}`;
      setVisibleComments(prev => [...prev.slice(-4), { ...comment, key }]);
      setTimeout(() => {
        setVisibleComments(prev => prev.filter(c => c.key !== key));
      }, 5000);
    }

    tick(); // show first comment immediately
    replayTimerRef.current = setInterval(tick, 2500);

    return () => {
      if (replayTimerRef.current) clearInterval(replayTimerRef.current);
    };
  }, [historicalComments]);

  // Socket: join/leave video room + listen for live comments
  useEffect(() => {
    const socket = getSocket() || connectSocket();
    if (!socket || !currentVideo) return;

    const prevId = activeVideoIdRef.current;
    if (prevId && prevId !== currentVideo.id) socket.emit('leave_video', prevId);
    socket.emit('join_video', currentVideo.id);
    activeVideoIdRef.current = currentVideo.id;

    function onNewComment({ videoId, comment }) {
      if (videoId !== currentVideo.id) return;
      setLiveComment(comment);
      const key = `live_${comment.id}_${Date.now()}`;
      setVisibleComments(prev => [...prev.slice(-4), { ...comment, key }]);
      setTimeout(() => setVisibleComments(prev => prev.filter(c => c.key !== key)), 5000);
    }

    socket.on('new_comment', onNewComment);
    return () => {
      socket.off('new_comment', onNewComment);
    };
  }, [currentIndex, currentVideo?.id]);

  // Leave video room on unmount
  useEffect(() => {
    return () => {
      const socket = getSocket();
      if (socket && activeVideoIdRef.current) socket.emit('leave_video', activeVideoIdRef.current);
    };
  }, []);

  const loadFeed = useCallback(async () => {
    try {
      const res = await api.get('/feed');
      setVideos(res.data);
    } catch {
      toast.error('Feed laden fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  function goNext() { if (currentIndex < videos.length - 1) setCurrentIndex(i => i + 1); }
  function goPrev() { if (currentIndex > 0) setCurrentIndex(i => i - 1); }

  async function handleLike() {
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount(c => wasLiked ? c - 1 : c + 1);
    try {
      await api.post(`/feed/${currentVideo.id}/like`);
    } catch {
      setLiked(wasLiked);
      setLikeCount(c => wasLiked ? c + 1 : c - 1);
      toast.error('Like fehlgeschlagen');
    }
  }

  async function handleUpload() {
    if (!selectedFileRef.current) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('video', selectedFileRef.current);
      if (caption.trim()) formData.append('caption', caption.trim());
      await api.post('/feed/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Video hochgeladen!');
      setShowUpload(false);
      setCaption('');
      selectedFileRef.current = null;
      setCurrentIndex(0);
      loadFeed();
    } catch {
      toast.error('Upload fehlgeschlagen');
    } finally {
      setUploading(false);
    }
  }

  function handleFileSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    selectedFileRef.current = file;
    setShowUpload(true);
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <style>{`
        @keyframes floatCommentIn {
          from { opacity: 0; transform: translateX(-12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      {/* Header */}
      <div
        className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', paddingBottom: 12 }}
      >
        <button onClick={() => navigate(-1)} className="w-9 h-9 bg-black/40 backdrop-blur rounded-full flex items-center justify-center">
          <ChevronLeft size={22} className="text-white" />
        </button>
        <h1 className="text-white font-bold text-base">Life Feed</h1>
        <button onClick={() => fileInputRef.current?.click()} className="w-9 h-9 bg-black/40 backdrop-blur rounded-full flex items-center justify-center">
          <Plus size={22} className="text-white" />
        </button>
      </div>

      <input ref={fileInputRef} type="file" accept="video/*" capture="environment" className="hidden" onChange={handleFileSelected} />

      {/* Feed area */}
      <div className="flex-1 relative" style={{ paddingBottom: '72px' }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-white/50 text-sm">Laden…</p>
          </div>
        ) : videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
            <p className="text-5xl">🎥</p>
            <p className="text-white font-semibold text-lg">Noch keine Videos</p>
            <p className="text-white/50 text-sm">Sei der Erste — zeig wie es bei euch abgeht!</p>
            <button onClick={() => fileInputRef.current?.click()} className="mt-2 px-6 py-3 bg-violet-600 text-white rounded-full font-semibold text-sm">
              Video hochladen
            </button>
          </div>
        ) : (
          <VideoItem
            key={currentVideo?.id}
            video={currentVideo}
            isActive={true}
            onSwipeUp={goNext}
            onSwipeDown={goPrev}
          />
        )}

        {/* Progress dots */}
        {videos.length > 1 && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-20 pointer-events-none">
            {videos.map((_, i) => (
              <div key={i} className={`w-1 rounded-full transition-all ${i === currentIndex ? 'h-6 bg-white' : 'h-1.5 bg-white/30'}`} />
            ))}
          </div>
        )}
      </div>

      {/* Floating comment overlay — fixed, außerhalb aller Container */}
      {!showComments && <FloatingCommentOverlay comments={visibleComments} />}

      {/* Kommentar-Panel — außerhalb VideoItem um overflow-hidden zu umgehen */}
      {showComments && currentVideo && (
        <div className="absolute inset-0 flex flex-col justify-end" style={{ zIndex: 60 }} onClick={() => setShowComments(false)}>
          <div
            className="rounded-t-3xl flex flex-col"
            style={{ background: 'rgba(10,10,14,0.97)', border: '1px solid rgba(124,58,237,0.3)', maxHeight: '70%' }}
            onClick={e => e.stopPropagation()}
          >
            <CommentPanel
              videoId={currentVideo.id}
              onClose={() => setShowComments(false)}
              onCountChange={setCommentCount}
              liveComment={liveComment}
            />
          </div>
        </div>
      )}

      {/* ── Kontrollleiste (Pill wie BottomNav) ── */}
      {videos.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            maxWidth: '448px',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            zIndex: 40,
          }}
        >
          <div
            style={{
              margin: '0 12px 8px',
              borderRadius: '16px',
              background: 'rgba(30,15,50,0.98)',
              border: '1.5px solid rgba(124,58,237,0.70)',
              boxShadow: '0 0 24px rgba(124,58,237,0.22)',
              display: 'flex',
              alignItems: 'center',
              height: '56px',
              padding: '0 6px',
            }}
          >
            {/* Zurück */}
            <button
              onClick={goPrev}
              disabled={currentIndex === 0}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'none', border: 'none', cursor: 'pointer', color: currentIndex === 0 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.75)', padding: 0 }}
            >
              <ChevronDown size={20} strokeWidth={2} />
              <span style={{ fontSize: 10, marginTop: 1, fontWeight: 500 }}>Zurück</span>
            </button>

            {/* Like */}
            <button
              onClick={handleLike}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <Heart size={20} color={liked ? '#EC4899' : 'rgba(255,255,255,0.75)'} fill={liked ? '#EC4899' : 'none'} strokeWidth={2} />
              <span style={{ fontSize: 10, marginTop: 1, fontWeight: 500, color: liked ? '#EC4899' : 'rgba(255,255,255,0.75)' }}>{likeCount}</span>
            </button>

            {/* Kommentare */}
            <button
              onClick={() => setShowComments(s => !s)}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: showComments ? 'white' : 'rgba(255,255,255,0.75)' }}
            >
              {showComments ? (
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #7C3AED, #EC4899)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MessageCircle size={17} color="white" strokeWidth={2.5} />
                </div>
              ) : (
                <>
                  <MessageCircle size={20} strokeWidth={1.5} />
                  <span style={{ fontSize: 10, marginTop: 1, fontWeight: 500 }}>{commentCount}</span>
                </>
              )}
            </button>

            {/* Video hochladen */}
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.75)', padding: 0 }}
            >
              <Plus size={20} strokeWidth={1.5} />
              <span style={{ fontSize: 10, marginTop: 1, fontWeight: 500 }}>Upload</span>
            </button>

            {/* Weiter */}
            <button
              onClick={goNext}
              disabled={currentIndex === videos.length - 1}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'none', border: 'none', cursor: 'pointer', color: currentIndex === videos.length - 1 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.75)', padding: 0 }}
            >
              <ChevronUp size={20} strokeWidth={2} />
              <span style={{ fontSize: 10, marginTop: 1, fontWeight: 500 }}>Weiter</span>
            </button>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="absolute inset-0 z-40 bg-black/80 flex items-end">
          <div className="w-full bg-gray-900 rounded-t-3xl p-6 pb-10 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-white font-bold text-base">Video hochladen</h2>
              <button onClick={() => { setShowUpload(false); selectedFileRef.current = null; }}>
                <X size={22} className="text-white/60" />
              </button>
            </div>
            <div className="bg-white/10 rounded-xl px-3 py-2">
              <p className="text-white/50 text-xs mb-1">Video ausgewählt</p>
              <p className="text-white text-sm truncate">{selectedFileRef.current?.name}</p>
            </div>
            <textarea
              placeholder="Beschreibung (optional)"
              value={caption}
              onChange={e => setCaption(e.target.value)}
              maxLength={120}
              rows={2}
              className="w-full bg-white/10 text-white placeholder-white/40 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full py-3.5 bg-violet-600 text-white font-bold rounded-full disabled:opacity-50"
            >
              {uploading ? 'Wird hochgeladen…' : 'Jetzt hochladen'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
