import React, { useState, useEffect } from 'react';
import CONFIG from './config';
import { getFeaturedEvent, getEventBySlug, getUpcomingActive, registerForUpcoming } from './api';
import { formatEventDate, getRefFromUrl } from './utils';
import MilestoneCelebration from './components/MilestoneCelebration';
import EventCountdown from './components/EventCountdown';
import { PhaseOne, PhaseTwo, PhaseThree } from './components/Phases';
import RegistrationForm from './components/RegistrationForm';
import PostRegistration from './components/PostRegistration';

function forceTrackerMode() {
  return new URLSearchParams(window.location.search).get('tracker') === '1';
}

function getUpcomingEventId() {
  return new URLSearchParams(window.location.search).get('event');
}

function AppLiveScreen({ event, isLoggedIn, onGoToApp }) {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6 text-center gap-6">
      <div className="text-7xl">{event?.emoji || '🚀'}</div>
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">SaiHello ist live!</h1>
        <p className="text-gray-400 text-sm mt-2">{event?.name} · {event?.city}</p>
      </div>
      <div className="w-full max-w-xs space-y-3">
        {isLoggedIn && onGoToApp ? (
          <button
            onClick={onGoToApp}
            className="w-full bg-teal-500 text-white font-bold py-4 rounded-2xl text-base active:scale-[0.98] transition"
          >
            Zur App →
          </button>
        ) : (
          <>
            <button
              onClick={() => window.location.href = '/register'}
              className="w-full bg-teal-500 text-white font-bold py-4 rounded-2xl text-base active:scale-[0.98] transition"
            >
              Jetzt registrieren
            </button>
            <button
              onClick={() => window.location.href = '/login'}
              className="w-full border border-gray-700 text-gray-300 font-medium py-3 rounded-2xl text-sm active:scale-[0.98] transition"
            >
              Bereits registriert? Einloggen →
            </button>
          </>
        )}
      </div>
      <p className="text-gray-700 text-xs">SaiHello © 2026</p>
    </div>
  );
}

export default function SaiYouTherePage({ isLoggedIn, onGoToApp, slug }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [registered, setRegistered] = useState(false);
  const [regResult, setRegResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [celebration, setCelebration] = useState(null);

  const refCode = getRefFromUrl();
  const showTracker = forceTrackerMode();
  const upcomingEventId = getUpcomingEventId();

  useEffect(() => {
    if (upcomingEventId) {
      loadUpcoming(upcomingEventId);
      const interval = setInterval(() => loadUpcoming(upcomingEventId), 30000);
      return () => clearInterval(interval);
    }
    if (slug) {
      loadBySlug(slug);
      const interval = setInterval(() => loadBySlug(slug), 30000);
      return () => clearInterval(interval);
    }
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!data?.thresholdReached || showTracker || upcomingEventId) return;
    if (isLoggedIn && onGoToApp) onGoToApp();
  }, [data, isLoggedIn, showTracker]);

  async function load() {
    try {
      const d = await getFeaturedEvent();
      setData(d);
    } catch (e) {}
    finally { setLoading(false); }
  }

  async function loadBySlug(s) {
    try {
      const d = await getEventBySlug(s);
      setData(d);
    } catch (e) {}
    finally { setLoading(false); }
  }

  async function loadUpcoming(id) {
    try {
      const d = await getUpcomingActive(id);
      setData(d);
    } catch (e) {}
    finally { setLoading(false); }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      let result;
      if (upcomingEventId || slug) {
        result = await registerForUpcoming({
          name, email, city,
          upcomingEventId: data.event.id,
          referredBy: refCode,
        });
      } else {
        const { registerForEvent } = await import('./api');
        result = await registerForEvent({
          name, email, city,
          eventId: data.event.id,
          referredBy: refCode,
        });
      }
      if (result.referralCode) {
        localStorage.setItem('saiHelloRefCode', result.referralCode);
      }
      setRegResult(result);
      setRegistered(true);
      setData(prev => ({ ...prev, count: result.count, thresholdReached: result.count >= prev.event.threshold_hard }));
      if (result.milestoneCelebration) setCelebration(result.milestoneCelebration);
    } catch (e) {}
    finally { setSubmitting(false); }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!data?.active) return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4 text-white px-6 text-center">
      <span className="text-5xl">🎉</span>
      <h1 className="text-2xl font-bold">{CONFIG.appName}</h1>
      <p className="text-gray-400 text-sm">Kein aktives Event gerade.</p>
      {isLoggedIn && onGoToApp && (
        <button onClick={onGoToApp} className="mt-2 text-teal-400 text-sm font-medium">Zur App →</button>
      )}
    </div>
  );

  // Threshold erreicht + kein ?tracker=1 (und kein upcoming-spezifischer Event) → "App ist live"-Screen
  if (data.thresholdReached && !showTracker && !upcomingEventId) {
    return <AppLiveScreen event={data.event} isLoggedIn={isLoggedIn} onGoToApp={onGoToApp} />;
  }

  const { event, phase } = data;

  return (
    <>
      {celebration && (
        <MilestoneCelebration milestone={celebration} onDismiss={() => setCelebration(null)} />
      )}

      <div className="min-h-screen bg-gray-950 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>

        <div className="w-full max-w-md mx-auto px-5 pt-6 flex items-center justify-between">
          <span className="text-teal-400 font-bold text-lg tracking-wide">{CONFIG.appName}</span>
          {upcomingEventId ? (
            <button onClick={() => window.history.back()} className="text-gray-500 text-xs hover:text-gray-300 transition">
              ← Zurück
            </button>
          ) : isLoggedIn && onGoToApp ? (
            <button onClick={onGoToApp} className="text-gray-500 text-xs hover:text-gray-300 transition">
              Zur App →
            </button>
          ) : null}
        </div>

        <div className="flex-1 w-full max-w-md mx-auto px-5 py-6 flex flex-col gap-5">

          <div className="text-center">
            <div className="text-7xl mb-3">{event.emoji}</div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">{event.name}</h1>
            <p className="text-gray-500 text-sm mt-1">{event.date_text || (event.event_date ? formatEventDate(event.event_date) : '')} · {event.city}</p>
          </div>

          <EventCountdown event={event} />

          {phase === 1 && <PhaseOne data={data} />}
          {phase === 2 && <PhaseTwo data={data} />}
          {phase === 3 && <PhaseThree data={data} />}

          {!registered ? (
            <RegistrationForm
              event={event}
              name={name} setName={setName}
              email={email} setEmail={setEmail}
              city={city} setCity={setCity}
              onSubmit={handleRegister}
              submitting={submitting}
            />
          ) : (
            <PostRegistration
              firstName={name.split(' ')[0]}
              event={event}
              regResult={regResult}
            />
          )}
        </div>

        <div className="w-full max-w-md mx-auto px-5 pb-8 text-center">
          <p className="text-gray-800 text-xs">{CONFIG.appName} © 2026</p>
        </div>
      </div>
    </>
  );
}
