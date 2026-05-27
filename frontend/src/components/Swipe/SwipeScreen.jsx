import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { MapPin, Clock, Users, Star, X, Heart, Flame, Filter, RefreshCw, PlusCircle, ChevronDown, Search } from 'lucide-react';
import api from '../../utils/api';
import useLanguage from '../../hooks/useLanguage';
import toast from 'react-hot-toast';
import ImageLightbox from '../Shared/ImageLightbox';
import LocationPicker from '../Shared/LocationPicker';
import HintBubble from '../Shared/HintBubble';

function SwipeCard({ offer, onSwipe, isTop, onImageTap }) {
  const { t } = useLanguage();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);

  function handleDragEnd(_, info) {
    const threshold = 100;
    if (info.offset.x > threshold) {
      animate(x, 500, { duration: 0.3 });
      setTimeout(() => onSwipe('like'), 300);
    } else if (info.offset.x < -threshold) {
      animate(x, -500, { duration: 0.3 });
      setTimeout(() => onSwipe('pass'), 300);
    } else {
      animate(x, 0, { type: 'spring', stiffness: 500, damping: 30 });
    }
  }

  if (!isTop) {
    return (
      <div className="absolute inset-0 rounded-2xl bg-gray-100 dark:bg-dark-card scale-[0.95] translate-y-2" />
    );
  }

  const photoUrl = offer.offerer_photo || offer.photo_url;

  return (
    <motion.div
      className="absolute inset-0 cursor-grab active:cursor-grabbing swipe-card"
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
    >
      <div className="relative h-full rounded-2xl overflow-hidden bg-gray-900 shadow-2xl">
        {/* Fullscreen Bild */}
        <div className="absolute inset-0">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt=""
              className="w-full h-full object-cover"
              onClick={(e) => {
                e.stopPropagation();
                onImageTap(photoUrl);
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-tinder-pink to-tinder-orange">
              <span className="text-8xl font-bold text-white/30">{offer.display_name?.charAt(0)}</span>
            </div>
          )}
          <div className="card-gradient absolute inset-0 pointer-events-none" />
        </div>

        {/* Kategorie-Badge */}
        {offer.category && offer.category !== 'sonstiges' && (() => {
          const map = { clubs: '🎵 Club', restaurants: '🍽️ Restaurant & Bar', kultur: '🎭 Kultur', konzert: '🎤 Konzert', sport_aktiv: '🏃 Sport (aktiv)', sport_event: '🏟️ Sport (Ereignis)' };
          const label = map[offer.category];
          if (!label) return null;
          return (
            <div className="absolute top-4 right-4 z-10 bg-black/50 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full">
              {label}
            </div>
          );
        })()}

        {/* Like/Nope Labels */}
        <motion.div
          style={{ opacity: likeOpacity }}
          className="absolute top-8 left-6 px-4 py-2 border-4 border-tinder-green rounded-lg rotate-[-20deg] z-10"
        >
          <span className="text-tinder-green text-3xl font-black">LIKE</span>
        </motion.div>
        <motion.div
          style={{ opacity: nopeOpacity }}
          className="absolute top-8 right-6 px-4 py-2 border-4 border-tinder-pink rounded-lg rotate-[20deg] z-10"
        >
          <span className="text-tinder-pink text-3xl font-black">NOPE</span>
        </motion.div>

        {/* Info Overlay unten */}
        <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
          <div className="flex items-end gap-2 mb-2">
            <h2 className="text-2xl font-bold text-white">{offer.display_name}</h2>
            <span className="text-white/80 text-xl">{offer.offerer_age}</span>
            {offer.is_verified && <Star size={16} className="text-tinder-yellow fill-tinder-yellow mb-1" />}
          </div>

          {offer.location_text && (
            <div className="flex items-center gap-1.5 text-white/70 text-sm mb-1">
              <MapPin size={14} className="text-tinder-orange" />
              <span className="font-medium">{offer.location_text}</span>
            </div>
          )}

          <div className="flex items-center gap-3 text-white/60 text-xs">
            <div className="flex items-center gap-1">
              <MapPin size={12} />
              <span>{new Date(offer.date).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={12} />
              <span>{offer.time_from?.slice(0, 5)} – {offer.time_until?.slice(0, 5)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users size={12} />
              <span>
                {offer.available_seats} {t('free')}
                {offer.seats_for_women > 0 && ` · ${offer.seats_for_women}♀`}
                {offer.seats_for_men > 0 && ` · ${offer.seats_for_men}♂`}
                {offer.seats_any_gender > 0 && ` · ${offer.seats_any_gender} ${t('anyGender')}`}
              </span>
            </div>
          </div>

          {/* Zeit-Badge: Immer die verfügbare Dauer anzeigen */}
          {(() => {
            function toMin(t) { if(!t) return 0; const [h,m] = t.split(':').map(Number); return h*60+m; }
            // Bei Zeitfilter: Überschneidung anzeigen
            if (offer.overlap_minutes != null) {
              if (!offer.full_overlap) {
                const h = Math.floor(offer.overlap_minutes/60);
                const m = offer.overlap_minutes%60;
                const label = h > 0 ? `${h}h ${m > 0 ? m+'min' : ''}` : `${m} Min`;
                return <div className="inline-block bg-orange-500/20 text-orange-300 px-2.5 py-0.5 rounded-full text-xs font-semibold mt-1.5">⚠️ {t('onlyXMinAvailable').replace('{x}', label.trim())}</div>;
              }
              return <div className="inline-block bg-green-500/20 text-green-300 px-2.5 py-0.5 rounded-full text-xs font-semibold mt-1.5">✅ {t('fullAvailability')}</div>;
            }
            // Ohne Zeitfilter: Gesamtdauer anzeigen
            const totalMin = toMin(offer.time_until) - toMin(offer.time_from);
            if (totalMin > 0) {
              const h = Math.floor(totalMin/60);
              const m = totalMin%60;
              const label = h > 0 ? `${h}h${m > 0 ? ' '+m+'min' : ''}` : `${m} Min`;
              return <div className="inline-block bg-white/15 text-white/70 px-2.5 py-0.5 rounded-full text-xs font-medium mt-1.5">⏱ {label}</div>;
            }
            return null;
          })()}


          {(offer.group_age_min || offer.group_age_max) && (
            <div className="inline-block bg-white/15 backdrop-blur-sm text-white px-2 py-0.5 rounded-full text-xs font-medium mt-2">
              {t('group')}: {offer.group_age_min || '?'}-{offer.group_age_max || '?'} {t('years')}
            </div>
          )}

          {offer.group_description && (
            <p className="text-white/70 text-sm mt-2 line-clamp-2">{offer.group_description}</p>
          )}

          {offer.price_per_seat > 0 && (
            <div className="inline-block bg-tinder-yellow/20 text-tinder-yellow px-3 py-1 rounded-full text-sm font-semibold mt-2">
              {parseFloat(offer.price_per_seat).toFixed(0)}{t('seatPrice')}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

const WIZARD_CATEGORIES = [
  { key: 'alle',        label: 'Egal / Alles',      emoji: '✨' },
  { key: 'clubs',       label: 'Club / Bar',         emoji: '🎵' },
  { key: 'restaurants', label: 'Restaurant',          emoji: '🍽️' },
  { key: 'kultur',      label: 'Kultur & Events',    emoji: '🎭' },
  { key: 'konzert',     label: 'Konzert',             emoji: '🎤' },
  { key: 'sport_aktiv', label: 'Sport (aktiv)',       emoji: '🏃' },
  { key: 'sport_event', label: 'Sport (Ereignis)',    emoji: '🏟️' },
  { key: 'sonstiges',   label: 'Sonstiges',           emoji: '🔮' },
];

function SeekerWizard({ onClose, onActivate, loading }) {
  const STEPS = 5;
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState('alle');
  const [dateMode, setDateMode] = useState(null); // 'today' | 'tomorrow' | 'other'
  const [customDate, setCustomDate] = useState('');
  const [timeFrom, setTimeFrom] = useState('18:00');
  const [timeUntil, setTimeUntil] = useState('22:00');
  const [persons, setPersons] = useState(1);
  const [location, setLocation] = useState({ locationText: '', locationLat: null, locationLng: null });
  const [locationChecking, setLocationChecking] = useState(false);
  const [locationError, setLocationError]       = useState('');
  const [geocodeConfirm, setGeocodeConfirm]     = useState(null);

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  function getDate() {
    if (dateMode === 'today') return today;
    if (dateMode === 'tomorrow') return tomorrow;
    if (dateMode === 'other') return customDate;
    return '';
  }

  function formatDate(d) {
    if (!d) return 'Kein Datum';
    return new Date(d + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  function selectQuickDate(mode) {
    setDateMode(mode);
    setTimeout(() => setStep(3), 280);
  }

  const timeOptions = Array.from({ length: 48 }, (_, i) => {
    const h = String(Math.floor(i / 2)).padStart(2, '0');
    const m = i % 2 === 0 ? '00' : '30';
    return `${h}:${m}`;
  });

  async function handleLocationNext() {
    setLocationError('');
    if (location.locationLat != null || !location.locationText?.trim()) {
      setStep(s => s + 1);
      return;
    }
    setLocationChecking(true);
    try {
      const { data } = await api.get('/tables/geocode-check', { params: { q: location.locationText.trim() } });
      if (data.status === 'ok') {
        setLocation(prev => ({ ...prev, locationText: data.displayName || prev.locationText, locationLat: data.lat, locationLng: data.lng }));
        setStep(s => s + 1);
      } else if (data.status === 'needs_confirm') {
        setGeocodeConfirm({ displayName: data.displayName, lat: data.lat, lng: data.lng });
      } else {
        setLocationError('Ort nicht gefunden. Bitte genauer eingeben oder GPS nutzen.');
      }
    } catch {
      setLocationError('Verbindungsfehler. Bitte nochmals versuchen.');
    } finally {
      setLocationChecking(false);
    }
  }

  function handleSubmit() {
    onActivate({ date: getDate(), timeFrom, timeUntil, persons, location, category });
  }

  const progress = (step / STEPS) * 100;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(8,4,20,0.97)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          {step > 1 ? (
            <button onClick={() => setStep(s => s - 1)} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              ‹
            </button>
          ) : <div style={{ width: 36 }} />}
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>{step} / {STEPS}</span>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 18 }}>
            ×
          </button>
        </div>
        {/* Progress bar */}
        <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #7C3AED, #EC4899)', borderRadius: 2, transition: 'width 0.3s ease' }} />
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 24px 24px' }}>

        {/* STEP 1: Kategorie */}
        {step === 1 && (
          <div>
            <h2 style={{ color: 'white', fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Was suchst du?</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, marginBottom: 32 }}>Wähle eine Aktivität für deine Suche.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {WIZARD_CATEGORIES.map(({ key, label, emoji }) => (
                <button key={key} onClick={() => { setCategory(key); setTimeout(() => setStep(2), 200); }} style={{
                  width: '100%', padding: '16px 20px', borderRadius: 16, cursor: 'pointer', textAlign: 'left',
                  background: category === key ? 'linear-gradient(135deg, rgba(124,58,237,0.4), rgba(236,72,153,0.2))' : 'rgba(255,255,255,0.05)',
                  border: category === key ? '1.5px solid rgba(124,58,237,0.8)' : '1.5px solid rgba(255,255,255,0.08)',
                  display: 'flex', alignItems: 'center', gap: 16, transition: 'all 0.2s',
                }}>
                  <span style={{ fontSize: 26 }}>{emoji}</span>
                  <div style={{ color: 'white', fontWeight: 600, fontSize: 16 }}>{label}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: Datum */}
        {step === 2 && (
          <div>
            <h2 style={{ color: 'white', fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Wann?</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, marginBottom: 32 }}>Wähle ein Datum für deine Suche.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { mode: 'today', label: 'Heute', sub: formatDate(today), emoji: '☀️' },
                { mode: 'tomorrow', label: 'Morgen', sub: formatDate(tomorrow), emoji: '🌅' },
              ].map(({ mode, label, sub, emoji }) => (
                <button key={mode} onClick={() => selectQuickDate(mode)} style={{
                  width: '100%', padding: '18px 20px', borderRadius: 18, cursor: 'pointer', textAlign: 'left',
                  background: dateMode === mode ? 'linear-gradient(135deg, rgba(124,58,237,0.4), rgba(236,72,153,0.2))' : 'rgba(255,255,255,0.05)',
                  border: dateMode === mode ? '1.5px solid rgba(124,58,237,0.8)' : '1.5px solid rgba(255,255,255,0.08)',
                  display: 'flex', alignItems: 'center', gap: 16, transition: 'all 0.2s',
                }}>
                  <span style={{ fontSize: 28 }}>{emoji}</span>
                  <div>
                    <div style={{ color: 'white', fontWeight: 700, fontSize: 17 }}>{label}</div>
                    <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>{sub}</div>
                  </div>
                </button>
              ))}

              <button onClick={() => setDateMode(dateMode === 'other' ? null : 'other')} style={{
                width: '100%', padding: '18px 20px', borderRadius: 18, cursor: 'pointer', textAlign: 'left',
                background: dateMode === 'other' ? 'linear-gradient(135deg, rgba(124,58,237,0.4), rgba(236,72,153,0.2))' : 'rgba(255,255,255,0.05)',
                border: dateMode === 'other' ? '1.5px solid rgba(124,58,237,0.8)' : '1.5px solid rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', gap: 16,
              }}>
                <span style={{ fontSize: 28 }}>📅</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'white', fontWeight: 700, fontSize: 17 }}>Anderes Datum</div>
                  <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>Datum auswählen</div>
                </div>
              </button>

              {dateMode === 'other' && (
                <div style={{ marginTop: -4 }}>
                  <input type="date" value={customDate} min={today}
                    onChange={e => setCustomDate(e.target.value)}
                    style={{ width: '100%', padding: '14px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(124,58,237,0.6)', color: 'white', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
                  />
                  {customDate && (
                    <button onClick={() => setStep(3)} style={{
                      marginTop: 12, width: '100%', padding: '14px', borderRadius: 14, cursor: 'pointer',
                      background: 'linear-gradient(135deg, #7C3AED, #EC4899)', color: 'white', fontWeight: 700, fontSize: 15, border: 'none',
                    }}>Weiter →</button>
                  )}
                </div>
              )}

              <button onClick={() => { setDateMode(null); setStep(3); }} style={{
                color: 'rgba(255,255,255,0.35)', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0', textAlign: 'center',
              }}>Ohne Datum fortfahren</button>
            </div>
          </div>
        )}

        {/* STEP 3: Zeitfenster */}
        {step === 3 && (
          <div>
            <h2 style={{ color: 'white', fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Wann genau?</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, marginBottom: 32 }}>In welchem Zeitfenster bist du verfügbar?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>Von</label>
                <div style={{ position: 'relative' }}>
                  <select value={timeFrom} onChange={e => setTimeFrom(e.target.value)} style={{
                    width: '100%', padding: '16px 20px', borderRadius: 16, background: 'rgba(255,255,255,0.08)',
                    border: '1.5px solid rgba(124,58,237,0.5)', color: 'white', fontSize: 20, fontWeight: 700,
                    appearance: 'none', outline: 'none', cursor: 'pointer', boxSizing: 'border-box',
                  }}>
                    {timeOptions.map(t => <option key={t} value={t} style={{ background: '#1a0a2e' }}>{t} Uhr</option>)}
                  </select>
                  <ChevronDown size={16} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', pointerEvents: 'none' }} />
                </div>
              </div>
              <div>
                <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>Bis</label>
                <div style={{ position: 'relative' }}>
                  <select value={timeUntil} onChange={e => setTimeUntil(e.target.value)} style={{
                    width: '100%', padding: '16px 20px', borderRadius: 16, background: 'rgba(255,255,255,0.08)',
                    border: '1.5px solid rgba(124,58,237,0.5)', color: 'white', fontSize: 20, fontWeight: 700,
                    appearance: 'none', outline: 'none', cursor: 'pointer', boxSizing: 'border-box',
                  }}>
                    {timeOptions.map(t => <option key={t} value={t} style={{ background: '#1a0a2e' }}>{t} Uhr</option>)}
                  </select>
                  <ChevronDown size={16} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', pointerEvents: 'none' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Personen + Ort */}
        {step === 4 && (
          <div>
            <h2 style={{ color: 'white', fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Wie viele seid ihr?</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, marginBottom: 36 }}>Und wo möchtet ihr hin?</p>

            {/* Stepper */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32, marginBottom: 40 }}>
              <button onClick={() => setPersons(p => Math.max(1, p - 1))} style={{
                width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.08)',
                border: '1.5px solid rgba(255,255,255,0.15)', color: 'white', fontSize: 28, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>−</button>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'white', fontSize: 52, fontWeight: 800, lineHeight: 1 }}>{persons}</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 6 }}>{persons === 1 ? 'Person' : 'Personen'}</div>
              </div>
              <button onClick={() => setPersons(p => Math.min(20, p + 1))} style={{
                width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(124,58,237,0.6), rgba(236,72,153,0.4))',
                border: '1.5px solid rgba(124,58,237,0.6)', color: 'white', fontSize: 28, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>+</button>
            </div>

            {/* Optional Ort */}
            <div>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Ort (optional)</p>
              <LocationPicker onLocationChange={(loc) => { setLocation(loc); setLocationError(''); }} />
              {locationError && (
                <div style={{
                  marginTop: 12, padding: '10px 14px', borderRadius: 12,
                  background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)',
                  color: '#fca5a5', fontSize: 13, lineHeight: 1.4,
                }}>
                  {locationError}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 5: Zusammenfassung */}
        {step === 5 && (
          <div>
            <h2 style={{ color: 'white', fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Alles korrekt?</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, marginBottom: 28 }}>Überprüfe deine Angaben.</p>

            <div style={{ borderRadius: 20, overflow: 'hidden', border: '1.5px solid rgba(124,58,237,0.3)', marginBottom: 28 }}>
              {[
                { icon: '🎯', label: 'Aktivität', value: WIZARD_CATEGORIES.find(c => c.key === category)?.label || 'Egal / Alles' },
                { icon: '📅', label: 'Datum', value: getDate() ? formatDate(getDate()) : 'Alle Tage' },
                { icon: '🕐', label: 'Zeitfenster', value: `${timeFrom} – ${timeUntil} Uhr` },
                { icon: '👥', label: 'Personen', value: `${persons} ${persons === 1 ? 'Person' : 'Personen'}` },
                { icon: '📍', label: 'Ort', value: location.locationText || 'Nicht angegeben' },
              ].map(({ icon, label, value }, i, arr) => (
                <div key={label} style={{
                  padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14,
                  background: i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                  borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                }}>
                  <span style={{ fontSize: 22, width: 28, textAlign: 'center' }}>{icon}</span>
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
                    <div style={{ color: 'white', fontSize: 15, fontWeight: 600, marginTop: 2 }}>{value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Geocode-Bestätigungs-Dialog */}
      {geocodeConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200000, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'rgba(18,10,35,0.98)', border: '1.5px solid rgba(124,58,237,0.5)', borderRadius: 20, padding: 24, width: '100%', maxWidth: 340 }}>
            <p style={{ color: 'white', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Meintest du diesen Ort?</p>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 24, lineHeight: 1.4 }}>{geocodeConfirm.displayName}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                onClick={() => {
                  setLocation(prev => ({ ...prev, locationText: geocodeConfirm.displayName, locationLat: geocodeConfirm.lat, locationLng: geocodeConfirm.lng }));
                  setGeocodeConfirm(null);
                  setStep(s => s + 1);
                }}
                style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #7C3AED, #EC4899)', color: 'white', fontWeight: 700, fontSize: 14 }}
              >
                Ja, das stimmt
              </button>
              <button
                onClick={() => setGeocodeConfirm(null)}
                style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.10)', cursor: 'pointer', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', fontWeight: 500, fontSize: 14 }}
              >
                Nein, neu eingeben
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer — Step 1 hat keinen Weiter-Button (Kategorie-Auswahl navigiert automatisch) */}
      <div style={{ padding: '12px 24px 32px' }}>
        {step === 1 ? null : step < 5 ? (
          <button
            onClick={step === 4 ? handleLocationNext : () => setStep(s => s + 1)}
            disabled={step === 4 && locationChecking}
            style={{
              width: '100%', padding: '16px', borderRadius: 18, cursor: locationChecking ? 'not-allowed' : 'pointer',
              background: 'linear-gradient(135deg, #7C3AED, #EC4899)', color: 'white', fontWeight: 800, fontSize: 16, border: 'none',
              boxShadow: '0 4px 20px rgba(124,58,237,0.4)', opacity: locationChecking ? 0.6 : 1,
            }}
          >
            {step === 4 && locationChecking ? 'Ort wird geprüft…' : 'Weiter →'}
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={loading} style={{
            width: '100%', padding: '16px', borderRadius: 18, cursor: loading ? 'not-allowed' : 'pointer',
            background: loading ? 'rgba(124,58,237,0.3)' : 'linear-gradient(135deg, #7C3AED, #EC4899)',
            color: 'white', fontWeight: 800, fontSize: 16, border: 'none',
            boxShadow: loading ? 'none' : '0 4px 20px rgba(124,58,237,0.4)',
          }}>
            {loading ? 'Wird aktiviert...' : '🔍 Suche aktivieren'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function SwipeScreen() {
  const [offers, setOffers] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showMatch, setShowMatch] = useState(null);
  const [showFilter, setShowFilter] = useState(false);
  const [ageFilter, setAgeFilter] = useState({ min: '', max: '' });
  const [searchFilter, setSearchFilter] = useState({
    totalPersons: '',
    women: '',
    men: '',
    date: '',
    timeFrom: '',
    timeUntil: '',
  });
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const [searchApplied, setSearchApplied] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('alle');
  const [roleLocked, setRoleLocked] = useState(false);
  const [conflictingOffer, setConflictingOffer] = useState(null);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [activeSearch, setActiveSearch] = useState(null);
  const [showSeekerWizard, setShowSeekerWizard] = useState(false);
  const [seekerLoading, setSeekerLoading] = useState(false);
  const pollRef = useRef(null);
  const geoFallbackRef = useRef(null);
  const { t } = useLanguage();

  useEffect(() => {
    initWithGeo();
    loadActiveSearch();
    pollRef.current = setInterval(refreshOffers, 10000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  function initWithGeo() {
    if (!navigator.geolocation) { loadOffers(); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        geoFallbackRef.current = coords;
        loadOffers(undefined, coords);
      },
      () => loadOffers(),
      { timeout: 4000, maximumAge: 120000 }
    );
  }

  async function loadActiveSearch() {
    try {
      const { data } = await api.get('/seeker/my');
      setActiveSearch(data);
      if (data?.category && data.category !== 'alle') {
        setCategoryFilter(data.category);
        loadOffers(data.category);
      }
    } catch (err) {}
  }

  async function activateSearch({ date, timeFrom, timeUntil, persons, location, category }) {
    setSeekerLoading(true);
    try {
      await api.post('/seeker', {
        locationText: location?.locationText || undefined,
        locationLat: location?.locationLat || undefined,
        locationLng: location?.locationLng || undefined,
        date: date || undefined,
        timeFrom: timeFrom || undefined,
        timeUntil: timeUntil || undefined,
        persons: persons || undefined,
        category: category || 'alle',
      });
      toast.success(t('searchCreated'));
      await loadActiveSearch();
      setShowSeekerWizard(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Fehler beim Aktivieren der Suche');
    } finally {
      setSeekerLoading(false);
    }
  }

  async function deactivateSearch() {
    try {
      await api.delete('/seeker/my');
      setActiveSearch(null);
      toast.success(t('searchDeleted'));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Fehler');
    }
  }

  function buildQuery(overrideCategory, geoCoords) {
    const params = new URLSearchParams();
    if (ageFilter.min) params.set('ageMin', ageFilter.min);
    if (ageFilter.max) params.set('ageMax', ageFilter.max);
    // Suchfilter
    if (searchFilter.totalPersons) params.set('seats', searchFilter.totalPersons);
    if (searchFilter.women) params.set('women', searchFilter.women);
    if (searchFilter.men) params.set('men', searchFilter.men);
    const totalP = parseInt(searchFilter.totalPersons) || 0;
    const womenP = parseInt(searchFilter.women) || 0;
    const menP = parseInt(searchFilter.men) || 0;
    const diverseP = Math.max(0, totalP - womenP - menP);
    if (diverseP > 0) params.set('diverse', diverseP.toString());
    if (searchFilter.date) params.set('date', searchFilter.date);
    if (searchFilter.timeFrom) params.set('timeFrom', searchFilter.timeFrom);
    if (searchFilter.timeUntil) params.set('timeUntil', searchFilter.timeUntil);
    const cat = overrideCategory !== undefined ? overrideCategory : categoryFilter;
    if (cat && cat !== 'alle') params.set('category', cat);
    if (geoCoords?.lat != null) { params.set('lat', geoCoords.lat); params.set('lng', geoCoords.lng); }
    return params.toString() ? `?${params.toString()}` : '';
  }

  async function loadOffers(overrideCategory, geoCoords) {
    try {
      setLoading(true);
      const queryStr = buildQuery(overrideCategory, geoCoords);
      const { data } = await api.get(`/tables/discover${queryStr}`);
      setOffers(data);
      setCurrentIdx(0);
    } catch (err) {
      if (err.response?.data?.code === 'ROLE_LOCKED_OFFERING') {
        setConflictingOffer(err.response.data.conflictingOffer || null);
        setRoleLocked(true);
      } else if (err.response?.status === 429) {
        toast.error(t('tooManyRequests'));
      } else {
        toast.error(err.response?.data?.error || t('loadOffersFailed'));
      }
    } finally {
      setLoading(false);
    }
  }

  async function refreshOffers() {
    try {
      const { data } = await api.get(`/tables/discover${buildQuery(undefined, geoFallbackRef.current)}`);
      if (data.length > offers.length - currentIdx) {
        setOffers(data);
        setCurrentIdx(0);
      }
    } catch (err) {
      // stille
    }
  }

  async function handleSwipe(direction) {
    const offer = offers[currentIdx];
    if (!offer) return;

    try {
      await api.post('/matching/swipe', { offerId: offer.id, direction });
      if (direction === 'like') {
        toast.success('Anfrage gesendet!');
      }
    } catch (err) {
      if (err.response?.status === 403) {
        toast.error(err.response.data.error || t('error'));
      }
    }

    setCurrentIdx((prev) => prev + 1);
  }

  if (roleLocked) {
    const co = conflictingOffer;
    const dateFormatted = co?.date
      ? new Date(co.date + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
      : null;

    return (
      <div className="flex flex-col h-[80vh] items-center justify-end pb-6 px-4">
        {/* Dimmed top area */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center opacity-30">
            <PlusCircle size={48} className="text-white mx-auto mb-3" />
            <p className="text-white text-sm">Entdecken</p>
          </div>
        </div>

        {/* Bottom Sheet */}
        <div
          className="w-full rounded-3xl p-6"
          style={{ background: 'rgba(22,12,40,0.98)', border: '1.5px solid rgba(124,58,237,0.40)' }}
        >
          {/* Handle */}
          <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />

          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 text-xl"
              style={{ background: 'rgba(124,58,237,0.2)' }}>
              🎯
            </div>
            <div>
              <h3 className="text-white font-bold text-base leading-snug">Zeitfenster bereits belegt</h3>
              <p className="text-white/60 text-sm mt-1 leading-relaxed">
                Du hast für diesen Zeitraum schon einen Platz angeboten. Solange dein Angebot aktiv ist, kannst du nicht gleichzeitig in diesem Fenster suchen.
              </p>
            </div>
          </div>

          {/* Kollidierendes Angebot */}
          {co && (
            <div className="rounded-2xl px-4 py-3 mb-5 flex items-center gap-3"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Clock size={15} className="text-white/50 shrink-0" />
              <div>
                <p className="text-white text-sm font-semibold">
                  {dateFormatted || co.date}
                </p>
                <p className="text-white/50 text-xs mt-0.5">
                  {co.timeFrom?.slice(0,5)} – {co.timeUntil?.slice(0,5)} Uhr
                  {co.locationText ? ` · ${co.locationText}` : ''}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => { setRoleLocked(false); window.location.href = '/offer'; }}
              className="w-full py-3.5 rounded-2xl text-white font-bold text-sm"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}
            >
              Mein Angebot bearbeiten
            </button>
            <button
              onClick={() => { setRoleLocked(false); setConflictingOffer(null); }}
              className="w-full py-3.5 rounded-2xl text-white/70 font-semibold text-sm"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              Anderes Zeitfenster suchen
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center">
          <Flame size={48} className="text-tinder-pink mx-auto mb-4 animate-bounce" fill="currentColor" />
          <p className="text-gray-400">{t('loadingOffers')}</p>
        </div>
      </div>
    );
  }

  const currentOffer = offers[currentIdx];
  const nextOffer = offers[currentIdx + 1];

  return (
    <div className="px-3 pt-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('discover')}</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Aktuelle Angebote in deiner Nähe</p>
        </div>
        <div className="flex gap-2 mt-0.5">
          <button onClick={() => setShowSearchOverlay(true)} className={`w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition ${searchApplied ? 'tinder-gradient text-white' : 'bg-gray-100 dark:bg-dark-card text-gray-500'}`}>
            <Search size={16} />
          </button>
          <button onClick={() => setShowFilter(!showFilter)} className={`w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition ${showFilter ? 'tinder-gradient text-white' : 'bg-gray-100 dark:bg-dark-card text-gray-500'}`}>
            <Filter size={16} />
          </button>
          <button onClick={loadOffers} className="w-9 h-9 bg-gray-100 dark:bg-dark-card rounded-full flex items-center justify-center active:scale-90 transition">
            <RefreshCw size={16} className="text-gray-500" />
          </button>
        </div>
      </div>

      {/* Seeker-Panel */}
      {activeSearch ? (
        <div className="bg-app-violet/10 border border-app-violet/30 rounded-2xl px-4 py-3 mb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-app-violet font-semibold mb-1">{t('searchActive')}</p>
              <p className="text-sm text-white font-medium">
                {activeSearch.location_text || t('myLocation')}
              </p>
              <p className="text-xs text-white/50 mt-0.5">
                {[
                  activeSearch.date,
                  activeSearch.time_from && activeSearch.time_until ? `${activeSearch.time_from}–${activeSearch.time_until}` : null,
                  activeSearch.seats_needed ? `${activeSearch.seats_needed} Platz/Plätze` : null,
                  activeSearch.category && activeSearch.category !== 'alle' ? activeSearch.category : null,
                ].filter(Boolean).join(' · ')}
              </p>
            </div>
            <button
              onClick={deactivateSearch}
              className="w-8 h-8 rounded-full bg-dark-elevated flex items-center justify-center shrink-0 mt-0.5"
            >
              <X size={16} className="text-white/60" />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-dark-elevated/50 border border-white/10 rounded-2xl px-4 py-3 mb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/40">{t('noSearchActive')}</p>
              <p className="text-xs text-white/25 mt-0.5">{t('noSearchActiveHint')}</p>
            </div>
            <button
              onClick={() => setShowSeekerWizard(true)}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs text-white font-semibold"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}
            >
              {t('startSearch')}
            </button>
          </div>
        </div>
      )}

      {/* Kategorie-Filter Chips */}
      <div className="relative mb-3">
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar pr-8">

        {[
          { key: 'alle', label: t('categoryAll') },
          { key: 'clubs', label: '🎵 ' + t('categoryClubs') },
          { key: 'restaurants', label: '🍽️ ' + t('categoryRestaurants') },
          { key: 'kultur', label: '🎭 ' + t('categoryKultur') },
          { key: 'konzert', label: '🎤 ' + t('categoryKonzert') },
          { key: 'sport_aktiv', label: '🏃 ' + t('categorySportAktiv') },
          { key: 'sport_event', label: '🏟️ ' + t('categorySportEvent') },
          { key: 'sonstiges', label: '✨ ' + t('categorySonstiges') },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setCategoryFilter(key); loadOffers(key); }}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition active:scale-95 ${
              categoryFilter === key
                ? 'tinder-gradient text-white border-transparent'
                : 'bg-gray-100 dark:bg-dark-card text-gray-600 dark:text-gray-400 border-gray-200 dark:border-dark-separator'
            }`}
          >
            {label}
          </button>
        ))}
        </div>
        {/* Fade-Indikator rechts */}
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-dark-bg to-transparent" />
      </div>

      {/* Altersfilter */}
      {showFilter && (
        <div className="bg-gray-50 dark:bg-dark-card rounded-2xl p-4 mb-3 border border-gray-200 dark:border-dark-separator dark-transition">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('filterAge')}</p>
          <div className="flex items-center gap-2">
            <input type="number" min={18} max={99} placeholder={t('from')} value={ageFilter.min}
              onChange={(e) => setAgeFilter(f => ({...f, min: e.target.value}))}
              className="flex-1 px-3 py-2 bg-white dark:bg-dark-elevated border border-gray-200 dark:border-dark-separator rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-tinder-pink" />
            <span className="text-gray-400">-</span>
            <input type="number" min={18} max={99} placeholder={t('to')} value={ageFilter.max}
              onChange={(e) => setAgeFilter(f => ({...f, max: e.target.value}))}
              className="flex-1 px-3 py-2 bg-white dark:bg-dark-elevated border border-gray-200 dark:border-dark-separator rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-tinder-pink" />
            <button onClick={() => { loadOffers(); setShowFilter(false); }}
              className="px-4 py-2 tinder-gradient text-white text-sm font-medium rounded-xl active:scale-95 transition">
              OK
            </button>
          </div>
          <button onClick={() => { setAgeFilter({min:'',max:''}); loadOffers(); setShowFilter(false); }}
            className="text-xs text-gray-500 mt-2 underline">{t('resetFilter')}</button>
        </div>
      )}

      {/* Card Stack — Fullscreen */}
      <div className="relative h-[68vh] mb-4">
        {!currentOffer ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center px-8">
              <Flame size={64} className="text-gray-200 dark:text-gray-700 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('noMoreOffers')}</h3>
              <p className="text-gray-400 text-sm">{t('checkBackLater')}</p>
              <button
                onClick={loadOffers}
                className="mt-4 px-6 py-2.5 tinder-gradient text-white rounded-full text-sm font-medium active:scale-95 transition shadow-md"
              >
                {t('refresh')}
              </button>
            </div>
          </div>
        ) : (
          <>
            {nextOffer && <SwipeCard offer={nextOffer} onSwipe={() => {}} isTop={false} onImageTap={() => {}} />}
            <SwipeCard
              key={currentOffer.id}
              offer={currentOffer}
              onSwipe={handleSwipe}
              isTop={true}
              onImageTap={(src) => setLightboxSrc(src)}
            />
          </>
        )}
      </div>

      {/* Action Button */}
      {currentOffer && (
        <div className="flex justify-center items-center" style={{ position: 'relative' }}>
          <HintBubble
            id="swipe_like"
            text="Gefällt dir das Angebot? Tippe auf Herz oder wische die Karte nach rechts. Wische links zum Überspringen."
            position="top"
            delay={800}
          />
          {/* Like (grün) */}
          <button
            onClick={() => handleSwipe('like')}
            className="w-16 h-16 bg-white dark:bg-dark-card border-2 border-tinder-green rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
          >
            <Heart size={30} className="text-tinder-green" />
          </button>
        </div>
      )}

      {/* Match Popup */}
      {showMatch && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setShowMatch(null)}
        >
          <div className="absolute inset-0 tinder-gradient opacity-95" />
          <div className="text-center relative z-10">
            <h2 className="text-5xl font-black text-white mb-4">{t('itsAMatch')}</h2>
            <p className="text-white/80 text-lg">{t('youAnd')} {showMatch.display_name}</p>
            <p className="text-white/60 mt-2">{t('canChatNow')}</p>
            <Heart size={64} className="text-white mx-auto mt-6 match-pulse" fill="white" />
          </div>
        </motion.div>
      )}

      {/* Such-Filter Overlay */}
      {showSearchOverlay && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={() => setShowSearchOverlay(false)}>
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-white dark:bg-dark-card w-full max-w-lg rounded-t-3xl p-6 pb-24 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('searchFilter')}</h3>
                <p className="text-xs text-gray-400 mt-0.5">Aktuelle Angebote im Feed einschränken</p>
              </div>
              <button onClick={() => setShowSearchOverlay(false)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-dark-elevated flex items-center justify-center shrink-0 mt-0.5">
                <X size={16} className="text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Anzahl Personen */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">{t('weAre')}</label>
                <input
                  type="number" min={1} max={10}
                  value={searchFilter.totalPersons}
                  onChange={(e) => setSearchFilter(f => ({...f, totalPersons: e.target.value}))}
                  placeholder={t('numberOfPersons')}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-elevated border border-gray-200 dark:border-dark-separator rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-tinder-pink text-sm"
                />
              </div>

              {/* Geschlecht-Verteilung */}
              {parseInt(searchFilter.totalPersons) > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('ofWhichWomen')}</label>
                    <input
                      type="number" min={0} max={parseInt(searchFilter.totalPersons) || 0}
                      value={searchFilter.women}
                      onChange={(e) => setSearchFilter(f => ({...f, women: e.target.value}))}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-elevated border border-gray-200 dark:border-dark-separator rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-tinder-pink text-sm text-center"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('ofWhichMen')}</label>
                    <input
                      type="number" min={0} max={parseInt(searchFilter.totalPersons) || 0}
                      value={searchFilter.men}
                      onChange={(e) => setSearchFilter(f => ({...f, men: e.target.value}))}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-elevated border border-gray-200 dark:border-dark-separator rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-tinder-pink text-sm text-center"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('ofWhichDiverse')}</label>
                    <div className="w-full px-3 py-2 bg-gray-100 dark:bg-dark-card border border-gray-200 dark:border-dark-separator rounded-xl text-gray-500 dark:text-gray-400 text-sm text-center">
                      {Math.max(0, (parseInt(searchFilter.totalPersons) || 0) - (parseInt(searchFilter.women) || 0) - (parseInt(searchFilter.men) || 0))}
                    </div>
                  </div>
                </div>
              )}


              {/* Datum */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">{t('date')} ({t('optional')})</label>
                <input
                  type="date"
                  value={searchFilter.date}
                  onChange={(e) => setSearchFilter(f => ({...f, date: e.target.value}))}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-elevated border border-gray-200 dark:border-dark-separator rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-tinder-pink text-sm"
                />
              </div>

              {/* Zeitfenster */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">{t('timeFromSearch')} ({t('optional')})</label>
                  <div className="relative">
                    <select
                      value={searchFilter.timeFrom}
                      onChange={(e) => setSearchFilter(f => ({...f, timeFrom: e.target.value}))}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-elevated border border-gray-200 dark:border-dark-separator rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-tinder-pink text-sm appearance-none"
                    >
                      <option value="">{t('selectTime')}</option>
                      {Array.from({length: 48}).map((_, i) => {
                        const h = String(Math.floor(i/2)).padStart(2,'0');
                        const m = i % 2 === 0 ? '00' : '30';
                        return <option key={i} value={`${h}:${m}`}>{h}:{m}</option>;
                      })}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">{t('timeUntilSearch')} ({t('optional')})</label>
                  <div className="relative">
                    <select
                      value={searchFilter.timeUntil}
                      onChange={(e) => setSearchFilter(f => ({...f, timeUntil: e.target.value}))}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-elevated border border-gray-200 dark:border-dark-separator rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-tinder-pink text-sm appearance-none"
                    >
                      <option value="">{t('selectTime')}</option>
                      {Array.from({length: 48}).map((_, i) => {
                        const h = String(Math.floor(i/2)).padStart(2,'0');
                        const m = i % 2 === 0 ? '00' : '30';
                        return <option key={i} value={`${h}:${m}`}>{h}:{m}</option>;
                      })}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setSearchFilter({ totalPersons: '', women: '', men: '', date: '', timeFrom: '', timeUntil: '' });
                  setSearchApplied(false);
                  setShowSearchOverlay(false);
                  setTimeout(loadOffers, 0);
                }}
                className="flex-1 py-3 bg-gray-100 dark:bg-dark-elevated text-gray-700 dark:text-gray-300 font-medium rounded-full text-sm"
              >
                {t('resetFilter')}
              </button>
              <button
                onClick={() => {
                  setSearchApplied(!!(searchFilter.totalPersons || searchFilter.date || searchFilter.timeFrom || searchFilter.timeUntil));
                  setShowSearchOverlay(false);
                  setTimeout(loadOffers, 0);
                }}
                className="flex-1 py-3 tinder-gradient text-white font-bold rounded-full text-sm shadow-lg"
              >
                {t('searchNow')}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}

      {/* Seeker Wizard */}
      {showSeekerWizard && (
        <SeekerWizard
          onClose={() => setShowSeekerWizard(false)}
          onActivate={activateSearch}
          loading={seekerLoading}
        />
      )}
    </div>
  );
}
