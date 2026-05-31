import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronDown, ChevronUp, MapPin, ThumbsUp, X, CheckCircle, Heart, MessageCircle, Send, Volume2, VolumeX, Plus, Play } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { connectSocket, getSocket } from '../../utils/socket';
import { requestPushPermission, isPushActive } from '../../utils/pushNotifications';
import HintBubble from '../Shared/HintBubble';

// ─── Comment Panel ─────────────────────────────────────────────────────────────
function CommentPanel({ photoId, onClose, onCountChange, endpoint }) {
  const resolvedEndpoint = endpoint || `/yesterday/photos/${photoId}/comments`;
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    api.get(resolvedEndpoint)
      .then(r => { setComments(r.data); onCountChange(r.data.length); })
      .catch(() => toast.error('Kommentare laden fehlgeschlagen'))
      .finally(() => setLoading(false));
  }, [resolvedEndpoint]);

  async function submit() {
    if (!text.trim()) return;
    setSending(true);
    try {
      const res = await api.post(resolvedEndpoint, { text });
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

// ─── Video Item ────────────────────────────────────────────────────────────────
function VideoItem({ video, isActive, onSwipeUp, onSwipeDown, muted, onToggleMute, commentsOpen }) {
  const videoRef = useRef(null);
  const touchStartRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive) videoRef.current.play().catch(() => {});
    else { videoRef.current.pause(); videoRef.current.currentTime = 0; }
  }, [isActive]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  function handleVideoEnded() {
    if (commentsOpen) {
      // Kommentare offen → Video neu starten statt weiterschalten
      if (videoRef.current) { videoRef.current.currentTime = 0; videoRef.current.play().catch(() => {}); }
    } else {
      onSwipeUp();
    }
  }

  function handleTouchStart(e) {
    if (commentsOpen) return;
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  function handleTouchEnd(e) {
    if (commentsOpen || !touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    if (Math.abs(dy) > Math.abs(dx) && dy < -60) { onSwipeUp(); return; }
    if (Math.abs(dy) > Math.abs(dx) && dy > 60) { onSwipeDown(); return; }
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <video
        ref={videoRef}
        src={video.video_url}
        className="w-full h-full object-cover"
        loop={false}
        playsInline
        muted
        onEnded={handleVideoEnded}
      />
      <button
        onClick={onToggleMute}
        className="absolute top-4 right-4 w-9 h-9 bg-black/40 backdrop-blur rounded-full flex items-center justify-center z-20"
      >
        {muted ? <VolumeX size={18} className="text-white" /> : <Volume2 size={18} className="text-white" />}
      </button>
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

// ─── Comment Bubble (TikTok-Live-Stil) ────────────────────────────────────────
function CommentBubble({ comment }) {
  const bubbleRef = useRef(null);
  const [bubbleW, setBubbleW] = useState(180);

  useLayoutEffect(() => {
    if (bubbleRef.current) setBubbleW(bubbleRef.current.offsetWidth);
  }, [comment?.key]);

  if (!comment) return null;

  // Tip zeigt auf Kommentar-Icon: 3. Button von 5 → genau bei 50vw
  const tipX = (typeof window !== 'undefined' ? window.innerWidth : 390) * 0.5 - 12;
  const tailH = 29;

  return (
    <div style={{ position: 'fixed', bottom: '72px', left: '12px', zIndex: 9999, pointerEvents: 'none' }}>
      <div
        ref={bubbleRef}
        key={comment.key}
        style={{
          background: 'rgba(15,8,30,0.96)',
          border: '1.5px solid rgba(124,58,237,0.75)',
          borderRadius: '16px',
          padding: '10px 14px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5), 0 0 12px rgba(124,58,237,0.15)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '10px',
          animation: 'bubbleIn 0.35s ease-out both',
          maxWidth: '68vw',
        }}
      >
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
          {comment.photo
            ? <img src={comment.photo} style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }} alt="" />
            : (comment.emoji || '👤')}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: 'rgba(167,139,250,1)', fontSize: 11, fontWeight: 700, marginBottom: 2 }}>{comment.display_name}</div>
          <div style={{ color: 'white', fontSize: 13, lineHeight: 1.3, wordBreak: 'break-word' }}>{comment.text}</div>
        </div>
      </div>
      <svg width={Math.max(tipX + 10, bubbleW)} height={tailH} style={{ display: 'block', overflow: 'visible', marginTop: '-1px' }}>
        <polygon
          points={`${bubbleW - 22},0 ${bubbleW},0 ${tipX},${tailH}`}
          fill="rgba(15,8,30,0.96)"
          stroke="rgba(124,58,237,0.75)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

// ─── Förderband-Konstanten (hier anpassen: 2, 3, 4 oder 5) ───────────────────
const VISIBLE_CARDS = 2;
const CARD_GAP = 8;
const ADVANCE_MS = 7000;

// ─── Playing Video Card ────────────────────────────────────────────────────────
function PlayingVideoCard({ video, width, height, onClick }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.play().catch(() => {});
    return () => { v.pause(); };
  }, []);

  return (
    <div onClick={onClick} style={{ width, height, borderRadius: 16, overflow: 'hidden', position: 'relative', background: '#000', flexShrink: 0, cursor: 'pointer' }}>
      <video ref={videoRef} src={video.video_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted loop playsInline />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 55%)' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
          {video.uploader_photo
            ? <img src={video.uploader_photo} style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover' }} alt="" />
            : <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>{video.uploader_emoji || '👤'}</div>
          }
          <span style={{ color: 'white', fontSize: 10, fontWeight: 600 }}>{video.display_name}</span>
        </div>
        {video.like_count > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Heart size={8} fill="#EC4899" color="#EC4899" />
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 8 }}>{video.like_count}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Video Carousel (Förderband) ───────────────────────────────────────────────
function VideoCarousel({ videos, onVideoClick }) {
  const containerWidth = Math.min(typeof window !== 'undefined' ? window.innerWidth : 375, 448) - 32;
  const cardWidth = Math.floor((containerWidth - CARD_GAP * (VISIBLE_CARDS - 1)) / VISIBLE_CARDS);
  const cardHeight = Math.round(cardWidth * 1.5);

  const [startIdx, setStartIdx] = useState(0);
  const [offset, setOffset] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [snapping, setSnapping] = useState(false);
  const timerRef = useRef(null);
  const touchStartXRef = useRef(null);

  const needsConveyor = videos.length > VISIBLE_CARDS;

  function startTimer() {
    clearInterval(timerRef.current);
    if (!needsConveyor) return;
    timerRef.current = setInterval(() => {
      setAnimating(true);
      setOffset(-(cardWidth + CARD_GAP));
    }, ADVANCE_MS);
  }

  useEffect(() => {
    startTimer();
    return () => clearInterval(timerRef.current);
  }, [needsConveyor, cardWidth]);

  function handleTransitionEnd() {
    if (snapping) { setSnapping(false); return; }
    if (!animating) return;
    setAnimating(false);
    setOffset(0);
    setStartIdx(i => (i + 1) % videos.length);
    startTimer();
  }

  function handleTouchStart(e) {
    if (!needsConveyor || animating) return;
    touchStartXRef.current = e.touches[0].clientX;
    clearInterval(timerRef.current);
  }

  function handleTouchMove(e) {
    if (touchStartXRef.current === null) return;
    const dx = e.touches[0].clientX - touchStartXRef.current;
    setDragOffset(Math.min(0, dx)); // nur nach links ziehen
  }

  function handleTouchEnd(e) {
    if (touchStartXRef.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartXRef.current;
    touchStartXRef.current = null;

    if (dx < -50) {
      // genug gezogen → Vorschub auslösen (CSS Transition läuft vom aktuellen Wert)
      setDragOffset(0);
      setAnimating(true);
      setOffset(-(cardWidth + CARD_GAP));
    } else {
      // zu wenig → zurücksnappen und Timer neu starten
      setSnapping(true);
      setDragOffset(0);
      startTimer();
    }
  }

  if (videos.length === 0) return null;

  const renderCount = needsConveyor ? VISIBLE_CARDS + 1 : videos.length;
  const slots = Array.from({ length: Math.min(renderCount, videos.length) }, (_, i) => ({
    video: videos[(startIdx + i) % videos.length],
    vidIdx: (startIdx + i) % videos.length,
  }));

  return (
    <div
      style={{ overflow: 'hidden', paddingLeft: 16, paddingRight: 16 }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        style={{
          display: 'flex',
          gap: CARD_GAP,
          transform: `translateX(${offset + dragOffset}px)`,
          transition: (animating || snapping) ? `transform 0.55s cubic-bezier(0.25,0.46,0.45,0.94)` : 'none',
          willChange: 'transform',
        }}
        onTransitionEnd={handleTransitionEnd}
      >
        {slots.map(({ video, vidIdx }, i) => (
          <PlayingVideoCard
            key={`${video.id}_${startIdx}_${i}`}
            video={video}
            width={cardWidth}
            height={cardHeight}
            onClick={() => onVideoClick(vidIdx)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function YesterdayScreen() {
  const navigate = useNavigate();
  const [locations, setLocations] = useState([]);
  const [feed, setFeed] = useState([]);

  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settingPin, setSettingPin] = useState(null);
  const [swipingId, setSwipingId] = useState(null);
  const [likingId, setLikingId] = useState(null);
  const likeHintShownRef = useRef(false);
  const [showPushBanner, setShowPushBanner] = useState(false);
  const [videoFullscreen, setVideoFullscreen] = useState(false);
  const [mineOrteExpanded, setMineOrteExpanded] = useState(false);

  // Video state
  const [videos, setVideos] = useState([]);
  const [videoIndex, setVideoIndex] = useState(0);
  const [videoMuted, setVideoMuted] = useState(true);
  const [videoLiked, setVideoLiked] = useState(false);
  const [videoLikeCount, setVideoLikeCount] = useState(0);
  const [videoCommentCount, setVideoCommentCount] = useState(0);
  const [showVideoComments, setShowVideoComments] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoCaption, setVideoCaption] = useState('');
  const [showVideoUpload, setShowVideoUpload] = useState(false);
  const videoFileInputRef = useRef(null);
  const selectedVideoRef = useRef(null);

  // Comment bubble state
  const [bubbleComment, setBubbleComment] = useState(null);
  const [historicalComments, setHistoricalComments] = useState([]);
  const replayTimerRef = useRef(null);
  const tickCountRef = useRef(0);
  const activeVideoIdRef = useRef(null);

  useEffect(() => {
    loadAll();
    isPushActive().then(active => setShowPushBanner(!active));
  }, []);

  // Video-State zurücksetzen wenn Video wechselt
  useEffect(() => {
    const video = videos[videoIndex];
    if (!video) return;
    setVideoLiked(!!video.my_like);
    setVideoLikeCount(video.like_count || 0);
    setVideoCommentCount(video.comment_count || 0);
    setShowVideoComments(false);
  }, [videoIndex, videos]);

  // Historische Kommentare laden wenn Vollbild öffnet oder Video wechselt
  useEffect(() => {
    if (!videoFullscreen || !videos[videoIndex]) return;
    const currentVideo = videos[videoIndex];
    setBubbleComment(null);
    setHistoricalComments([]);
    if (replayTimerRef.current) clearInterval(replayTimerRef.current);
    tickCountRef.current = 0;
    api.get(`/feed/${currentVideo.id}/comments`)
      .then(r => { if (r.data.length > 0) setHistoricalComments(r.data); })
      .catch(() => {});
  }, [videoFullscreen, videoIndex, videos]);

  // Replay-Loop: historische Kommentare alle 3,5s als Bubble anzeigen
  useEffect(() => {
    if (historicalComments.length === 0) return;
    if (replayTimerRef.current) clearInterval(replayTimerRef.current);
    tickCountRef.current = 0;
    setBubbleComment(null);
    function tick() {
      const idx = tickCountRef.current % historicalComments.length;
      tickCountRef.current += 1;
      const comment = historicalComments[idx];
      setBubbleComment({ ...comment, key: `${comment.id}_${tickCountRef.current}` });
    }
    tick();
    replayTimerRef.current = setInterval(tick, 3500);
    return () => { if (replayTimerRef.current) clearInterval(replayTimerRef.current); };
  }, [historicalComments]);

  // Socket: Live-Kommentare empfangen
  useEffect(() => {
    if (!videoFullscreen || !videos[videoIndex]) return;
    const currentVideo = videos[videoIndex];
    const socket = getSocket() || connectSocket();
    if (!socket) return;
    const prevId = activeVideoIdRef.current;
    if (prevId && prevId !== currentVideo.id) socket.emit('leave_video', prevId);
    socket.emit('join_video', currentVideo.id);
    activeVideoIdRef.current = currentVideo.id;
    function onNewComment({ videoId, comment }) {
      if (videoId !== currentVideo.id) return;
      setBubbleComment({ ...comment, key: `live_${comment.id}_${Date.now()}` });
    }
    socket.on('new_comment', onNewComment);
    return () => { socket.off('new_comment', onNewComment); };
  }, [videoFullscreen, videoIndex, videos]);

  // Cleanup beim Schließen des Vollbilds
  useEffect(() => {
    if (!videoFullscreen) {
      if (replayTimerRef.current) clearInterval(replayTimerRef.current);
      setBubbleComment(null);
      const socket = getSocket();
      if (socket && activeVideoIdRef.current) {
        socket.emit('leave_video', activeVideoIdRef.current);
        activeVideoIdRef.current = null;
      }
    }
  }, [videoFullscreen]);

  // Unmount-Cleanup
  useEffect(() => {
    return () => {
      if (replayTimerRef.current) clearInterval(replayTimerRef.current);
      const socket = getSocket();
      if (socket && activeVideoIdRef.current) socket.emit('leave_video', activeVideoIdRef.current);
    };
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [locRes, feedRes, chatRes, videoRes] = await Promise.all([
        api.get('/yesterday/locations'),
        api.get('/yesterday/feed'),
        api.get('/yesterday/requests'),
        api.get('/feed').catch(() => ({ data: [] })),
      ]);
      setLocations(locRes.data);
      setFeed(feedRes.data);
      setVideos(videoRes.data);
      setVideoIndex(0);
      const accepted = (chatRes.data || []).filter(r => r.status === 'accepted');
      setChats(accepted);
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
      const [feedRes, locRes] = await Promise.all([
        api.get('/yesterday/feed'),
        api.get('/yesterday/locations'),
      ]);
      setFeed(feedRes.data);
      setLocations(locRes.data);
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
      } else {
        if (!likeHintShownRef.current) {
          likeHintShownRef.current = true;
          toast('👍 Like gesendet! Wenn die Person dich auch liked, könnt ihr chatten.', { duration: 4000 });
        } else {
          toast.success('👍 Like gesendet!');
        }
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

  async function handleVideoLike() {
    const video = videos[videoIndex];
    if (!video) return;
    const wasLiked = videoLiked;
    setVideoLiked(!wasLiked);
    setVideoLikeCount(c => wasLiked ? c - 1 : c + 1);
    try {
      await api.post(`/feed/${video.id}/like`);
    } catch {
      setVideoLiked(wasLiked);
      setVideoLikeCount(c => wasLiked ? c + 1 : c - 1);
    }
  }

  function handleVideoFileSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    selectedVideoRef.current = file;
    setShowVideoUpload(true);
  }

  async function handleVideoUpload() {
    if (!selectedVideoRef.current) return;
    setVideoUploading(true);
    try {
      const formData = new FormData();
      formData.append('video', selectedVideoRef.current);
      if (videoCaption.trim()) formData.append('caption', videoCaption.trim());
      await api.post('/feed/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Video hochgeladen!');
      setShowVideoUpload(false);
      setVideoCaption('');
      selectedVideoRef.current = null;
      const res = await api.get('/feed');
      setVideos(res.data);
      setVideoIndex(0);
    } catch {
      toast.error('Upload fehlgeschlagen');
    } finally {
      setVideoUploading(false);
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
  }

  const pinnedCount = locations.filter(l => l.pinned).length;

  function renderPersonCard(user, isTier2 = false) {
    return (
      <div
        key={user.userId}
        className={`bg-white dark:bg-dark-card rounded-2xl shadow-sm overflow-hidden transition-all duration-300 ${swipingId === user.userId ? '-translate-x-full opacity-0' : ''}`}
      >
        <div className="flex items-center gap-3 p-4">
          {user.photo
            ? <img src={user.photo} className="w-14 h-14 rounded-full object-cover shrink-0" alt="" />
            : <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center text-2xl shrink-0">{user.emoji || user.displayName?.[0] || '👤'}</div>
          }
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-gray-900 dark:text-white">{user.displayName}</p>
            {!isTier2 && user.sharedLocation && (
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
              className={`w-10 h-10 rounded-full flex items-center justify-center shadow active:scale-90 transition disabled:opacity-60 ${!isTier2 ? 'bg-tinder-pink' : ''}`}
              style={isTier2 ? { background: 'linear-gradient(135deg,#7C3AED,#EC4899)' } : {}}
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
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-50 dark:bg-dark-bg z-[100] flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>

      <input ref={videoFileInputRef} type="file" accept="video/*" capture="environment" className="hidden" onChange={handleVideoFileSelected} />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-dark-card border-b border-gray-100 dark:border-dark-separator shrink-0">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-dark-elevated">
          <ChevronLeft size={20} className="text-gray-600 dark:text-gray-300" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-gray-900 dark:text-white">About yesterday</h1>
          <p className="text-xs text-gray-400">Letzte 7 Tage</p>
        </div>
      </div>

      {/* Push-Banner */}
      {showPushBanner && (typeof Notification === 'undefined' || Notification.permission !== 'denied') && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-violet-50 dark:bg-violet-900/20 border-b border-violet-100 dark:border-violet-800/30 shrink-0">
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
          <button onClick={() => setShowPushBanner(false)} className="text-violet-400"><X size={14} /></button>
        </div>
      )}

      {/* Scroll Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-tinder-pink border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="pb-8">

            {/* ── SECTION 1: Community Videos ── */}
            <div className="pt-5 pb-2">
              <div className="flex items-center justify-between px-4 mb-3">
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">🎥 Community Videos</h2>
                <button
                  onClick={() => videoFileInputRef.current?.click()}
                  disabled={videoUploading}
                  className="flex items-center gap-1.5 bg-tinder-pink text-white text-xs font-semibold px-3 py-1.5 rounded-xl active:scale-95 transition disabled:opacity-50"
                >
                  {videoUploading
                    ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Plus size={13} />
                  }
                  Video
                </button>
              </div>
              {videos.length === 0 ? (
                <div className="mx-4 rounded-2xl bg-black/5 dark:bg-white/5 p-6 text-center">
                  <span className="text-3xl block mb-2">🎥</span>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Noch keine Videos</p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Sei der Erste – zeig was gestern los war!</p>
                </div>
              ) : (
                <VideoCarousel
                  videos={videos}
                  onVideoClick={(i) => { setVideoIndex(i); setVideoFullscreen(true); }}
                />
              )}
            </div>

            <div className="mx-4 my-3 h-px bg-gray-100 dark:bg-dark-separator" />

            {/* ── SECTION 2: Wer war dabei? ── */}
            <div className="px-4 pb-2">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-3">👥 Wer war dabei?</h2>

              {chats.length > 0 && (
                <div className="mb-4">
                  <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Matches</p>
                  <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1">
                    {chats.map(chat => (
                      <button key={chat.id} onClick={() => navigate(`/yesterday/chat/${chat.chatId}`)}
                        className="flex flex-col items-center gap-1 shrink-0 active:scale-95 transition">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-tinder-pink to-tinder-orange p-[2px]">
                          <div className="w-full h-full rounded-full overflow-hidden bg-white dark:bg-dark-bg">
                            {chat.otherUser?.photo
                              ? <img src={chat.otherUser.photo} alt="" className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center text-xl font-bold text-tinder-pink">{chat.otherUser?.displayName?.charAt(0) || '?'}</div>
                            }
                          </div>
                        </div>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium max-w-[56px] truncate">{chat.otherUser?.displayName}</span>
                      </button>
                    ))}
                  </div>
                  <div className="h-px bg-gray-100 dark:bg-dark-separator mt-3 mb-3" />
                </div>
              )}

              {feed.length === 0 && chats.length === 0 ? (
                <div className="text-center py-8">
                  <ThumbsUp size={32} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 text-sm font-medium">Noch niemand in deinem Feed</p>
                  <p className="text-gray-400 text-xs mt-1">Setze unten einen Pin, um Personen zu entdecken</p>
                </div>
              ) : feed.length > 0 ? (() => {
                const tier1 = feed.filter(u => u.tier === 1);
                const tier2 = feed.filter(u => u.tier === 2);
                return (
                  <div className="space-y-3">
                    {tier1.length > 0 && (
                      <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">📍 Gleicher Ort</p>
                    )}
                    {tier1.map(user => renderPersonCard(user, false))}
                    {tier2.length > 0 && (
                      <>
                        <div className="flex items-center gap-2 mt-3">
                          <div className="flex-1 h-px bg-gray-200 dark:bg-dark-separator" />
                          <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide shrink-0">🌆 In deiner Nähe</p>
                          <div className="flex-1 h-px bg-gray-200 dark:bg-dark-separator" />
                        </div>
                        {tier2.map(user => renderPersonCard(user, true))}
                      </>
                    )}
                  </div>
                );
              })() : null}
            </div>

            <div className="mx-4 my-3 h-px bg-gray-100 dark:bg-dark-separator" />

            {/* ── SECTION 3: Meine Orte (collapsible) ── */}
            <div className="px-4">
              <button onClick={() => setMineOrteExpanded(e => !e)} className="flex items-center justify-between w-full py-1">
                <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  📍 Meine Orte
                  {pinnedCount > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] bg-tinder-pink text-white text-[9px] font-bold rounded-full px-1">
                      {pinnedCount}
                    </span>
                  )}
                </h2>
                <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${mineOrteExpanded ? 'rotate-180' : ''}`} />
              </button>

              {mineOrteExpanded && (
                <div className="mt-3 space-y-3 pb-2">
                  {locations.length === 0 ? (
                    <div className="text-center py-6">
                      <MapPin size={28} className="mx-auto text-gray-300 mb-2" />
                      <p className="text-gray-500 text-sm">Keine Aktivität der letzten 7 Tage</p>
                      <p className="text-gray-400 text-xs mt-1">Erstelle ein Angebot oder suche einen Platz</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-gray-400">Wähle einen Ort und setze einen Pin – andere User die dort ebenfalls waren erscheinen in deinem Feed.</p>
                      {locations.map((loc, i) => (
                        <div key={i} style={{ position: 'relative' }} className="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-sm flex items-center gap-3">
                          {i === 0 && !loc.pinned && (
                            <HintBubble id="yesterday_pin" text="Setze einen Pin für diesen Ort — so siehst du, wer gestern ebenfalls dort war." position="bottom" delay={700} />
                          )}
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${loc.pinned ? 'bg-tinder-pink/10' : 'bg-gray-100 dark:bg-dark-elevated'}`}>
                            <MapPin size={18} className={loc.pinned ? 'text-tinder-pink' : 'text-gray-400'} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{loc.label || `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`}</p>
                            <p className="text-xs text-gray-400">{formatDate(loc.activity_date)}</p>
                          </div>
                          {loc.pinned ? (
                            <div className="flex items-center gap-1 text-tinder-pink text-xs font-semibold">
                              <CheckCircle size={14} /><span>Gepinnt</span>
                            </div>
                          ) : (
                            <button onClick={() => handleSetPin(loc)} disabled={settingPin === loc.lat + ',' + loc.lng}
                              className="bg-tinder-pink text-white text-xs font-semibold px-3 py-1.5 rounded-xl active:scale-95 transition disabled:opacity-60">
                              {settingPin === loc.lat + ',' + loc.lng ? '...' : 'Pin setzen'}
                            </button>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* ── Vollbild Video-Overlay ── */}
      {videoFullscreen && videos[videoIndex] && (
        <div className="fixed inset-0 bg-black z-[200] flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <style>{`
            @keyframes bubbleIn {
              from { opacity: 0; transform: translateY(6px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          <CommentBubble comment={bubbleComment} />
          <div className="flex-1 relative overflow-hidden">
            <VideoItem
              key={videos[videoIndex]?.id}
              video={videos[videoIndex]}
              isActive={true}
              onSwipeUp={() => setVideoIndex(i => (i + 1) % videos.length)}
              onSwipeDown={() => setVideoIndex(i => Math.max(0, i - 1))}
              muted={videoMuted}
              onToggleMute={() => setVideoMuted(m => !m)}
              commentsOpen={showVideoComments}
            />
            <button
              onClick={() => { setVideoFullscreen(false); setShowVideoComments(false); }}
              className="absolute top-4 left-4 z-50 w-9 h-9 bg-black/50 backdrop-blur rounded-full flex items-center justify-center"
            >
              <X size={18} className="text-white" />
            </button>
            {videos.length > 1 && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-20 pointer-events-none">
                {videos.map((_, i) => (
                  <div key={i} className={`w-1 rounded-full transition-all ${i === videoIndex ? 'h-6 bg-white' : 'h-1.5 bg-white/30'}`} />
                ))}
              </div>
            )}
            {showVideoComments && (
              <div className="absolute inset-0 flex flex-col justify-end z-60" onClick={() => setShowVideoComments(false)}>
                <div className="rounded-t-3xl flex flex-col" style={{ background: 'rgba(10,10,14,0.97)', border: '1px solid rgba(124,58,237,0.3)', maxHeight: '70%' }} onClick={e => e.stopPropagation()}>
                  <CommentPanel
                    photoId={videos[videoIndex].id}
                    endpoint={`/feed/${videos[videoIndex].id}/comments`}
                    onClose={() => setShowVideoComments(false)}
                    onCountChange={setVideoCommentCount}
                  />
                </div>
              </div>
            )}
          </div>

          {!showVideoComments && (
            <div style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
              <div style={{ margin: '0 12px 8px', borderRadius: 16, background: 'rgba(30,15,50,0.98)', border: '1.5px solid rgba(124,58,237,0.70)', display: 'flex', alignItems: 'center', height: 56, padding: '0 6px' }}>
                <button onClick={() => setVideoIndex(i => Math.max(0, i - 1))} disabled={videoIndex === 0} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'none', border: 'none', cursor: 'pointer', color: videoIndex === 0 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.75)', padding: 0 }}>
                  <ChevronDown size={20} strokeWidth={2} />
                </button>
                <button onClick={handleVideoLike} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <Heart size={20} strokeWidth={2} fill={videoLiked ? '#EC4899' : 'none'} color={videoLiked ? '#EC4899' : 'rgba(255,255,255,0.75)'} />
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>{videoLikeCount || ''}</span>
                </button>
                <button onClick={() => setShowVideoComments(true)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <MessageCircle size={20} strokeWidth={2} color="rgba(255,255,255,0.75)" />
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>{videoCommentCount || ''}</span>
                </button>
                <button onClick={() => videoFileInputRef.current?.click()} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.75)', padding: 0 }}>
                  <Plus size={20} strokeWidth={2} />
                </button>
                <button onClick={() => setVideoIndex(i => (i + 1) % videos.length)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.75)', padding: 0 }}>
                  <ChevronUp size={20} strokeWidth={2} />
                </button>
              </div>
            </div>
          )}

          {showVideoUpload && (
            <div className="absolute inset-0 z-50 bg-black/80 flex items-end justify-center" onClick={() => setShowVideoUpload(false)}>
              <div className="bg-dark-card rounded-t-3xl w-full p-6 pb-10" onClick={e => e.stopPropagation()}>
                <h3 className="text-white font-bold text-base mb-4">Video hochladen</h3>
                <input type="text" placeholder="Beschreibung (optional)" value={videoCaption}
                  onChange={e => setVideoCaption(e.target.value)}
                  className="w-full bg-white/10 text-white placeholder-white/40 rounded-xl px-4 py-3 text-sm mb-4 outline-none border border-white/10" />
                <button onClick={handleVideoUpload} disabled={videoUploading}
                  className="w-full py-3.5 rounded-2xl text-white font-bold text-sm disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#7C3AED,#EC4899)' }}>
                  {videoUploading ? 'Wird hochgeladen…' : 'Hochladen'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
