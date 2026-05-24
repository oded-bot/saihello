import React, { useState, useEffect } from 'react';
import { X, MessageCircle, Send } from 'lucide-react';
import api from '../../utils/api';
import { useNavigate } from 'react-router-dom';

export default function HostProfileModal({ userId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [matchId, setMatchId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get(`/hosts/${userId}`).catch(e => {
        if (e.response?.status === 403) setLocked(true);
        return null;
      }),
      api.get('/matching/matches').catch(() => ({ data: [] })),
    ]).then(([profileRes, matchesRes]) => {
      if (profileRes) setData(profileRes.data);
      const match = matchesRes.data.find(m => m.offerer_id === userId || m.seeker_id === userId);
      if (match) setMatchId(match.id);
    }).finally(() => setLoading(false));
  }, [userId]);

  async function handleComment(e) {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      const { data: newComment } = await api.post(`/hosts/${userId}/comments`, { body: comment.trim() });
      setData(prev => ({ ...prev, comments: [newComment, ...prev.comments] }));
      setComment('');
    } catch (err) {}
    finally { setSubmitting(false); }
  }

  function handleChat() {
    onClose();
    navigate(`/chat/${matchId}`);
  }

  return (
    <div className="fixed inset-0 z-[3000] flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-white dark:bg-dark-card rounded-t-3xl w-full max-w-md shadow-2xl overflow-y-auto"
        style={{ maxHeight: '75vh', marginBottom: 'calc(env(safe-area-inset-bottom, 0px) + 70px)', paddingBottom: '24px' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-dark-card px-6 pt-6 pb-4 flex items-center justify-between border-b border-gray-100 dark:border-dark-separator">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Member-Profil</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-dark-elevated flex items-center justify-center">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5">
          {loading && (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && locked && (
            <div className="text-center py-10 space-y-2">
              <p className="text-4xl">🔒</p>
              <p className="text-gray-500 text-sm">Dieses Mitglied hat sein Profil noch nicht freigegeben.</p>
            </div>
          )}

          {!loading && data && (
            <div className="space-y-5">
              {/* Profile header */}
              <div className="flex items-center gap-4">
                {data.profile.photo_1 ? (
                  <img src={data.profile.photo_1} className="w-20 h-20 rounded-full object-cover" alt="" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-400 to-violet-400 flex items-center justify-center text-3xl">
                    {data.profile.emoji || data.profile.display_name?.[0] || '👤'}
                  </div>
                )}
                <div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{data.profile.display_name}</p>
                  <p className="text-sm text-gray-400">@{data.profile.username}</p>
                  <p className="text-sm text-teal-500 font-semibold mt-1">🤝 {data.profile.confirmed_matches} bestätigte Matches</p>
                </div>
              </div>

              {data.profile.bio && (
                <p className="text-sm text-gray-600 dark:text-gray-300">{data.profile.bio}</p>
              )}

              {/* Chat button — nur bei bestehendem Match */}
              {matchId && (
                <button
                  onClick={handleChat}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-teal-500 text-white rounded-2xl font-semibold text-sm active:scale-[0.98] transition"
                >
                  <MessageCircle size={18} /> Nachricht schreiben
                </button>
              )}

              {/* Comment form */}
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Öffentlicher Kommentar</p>
                <form onSubmit={handleComment} className="flex gap-2">
                  <input
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    maxLength={280}
                    placeholder="z.B. Immer dabei, super Member! 🎉"
                    className="flex-1 px-3 py-2.5 border border-gray-200 dark:border-dark-separator rounded-xl text-sm bg-gray-50 dark:bg-dark-elevated text-gray-900 dark:text-white focus:outline-none focus:border-teal-400"
                  />
                  <button
                    type="submit"
                    disabled={submitting || !comment.trim()}
                    className="bg-teal-500 text-white px-4 rounded-xl disabled:opacity-40"
                  >
                    <Send size={16} />
                  </button>
                </form>
              </div>

              {/* Comments */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Kommentare {data.comments.length > 0 && `(${data.comments.length})`}
                </p>
                {data.comments.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">Noch keine Kommentare. Sei der Erste!</p>
                )}
                {data.comments.map(c => (
                  <div key={c.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center text-sm shrink-0">
                      {c.author_emoji || c.author_name?.[0] || '👤'}
                    </div>
                    <div className="flex-1 bg-gray-50 dark:bg-dark-elevated rounded-2xl px-3 py-2">
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{c.author_name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{c.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
