import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Flame, Eye, EyeOff } from 'lucide-react';
import useAuthStore from '../../context/authStore';
import useLanguage from '../../hooks/useLanguage';
import toast from 'react-hot-toast';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const { login, loading } = useAuthStore();
  const { t } = useLanguage();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    const result = await login(phone, password);
    if (result.success) {
      navigate('/home');
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white flex flex-col justify-center px-8">
      {/* Logo */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 tinder-gradient rounded-3xl mb-4 shadow-lg">
          <Flame size={40} className="text-white" fill="white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Servus Wiesn</h1>
        <p className="text-gray-400 mt-2 text-sm">{t('findPlaceOnWiesn')}</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="text"
            placeholder={t('phone')}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="username"
            className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-tinder-pink focus:ring-1 focus:ring-tinder-pink/30 transition"
            required
          />
        </div>

        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'}
            placeholder={t('password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-tinder-pink focus:ring-1 focus:ring-tinder-pink/30 transition pr-12"
            required
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
          >
            {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 tinder-gradient text-white font-bold rounded-full shadow-lg hover:shadow-xl transition disabled:opacity-50 text-base"
        >
          {loading ? t('loggingIn') : t('login')}
        </button>
      </form>

      <p className="text-center text-gray-400 mt-8 text-sm">
        {t('noAccount')}{' '}
        <Link to="/register" className="text-tinder-pink font-semibold">
          {t('register')}
        </Link>
      </p>
    </div>
  );
}
