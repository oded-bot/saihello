import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, X } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const REACTIONS = [
  { type: 'thumbs_up',        label: '👍',                    emoji: true },
  { type: 'laughing',         label: '😄',                    emoji: true },
  { type: 'super_drauf',      label: 'Ihr seid super drauf!', emoji: false },
  { type: 'gute_unterhaltung',label: 'Das sieht nach guter Unterhaltung aus!', emoji: false },
];

function ReactionBar({ counts, myReaction, onReact, onClose }) {
  return (
    <div className="absolute inset-0 z-20 flex items-end" onClick={onClose}>
      <div
        className="w-full bg-black/80 backdrop-blur-sm p-5 pb-10 space-y-3"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-2">
          <p className="text-white text-sm font-semibold">Reagieren</p>
          <button onClick={onClose}><X size={20} className="text-white/60" /></button>
        </div>
        {REACTIONS.map(r => {
          const count = counts?.[r.type] || 0;
          const active = myReaction === r.type;
          return (
            <button
              key={r.type}
              onClick={() => onReact(r.type)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition ${
                active ? 'bg-violet-600' : 'bg-white/10 active:bg-white/20'
              }`}
            >
              <span className={`text-base font-medium ${active ? 'text-white' : 'text-white'}`}>
                {r.label}
              </span>
              {count > 0 && (
                <span className="text-white/60 text-sm font-medium">{count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ReactionCounts({ counts, myReaction }) {
  const total = Object.values(counts || {}).reduce((s, v) => s + (v || 0), 0);
  if (total === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {REACTIONS.map(r => {
        const count = counts?.[r.type] || 0;
        if (count === 0) return null;
        const active = myReaction === r.type;
        return (
          <span
            key={r.type}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              active ? 'bg-violet-600 text-white' : 'bg-black/50 text-white'
            }`}
          >
            {r.emoji ? r.label : '💬'} {count}
          </span>
        );
      })}
    </div>
  );
}

function VideoItem({ video, isActive, onSwipeUp, onSwipeLeft }) {
  const videoRef = useRef(null);
  const touchStartRef = useRef(null);
  const [showReactions, setShowReactions] = useState(false);
  const [counts, setCounts] = useState({
    thumbs_up: video.count_thumbs_up || 0,
    laughing: video.count_laughing || 0,
    super_drauf: video.count_super_drauf || 0,
    gute_unterhaltung: video.count_gute_unterhaltung || 0,
  });
  const [myReaction, setMyReaction] = useState(video.my_reaction || null);

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

    if (Math.abs(dy) > Math.abs(dx) && dy < -60) {
      onSwipeUp();
      return;
    }
    if (Math.abs(dx) > Math.abs(dy) && dx < -60) {
      setShowReactions(true);
    }
  }

  async function handleReact(type) {
    try {
      await api.post(`/feed/${video.id}/react`, { reaction: type });
      setShowReactions(false);
      onSwipeUp();
    } catch {
      toast.error('Reaktion fehlgeschlagen');
    }
  }

  return (
    <div
      className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <video
        ref={videoRef}
        src={video.video_url}
        className="w-full h-full object-cover"
        loop={false}
        muted
        playsInline
        onEnded={onSwipeUp}
      />

      {/* Uploader info + reactions overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-5 pb-8 bg-gradient-to-t from-black/70 to-transparent pointer-events-none">
        <div className="flex items-center gap-2 mb-2">
          {video.uploader_photo ? (
            <img src={video.uploader_photo} className="w-8 h-8 rounded-full object-cover border border-white/30" alt="" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-base">
              {video.uploader_emoji || '👤'}
            </div>
          )}
          <span className="text-white font-semibold text-sm">{video.display_name}</span>
        </div>
        {video.caption && (
          <p className="text-white/80 text-sm mb-2">{video.caption}</p>
        )}
        <ReactionCounts counts={counts} myReaction={myReaction} />
        <p className="text-white/40 text-xs mt-2">← wischen zum Reagieren · ↑ nächstes Video</p>
      </div>

      {showReactions && (
        <ReactionBar
          counts={counts}
          myReaction={myReaction}
          onReact={handleReact}
          onClose={() => setShowReactions(false)}
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

  function goNext() {
    setCurrentIndex(i => Math.min(i + 1, videos.length - 1));
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
            onSwipeLeft={() => {}}
          />
        )}

        {/* Progress dots */}
        {videos.length > 1 && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-20">
            {videos.map((_, i) => (
              <div
                key={i}
                className={`w-1 rounded-full transition-all ${
                  i === currentIndex ? 'h-6 bg-white' : 'h-1.5 bg-white/30'
                }`}
              />
            ))}
          </div>
        )}

        {/* End of feed */}
        {currentIndex === videos.length - 1 && videos.length > 0 && (
          <div className="absolute bottom-20 left-0 right-0 flex justify-center z-20 pointer-events-none">
            <span className="bg-black/50 text-white/60 text-xs px-3 py-1 rounded-full">
              Ende des Feeds
            </span>
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
