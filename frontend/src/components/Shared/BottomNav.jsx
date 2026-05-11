import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Flame, Map, Star, MessageCircle, User, Info, Share2 } from 'lucide-react';
import useNotifications from '../../hooks/useNotifications';
import useLanguage from '../../hooks/useLanguage';
import HowItWorksModal from './HowItWorksModal';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const notifications = useNotifications();
  const { t } = useLanguage();
  const [showHelp, setShowHelp] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  function handleShare() {
    const refCode = localStorage.getItem('saiHelloRefCode');
    const url = refCode ? `${window.location.origin}/?ref=${refCode}` : window.location.origin;
    if (navigator.share) {
      navigator.share({ title: 'SaiHello', url });
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      });
    }
  }

  const tabs = [
    { path: '/home', icon: Flame, label: t('home') },
    { path: '/map', icon: Map, label: 'Karte' },
    { path: '/matches', icon: Star, label: t('matches'), badgeKey: 'matchesBadge' },
    { path: '/chat', icon: MessageCircle, label: t('chat'), badgeKey: 'totalBadge' },
    { path: '/profile', icon: User, label: t('profile') },
  ];

  return (
    <>
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white dark:bg-dark-card border-t border-gray-100 dark:border-dark-separator z-50 dark-transition" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex justify-around items-center h-14 px-2">
          {tabs.map(({ path, icon: Icon, label, badgeKey }) => {
            const active = location.pathname === path;
            const badge = badgeKey ? notifications[badgeKey] : 0;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`flex flex-col items-center justify-center w-full h-full transition-colors relative ${
                  active ? 'text-tinder-pink' : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                <div className="relative">
                  <Icon size={22} strokeWidth={active ? 2.5 : 1.5} fill={active && path === '/home' ? 'currentColor' : 'none'} />
                  {badge > 0 && (
                    <div className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 bg-tinder-pink rounded-full flex items-center justify-center px-1">
                      <span className="text-[9px] font-bold text-white">{badge > 9 ? '9+' : badge}</span>
                    </div>
                  )}
                </div>
                <span className="text-[10px] mt-0.5 font-medium">{label}</span>
              </button>
            );
          })}
          <button
            onClick={handleShare}
            className="flex flex-col items-center justify-center w-full h-full transition-colors text-gray-400 dark:text-gray-500"
          >
            <Share2 size={22} strokeWidth={1.5} className={shareCopied ? 'text-teal-500' : ''} />
            <span className={`text-[10px] mt-0.5 font-medium ${shareCopied ? 'text-teal-500' : ''}`}>
              {shareCopied ? 'Kopiert!' : 'Teilen'}
            </span>
          </button>
          <button
            onClick={() => setShowHelp(true)}
            className="flex flex-col items-center justify-center w-full h-full transition-colors text-gray-400 dark:text-gray-500"
          >
            <Info size={22} strokeWidth={1.5} />
            <span className="text-[10px] mt-0.5 font-medium">Hilfe</span>
          </button>
        </div>
      </nav>
      {showHelp && <HowItWorksModal onClose={() => setShowHelp(false)} />}
    </>
  );
}
