import React, { useState, useEffect, useRef } from 'react';


import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { MapPin, Clock, Users, Star, X, Heart, Sparkles, Flame, Filter, RefreshCw, PlusCircle, ChevronDown, Search } from 'lucide-react';
import api from '../../utils/api';
import useLanguage from '../../hooks/useLanguage';
import toast from 'react-hot-toast';
import ImageLightbox from '../Shared/ImageLightbox';

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

          <div className="flex items-center gap-1.5 text-white/70 text-sm mb-1">
            <Flame size={14} className="text-tinder-orange" />
            <span className="font-medium">{offer.tent_name}</span>
          </div>

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
              <span>{offer.available_seats} {t('free')}</span>
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

          {/* Geschlechts-Platz-Info */}
          {(offer.seats_for_women > 0 || offer.seats_for_men > 0 || offer.seats_any_gender > 0) ? (
            <div className="flex gap-1.5 mt-1.5 flex-wrap">
              {offer.seats_for_women > 0 && (
                <span className="bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded-full text-xs font-medium">
                  {offer.seats_for_women}♀
                </span>
              )}
              {offer.seats_for_men > 0 && (
                <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full text-xs font-medium">
                  {offer.seats_for_men}♂
                </span>
              )}
              {offer.seats_any_gender > 0 && (
                <span className="bg-white/15 text-white/70 px-2 py-0.5 rounded-full text-xs font-medium">
                  {offer.seats_any_gender} {t('anyGender')}
                </span>
              )}
            </div>
          ) : (
            <div className="mt-1.5">
              <span className="bg-white/15 text-white/70 px-2 py-0.5 rounded-full text-xs font-medium">
                {t('allWelcome')}
              </span>
            </div>
          )}

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

    tentId: '',
    date: '',
    timeFrom: '',
    timeUntil: '',
  });
  const [tents, setTents] = useState([]);
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const [searchApplied, setSearchApplied] = useState(false);
  const [roleLocked, setRoleLocked] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const pollRef = useRef(null);
  const { t } = useLanguage();

  useEffect(() => {
    loadOffers();
    loadTents();
    pollRef.current = setInterval(refreshOffers, 10000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  async function loadTents() {
    try {
      const { data } = await api.get('/tables/tents');
      setTents(data);
    } catch (err) {}
  }

  function buildQuery() {
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
    if (searchFilter.tentId) params.set('tentId', searchFilter.tentId);
    if (searchFilter.date) params.set('date', searchFilter.date);
    if (searchFilter.timeFrom) params.set('timeFrom', searchFilter.timeFrom);
    if (searchFilter.timeUntil) params.set('timeUntil', searchFilter.timeUntil);
    return params.toString() ? `?${params.toString()}` : '';
  }

  async function loadOffers() {
    try {
      setLoading(true);
      const { data } = await api.get(`/tables/discover${buildQuery()}`);
      setOffers(data);
      setCurrentIdx(0);
    } catch (err) {
      if (err.response?.data?.code === 'ROLE_LOCKED_OFFERING') {
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
      const { data } = await api.get(`/tables/discover${buildQuery()}`);
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
      const { data } = await api.post('/matching/swipe', {
        offerId: offer.id,
        direction,
      });

      if (data.match?.isNew) {
        setShowMatch(offer);
        setTimeout(() => setShowMatch(null), 3000);
      }
    } catch (err) {
      if (err.response?.status === 403) {
        toast.error(err.response.data.error || t('error'));
        return;
      }
    }

    setCurrentIdx((prev) => prev + 1);
  }

  if (roleLocked) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center px-8">
          <PlusCircle size={48} className="text-tinder-pink mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('youAreOfferer')}</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{t('deactivateFirst')}</p>
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
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('discover')}</h1>
        <div className="flex gap-2">
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
        <div className="flex justify-center items-center">
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
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('searchFilter')}</h3>
              <button onClick={() => setShowSearchOverlay(false)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-dark-elevated flex items-center justify-center">
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


              {/* Zelt */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">{t('tent')} ({t('optional')})</label>
                <div className="relative">
                  <select
                    value={searchFilter.tentId}
                    onChange={(e) => setSearchFilter(f => ({...f, tentId: e.target.value}))}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-elevated border border-gray-200 dark:border-dark-separator rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-tinder-pink text-sm appearance-none"
                  >
                    <option value="">{t('allTents')}</option>
                    {tents.map((tent) => (
                      <option key={tent.id} value={tent.id}>{tent.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

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
                  setSearchFilter({ totalPersons: '', women: '', men: '', tentId: '', date: '', timeFrom: '', timeUntil: '' });
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
                  setSearchApplied(!!(searchFilter.totalPersons || searchFilter.tentId || searchFilter.date || searchFilter.timeFrom || searchFilter.timeUntil));
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
    </div>
  );
}
