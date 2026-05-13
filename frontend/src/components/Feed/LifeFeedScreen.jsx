import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Heart, MessageCircle, Send, X } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

function CommentPanel({ videoId, onClose }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    api.get(`/feed/${videoId}/comments`)
      .then(r => setComments(r.data))
      .catch(() => toast.error('Kommentare laden fehlgeschlagen'))
      .finally(() => setLoading(false));
  }, [videoId]);

  async function submit() {
    if (!text.trim()) return;
    setSending(true);
    try {
      const res = await api.post(`/feed/${videoId}/comment`, { text });
      setComments(c => [...c, res.data]);
      setText('');
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch {
      toast.error('Kommentar fehlgeschlagen');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end" onClick={onClose}>
      <div
        className="rounded-t-3xl flex flex-col"
        style={{ background: 'rgba(10,10,14,0.97)', border: '1px solid rgba(124,58,237,0.3)', maxHeight: '70%' }}
        onClick={e => e.stopPropagation()}
      >
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
      </div>
    </div>
  );
}

function VideoItem({ video, isActive, onSwipeUp, onSwipeDown }) {
  const videoRef = useRef(null);
  const touchStartRef = useRef(null);
  const [liked, setLiked] = useState(!!video.my_like);
  const [likeCount, setLikeCount] = useState(video.like_count || 0);
  const [commentCount, setCommentCount] = useState(video.comment_count || 0);
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
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

  async function handleLike() {
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount(c => wasLiked ? c - 1 : c + 1);
    try {
      await api.post(`/feed/${video.id}/like`);
    } catch {
      setLiked(wasLiked);
      setLikeCount(c => wasLiked ? c + 1 : c - 1);
      toast.error('Like fehlgeschlagen');
    }
  }

  return (
    <div
      className="relative w-full h-full bg-black overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <video
        ref={videoRef}
        src={video.video_url}
        className="w-full h-full object-cover"
        loop={false}
        playsInline
        onEnded={onSwipeUp}
      />

      {/* Right action bar */}
      <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 z-10">
        {/* Like */}
        <button onClick={handleLike} className="flex flex-col items-center gap-1">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.4)' }}
          >
            <Heart
              size={24}
              color={liked ? '#EC4899' : 'white'}
              fill={liked ? '#EC4899' : 'none'}
              strokeWidth={2}
            />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow">{likeCount}</span>
        </button>

        {/* Comment */}
        <button onClick={() => setShowComments(true)} className="flex flex-col items-center gap-1">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.4)' }}
          >
            <MessageCircle size={24} color="white" strokeWidth={2} />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow">{commentCount}</span>
        </button>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-14 p-4 pb-6 bg-gradient-to-t from-black/70 to-transparent pointer-events-none">
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
        <p className="text-white/30 text-xs mt-2">↑ weiter · ↓ zurück</p>
      </div>

      {showComments && (
        <CommentPanel
          videoId={video.id}
          onClose={() => {
            setShowComments(false);
            api.get(`/feed/${video.id}/comments`)
              .then(r => setCommentCount(r.data.length))
              .catch(() => {});
          }}
        />
      )}
    </div>
  );
}

export default function LifeFeedScreen() {
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [caption, setCaption] = useState('');
  const fileInputRef = useRef(null);
  const selectedFileRef = useRef(null);

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

  function goNext() { setCurrentIndex(i => Math.min(i + 1, videos.length - 1)); }
  function goPrev() { setCurrentIndex(i => Math.max(i - 1, 0)); }

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
      {/* Header */}
      <div
        className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', paddingBottom: 12 }}
      >
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 bg-black/40 backdrop-blur rounded-full flex items-center justify-center"
        >
          <ChevronLeft size={22} className="text-white" />
        </button>
        <h1 className="text-white font-bold text-base">Life Feed</h1>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-9 h-9 bg-black/40 backdrop-blur rounded-full flex items-center justify-center"
        >
          <Plus size={22} className="text-white" />
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* Feed */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-white/50 text-sm">Laden…</p>
          </div>
        ) : videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
            <p className="text-5xl">🎥</p>
            <p className="text-white font-semibold text-lg">Noch keine Videos</p>
            <p className="text-white/50 text-sm">Sei der Erste — zeig wie es bei euch abgeht!</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 px-6 py-3 bg-violet-600 text-white rounded-full font-semibold text-sm"
            >
              Video hochladen
            </button>
          </div>
        ) : (
          <VideoItem
            key={videos[currentIndex]?.id}
            video={videos[currentIndex]}
            isActive={true}
            onSwipeUp={goNext}
            onSwipeDown={goPrev}
          />
        )}

        {/* Progress dots */}
        {videos.length > 1 && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-20">
            {videos.map((_, i) => (
              <div
                key={i}
                className={`w-1 rounded-full transition-all ${i === currentIndex ? 'h-6 bg-white' : 'h-1.5 bg-white/30'}`}
              />
            ))}
          </div>
        )}

        {currentIndex === videos.length - 1 && videos.length > 0 && (
          <div className="absolute bottom-24 left-0 right-0 flex justify-center z-20 pointer-events-none">
            <span className="bg-black/50 text-white/60 text-xs px-3 py-1 rounded-full">Ende des Feeds</span>
          </div>
        )}
      </div>

      {/* Upload modal */}
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
