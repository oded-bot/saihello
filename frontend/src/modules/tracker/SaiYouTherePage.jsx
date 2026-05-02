import React, { useState, useEffect } from 'react';
import CONFIG from './config';
import { getActiveEvent, registerForEvent } from './api';
import { formatEventDate, getRefFromUrl } from './utils';
import MilestoneCelebration from './components/MilestoneCelebration';
import EventCountdown from './components/EventCountdown';
import { PhaseOne, PhaseTwo, PhaseThree } from './components/Phases';
import RegistrationForm from './components/RegistrationForm';
import PostRegistration from './components/PostRegistration';

export default function SaiYouTherePage({ isLoggedIn, onGoToApp }) {
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

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  async function load() {
    try {
      const d = await getActiveEvent();
      setData(d);
    } catch (e) {}
    finally { setLoading(false); }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await registerForEvent({
        name, email, city,
        eventId: data.event.id,
        referredBy: refCode,
      });
      setRegResult(result);
      setRegistered(true);
      setData(prev => ({ ...prev, count: result.count }));
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
        <button onClick={onGoToApp} className="mt-2 text-teal-400 text-sm font-medium">
          Zur App →
        </button>
      )}
    </div>
  );

  const { event, phase } = data;

  return (
    <>
      {celebration && (
        <MilestoneCelebration milestone={celebration} onDismiss={() => setCelebration(null)} />
      )}

      <div className="min-h-screen bg-gray-950 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>

        {/* Top bar */}
        <div className="w-full max-w-md mx-auto px-5 pt-6 flex items-center justify-between">
          <span className="text-teal-400 font-bold text-lg tracking-wide">{CONFIG.appName}</span>
          {isLoggedIn && onGoToApp && (
            <button onClick={onGoToApp} className="text-gray-500 text-xs hover:text-gray-300 transition">
              Zur App →
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 w-full max-w-md mx-auto px-5 py-6 flex flex-col gap-5">

          {/* Event header */}
          <div className="text-center">
            <div className="text-7xl mb-3">{event.emoji}</div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">{event.name}</h1>
            <p className="text-gray-500 text-sm mt-1">{formatEventDate(event.event_date)} · {event.city}</p>
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
