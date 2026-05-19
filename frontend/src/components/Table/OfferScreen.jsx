import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Camera, Image as ImageIcon, ChevronLeft, Plus, Minus, X, Edit2, Trash2, Clock, Users, ChevronDown } from 'lucide-react';
import api from '../../utils/api';
import useLanguage from '../../hooks/useLanguage';
import toast from 'react-hot-toast';
import LocationPicker from '../Shared/LocationPicker';

const CATEGORIES = [
  { key: 'clubs',        label: 'Club / Bar',        emoji: '🎵' },
  { key: 'restaurants',  label: 'Restaurant',         emoji: '🍽️' },
  { key: 'kultur',       label: 'Kultur & Events',    emoji: '🎭' },
  { key: 'konzert',      label: 'Konzert',            emoji: '🎤' },
  { key: 'sport_aktiv',  label: 'Sport (aktiv)',      emoji: '🏃' },
  { key: 'sport_event',  label: 'Sport (Ereignis)',   emoji: '🏟️' },
  { key: 'sonstiges',    label: 'Sonstiges',          emoji: '✨' },
];

const TIME_OPTIONS = Array.from({ length: 48 }).map((_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, '0');
  const m = i % 2 === 0 ? '00' : '30';
  return `${h}:${m}`;
});

const WIZARD_STEPS = 6;

// ─── Wizard (Create) ──────────────────────────────────────────────────────────

function OfferWizard({ onCancel, onSuccess }) {
  const [step, setStep] = useState(1);
  const fileInputRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const [category, setCategory]         = useState('');
  const [location, setLocation]         = useState({ locationText: '', locationLat: null, locationLng: null });
  const [date, setDate]                 = useState(today);
  const [timeFrom, setTimeFrom]         = useState('18:00');
  const [timeUntil, setTimeUntil]       = useState('22:00');
  const [seats, setSeats]               = useState(2);
  const [genderEgal, setGenderEgal]     = useState(true);
  const [seatsForWomen, setSeatsForWomen] = useState(0);
  const [seatsForMen, setSeatsForMen]   = useState(0);
  const [photo, setPhoto]               = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [description, setDescription]   = useState('');
  const [geocodeConfirm, setGeocodeConfirm] = useState(null); // { displayName, lat, lng }
  const [locationChecking, setLocationChecking] = useState(false);
  const [locationError, setLocationError] = useState('');

  function next() { setStep(s => s + 1); }
  function back() { step === 1 ? onCancel() : setStep(s => s - 1); }

  async function handleLocationNext() {
    setLocationError('');
    if (location.locationLat != null || !location.locationText?.trim()) {
      next();
      return;
    }
    setLocationChecking(true);
    try {
      const { data } = await api.get('/tables/geocode-check', { params: { q: location.locationText.trim() } });
      if (data.status === 'ok') {
        setLocation(prev => ({ ...prev, locationLat: data.lat, locationLng: data.lng }));
        next();
      } else if (data.status === 'needs_confirm') {
        setGeocodeConfirm({ displayName: data.displayName, lat: data.lat, lng: data.lng });
      } else {
        setLocationError('Ort nicht gefunden. Bitte genauer eingeben (z.B. "Bratwurstglöcklein, München") oder GPS nutzen.');
      }
    } catch {
      setLocationError('Verbindungsfehler. Bitte nochmals versuchen.');
    } finally {
      setLocationChecking(false);
    }
  }

  function handlePhotoSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    const reader = new FileReader();
    reader.onload = ev => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  async function handleSubmit() {
    if (!photo) { toast.error('Bitte ein Foto hochladen'); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('photo', photo);
      const { data: up } = await api.post('/upload/table-photo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const pfd = new FormData();
      pfd.append('photo', photo);
      pfd.append('slot', '1');
      api.post('/upload/profile-photo', pfd, { headers: { 'Content-Type': 'multipart/form-data' } }).catch(() => {});

      const sfw = genderEgal ? 0 : seatsForWomen;
      const sfm = genderEgal ? 0 : seatsForMen;
      const sag = genderEgal ? 0 : Math.max(0, seats - sfw - sfm);

      await api.post('/tables/offers', {
        totalSeats: seats,
        availableSeats: seats,
        date, timeFrom, timeUntil,
        seatsForWomen: sfw, seatsForMen: sfm, seatsAnyGender: sag,
        groupDescription: description || undefined,
        pricePerSeat: 0,
        photoUrl: up.url,
        locationText: location.locationText || undefined,
        locationLat:  location.locationLat  || undefined,
        locationLng:  location.locationLng  || undefined,
        category: category || 'sonstiges',
      });

      toast.success('Angebot veröffentlicht! 🎉');
      onSuccess();
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === 'ROLE_LOCKED_SEARCHING') {
        toast.error('Du suchst gerade selbst einen Platz. Wechsle erst deine Rolle.');
      } else if (code === 'GEOCODE_NEEDS_CONFIRM') {
        const { displayName, lat, lng } = err.response.data;
        setGeocodeConfirm({ displayName, lat, lng });
      } else if (code === 'GEOCODE_FAILED' || code === 'LOCATION_MISSING') {
        toast.error(err.response.data.error, { duration: 5000 });
        setStep(2);
      } else {
        toast.error(err.response?.data?.error || 'Fehler beim Veröffentlichen');
      }
      setSubmitting(false);
    }
  }

  const catInfo = CATEGORIES.find(c => c.key === category);

  const cardBg   = 'rgba(255,255,255,0.05)';
  const cardBord = '1px solid rgba(255,255,255,0.08)';
  const inputStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', colorScheme: 'dark' };
  const activeCard = { background: 'rgba(124,58,237,0.18)', border: '1.5px solid rgba(124,58,237,0.55)' };
  const btnGrad = { background: 'linear-gradient(135deg, #7C3AED, #EC4899)' };

  function renderStep() {
    switch (step) {

      /* ── Step 1: Kategorie ── */
      case 1:
        return (
          <div className="flex-1 flex flex-col px-6 pt-6">
            <h2 className="text-2xl font-black text-white mb-1">Was bietest du an?</h2>
            <p className="text-white/50 text-sm mb-8">Wähle eine Kategorie</p>
            <div className="grid grid-cols-2 gap-3">
              {CATEGORIES.map(({ key, label, emoji }) => (
                <button
                  key={key}
                  onClick={() => { setCategory(key); next(); }}
                  className="rounded-2xl p-5 flex flex-col items-center gap-3 active:scale-95 transition"
                  style={{ background: cardBg, border: cardBord }}
                >
                  <span className="text-4xl">{emoji}</span>
                  <span className="text-white font-semibold text-sm text-center">{label}</span>
                </button>
              ))}
            </div>
          </div>
        );

      /* ── Step 2: Ort ── */
      case 2:
        return (
          <div className="flex-1 flex flex-col px-6 pt-6 overflow-y-auto">
            <h2 className="text-2xl font-black text-white mb-1">Wo findet es statt?</h2>
            <p className="text-white/50 text-sm mb-8">Optional — du kannst das auch überspringen</p>
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
            <div className="mt-6 space-y-3 pb-6">
              <button
                onClick={handleLocationNext}
                disabled={locationChecking}
                className="w-full py-4 rounded-2xl text-white font-bold text-base disabled:opacity-60"
                style={btnGrad}
              >
                {locationChecking ? 'Ort wird geprüft…' : 'Weiter'}
              </button>
              <button onClick={next} className="w-full py-3 text-white/30 text-sm">Überspringen</button>
            </div>
          </div>
        );

      /* ── Step 3: Datum & Zeit ── */
      case 3:
        return (
          <div className="flex-1 flex flex-col px-6 pt-6">
            <h2 className="text-2xl font-black text-white mb-1">Wann?</h2>
            <p className="text-white/50 text-sm mb-8">Datum und Uhrzeit deines Events</p>
            <div className="space-y-5">
              <div>
                <label className="text-white/60 text-xs uppercase tracking-wide block mb-2">Datum</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl text-white focus:outline-none"
                  style={inputStyle}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Von', value: timeFrom, set: setTimeFrom },
                  { label: 'Bis', value: timeUntil, set: setTimeUntil },
                ].map(({ label, value, set }) => (
                  <div key={label}>
                    <label className="text-white/60 text-xs uppercase tracking-wide block mb-2">{label}</label>
                    <select
                      value={value}
                      onChange={e => set(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-xl text-white appearance-none"
                      style={{ ...inputStyle, colorScheme: undefined }}
                    >
                      {TIME_OPTIONS.map(t => (
                        <option key={t} value={t} style={{ background: '#1a0a2e' }}>{t}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-auto pt-6">
              <button onClick={next} disabled={!date} className="w-full py-4 rounded-2xl text-white font-bold text-base disabled:opacity-40" style={btnGrad}>
                Weiter
              </button>
            </div>
          </div>
        );

      /* ── Step 4: Plätze ── */
      case 4:
        return (
          <div className="flex-1 flex flex-col px-6 pt-6">
            <h2 className="text-2xl font-black text-white mb-1">Wie viele Gäste?</h2>
            <p className="text-white/50 text-sm mb-12">Wie viele freie Plätze kannst du anbieten?</p>
            <div className="flex items-center justify-center gap-10 mb-12">
              <button
                onClick={() => setSeats(s => Math.max(1, s - 1))}
                className="w-16 h-16 rounded-full flex items-center justify-center active:scale-90 transition"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.10)' }}
              >
                <Minus size={24} color="white" />
              </button>
              <div className="text-center min-w-[90px]">
                <span className="text-8xl font-black text-white leading-none">{seats}</span>
                <p className="text-white/40 text-sm mt-2">{seats === 1 ? 'Platz' : 'Plätze'}</p>
              </div>
              <button
                onClick={() => setSeats(s => Math.min(20, s + 1))}
                className="w-16 h-16 rounded-full flex items-center justify-center active:scale-90 transition"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.10)' }}
              >
                <Plus size={24} color="white" />
              </button>
            </div>
            <div className="mt-auto">
              <button onClick={next} className="w-full py-4 rounded-2xl text-white font-bold text-base" style={btnGrad}>
                Weiter
              </button>
            </div>
          </div>
        );

      /* ── Step 5: Für wen ── */
      case 5:
        return (
          <div className="flex-1 flex flex-col px-6 pt-6">
            <h2 className="text-2xl font-black text-white mb-1">Für wen?</h2>
            <p className="text-white/50 text-sm mb-8">Wen möchtest du dabei haben?</p>
            <div className="space-y-3">
              {[
                { label: 'Egal — alle willkommen', sub: 'Kein Filter', value: true },
                { label: 'Ich habe Präferenzen',   sub: 'Plätze nach Geschlecht aufteilen', value: false },
              ].map(({ label, sub, value }) => (
                <button
                  key={String(value)}
                  onClick={() => setGenderEgal(value)}
                  className="w-full p-4 rounded-2xl text-left flex items-center gap-3 transition"
                  style={genderEgal === value ? activeCard : { background: cardBg, border: cardBord }}
                >
                  <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                    style={{ borderColor: genderEgal === value ? '#7C3AED' : 'rgba(255,255,255,0.25)' }}>
                    {genderEgal === value && <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{label}</p>
                    <p className="text-white/40 text-xs">{sub}</p>
                  </div>
                </button>
              ))}
            </div>

            {!genderEgal && (
              <div className="mt-5 p-4 rounded-2xl space-y-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {[
                  { label: 'Frauen', value: seatsForWomen, setter: setSeatsForWomen, max: seats - seatsForMen },
                  { label: 'Männer', value: seatsForMen,   setter: setSeatsForMen,   max: seats - seatsForWomen },
                ].map(({ label, value, setter, max }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-white/80 text-sm">{label}</span>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setter(v => Math.max(0, v - 1))} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <Minus size={13} color="white" />
                      </button>
                      <span className="text-white font-bold text-base w-5 text-center">{value}</span>
                      <button onClick={() => setter(v => Math.min(max, v + 1))} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <Plus size={13} color="white" />
                      </button>
                    </div>
                  </div>
                ))}
                {seatsForWomen + seatsForMen < seats && (
                  <p className="text-white/30 text-xs">{seats - seatsForWomen - seatsForMen} Plätze offen für alle</p>
                )}
              </div>
            )}

            <div className="mt-auto pt-6">
              <button onClick={next} className="w-full py-4 rounded-2xl text-white font-bold text-base" style={btnGrad}>
                Weiter
              </button>
            </div>
          </div>
        );

      /* ── Step 6: Foto + Beschreibung ── */
      case 6:
        return (
          <div className="flex-1 flex flex-col px-6 pt-6 overflow-y-auto">
            <h2 className="text-2xl font-black text-white mb-1">Zeig deine Gruppe!</h2>
            <p className="text-white/50 text-sm mb-6">Ein Foto macht dein Angebot deutlich attraktiver</p>

            {photoPreview ? (
              <div className="relative w-full h-44 rounded-2xl overflow-hidden mb-5">
                <img src={photoPreview} className="w-full h-full object-cover" alt="" />
                <button
                  onClick={() => { setPhoto(null); setPhotoPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="absolute top-2 right-2 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center"
                >
                  <X size={16} color="white" />
                </button>
              </div>
            ) : (
              <div className="flex gap-3 mb-5">
                <button
                  onClick={() => { fileInputRef.current.setAttribute('capture', 'environment'); fileInputRef.current.click(); }}
                  className="flex-1 h-28 rounded-2xl flex flex-col items-center justify-center gap-2"
                  style={{ background: 'rgba(236,72,153,0.07)', border: '2px dashed rgba(236,72,153,0.25)' }}
                >
                  <Camera size={26} className="text-pink-400" />
                  <span className="text-xs font-medium text-pink-400">Kamera</span>
                </button>
                <button
                  onClick={() => { fileInputRef.current.removeAttribute('capture'); fileInputRef.current.click(); }}
                  className="flex-1 h-28 rounded-2xl flex flex-col items-center justify-center gap-2"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '2px dashed rgba(255,255,255,0.10)' }}
                >
                  <ImageIcon size={26} className="text-white/30" />
                  <span className="text-xs font-medium text-white/30">Galerie</span>
                </button>
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />

            <textarea
              placeholder="Kurze Beschreibung (optional) — wer seid ihr, was erwartet eure Gäste?"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              maxLength={300}
              className="w-full px-4 py-3 rounded-xl text-white placeholder-white/25 resize-none focus:outline-none text-sm"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            />

            <div className="mt-6 pb-6">
              <button
                onClick={next}
                disabled={!photo}
                className="w-full py-4 rounded-2xl text-white font-bold text-base disabled:opacity-35"
                style={btnGrad}
              >
                Weiter zur Zusammenfassung
              </button>
            </div>
          </div>
        );

      /* ── Step 7: Zusammenfassung ── */
      case 7: {
        return (
          <div className="flex-1 flex flex-col px-6 pt-6 overflow-y-auto">
            <h2 className="text-2xl font-black text-white mb-1">Sieht gut aus! ✨</h2>
            <p className="text-white/50 text-sm mb-6">Überprüf dein Angebot und veröffentliche es</p>

            {photoPreview && (
              <div className="w-full h-40 rounded-2xl overflow-hidden mb-4">
                <img src={photoPreview} className="w-full h-full object-cover" alt="" />
              </div>
            )}

            <div className="rounded-2xl p-4 space-y-3 mb-6" style={{ background: cardBg, border: cardBord }}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{catInfo?.emoji}</span>
                <div>
                  <p className="text-white font-bold">{catInfo?.label}</p>
                  {location.locationText && <p className="text-white/50 text-xs mt-0.5">{location.locationText}</p>}
                </div>
              </div>
              <div className="h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className="flex items-center gap-2 text-white/70 text-sm">
                <Clock size={14} className="shrink-0" />
                <span>
                  {new Date(date + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
                  {' · '}{timeFrom} – {timeUntil} Uhr
                </span>
              </div>
              <div className="flex items-center gap-2 text-white/70 text-sm">
                <Users size={14} className="shrink-0" />
                <span>
                  {seats} {seats === 1 ? 'Platz' : 'Plätze'} ·{' '}
                  {genderEgal ? 'Alle willkommen' : `${seatsForWomen}× Frauen, ${seatsForMen}× Männer`}
                </span>
              </div>
              {description && (
                <>
                  <div className="h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  <p className="text-white/60 text-sm italic">"{description}"</p>
                </>
              )}
            </div>

            <div className="pb-6">
              <button
                onClick={() => handleSubmit()}
                disabled={submitting}
                className="w-full py-4 rounded-2xl text-white font-bold text-base disabled:opacity-50"
                style={btnGrad}
              >
                {submitting ? 'Wird veröffentlicht…' : '🎉 Angebot veröffentlichen'}
              </button>
            </div>
          </div>
        );
      }

      default: return null;
    }
  }

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ background: 'linear-gradient(180deg, #0D0A1A 0%, #0A0A0E 100%)', zIndex: 100000 }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', paddingBottom: 12 }}
      >
        <button
          onClick={back}
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'rgba(255,255,255,0.07)' }}
        >
          <ChevronLeft size={20} color="white" />
        </button>
        <div className="flex-1 flex gap-1.5">
          {Array.from({ length: WIZARD_STEPS }).map((_, i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full transition-all duration-300"
              style={{ background: i < step ? 'linear-gradient(90deg, #7C3AED, #EC4899)' : 'rgba(255,255,255,0.10)' }}
            />
          ))}
        </div>
        <span className="text-white/30 text-xs shrink-0 w-8 text-right">
          {Math.min(step, WIZARD_STEPS)}/{WIZARD_STEPS}
        </span>
      </div>

      {renderStep()}

      {/* Geocode-Bestätigungs-Dialog */}
      {geocodeConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200000,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px',
        }}>
          <div style={{
            background: 'rgba(18,10,35,0.98)',
            border: '1.5px solid rgba(124,58,237,0.5)',
            borderRadius: '20px',
            padding: '24px',
            width: '100%',
            maxWidth: '340px',
          }}>
            <p className="text-white font-bold text-base mb-2">Meintest du diesen Ort?</p>
            <p className="text-white/60 text-sm mb-6 leading-relaxed">{geocodeConfirm.displayName}</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  const { lat, lng } = geocodeConfirm;
                  setLocation(prev => ({ ...prev, locationLat: lat, locationLng: lng }));
                  setGeocodeConfirm(null);
                  next();
                }}
                className="w-full py-3 rounded-xl text-white font-bold text-sm"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}
              >
                Ja, das stimmt
              </button>
              <button
                onClick={() => { setGeocodeConfirm(null); setStep(2); }}
                className="w-full py-3 rounded-xl text-white/60 font-medium text-sm"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
              >
                Nein, neu eingeben
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Edit Form (unchanged logic, dark theme) ─────────────────────────────────

function EditForm({ offer, onCancel, onSaved }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    availableSeats: offer.available_seats?.toString() || '',
    date:           offer.date || '',
    timeFrom:       offer.time_from || '',
    timeUntil:      offer.time_until || '',
    groupDescription: offer.group_description || '',
    pricePerSeat:   offer.price_per_seat?.toString() || '',
  });
  const [genderEgal, setGenderEgal] = useState((offer.seats_for_women || 0) === 0 && (offer.seats_for_men || 0) === 0);
  const [seatsForWomen, setSeatsForWomen] = useState(offer.seats_for_women || 0);
  const [seatsForMen, setSeatsForMen]     = useState(offer.seats_for_men || 0);
  const [saving, setSaving] = useState(false);

  function update(k, v) { setForm(p => ({ ...p, [k]: v })); }
  const avail = parseInt(form.availableSeats) || 0;
  const seatsAnyGender = Math.max(0, avail - seatsForWomen - seatsForMen);

  async function save() {
    setSaving(true);
    try {
      const sfw = genderEgal ? 0 : seatsForWomen;
      const sfm = genderEgal ? 0 : seatsForMen;
      await api.patch(`/tables/offers/${offer.id}`, {
        availableSeats:  avail,
        date:            form.date || undefined,
        timeFrom:        form.timeFrom,
        timeUntil:       form.timeUntil,
        groupDescription: form.groupDescription || undefined,
        pricePerSeat:    parseFloat(form.pricePerSeat) || 0,
        seatsForWomen:   sfw,
        seatsForMen:     sfm,
        seatsAnyGender:  genderEgal ? 0 : seatsAnyGender,
      });
      toast.success(t('offerUpdated'));
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || t('updateFailed'));
    } finally {
      setSaving(false);
    }
  }

  const inp = "w-full px-4 py-3 rounded-xl text-white focus:outline-none focus:border-violet-500 text-sm";
  const inpStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', colorScheme: 'dark' };

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: 'linear-gradient(180deg, #0D0A1A 0%, #0A0A0E 100%)', zIndex: 100000 }}>
      <div className="flex items-center gap-3 px-4" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', paddingBottom: 12 }}>
        <button onClick={onCancel} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <ChevronLeft size={20} color="white" />
        </button>
        <h1 className="text-white font-bold text-base flex-1">{t('editOffer')}</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pt-4 pb-6 space-y-5">
        <div>
          <label className="text-white/60 text-xs uppercase tracking-wide block mb-2">Datum</label>
          <input type="date" value={form.date} onChange={e => update('date', e.target.value)} className={inp} style={inpStyle} />
        </div>

        <div>
          <label className="text-white/60 text-xs uppercase tracking-wide block mb-2">Freie Plätze</label>
          <input type="number" min={0} value={form.availableSeats} onChange={e => update('availableSeats', e.target.value)} className={inp} style={inpStyle} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Von', k: 'timeFrom', v: form.timeFrom },
            { label: 'Bis', k: 'timeUntil', v: form.timeUntil },
          ].map(({ label, k, v }) => (
            <div key={k}>
              <label className="text-white/60 text-xs uppercase tracking-wide block mb-2">{label}</label>
              <select value={v} onChange={e => update(k, e.target.value)} className={`${inp} appearance-none`} style={inpStyle}>
                {TIME_OPTIONS.map(t => <option key={t} value={t} style={{ background: '#1a0a2e' }}>{t}</option>)}
              </select>
            </div>
          ))}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-white/60 text-xs uppercase tracking-wide">Geschlecht egal</label>
            <button
              type="button"
              onClick={() => { setGenderEgal(!genderEgal); setSeatsForWomen(0); setSeatsForMen(0); }}
              className="relative w-12 h-7 rounded-full transition-colors"
              style={{ background: genderEgal ? 'linear-gradient(135deg, #7C3AED, #EC4899)' : 'rgba(255,255,255,0.15)' }}
            >
              <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${genderEgal ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
          {!genderEgal && avail > 0 && (
            <div className="space-y-3 p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {[
                { label: 'Frauen', value: seatsForWomen, setter: setSeatsForWomen, max: avail - seatsForMen },
                { label: 'Männer', value: seatsForMen,   setter: setSeatsForMen,   max: avail - seatsForWomen },
              ].map(({ label, value, setter, max }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-white/80 text-sm">{label}</span>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setter(v => Math.max(0, v - 1))} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}><Minus size={13} color="white" /></button>
                    <span className="text-white font-bold w-5 text-center">{value}</span>
                    <button onClick={() => setter(v => Math.min(max, v + 1))} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}><Plus size={13} color="white" /></button>
                  </div>
                </div>
              ))}
              <p className="text-white/30 text-xs">{seatsAnyGender} Plätze offen für alle</p>
            </div>
          )}
        </div>

        <div>
          <label className="text-white/60 text-xs uppercase tracking-wide block mb-2">Beschreibung</label>
          <textarea
            value={form.groupDescription}
            onChange={e => update('groupDescription', e.target.value)}
            placeholder="Optional"
            rows={3}
            maxLength={300}
            className={`${inp} resize-none`}
            style={inpStyle}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onCancel} className="flex-1 py-3.5 rounded-2xl text-white/60 font-bold" style={{ background: 'rgba(255,255,255,0.06)' }}>
            {t('cancel')}
          </button>
          <button onClick={save} disabled={saving} className="flex-1 py-3.5 rounded-2xl text-white font-bold disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}>
            {saving ? '…' : t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function OfferScreen() {
  const { t }        = useLanguage();
  const navigate     = useNavigate();
  const [myOffers, setMyOffers]       = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [showWizard, setShowWizard]   = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);

  useEffect(() => { loadMyOffers(); }, []);

  async function loadMyOffers() {
    try {
      const { data } = await api.get('/tables/offers/mine');
      setMyOffers(data);
      if (data.length === 0) setShowWizard(true);
    } catch (err) {}
    finally { setLoadingOffers(false); }
  }

  async function handleDelete(id) {
    if (!confirm(t('deleteOfferConfirm'))) return;
    try {
      await api.delete(`/tables/offers/${id}`);
      toast.success(t('offerDeleted'));
      loadMyOffers();
    } catch (err) {
      toast.error(t('deleteFailed'));
    }
  }

  if (loadingOffers) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (showWizard) {
    return (
      <OfferWizard
        onCancel={() => { if (myOffers.length > 0) setShowWizard(false); else navigate(-1); }}
        onSuccess={() => { setShowWizard(false); loadMyOffers(); }}
      />
    );
  }

  if (editingOffer) {
    return (
      <EditForm
        offer={editingOffer}
        onCancel={() => setEditingOffer(null)}
        onSaved={() => { setEditingOffer(null); loadMyOffers(); }}
      />
    );
  }

  return (
    <div className="px-5 pt-12 pb-8">
      <h1 className="text-2xl font-black text-white mb-6">{t('yourOffers')}</h1>

      <div className="space-y-3 mb-6">
        {myOffers.map(offer => (
          <div key={offer.id} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Flame size={16} className="text-pink-400" />
                <span className="font-semibold text-white text-sm">{offer.location_text || 'Kein Ort'}</span>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${offer.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/8 text-white/40'}`}
                style={offer.status !== 'active' ? { background: 'rgba(255,255,255,0.06)' } : {}}>
                {offer.status === 'active' ? 'Aktiv' : offer.status}
              </span>
            </div>
            <div className="flex items-center gap-3 text-white/50 text-xs mb-3">
              <span>{new Date(offer.date).toLocaleDateString('de-DE')}</span>
              <span>·</span>
              <span>{offer.time_from?.slice(0, 5)} – {offer.time_until?.slice(0, 5)}</span>
              <span>·</span>
              <span>{offer.available_seats} Plätze</span>
            </div>
            {offer.status === 'active' && (
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingOffer(offer)}
                  className="flex-1 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 active:scale-95 transition"
                  style={{ background: 'rgba(6,182,212,0.10)', color: '#22d3ee' }}
                >
                  <Edit2 size={13} /> Bearbeiten
                </button>
                <button
                  onClick={() => handleDelete(offer.id)}
                  className="flex-1 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 active:scale-95 transition"
                  style={{ background: 'rgba(239,68,68,0.10)', color: '#f87171' }}
                >
                  <Trash2 size={13} /> Löschen
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={() => setShowWizard(true)}
        className="w-full py-4 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-2"
        style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}
      >
        <Plus size={20} />
        {t('newOffer')}
      </button>
    </div>
  );
}
