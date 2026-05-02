import React, { useEffect } from 'react';

export default function MilestoneCelebration({ milestone, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm cursor-pointer"
      onClick={onDismiss}
    >
      <div className="text-center px-8" style={{ animation: 'trackerPopIn 0.4s ease-out both' }}>
        <div className="text-8xl mb-4" style={{ animation: 'trackerBounce 0.8s ease-in-out 0.4s 3 both' }}>🎉</div>
        <p className="text-7xl font-black text-white mb-3 tabular-nums">{milestone}</p>
        <p className="text-teal-400 text-2xl font-bold">Menschen sind dabei!</p>
        <p className="text-gray-500 text-sm mt-3">SaiHello wächst 🚀</p>
        <p className="text-gray-700 text-xs mt-6">Tippen zum Schließen</p>
      </div>

      <style>{`
        @keyframes trackerPopIn {
          0%   { transform: scale(0); opacity: 0; }
          60%  { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes trackerBounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-16px); }
        }
      `}</style>
    </div>
  );
}
