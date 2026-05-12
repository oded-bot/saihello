import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Users, MessageCircle, MapPin } from 'lucide-react';
import useLanguage from '../../hooks/useLanguage';

export default function LandingPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const features = [
    {
      icon: <Zap size={20} className="text-app-violet" />,
      title: t('landingFeature1Title'),
      desc: t('landingFeature1Desc'),
    },
    {
      icon: <MessageCircle size={20} className="text-app-pink" />,
      title: t('landingFeature2Title'),
      desc: t('landingFeature2Desc'),
    },
    {
      icon: <Users size={20} className="text-app-neon" />,
      title: t('landingFeature3Title'),
      desc: t('landingFeature3Desc'),
    },
    {
      icon: <MapPin size={20} className="text-tinder-cyan" />,
      title: 'Where\'s the heat?',
      desc: t('landingDescription'),
    },
  ];

  return (
    <div className="max-w-md mx-auto min-h-screen bg-black flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>

      {/* Hero */}
      <div className="flex-1 flex flex-col justify-between px-6 pt-16 pb-8">

        {/* Top: Logo + Headline */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl tinder-gradient mb-6 gradient-glow">
            <Zap size={40} className="text-white" fill="white" />
          </div>

          <h1 className="text-5xl font-black text-white tracking-tight mb-2">
            SaiHello
          </h1>
          <p className="text-lg text-white/50 font-medium">
            {t('landingSubtitle')}
          </p>
        </div>

        {/* Feature list */}
        <div className="mt-12 space-y-3">
          {features.map((f, i) => (
            <div key={i} className="flex items-center gap-4 glass rounded-2xl px-4 py-3">
              <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                {f.icon}
              </div>
              <div>
                <p className="font-semibold text-white text-sm">{f.title}</p>
                <p className="text-white/40 text-xs leading-snug mt-0.5 line-clamp-1">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="mt-10 space-y-3">
          <button
            onClick={() => navigate('/register')}
            className="w-full py-4 tinder-gradient text-white font-bold rounded-2xl text-base shadow-lg gradient-glow active:scale-[0.98] transition"
          >
            {t('landingCTA')}
          </button>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-4 glass text-white font-semibold rounded-2xl text-base active:scale-[0.98] transition"
          >
            {t('login')}
          </button>
        </div>

        {/* Footer links */}
        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-white/25">
          <button onClick={() => navigate('/privacy')} className="hover:text-white/50 transition">
            {t('privacyPolicyFull')}
          </button>
          <span>·</span>
          <button onClick={() => navigate('/imprint')} className="hover:text-white/50 transition">
            {t('imprint')}
          </button>
          <span>·</span>
          <span>SaiHello © 2026</span>
        </div>
      </div>
    </div>
  );
}
