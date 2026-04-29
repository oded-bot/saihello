import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, LogOut, Star, Shield, Edit2, Flame, ChevronRight, Bell, BellOff, Moon, Sun, Globe } from 'lucide-react';
import useAuthStore from '../../context/authStore';
import useDarkMode from '../../hooks/useDarkMode';
import useLanguage from '../../hooks/useLanguage';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import ImageLightbox from '../Shared/ImageLightbox';
import { FEATURES } from '../../config/features';
import BadgePicker from '../Badges/BadgePicker';

export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuthStore();
  const { darkMode, toggle: toggleDarkMode } = useDarkMode();
  const { t, lang, setLang } = useLanguage();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ displayName: '', bio: '', age: '' });
  const [notifSettings, setNotifSettings] = useState({ matchesEnabled: true, messagesEnabled: true, invitesEnabled: true });
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [currentEmoji, setCurrentEmoji] = useState(null);
  const [myBadges, setMyBadges] = useState([]);

  const EMOJIS = [
    '😀','😎','🤩','😍','🥳','🤠','🎭','👑',
    '🦁','🐯','🦊','🐺','🦄','🐻','🐼','🐸',
    '🍺','🍻','🥂','🎉','🎊','🎸','🎵','🎶',
    '🌟','⭐','🔥','💫','❤️','🏆','💎','🚀',
  ];

  useEffect(() => {
    loadProfile();
    loadNotifSettings();
    if (FEATURES.inclusivityBadges) loadBadges();
  }, []);

  async function loadProfile() {
    try {
      const { data } = await api.get('/auth/me');
      setProfile(data);
      setForm({ displayName: data.displayName, bio: data.bio || '', age: data.age?.toString() || '' });
      setCurrentEmoji(data.emoji || null);
    } catch (err) {
      // stille
    }
  }

  async function loadNotifSettings() {
    try {
      const { data } = await api.get('/notifications/settings');
      setNotifSettings(data);
    } catch (err) {}
  }

  async function toggleNotifSetting(key) {
    const updated = { ...notifSettings, [key]: !notifSettings[key] };
    setNotifSettings(updated);
    try {
      await api.patch('/notifications/settings', updated);
    } catch (err) {}
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('photo', file);
    formData.append('slot', '1');

    try {
      const { data } = await api.post('/upload/profile-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProfile((prev) => ({ ...prev, photos: [data.url, ...(prev?.photos?.slice(1) || [])] }));
      toast.success(t('photoUpdated'));
    } catch (err) {
      toast.error(t('uploadFailed'));
    }
  }

  async function handleSave() {
    try {
      await api.patch('/users/profile', {
        displayName: form.displayName,
        bio: form.bio,
        age: parseInt(form.age),
      });
      updateUser({ displayName: form.displayName });
      setEditing(false);
      toast.success(t('profileSaved'));
      loadProfile();
    } catch (err) {
      toast.error(t('saveFailed'));
    }
  }

  async function loadBadges() {
    try {
      const { data } = await api.get('/badges/mine');
      setMyBadges(data.badges || []);
    } catch {}
  }

  async function saveBadges(badges) {
    try {
      await api.patch('/badges/mine', { badges });
      setMyBadges(badges);
      toast.success('Badges gespeichert');
    } catch {
      toast.error('Speichern fehlgeschlagen');
    }
  }

  async function saveEmoji(emoji) {
    try {
      await api.patch('/users/profile', { emoji: emoji || null });
      setCurrentEmoji(emoji || null);
      setShowEmojiPicker(false);
      toast.success(emoji ? 'Pin-Symbol gespeichert' : 'Pin-Symbol zurückgesetzt');
    } catch (err) {
      toast.error('Speichern fehlgeschlagen');
    }
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const photo = profile?.photos?.[0];

  return (
    <div className="px-5 pt-8">
      {/* Profil Header */}
      <div className="text-center mb-8">
        <div className="relative inline-block mb-4">
          <div
            className="w-28 h-28 rounded-full bg-gradient-to-br from-tinder-pink to-tinder-orange flex items-center justify-center overflow-hidden mx-auto cursor-pointer"
            onClick={() => photo && setLightboxSrc(photo)}
          >
            {photo ? (
              <img src={photo} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-4xl font-bold">
                {profile?.displayName?.charAt(0) || '?'}
              </span>
            )}
          </div>
          <label className="absolute bottom-0 right-0 w-9 h-9 tinder-gradient rounded-full flex items-center justify-center cursor-pointer shadow-lg">
            <Camera size={16} className="text-white" />
            <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
          </label>
        </div>

        {editing ? (
          <div className="space-y-3 max-w-xs mx-auto">
            <input
              type="text"
              value={form.displayName}
              onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-200 dark:border-dark-separator rounded-xl text-center text-gray-900 dark:text-white bg-white dark:bg-dark-elevated focus:outline-none focus:border-tinder-pink"
            />
            <input
              type="number"
              value={form.age}
              onChange={(e) => setForm((p) => ({ ...p, age: e.target.value }))}
              placeholder={t('age')}
              className="w-full px-4 py-2 border border-gray-200 dark:border-dark-separator rounded-xl text-center text-gray-900 dark:text-white bg-white dark:bg-dark-elevated focus:outline-none focus:border-tinder-pink"
              min={18}
            />
            <textarea
              value={form.bio}
              onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
              placeholder={t('tellAboutYou')}
              rows={3}
              maxLength={500}
              className="w-full px-4 py-2 border border-gray-200 dark:border-dark-separator rounded-xl text-gray-900 dark:text-white bg-white dark:bg-dark-elevated focus:outline-none focus:border-tinder-pink resize-none placeholder-gray-400"
            />
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="flex-1 py-2 bg-gray-100 dark:bg-dark-elevated rounded-xl text-gray-600 dark:text-gray-400 font-medium">
                {t('cancel')}
              </button>
              <button onClick={handleSave} className="flex-1 py-2 tinder-gradient rounded-xl text-white font-medium">
                {t('save')}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{profile?.displayName}</h2>
              {profile?.isVerified && <Star size={16} className="text-tinder-yellow fill-tinder-yellow" />}
              <span className="text-gray-500 dark:text-gray-400">{profile?.age}</span>
            </div>
            {profile?.bio && <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-xs mx-auto">{profile.bio}</p>}
            <button
              onClick={() => setEditing(true)}
              className="mt-3 text-tinder-pink text-sm font-medium flex items-center gap-1 mx-auto"
            >
              <Edit2 size={14} /> {t('editProfile')}
            </button>
          </>
        )}
      </div>

      {/* Pin-Symbol */}
      <div className="mb-6 bg-gray-50 dark:bg-dark-card rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Pin-Symbol auf der Karte</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {currentEmoji ? 'Emoji wird neben deinem Pin angezeigt' : 'Dein Profilfoto wird neben dem Pin angezeigt'}
            </p>
          </div>
          {/* Vorschau */}
          <div className="relative flex-shrink-0">
            <div className="w-8 h-12 bg-contain bg-no-repeat bg-center"
              style={{ backgroundImage: `url('https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png')` }}
            />
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
              {currentEmoji ? (
                <span style={{ fontSize: 20, lineHeight: 1 }}>{currentEmoji}</span>
              ) : photo ? (
                <img src={photo} className="w-7 h-7 rounded-full border-2 border-white object-cover shadow" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-tinder-pink flex items-center justify-center text-white text-xs font-bold border-2 border-white">
                  {profile?.displayName?.charAt(0)}
                </div>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="w-full py-2 border border-tinder-pink text-tinder-pink rounded-xl text-sm font-medium"
        >
          {showEmojiPicker ? 'Schließen' : currentEmoji ? 'Emoji ändern' : 'Emoji wählen'}
        </button>

        {showEmojiPicker && (
          <div className="mt-3 space-y-3">
            {/* Freie Eingabe */}
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Eigenes Emoji eingeben oder einfügen:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="z.B. 🦋"
                  maxLength={8}
                  defaultValue={currentEmoji || ''}
                  id="custom-emoji-input"
                  className="flex-1 border border-gray-200 dark:border-dark-separator rounded-xl px-4 py-2 text-2xl text-center bg-gray-50 dark:bg-dark-elevated focus:outline-none focus:border-tinder-pink"
                />
                <button
                  onClick={() => {
                    const val = document.getElementById('custom-emoji-input').value.trim();
                    if (val) saveEmoji(val);
                  }}
                  className="px-4 py-2 tinder-gradient text-white rounded-xl text-sm font-medium"
                >
                  Übernehmen
                </button>
              </div>
            </div>

            {/* Schnellauswahl */}
            <p className="text-xs text-gray-500 dark:text-gray-400">Oder schnell wählen:</p>
            <div className="grid grid-cols-8 gap-1">
              {EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => saveEmoji(e)}
                  className={`text-2xl p-1 rounded-lg transition ${currentEmoji === e ? 'bg-tinder-pink/20 ring-2 ring-tinder-pink' : 'hover:bg-gray-100 dark:hover:bg-dark-elevated'}`}
                >
                  {e}
                </button>
              ))}
            </div>

            {currentEmoji && (
              <button
                onClick={() => saveEmoji(null)}
                className="w-full py-2 bg-gray-100 dark:bg-dark-elevated text-gray-500 dark:text-gray-400 rounded-xl text-sm font-medium"
              >
                Emoji entfernen (Foto als Pin)
              </button>
            )}
          </div>
        )}
      </div>

      {/* Inclusivity Badges */}
      {FEATURES.inclusivityBadges && (
        <div className="mb-6 bg-gray-50 dark:bg-dark-card rounded-2xl p-4">
          <div className="mb-3">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Meine Badges</p>
            <p className="text-xs text-gray-400 mt-0.5">Zeige anderen, wer du bist oder was dir wichtig ist</p>
          </div>
          <BadgePicker selected={myBadges} onChange={saveBadges} compact />
        </div>
      )}

      {/* Menu */}
      <div className="space-y-1">
        <button
          onClick={() => navigate('/matches')}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-dark-card rounded-xl transition"
        >
          <div className="flex items-center gap-3">
            <Flame size={20} className="text-tinder-pink" />
            <span className="text-gray-900 dark:text-white">{t('myMatches')}</span>
          </div>
          <ChevronRight size={18} className="text-gray-400" />
        </button>

        <button
          onClick={() => navigate('/offer')}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-dark-card rounded-xl transition"
        >
          <div className="flex items-center gap-3">
            <Shield size={20} className="text-tinder-cyan" />
            <span className="text-gray-900 dark:text-white">{t('myOffers')}</span>
          </div>
          <ChevronRight size={18} className="text-gray-400" />
        </button>

        {/* Admin Panel Link — only for admins */}
        {user?.isAdmin && (
          <button
            onClick={() => navigate('/admin')}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-dark-card rounded-xl transition"
          >
            <div className="flex items-center gap-3">
              <Shield size={20} className="text-purple-500" />
              <span className="text-gray-900 dark:text-white">{t('adminPanel')}</span>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </button>
        )}
      </div>

      {/* Dark Mode Toggle */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 px-1">{t('appearance')}</h3>
        <button
          onClick={toggleDarkMode}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-dark-card rounded-xl transition"
        >
          <div className="flex items-center gap-3">
            {darkMode ? <Moon size={18} className="text-tinder-purple" /> : <Sun size={18} className="text-tinder-yellow" />}
            <span className="text-gray-900 dark:text-white text-sm">{darkMode ? t('darkMode') : t('lightMode')}</span>
          </div>
          <div className={`w-10 h-6 rounded-full transition-colors flex items-center ${darkMode ? 'bg-tinder-purple justify-end' : 'bg-gray-300 justify-start'}`}>
            <div className="w-5 h-5 bg-white rounded-full shadow mx-0.5" />
          </div>
        </button>
      </div>

      {/* Sprache */}
      <div className="mt-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 px-1">{t('language')}</h3>
        <div className="flex gap-2 px-1">
          <button
            onClick={() => setLang('de')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${
              lang === 'de'
                ? 'tinder-gradient text-white shadow-md'
                : 'bg-gray-100 dark:bg-dark-card text-gray-500 dark:text-gray-400'
            }`}
          >
            {t('german')}
          </button>
          <button
            onClick={() => setLang('en')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${
              lang === 'en'
                ? 'tinder-gradient text-white shadow-md'
                : 'bg-gray-100 dark:bg-dark-card text-gray-500 dark:text-gray-400'
            }`}
          >
            {t('english')}
          </button>
        </div>
      </div>

      {/* Benachrichtigungen */}
      <div className="mt-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 px-1">{t('notifications')}</h3>
        {[
          { key: 'matchesEnabled', label: t('newMatches') },
          { key: 'messagesEnabled', label: t('newMessages') },
          { key: 'invitesEnabled', label: t('invitations') },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => toggleNotifSetting(key)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-dark-card rounded-xl transition"
          >
            <div className="flex items-center gap-3">
              {notifSettings[key] ? <Bell size={18} className="text-tinder-pink" /> : <BellOff size={18} className="text-gray-400" />}
              <span className="text-gray-900 dark:text-white text-sm">{label}</span>
            </div>
            <div className={`w-10 h-6 rounded-full transition-colors flex items-center ${notifSettings[key] ? 'bg-tinder-pink justify-end' : 'bg-gray-300 dark:bg-dark-separator justify-start'}`}>
              <div className="w-5 h-5 bg-white rounded-full shadow mx-0.5" />
            </div>
          </button>
        ))}
      </div>

      {/* Rechtliches */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 px-1">{t('legal')}</h3>
        <button
          onClick={() => navigate('/privacy')}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-dark-card rounded-xl transition"
        >
          <span className="text-gray-900 dark:text-white text-sm">{t('privacyPolicyFull')}</span>
          <ChevronRight size={18} className="text-gray-400" />
        </button>
        <button
          onClick={() => navigate('/imprint')}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-dark-card rounded-xl transition"
        >
          <span className="text-gray-900 dark:text-white text-sm">{t('imprint')}</span>
          <ChevronRight size={18} className="text-gray-400" />
        </button>
      </div>

      {/* How ServusWiesn Works – Neu aufrufen */}
      {localStorage.getItem('hideHowItWorks') === 'true' && (
        <button
          onClick={() => { localStorage.removeItem('hideHowItWorks'); window.location.reload(); }}
          className="w-full mt-4 py-3 bg-gray-50 dark:bg-dark-card text-green-500 font-medium rounded-xl flex items-center justify-center gap-2 dark-transition"
        >
          <span>❓</span>
          How ServusWiesn Works erneut anzeigen
        </button>
      )}

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full mt-8 py-3 bg-gray-50 dark:bg-dark-card text-red-500 font-medium rounded-xl flex items-center justify-center gap-2 dark-transition"
      >
        <LogOut size={18} />
        {t('logout')}
      </button>

      <p className="text-center text-gray-300 dark:text-gray-600 text-xs mt-6 pb-4">Servus Wiesn v2.0</p>

      {/* Lightbox */}
      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}
    </div>
  );
}
