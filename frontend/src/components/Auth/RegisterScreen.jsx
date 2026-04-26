import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Flame, ChevronLeft } from 'lucide-react';
import useAuthStore from '../../context/authStore';
import useLanguage from '../../hooks/useLanguage';
import toast from 'react-hot-toast';

export default function RegisterScreen() {
  const [form, setForm] = useState({
    username: '', email: '', password: '', displayName: '', age: '', gender: '', bio: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const { register, loading } = useAuthStore();
  const { t } = useLanguage();
  const navigate = useNavigate();

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.email) {
      toast.error(t('emailRequired'));
      return;
    }
    if (!form.gender) {
      toast.error(t('pleaseSelectGender'));
      return;
    }
    if (form.password !== confirmPassword) {
      setPasswordMismatch(true);
      toast.error('Passwörter stimmen nicht überein');
      return;
    }
    setPasswordMismatch(false);
    const result = await register({
      ...form,
      age: parseInt(form.age),
    });
    if (result.success) {
      toast.success(t('verificationCodeSent'));
      navigate('/verify', { state: { username: form.username } });
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white">
      {/* Header */}
      <div className="flex items-center px-4 pt-12 pb-4">
        <button onClick={() => navigate('/login')} className="text-gray-400 p-1">
          <ChevronLeft size={28} />
        </button>
        <h1 className="text-xl font-bold text-gray-900 ml-2">{t('register')}</h1>
      </div>

      {/* Logo */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 tinder-gradient rounded-2xl shadow-md">
          <Flame size={28} className="text-white" fill="white" />
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="px-8 space-y-3">
        <input
          type="text"
          placeholder={t('yourName')}
          value={form.displayName}
          onChange={(e) => update('displayName', e.target.value)}
          className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-tinder-pink focus:ring-1 focus:ring-tinder-pink/30 transition"
          required
        />

        <input
          type="text"
          placeholder="Benutzername"
          value={form.username}
          onChange={(e) => update('username', e.target.value)}
          className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-tinder-pink focus:ring-1 focus:ring-tinder-pink/30 transition"
          required
        />

        <input
          type="email"
          placeholder={t('email')}
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
          className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-tinder-pink focus:ring-1 focus:ring-tinder-pink/30 transition"
          required
        />

        <input
          type="password"
          placeholder={t('passwordMin')}
          value={form.password}
          onChange={(e) => { update('password', e.target.value); setPasswordMismatch(false); }}
          className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-tinder-pink focus:ring-1 focus:ring-tinder-pink/30 transition"
          required
          minLength={6}
        />

        <input
          type="password"
          placeholder="Passwort bestätigen"
          value={confirmPassword}
          onChange={(e) => { setConfirmPassword(e.target.value); setPasswordMismatch(false); }}
          className={`w-full px-4 py-3.5 bg-gray-50 border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none transition ${passwordMismatch ? 'border-red-400 focus:border-red-400 ring-1 ring-red-300' : 'border-gray-200 focus:border-tinder-pink focus:ring-1 focus:ring-tinder-pink/30'}`}
          required
          minLength={6}
        />
        {passwordMismatch && (
          <p className="text-red-500 text-xs -mt-1 px-1">Passwörter stimmen nicht überein</p>
        )}

        <input
          type="number"
          placeholder={t('age')}
          value={form.age}
          onChange={(e) => update('age', e.target.value)}
          className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-tinder-pink focus:ring-1 focus:ring-tinder-pink/30 transition"
          required
          min={18}
          max={120}
        />

        {/* Gender Selection */}
        <div className="flex gap-2">
          {[
            { value: 'm', label: t('male') },
            { value: 'f', label: t('female') },
            { value: 'd', label: t('diverse') },
          ].map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => update('gender', value)}
              className={`flex-1 py-3 rounded-full font-medium text-sm transition ${
                form.gender === value
                  ? 'tinder-gradient text-white shadow-md'
                  : 'bg-gray-50 text-gray-500 border border-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <textarea
          placeholder={t('shortBio')}
          value={form.bio}
          onChange={(e) => update('bio', e.target.value)}
          rows={2}
          maxLength={500}
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-tinder-pink focus:ring-1 focus:ring-tinder-pink/30 transition resize-none"
        />

        <label className="flex items-start gap-3 mt-2 cursor-pointer">
          <input
            type="checkbox"
            checked={privacyConsent}
            onChange={(e) => setPrivacyConsent(e.target.checked)}
            className="mt-1 w-4 h-4 accent-pink-500 rounded"
          />
          <span className="text-gray-600 text-sm leading-snug">
            {t('consentText')}{' '}
            <Link to="/privacy" className="text-tinder-pink font-semibold underline">
              {t('privacyPolicy')}
            </Link>{' '}
            {t('consentEnd')}
          </span>
        </label>

        <button
          type="submit"
          disabled={loading || !privacyConsent}
          className="w-full py-3.5 tinder-gradient text-white font-bold rounded-full shadow-lg hover:shadow-xl transition disabled:opacity-50 mt-2 text-base"
        >
          {loading ? t('creatingAccount') : t('createAccount')}
        </button>
      </form>

      <p className="text-center text-gray-400 mt-6 pb-8 text-sm">
        {t('alreadyRegistered')}{' '}
        <Link to="/login" className="text-tinder-pink font-semibold">
          {t('login')}
        </Link>
      </p>
    </div>
  );
}
