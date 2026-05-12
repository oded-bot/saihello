import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, ArrowRightLeft, MessageCircle, PartyPopper } from 'lucide-react';
import useLanguage from '../../hooks/useLanguage';

export default function LandingPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const features = [
    {
      icon: <ArrowRightLeft size={24} className="text-white" />,
      title: t('landingFeature1Title'),
      desc: t('landingFeature1Desc'),
    },
    {
      icon: <MessageCircle size={24} className="text-white" />,
      title: t('landingFeature2Title'),
      desc: t('landingFeature2Desc'),
    },
    {
      icon: <PartyPopper size={24} className="text-white" />,
      title: t('landingFeature3Title'),
      desc: t('landingFeature3Desc'),
    },
  ];

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="tinder-gradient px-6 pt-14 pb-16 text-center">
          {/* Decorative circles */}
          <div className="absolute top-[-60px] right-[-40px] w-48 h-48 bg-white/10 rounded-full" />
          <div className="absolute bottom-[-30px] left-[-20px] w-32 h-32 bg-white/10 rounded-full" />

          {/* Flame Icon */}
          <div className="relative z-10 mb-5">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full shadow-2xl">
              <Flame size={44} className="text-white drop-shadow-lg" fill="white" />
            </div>
          </div>

          {/* Title */}
          <h1 className="relative z-10 text-3xl font-extrabold text-white tracking-tight mb-2">
            SaiHello
          </h1>
          <p className="relative z-10 text-white/90 text-base font-medium max-w-[280px] mx-auto leading-snug">
            {t('landingSubtitle')}
          </p>

          {/* CTA Buttons */}
          <div className="relative z-10 mt-7 space-y-3 max-w-[300px] mx-auto">
            <button
              onClick={() => navigate('/register')}
              className="w-full py-3.5 bg-white text-tinder-pink font-bold rounded-full shadow-xl hover:shadow-2xl transition text-base active:scale-[0.98]"
            >
              {t('landingCTA')}
            </button>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 bg-white/25 backdrop-blur-sm text-white font-semibold rounded-full border-2 border-white/40 hover:bg-white/35 transition active:scale-[0.98]"
            >
              {t('login')}
            </button>
          </div>
        </div>

        {/* Wave separator */}
        <svg viewBox="0 0 400 30" className="w-full -mt-1 block" preserveAspectRatio="none">
          <path d="M0,0 C100,30 300,30 400,0 L400,30 L0,30 Z" fill="white" />
        </svg>
      </div>

      {/* Description */}
      <div className="px-8 mt-2 mb-6">
        <p className="text-gray-600 text-center text-[15px] leading-relaxed">
          {t('landingDescription')}
        </p>
      </div>

      {/* Feature Cards */}
      <div className="px-5 space-y-3 flex-1">
        {features.map((f, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 bg-gray-50 border border-gray-100 rounded-2xl"
          >
            <div className="flex-shrink-0 w-11 h-11 tinder-gradient rounded-xl flex items-center justify-center shadow-md">
              {f.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 text-[15px]">{f.title}</h3>
              <p className="text-gray-500 text-[13px] mt-0.5 leading-snug">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-8 pt-6 pb-8 text-center border-t border-gray-100 mx-5">
        <div className="flex items-center justify-center gap-4 text-sm text-gray-400">
          <button onClick={() => navigate('/privacy')} className="hover:text-gray-600 transition">
            {t('privacyPolicyFull')}
          </button>
          <span>·</span>
          <button onClick={() => navigate('/imprint')} className="hover:text-gray-600 transition">
            {t('imprint')}
          </button>
        </div>
        <p className="text-gray-300 text-xs mt-2">SaiHello © 2026</p>
      </div>
    </div>
  );
}
