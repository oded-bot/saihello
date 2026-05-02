import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Share2, Check, ArrowRight } from 'lucide-react';
import api from '../../utils/api';
import useAuthStore from '../../context/authStore';

function formatDate(dateStr) {
  const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  const [year, month, day] = dateStr.split('-').map(Number);
  return `${day}. ${months[month - 1]} ${year}`;
}

export default function SaiYouTherePage() {
  const navigate = useNavigate();
  const token = useAuthStore(s => s.token);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [registered, setRegistered] = useState(false);
  const [registeredName, setRegisteredName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const { data: d } = await api.get('/tracker/active');
      setData(d);
    } catch (err) {}
    finally { setLoading(false); }
  }

  async function handleRegister(e) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setSubmitting(true);
    try {
      const { data: res } = await api.post('/tracker/register', {
        name: name.trim(),
        email: email.trim(),
        eventId: data.event.id,
      });
      setRegisteredName(name.trim());
      setRegistered(true);
      setData(prev => ({ ...prev, count: res.count }));
    } catch (err) {}
    finally { setSubmitting(false); }
  }

  async function handleShare() {
    const eventName = data?.event?.name || 'SaiHello';
    const text = `Ich bin beim ${eventName} dabei! Komm auch — SaiHello macht es möglich.`;
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: 'SaiHello', text, url }); } catch (e) {}
    } else {
      try {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2500);
      } catch (e) {}
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!data?.active) return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4 text-white px-6 text-center">
      <span className="text-5xl">🎉</span>
      <h1 className="text-2xl font-bold">SaiHello</h1>
      <p className="text-gray-400">Kein aktives Event gerade.</p>
      {token && (
        <button onClick={() => navigate('/home')} className="mt-4 text-teal-400 text-sm font-medium">
          Zur App →
        </button>
      )}
    </div>
  );

  const { event, count, recentCount, recentNames, phase, thresholdReached, softThresholdReached } = data;
  const pct = Math.min(100, Math.round((count / event.threshold_hard) * 100));

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>

      {/* Top bar */}
      <div className="w-full max-w-md mx-auto px-5 pt-6 flex items-center justify-between">
        <span className="text-teal-400 font-bold text-lg tracking-wide">SaiHello</span>
        <div className="flex items-center gap-4">
          {token
            ? <button onClick={() => navigate('/home')} className="text-gray-400 text-xs font-medium hover:text-teal-400 transition">Zur App →</button>
            : <button onClick={() => navigate('/login')} className="text-gray-500 text-xs hover:text-gray-300 transition">Einloggen →</button>
          }
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md mx-auto px-5 py-8 gap-6">

        {/* Event header */}
        <div className="text-center">
          <div className="text-7xl mb-3 animate-[bounce_2s_ease-in-out_3]">{event.emoji}</div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">{event.name}</h1>
          <p className="text-gray-500 text-sm mt-1">{formatDate(event.event_date)} · {event.city}</p>
        </div>

        {/* Phase 1: Momentum display */}
        {phase === 1 && (
          <div className="w-full bg-gray-900 rounded-3xl p-6 text-center space-y-3">
            <p className="text-6xl font-black text-white tabular-nums">{count}</p>
            <p className="text-gray-400 text-base">Menschen sind dabei</p>
            {recentCount > 0 && (
              <p className="text-teal-400 text-sm font-medium">+{recentCount} in den letzten 48h 🔥</p>
            )}
            {recentNames.length > 0 && (
              <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
                {recentNames.map((n, i) => (
                  <span key={i} className="bg-gray-800 text-gray-300 text-xs px-3 py-1.5 rounded-full">{n}</span>
                ))}
                {count > recentNames.length && (
                  <span className="text-gray-600 text-xs">& {count - recentNames.length} mehr</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Phase 2 + 3: Progress bar */}
        {(phase === 2 || phase === 3) && (
          <div className="w-full bg-gray-900 rounded-3xl p-6 space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-4xl font-black text-white tabular-nums">{count}</p>
                <p className="text-gray-500 text-sm">von {event.threshold_hard}</p>
              </div>
              <p className="text-4xl font-black text-teal-400">{pct}%</p>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-teal-600 to-teal-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            {phase === 2 && !softThresholdReached && (
              <p className="text-gray-500 text-xs text-center">Bei {event.threshold_soft} öffnet sich die App 🔓</p>
            )}
            {phase === 2 && softThresholdReached && (
              <p className="text-teal-400 text-xs text-center font-medium">Die App ist offen — noch wächst die Community 🚀</p>
            )}
            {phase === 3 && (
              <p className="text-teal-300 text-sm font-semibold text-center">
                Noch {event.threshold_hard - count} bis zum vollen Start! 🚀
              </p>
            )}
            {recentCount > 0 && (
              <p className="text-teal-500 text-xs text-center">+{recentCount} neue in den letzten 48h</p>
            )}
          </div>
        )}

        {/* Registration / post-registration */}
        {!registered ? (
          <form onSubmit={handleRegister} className="w-full space-y-3">
            <h2 className="text-white font-bold text-xl text-center mb-1">Sai You There! 👋</h2>
            <p className="text-gray-500 text-xs text-center mb-3">Kein Passwort. Nur dein Name und deine E-Mail.</p>
            <input
              type="text"
              placeholder="Dein Name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-gray-800 text-white placeholder-gray-600 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 border border-gray-700"
              required
            />
            <input
              type="email"
              placeholder="E-Mail-Adresse"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-gray-800 text-white placeholder-gray-600 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 border border-gray-700"
              required
            />
            <button
              type="submit"
              disabled={submitting || !name.trim() || !email.trim()}
              className="w-full bg-teal-500 hover:bg-teal-400 text-white font-bold py-4 rounded-2xl text-base transition active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {submitting
                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><span>Ich bin dabei!</span><ArrowRight size={18} /></>
              }
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="w-full border border-gray-700 text-gray-500 font-medium py-3 rounded-2xl flex items-center justify-center gap-2 text-sm hover:border-gray-500 hover:text-gray-300 transition active:scale-[0.98]"
            >
              {shareSuccess
                ? <><Check size={16} className="text-teal-400" /><span className="text-teal-400">Link kopiert!</span></>
                : <><Share2 size={16} /><span>Teilen</span></>
              }
            </button>
          </form>
        ) : (
          <div className="w-full space-y-4">
            <div className="bg-teal-900/30 border border-teal-700/40 rounded-3xl p-6 text-center space-y-2">
              <div className="text-4xl">✅</div>
              <p className="text-white font-bold text-lg">Du bist dabei, {registeredName.split(' ')[0]}!</p>
              <p className="text-gray-400 text-sm">Wir schreiben dir, sobald SaiHello beim {event.name} startet.</p>
            </div>
            <button
              onClick={handleShare}
              className="w-full bg-teal-600 hover:bg-teal-500 text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 transition active:scale-[0.98]"
            >
              {shareSuccess
                ? <><Check size={18} /><span>Link kopiert!</span></>
                : <><Share2 size={18} /><span>Freunde einladen</span></>
              }
            </button>
            <p className="text-gray-600 text-xs text-center">Je mehr mitmachen, desto schneller startet SaiHello.</p>
          </div>
        )}

      </div>

      {/* Footer */}
      <div className="w-full max-w-md mx-auto px-5 pb-8 text-center">
        <p className="text-gray-700 text-xs">SaiHello © 2026</p>
      </div>
    </div>
  );
}
