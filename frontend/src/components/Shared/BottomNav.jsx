import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { Zap, Map, MessageCircle, User, Info } from 'lucide-react';
import useNotifications from '../../hooks/useNotifications';
import useLanguage from '../../hooks/useLanguage';
import HowItWorksModal from './HowItWorksModal';

const GRADIENT = 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const notifications = useNotifications();
  const { t } = useLanguage();
  const [showHelp, setShowHelp] = useState(false);

  const leftTabs = [
    { path: '/home', icon: Zap, label: t('home') },
    { path: '/map', icon: Map, label: 'Karte' },
  ];

  const rightTabs = [
    { path: '/chat', icon: MessageCircle, label: t('chat'), badgeKey: 'totalBadge' },
    { path: '/profile', icon: User, label: t('profile') },
  ];

  const content = (
    <>
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '448px',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          zIndex: 99999,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            margin: '0 12px 8px',
            borderRadius: '16px',
            background: 'rgba(30,15,50,0.98)',
            border: '1.5px solid rgba(124,58,237,0.70)',
            boxShadow: '0 0 24px rgba(124,58,237,0.22)',
            display: 'flex',
            alignItems: 'center',
            height: '56px',
            padding: '0 6px',
            pointerEvents: 'auto',
          }}
        >
          {/* Left tabs */}
          {leftTabs.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: active ? 'white' : 'rgba(255,255,255,0.75)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {active ? (
                  <div style={{ width: 36, height: 36, borderRadius: 12, background: GRADIENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={18} strokeWidth={2.5} fill={path === '/home' ? 'white' : 'none'} color="white" />
                  </div>
                ) : (
                  <>
                    <Icon size={22} strokeWidth={1.5} />
                    <span style={{ fontSize: 10, marginTop: 2, fontWeight: 500 }}>{label}</span>
                  </>
                )}
              </button>
            );
          })}

          {/* Right tabs */}
          {rightTabs.map(({ path, icon: Icon, label, badgeKey }) => {
            const active = location.pathname === path;
            const badge = badgeKey ? notifications[badgeKey] : 0;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: active ? 'white' : 'rgba(255,255,255,0.75)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  position: 'relative',
                }}
              >
                <div style={{ position: 'relative' }}>
                  {active ? (
                    <div style={{ width: 36, height: 36, borderRadius: 12, background: GRADIENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={18} strokeWidth={2.5} color="white" />
                    </div>
                  ) : (
                    <Icon size={22} strokeWidth={1.5} />
                  )}
                  {badge > 0 && (
                    <div style={{ position: 'absolute', top: -4, right: -8, minWidth: 16, height: 16, background: '#EC4899', borderRadius: 99, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: 'white' }}>{badge > 9 ? '9+' : badge}</span>
                    </div>
                  )}
                </div>
                {!active && <span style={{ fontSize: 10, marginTop: 2, fontWeight: 500 }}>{label}</span>}
              </button>
            );
          })}

          {/* Hilfe */}
          <button
            onClick={() => setShowHelp(true)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'rgba(255,255,255,0.75)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <Info size={22} strokeWidth={1.5} />
            <span style={{ fontSize: 10, marginTop: 2, fontWeight: 500 }}>Hilfe</span>
          </button>
        </div>
      </div>

      {showHelp && <HowItWorksModal onClose={() => setShowHelp(false)} />}
    </>
  );

  return ReactDOM.createPortal(content, document.body);
}
