import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Zap, Eye, EyeOff } from 'lucide-react';
import useAuthStore from '../../context/authStore';
import useLanguage from '../../hooks/useLanguage';
import toast from 'react-hot-toast';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const { login, loading } = useAuthStore();
  const { t } = useLanguage();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    const result = await login(username, password);
    if (result.success) {
      navigate('/home');
    } else {
      toast.error(result.error);
    }
  }

  const inputClass = "w-full px-4 py-4 bg-dark-elevated border border-dark-separator rounded-2xl text-white placeholder-white/25 focus:outline-none focus:border-app-violet focus:ring-1 focus:ring-app-violet/30 transition text-base";

  return (
    <div className="max-w-md mx-auto min-h-screen bg-black flex flex-col justify-center px-6">
      {/* Logo */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 tinder-gradient rounded-3xl mb-5 gradient-glow">
          <Zap size={40} className="text-white" fill="white" />
        </div>
        <h1 className="text-4xl font-black text-white">SaiHello</h1>
        <p className="text-white/40 mt-2 text-sm">{t('findPlaceOnWiesn')}</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          placeholder="Benutzername"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          className={inputClass}
          required
        />

        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'}
            placeholder={t('password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${inputClass} pr-12`}
            required
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30"
          >
            {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 tinder-gradient text-white font-bold rounded-2xl shadow-lg gradient-glow disabled:opacity-50 text-base mt-2 active:scale-[0.98] transition"
        >
          {loading ? t('loggingIn') : t('login')}
        </button>
      </form>

      <p className="text-center text-white/30 mt-8 text-sm">
        {t('noAccount')}{' '}
        <Link to="/register" className="text-app-neon font-semibold">
          {t('register')}
        </Link>
      </p>
    </div>
  );
}
