import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Heart, PartyPopper } from 'lucide-react';
import useNotifications from '../../hooks/useNotifications';
import useLanguage from '../../hooks/useLanguage';

export default function NotificationBanner() {
  const navigate = useNavigate();
  const { lastNotification, dismissNotification } = useNotifications();
  const { t } = useLanguage();
  const [offsetY, setOffsetY] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const startYRef = useRef(null);

  if (!lastNotification || dismissed) return null;

  const icons = {
    text: MessageCircle,
    invite: PartyPopper,
    match: Heart,
  };
  const Icon = icons[lastNotification.type] || MessageCircle;

  function onTouchStart(e) {
    e.stopPropagation();
    startYRef.current = e.touches[0].clientY;
    setSwiping(true);
  }

  function onTouchMove(e) {
    e.stopPropagation();
    e.preventDefault();
    if (startYRef.current === null) return;
    const diff = e.touches[0].clientY - startYRef.current;
    // Nur nach oben erlauben
    if (diff < 0) {
      setOffsetY(diff);
    }
  }

  function onTouchEnd(e) {
    e.stopPropagation();
    setSwiping(false);
    if (offsetY < -40) {
      // Weg-Animation
      setDismissed(true);
      setTimeout(() => {
        dismissNotification();
        setDismissed(false);
        setOffsetY(0);
      }, 200);
    } else {
      setOffsetY(0);
    }
    startYRef.current = null;
  }

  function handleClick() {
    dismissNotification();
    if (lastNotification.matchId) {
      navigate(`/chat/${lastNotification.matchId}`);
    } else {
      navigate('/matches');
    }
  }

  const opacity = dismissed ? 0 : Math.max(0, 1 + offsetY / 80);
  const translateY = dismissed ? -100 : offsetY;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[80] flex justify-center px-4"
      style={{ pointerEvents: 'none', paddingTop: 'calc(env(safe-area-inset-top) + 24px)' }}
    >
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={handleClick}
        className={`w-full max-w-md tinder-gradient text-white rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3 cursor-pointer ${!swiping && !dismissed ? 'animate-slide-down' : ''}`}
        style={{
          transform: `translateY(${translateY}px)`,
          opacity,
          transition: swiping ? 'none' : 'transform 0.2s ease-out, opacity 0.2s ease-out',
          pointerEvents: 'auto',
          touchAction: 'none',
        }}
      >
        <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center shrink-0">
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold">{lastNotification.sender}</p>
          <p className="text-xs text-white/80 truncate">{lastNotification.content}</p>
        </div>
        <span className="text-[10px] text-white/50">{t('notifNow')}</span>
      </div>
    </div>
  );
}
