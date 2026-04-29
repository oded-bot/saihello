import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, MapPin, ThumbsUp, X, Clock, CheckCircle, MessageCircle } from 'lucide-react';
import api from '../../utils/api';

export default function YesterdayScreen() {
  const navigate = useNavigate();
  const [locations, setLocations] = useState([]);
  const [feed, setFeed] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settingPin, setSettingPin] = useState(null);
  const [activeTab, setActiveTab] = useState('locations'); // 'locations' | 'feed' | 'requests'
  const [swipingId, setSwipingId] = useState(null);
  const touchStartX = useRef(null);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [locRes, feedRes, reqRes] = await Promise.all([
        api.get('/yesterday/locations'),
        api.get('/yesterday/feed'),
        api.get('/yesterday/requests'),
      ]);
      setLocations(locRes.data);
      setFeed(feedRes.data);
      setRequests(reqRes.data);
      if (feedRes.data.length > 0) setActiveTab('feed');
      if (reqRes.data.some(r => !r.myAccepted && r.status === 'pending')) setActiveTab('requests');
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
      if (feedRes.data.length > 0) setActiveTab('feed');
    } catch (err) {
      console.error(err);
    } finally {
      setSettingPin(null);
    }
  }

  async function handleLike(userId) {
    try {
      const { data } = await api.post(`/yesterday/feed/${userId}/like`);
      setFeed(prev => prev.filter(u => u.userId !== userId));
      if (data.mutualMatch) {
        const reqRes = await api.get('/yesterday/requests');
        setRequests(reqRes.data);
        setActiveTab('requests');
      }
    } catch (err) {
      console.error(err);
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

  async function handleAccept(requestId) {
    try {
      const { data } = await api.post(`/yesterday/requests/${requestId}/accept`);
      if (data.chatId) {
        navigate(`/yesterday/chat/${data.chatId}`);
      } else {
        const reqRes = await api.get('/yesterday/requests');
        setRequests(reqRes.data);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleReject(requestId) {
    try {
      await api.post(`/yesterday/requests/${requestId}/reject`);
      setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (err) {
      console.error(err);
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
  }

  const pendingRequests = requests.filter(r => r.status === 'pending' && !r.myAccepted);
  const waitingRequests = requests.filter(r => r.status === 'pending' && r.myAccepted);
  const acceptedRequests = requests.filter(r => r.status === 'accepted');
  const pinnedCount = locations.filter(l => l.pinned).length;

  return (
    <div className="fixed inset-0 bg-gray-50 dark:bg-dark-bg z-[100] flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-dark-card border-b border-gray-100 dark:border-dark-separator">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-dark-elevated">
          <ChevronLeft size={20} className="text-gray-600 dark:text-gray-300" />
        </button>
        <div>
          <h1 className="text-base font-bold text-gray-900 dark:text-white">About yesterday</h1>
          <p className="text-xs text-gray-400">Letzte 7 Tage</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white dark:bg-dark-card border-b border-gray-100 dark:border-dark-separator">
        {[
          { key: 'locations', label: 'Meine Orte', badge: pinnedCount > 0 ? pinnedCount : null },
          { key: 'feed', label: 'Feed', badge: feed.length > 0 ? feed.length : null },
          { key: 'requests', label: 'Anfragen', badge: pendingRequests.length > 0 ? pendingRequests.length : null },
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
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
                    <p className="text-xs text-gray-400 mb-2">Wähle einen Ort und setze einen Pin – andere User, die dort ebenfalls waren, erscheinen in deinem Feed.</p>
                    {locations.map((loc, i) => (
                      <div key={i} className="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-sm flex items-center gap-3">
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
                          {user.age && (
                            <p className="text-xs text-gray-400">{user.age} Jahre</p>
                          )}
                          {user.bio && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{user.bio}</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          <button
                            onClick={() => handleLike(user.userId)}
                            className="w-10 h-10 rounded-full bg-tinder-pink flex items-center justify-center shadow active:scale-90 transition"
                          >
                            <ThumbsUp size={18} className="text-white" />
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

            {/* REQUESTS TAB */}
            {activeTab === 'requests' && (
              <div className="p-4 space-y-3">
                {pendingRequests.length === 0 && waitingRequests.length === 0 && acceptedRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageCircle size={36} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 text-sm font-medium">Keine Kontaktanfragen</p>
                    <p className="text-gray-400 text-xs mt-1">Wenn sich zwei gegenseitig liken, erscheint hier eine Anfrage</p>
                  </div>
                ) : (
                  <>
                    {pendingRequests.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">Neue Anfragen</p>
                        {pendingRequests.map(req => (
                          <RequestCard
                            key={req.id}
                            req={req}
                            onAccept={() => handleAccept(req.id)}
                            onReject={() => handleReject(req.id)}
                          />
                        ))}
                      </div>
                    )}
                    {waitingRequests.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">Warte auf Antwort</p>
                        {waitingRequests.map(req => (
                          <RequestCard key={req.id} req={req} waiting />
                        ))}
                      </div>
                    )}
                    {acceptedRequests.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">Aktive Chats</p>
                        {acceptedRequests.map(req => (
                          <div key={req.id} className="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-sm flex items-center gap-3">
                            <Avatar user={req.otherUser} />
                            <div className="flex-1">
                              <p className="font-semibold text-sm text-gray-900 dark:text-white">{req.otherUser.displayName}</p>
                            </div>
                            <button
                              onClick={() => navigate(`/yesterday/chat/${req.chatId}`)}
                              className="bg-tinder-pink text-white text-xs font-semibold px-3 py-1.5 rounded-xl active:scale-95 transition"
                            >
                              Chat öffnen
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Avatar({ user }) {
  if (user.photo) {
    return <img src={user.photo} className="w-11 h-11 rounded-full object-cover shrink-0" alt="" />;
  }
  return (
    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center text-lg shrink-0">
      {user.emoji || user.displayName?.[0] || '👤'}
    </div>
  );
}

function RequestCard({ req, onAccept, onReject, waiting }) {
  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-sm flex items-center gap-3 mb-2">
      <Avatar user={req.otherUser} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-900 dark:text-white">{req.otherUser.displayName}</p>
        <p className="text-xs text-gray-400">Kontaktanfrage</p>
      </div>
      {waiting ? (
        <div className="flex items-center gap-1 text-gray-400 text-xs">
          <Clock size={13} />
          <span>Wartet</span>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={onAccept}
            className="w-9 h-9 rounded-full bg-tinder-pink flex items-center justify-center active:scale-90 transition"
          >
            <ThumbsUp size={16} className="text-white" />
          </button>
          <button
            onClick={onReject}
            className="w-9 h-9 rounded-full bg-gray-100 dark:bg-dark-elevated flex items-center justify-center active:scale-90 transition"
          >
            <X size={16} className="text-gray-400" />
          </button>
        </div>
      )}
    </div>
  );
}
