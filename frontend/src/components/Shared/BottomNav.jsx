import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Zap, Map, PlusCircle, MessageCircle, User, Info } from 'lucide-react';
import useNotifications from '../../hooks/useNotifications';
import useLanguage from '../../hooks/useLanguage';
import HowItWorksModal from './HowItWorksModal';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const notifications = useNotifications();
  const { t } = useLanguage();
  const [showHelp, setShowHelp] = useState(false);

  const tabs = [
    { path: '/home', icon: Zap, label: t('home') },
    { path: '/map', icon: Map, label: 'Karte' },
    { path: '/offer', icon: PlusCircle, label: t('offer') },
    { path: '/chat', icon: MessageCircle, label: t('chat'), badgeKey: 'totalBadge' },
    { path: '/profile', icon: User, label: t('profile') },
  ];

  return (
    <>
      <nav
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-3 mb-2 glass rounded-2xl">
          <div className="flex justify-around items-center h-14 px-2">
            {tabs.map(({ path, icon: Icon, label, badgeKey }) => {
              const active = location.pathname === path;
              const badge = badgeKey ? notifications[badgeKey] : 0;
              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className={`flex flex-col items-center justify-center w-full h-full transition-all relative ${
                    active ? 'text-white' : 'text-white/30'
                  }`}
                >
                  <div className="relative">
                    {active ? (
                      <div className="w-9 h-9 tinder-gradient rounded-xl flex items-center justify-center">
                        <Icon size={18} strokeWidth={2.5} fill={path === '/home' ? 'white' : 'none'} className="text-white" />
                      </div>
                    ) : (
                      <Icon size={22} strokeWidth={1.5} />
                    )}
                    {badge > 0 && (
                      <div className="absolute -top-1 -right-2 min-w-[16px] h-4 bg-app-pink rounded-full flex items-center justify-center px-1">
                        <span className="text-[9px] font-bold text-white">{badge > 9 ? '9+' : badge}</span>
                      </div>
                    )}
                  </div>
                  {!active && <span className="text-[10px] mt-0.5 font-medium">{label}</span>}
                </button>
              );
            })}
            <button
              onClick={() => setShowHelp(true)}
              className="flex flex-col items-center justify-center w-full h-full transition-all text-white/30"
            >
              <Info size={22} strokeWidth={1.5} />
              <span className="text-[10px] mt-0.5 font-medium">Hilfe</span>
            </button>
          </div>
        </div>
      </nav>
      {showHelp && <HowItWorksModal onClose={() => setShowHelp(false)} />}
    </>
  );
}
