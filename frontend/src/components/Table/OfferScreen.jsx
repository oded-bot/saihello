import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Camera, Image, Clock, Users, ChevronDown, X, Edit2, Trash2, ArrowLeft } from 'lucide-react';
import api from '../../utils/api';
import useLanguage from '../../hooks/useLanguage';
import toast from 'react-hot-toast';
import LocationPicker from '../Shared/LocationPicker';

export default function OfferScreen() {
  const [form, setForm] = useState({
    totalSeats: '',
    availableSeats: '',
    date: '',
    timeFrom: '',
    timeUntil: '',
    groupDescription: '',
    pricePerSeat: '',
    groupAgeMin: '',
    groupAgeMax: '',
    preferredAgeMin: '',
    preferredAgeMax: '',
  });
  const [genderEgal, setGenderEgal] = useState(true);
  const [seatsForWomen, setSeatsForWomen] = useState(0);
  const [seatsForMen, setSeatsForMen] = useState(0);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [myOffers, setMyOffers] = useState([]);
  const [editingOfferId, setEditingOfferId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState(1);
  const [location, setLocation] = useState({ locationText: '', locationLat: null, locationLng: null });
  const fileInputRef = useRef(null);
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    loadMyOffers();
  }, []);

  async function loadMyOffers() {
    try {
      const { data } = await api.get('/tables/offers/mine');
      setMyOffers(data);
    } catch (err) {}
  }

  function handleEditOffer(offer) {
    setEditingOfferId(offer.id);
    setForm({
      totalSeats: offer.total_seats?.toString() || '',
      availableSeats: offer.available_seats?.toString() || '',
      date: offer.date || '',
      timeFrom: offer.time_from || '',
      timeUntil: offer.time_until || '',
      groupDescription: offer.group_description || '',
      pricePerSeat: offer.price_per_seat?.toString() || '',
      groupAgeMin: offer.group_age_min?.toString() || '',
      groupAgeMax: offer.group_age_max?.toString() || '',
      preferredAgeMin: offer.preferred_age_min?.toString() || '',
      preferredAgeMax: offer.preferred_age_max?.toString() || '',
    });
    const sfw = offer.seats_for_women || 0;
    const sfm = offer.seats_for_men || 0;
    if (sfw === 0 && sfm === 0) {
      setGenderEgal(true);
      setSeatsForWomen(0);
      setSeatsForMen(0);
    } else {
      setGenderEgal(false);
      setSeatsForWomen(sfw);
      setSeatsForMen(sfm);
    }
    if (offer.photo_url) setPhotoPreview(offer.photo_url);
    setStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingOfferId(null);
    setShowForm(false);
    setStep(1);
    setForm({
      totalSeats: '', availableSeats: '', date: '',
      timeFrom: '', timeUntil: '', groupDescription: '', pricePerSeat: '',
      groupAgeMin: '', groupAgeMax: '', preferredAgeMin: '', preferredAgeMax: '',
    });
    setGenderEgal(true);
    setSeatsForWomen(0);
    setSeatsForMen(0);
    setPhoto(null);
    setPhotoPreview(null);
    setLocation({ locationText: '', locationLat: null, locationLng: null });
  }

  async function handleUpdateOffer() {
    setLoading(true);
    try {
      const avail = parseInt(form.availableSeats) || 0;
      const sfw = genderEgal ? 0 : seatsForWomen;
      const sfm = genderEgal ? 0 : seatsForMen;
      const sag = genderEgal ? 0 : Math.max(0, avail - sfw - sfm);

      await api.patch(`/tables/offers/${editingOfferId}`, {
        availableSeats: avail,
        timeFrom: form.timeFrom,
        timeUntil: form.timeUntil,
        groupDescription: form.groupDescription || undefined,
        pricePerSeat: parseFloat(form.pricePerSeat) || 0,
        preferredAgeMin: form.preferredAgeMin ? parseInt(form.preferredAgeMin) : undefined,
        preferredAgeMax: form.preferredAgeMax ? parseInt(form.preferredAgeMax) : undefined,
        groupAgeMin: form.groupAgeMin ? parseInt(form.groupAgeMin) : undefined,
        groupAgeMax: form.groupAgeMax ? parseInt(form.groupAgeMax) : undefined,
        seatsForWomen: sfw,
        seatsForMen: sfm,
        seatsAnyGender: sag,
      });
      toast.success(t('offerUpdated'));
      cancelEdit();
      loadMyOffers();
    } catch (err) {
      toast.error(err.response?.data?.error || t('updateFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteOffer(offerId) {
    if (!confirm(t('deleteOfferConfirm'))) return;
    try {
      await api.delete(`/tables/offers/${offerId}`);
      toast.success(t('offerDeleted'));
      loadMyOffers();
    } catch (err) {
      toast.error(t('deleteFailed'));
    }
  }

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const availSeats = parseInt(form.availableSeats) || 0;
  const seatsAnyGender = Math.max(0, availSeats - seatsForWomen - seatsForMen);

  function handlePhotoSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  function removePhoto() {
    setPhoto(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleWeiter(e) {
    e.preventDefault();
    if (!photo) {
      toast.error(t('uploadPhoto'));
      return;
    }
    if (!form.date || !form.timeFrom || !form.timeUntil || !form.totalSeats || !form.availableSeats) {
      toast.error('Bitte alle Pflichtfelder ausfüllen.');
      return;
    }
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmitWithLocation(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('photo', photo);
      const uploadRes = await api.post('/upload/table-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const photoUrl = uploadRes.data.url;

      const profileForm = new FormData();
      profileForm.append('photo', photo);
      profileForm.append('slot', '1');
      api.post('/upload/profile-photo', profileForm, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).catch(() => {});

      const sfw = genderEgal ? 0 : seatsForWomen;
      const sfm = genderEgal ? 0 : seatsForMen;
      const sag = genderEgal ? 0 : seatsAnyGender;

      await api.post('/tables/offers', {
        totalSeats: parseInt(form.totalSeats),
        availableSeats: parseInt(form.availableSeats),
        date: form.date,
        timeFrom: form.timeFrom,
        timeUntil: form.timeUntil,
        seatsForWomen: sfw,
        seatsForMen: sfm,
        seatsAnyGender: sag,
        groupDescription: form.groupDescription || undefined,
        pricePerSeat: parseFloat(form.pricePerSeat) || 0,
        groupAgeMin: form.groupAgeMin ? parseInt(form.groupAgeMin) : undefined,
        groupAgeMax: form.groupAgeMax ? parseInt(form.groupAgeMax) : undefined,
        preferredAgeMin: form.preferredAgeMin ? parseInt(form.preferredAgeMin) : undefined,
        preferredAgeMax: form.preferredAgeMax ? parseInt(form.preferredAgeMax) : undefined,
        photoUrl,
        locationText: location.locationText || undefined,
        locationLat: location.locationLat || undefined,
        locationLng: location.locationLng || undefined,
      });

      toast.success(t('offerCreated'));
      cancelEdit();
      loadMyOffers();
    } catch (err) {
      if (err.response?.data?.code === 'ROLE_LOCKED_SEARCHING') {
        toast.error(t('roleLockedSearching'));
      } else {
        toast.error(err.response?.data?.error || t('createFailed'));
      }
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "w-full px-4 py-3 bg-gray-50 dark:bg-dark-elevated border border-gray-200 dark:border-dark-separator rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-tinder-pink focus:ring-1 focus:ring-tinder-pink/30 transition placeholder-gray-400";
  const labelClass = "text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block";

  return (
    <div className="px-5 pt-8 pb-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{editingOfferId ? t('editOffer') : t('offerTitle')}</h1>

      {/* Meine Angebote */}
      {myOffers.length > 0 && !editingOfferId && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t('yourOffers')}</h2>
          <div className="space-y-3">
            {myOffers.map((offer) => (
              <div key={offer.id} className="bg-gray-50 dark:bg-dark-card rounded-xl p-4 border border-gray-100 dark:border-dark-separator dark-transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame size={16} className="text-tinder-pink" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {offer.location_text || 'Kein Ort angegeben'}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    offer.status === 'active' ? 'bg-tinder-green/10 text-tinder-green' : 'bg-gray-200 dark:bg-dark-elevated text-gray-500'
                  }`}>
                    {offer.status === 'active' ? t('active') : offer.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mt-2">
                  <span>{new Date(offer.date).toLocaleDateString('de-DE')}</span>
                  <span>{offer.time_from?.slice(0, 5)} – {offer.time_until?.slice(0, 5)}</span>
                  <span>{offer.available_seats} {t('seats')}</span>
                </div>
                {offer.status === 'active' && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleEditOffer(offer)}
                      className="flex-1 py-2 bg-tinder-cyan/10 text-tinder-cyan rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 active:scale-95 transition"
                    >
                      <Edit2 size={14} />
                      {t('edit')}
                    </button>
                    <button
                      onClick={() => handleDeleteOffer(offer.id)}
                      className="flex-1 py-2 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 active:scale-95 transition"
                    >
                      <Trash2 size={14} />
                      {t('delete')}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="w-full mt-4 py-3 border-2 border-dashed border-tinder-pink/30 rounded-xl text-tinder-pink font-medium text-sm flex items-center justify-center gap-2 active:scale-95 transition"
            >
              + {t('newOffer')}
            </button>
          )}
        </div>
      )}

      {/* Formular */}
      {(myOffers.length === 0 || showForm || editingOfferId) && (
        <>
          {/* Step 1: Details */}
          {(editingOfferId || step === 1) && (
            <form onSubmit={editingOfferId ? (e) => { e.preventDefault(); handleUpdateOffer(); } : handleWeiter} className="space-y-4">
              {/* FOTO */}
              {!editingOfferId && (
                <div>
                  <label className={labelClass}>{t('photoRequired')}</label>
                  {photoPreview ? (
                    <div className="relative w-full h-48 rounded-2xl overflow-hidden">
                      <img src={photoPreview} alt="Vorschau" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={removePhoto}
                        className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center"
                      >
                        <X size={16} className="text-white" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          fileInputRef.current.setAttribute('capture', 'environment');
                          fileInputRef.current.click();
                        }}
                        className="flex-1 h-32 bg-tinder-pink/5 border-2 border-dashed border-tinder-pink/30 rounded-2xl flex flex-col items-center justify-center gap-2 active:bg-tinder-pink/10 transition"
                      >
                        <Camera size={28} className="text-tinder-pink" />
                        <span className="text-sm font-medium text-tinder-pink">{t('camera')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          fileInputRef.current.removeAttribute('capture');
                          fileInputRef.current.click();
                        }}
                        className="flex-1 h-32 bg-gray-50 dark:bg-dark-card border-2 border-dashed border-gray-200 dark:border-dark-separator rounded-2xl flex flex-col items-center justify-center gap-2 active:bg-gray-100 dark:active:bg-dark-elevated transition"
                      >
                        <Image size={28} className="text-gray-400" />
                        <span className="text-sm font-medium text-gray-400">{t('gallery')}</span>
                      </button>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </div>
              )}

              {/* Datum */}
              <div>
                <label className={labelClass}>{t('date')} *</label>
                <input type="date" value={form.date} onChange={(e) => update('date', e.target.value)} className={inputClass} required />
              </div>

              {/* Zeit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>{t('timeFrom')} *</label>
                  <div className="relative">
                    <select value={form.timeFrom} onChange={(e) => update('timeFrom', e.target.value)} className={`${inputClass} appearance-none`} required>
                      <option value="">--:--</option>
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
                  <label className={labelClass}>{t('timeUntil')} *</label>
                  <div className="relative">
                    <select value={form.timeUntil} onChange={(e) => update('timeUntil', e.target.value)} className={`${inputClass} appearance-none`} required>
                      <option value="">--:--</option>
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

              {/* Plätze */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>{t('totalSeats')} *</label>
                  <input type="number" min={1} max={20} value={form.totalSeats} onChange={(e) => update('totalSeats', e.target.value)} className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>{t('freeSeats')} *</label>
                  <input type="number" min={1} max={form.totalSeats || 20} value={form.availableSeats} onChange={(e) => update('availableSeats', e.target.value)} className={inputClass} required />
                </div>
              </div>

              {/* Geschlecht */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('genderDoesntMatter')}</label>
                  <button
                    type="button"
                    onClick={() => { setGenderEgal(!genderEgal); setSeatsForWomen(0); setSeatsForMen(0); }}
                    className={`relative w-12 h-7 rounded-full transition-colors ${genderEgal ? 'bg-tinder-pink' : 'bg-gray-300 dark:bg-gray-600'}`}
                  >
                    <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${genderEgal ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>

                {!genderEgal && availSeats > 0 && (
                  <div className="space-y-2 bg-gray-50 dark:bg-dark-elevated rounded-xl p-3 border border-gray-200 dark:border-dark-separator">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{t('seatsForWomen')}:</span>
                      <input
                        type="number" min={0} max={availSeats - seatsForMen} value={seatsForWomen}
                        onChange={(e) => setSeatsForWomen(Math.min(parseInt(e.target.value) || 0, availSeats - seatsForMen))}
                        className="w-16 px-2 py-1 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-separator rounded-lg text-center text-sm text-gray-900 dark:text-white focus:outline-none focus:border-tinder-pink"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{t('seatsForMen')}:</span>
                      <input
                        type="number" min={0} max={availSeats - seatsForWomen} value={seatsForMen}
                        onChange={(e) => setSeatsForMen(Math.min(parseInt(e.target.value) || 0, availSeats - seatsForWomen))}
                        className="w-16 px-2 py-1 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-separator rounded-lg text-center text-sm text-gray-900 dark:text-white focus:outline-none focus:border-tinder-pink"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{t('seatsAnyGender')}:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white w-16 text-center">{seatsAnyGender}</span>
                    </div>
                    {seatsForWomen + seatsForMen > availSeats && (
                      <p className="text-xs text-red-500">{t('seatSumError')}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Alter Gruppe */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">{t('groupAge')}</label>
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" min={18} max={99} value={form.groupAgeMin} onChange={(e) => update('groupAgeMin', e.target.value)} placeholder={t('fromAge')} className={inputClass} />
                  <input type="number" min={18} max={99} value={form.groupAgeMax} onChange={(e) => update('groupAgeMax', e.target.value)} placeholder={t('toAge')} className={inputClass} />
                </div>
                <p className="text-xs text-gray-400 mt-1">{t('leaveEmpty')}</p>
              </div>

              {/* Gewünschtes Alter Gäste */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">{t('guestAge')}</label>
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" min={18} max={99} value={form.preferredAgeMin} onChange={(e) => update('preferredAgeMin', e.target.value)} placeholder={t('fromAgeGuest')} className={inputClass} />
                  <input type="number" min={18} max={99} value={form.preferredAgeMax} onChange={(e) => update('preferredAgeMax', e.target.value)} placeholder={t('toAgeGuest')} className={inputClass} />
                </div>
                <p className="text-xs text-gray-400 mt-1">{t('leaveEmpty')}</p>
              </div>

              {/* Beschreibung */}
              <div>
                <label className={labelClass}>{t('description')}</label>
                <textarea
                  value={form.groupDescription}
                  onChange={(e) => update('groupDescription', e.target.value)}
                  placeholder={t('descriptionPlaceholder')}
                  rows={3}
                  maxLength={500}
                  className={`${inputClass} resize-none`}
                />
              </div>

              {editingOfferId ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="flex-1 py-3.5 bg-gray-100 dark:bg-dark-elevated text-gray-600 dark:text-gray-300 font-bold rounded-full transition text-base"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3.5 tinder-gradient text-white font-bold rounded-full shadow-lg transition disabled:opacity-50 text-base"
                  >
                    {loading ? '...' : t('save')}
                  </button>
                </div>
              ) : (
                <button
                  type="submit"
                  className="w-full py-3.5 tinder-gradient text-white font-bold rounded-full shadow-lg hover:shadow-xl transition text-base"
                >
                  Weiter →
                </button>
              )}
            </form>
          )}

          {/* Step 2: Ort */}
          {!editingOfferId && step === 2 && (
            <form onSubmit={handleSubmitWithLocation} className="space-y-5">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Wo findet euer Treffen statt? (optional)
              </p>

              <LocationPicker onLocationChange={setLocation} />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="flex-1 py-3.5 bg-gray-100 dark:bg-dark-elevated text-gray-700 dark:text-gray-300 font-bold rounded-full transition text-base flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={18} /> Zurück
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3.5 tinder-gradient text-white font-bold rounded-full shadow-lg hover:shadow-xl transition disabled:opacity-50 text-base"
                >
                  {loading ? t('publishing') : t('publishOffer')}
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
