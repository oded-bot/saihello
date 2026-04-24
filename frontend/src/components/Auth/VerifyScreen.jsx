import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Flame, ChevronLeft } from 'lucide-react';
import useLanguage from '../../hooks/useLanguage';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function VerifyScreen() {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [verified, setVerified] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(600); // 10 Minuten
  const inputRefs = useRef([]);
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const phone = location.state?.phone || '';

  // Redirect wenn keine Phone-Nummer
  useEffect(() => {
    if (!phone) {
      navigate('/register', { replace: true });
    }
  }, [phone, navigate]);

  // Countdown Timer
  useEffect(() => {
    if (verified || secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((s) => s - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [verified, secondsLeft]);

  // Auto-Focus erstes Feld
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  function formatTime(sec) {
    if (sec <= 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function handleChange(index, value) {
    // Nur Ziffern
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    // Auto-Focus nächstes Feld
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-Submit wenn alle 6 Felder gefüllt
    if (digit && index === 5) {
      const code = newDigits.join('');
      if (code.length === 6) {
        submitCode(code);
      }
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const newDigits = pasted.split('');
      setDigits(newDigits);
      inputRefs.current[5]?.focus();
      submitCode(pasted);
    }
  }

  async function submitCode(code) {
    if (loading) return;
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-email', { phone, code });
      if (data.success) {
        setVerified(true);
        toast.success(t('emailVerified'));
      }
    } catch (err) {
      const msg = err.response?.data?.error || t('verificationFailed');
      toast.error(msg);
      // Felder zurücksetzen
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resending) return;
    setResending(true);
    try {
      const { data } = await api.post('/auth/resend-code', { phone });
      if (data.success) {
        toast.success(t('newCodeSent'));
        setSecondsLeft(600);
        setDigits(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (err) {
      const msg = err.response?.data?.error || t('resendFailed');
      toast.error(msg);
    } finally {
      setResending(false);
    }
  }

  // Erfolgsanzeige
  if (verified) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-white flex flex-col items-center justify-center px-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
          <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">{t('emailVerifiedTitle')}</h2>
        <p className="text-gray-500 text-center mb-8">{t('emailVerifiedDesc')}</p>
        <Link
          to="/login"
          className="w-full py-3.5 tinder-gradient text-white font-bold rounded-full shadow-lg text-center block text-base"
        >
          {t('goToLogin')}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white">
      {/* Header */}
      <div className="flex items-center px-4 pt-12 pb-4">
        <button onClick={() => navigate('/register')} className="text-gray-400 p-1">
          <ChevronLeft size={28} />
        </button>
        <h1 className="text-xl font-bold text-gray-900 ml-2">{t('verifyEmail')}</h1>
      </div>

      {/* Logo */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 tinder-gradient rounded-2xl shadow-md">
          <Flame size={28} className="text-white" fill="white" />
        </div>
      </div>

      {/* Info */}
      <div className="px-8 mb-8">
        <p className="text-gray-600 text-center text-sm leading-relaxed">
          {t('verifyEmailDesc')}
        </p>
      </div>

      {/* Code Input — 6 Felder */}
      <div className="px-8 mb-6">
        <div className="flex justify-center gap-3" onPaste={handlePaste}>
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="w-12 h-14 text-center text-2xl font-bold bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-tinder-pink focus:ring-2 focus:ring-tinder-pink/30 transition"
            />
          ))}
        </div>
      </div>

      {/* Timer */}
      <div className="text-center mb-6">
        {secondsLeft > 0 ? (
          <p className="text-gray-400 text-sm">
            {t('codeValidFor')} <span className="font-semibold text-gray-600">{formatTime(secondsLeft)}</span>
          </p>
        ) : (
          <p className="text-red-400 text-sm font-medium">{t('codeExpired')}</p>
        )}
      </div>

      {/* Manueller Submit-Button */}
      <div className="px-8 mb-4">
        <button
          onClick={() => {
            const code = digits.join('');
            if (code.length === 6) submitCode(code);
            else toast.error(t('enterFullCode'));
          }}
          disabled={loading || digits.join('').length < 6}
          className="w-full py-3.5 tinder-gradient text-white font-bold rounded-full shadow-lg hover:shadow-xl transition disabled:opacity-50 text-base"
        >
          {loading ? t('verifying') : t('verify')}
        </button>
      </div>

      {/* Resend */}
      <div className="text-center">
        <button
          onClick={handleResend}
          disabled={resending}
          className="text-tinder-pink font-semibold text-sm hover:underline disabled:opacity-50"
        >
          {resending ? t('sending') : t('resendCode')}
        </button>
      </div>
    </div>
  );
}
