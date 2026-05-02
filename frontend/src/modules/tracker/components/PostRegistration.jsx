import React from 'react';
import { Users } from 'lucide-react';
import ShareButton from './ShareButton';

export default function PostRegistration({ firstName, event, regResult }) {
  const { referralCode, referralCount, founderBadge, founderPosition } = regResult;

  return (
    <div className="space-y-4">
      {/* Success */}
      <div className="bg-teal-900/30 border border-teal-700/40 rounded-3xl p-6 text-center space-y-2">
        <div className="text-4xl">✅</div>
        <p className="text-white font-bold text-lg">Du bist dabei, {firstName}!</p>
        <p className="text-gray-400 text-sm">
          Wir schreiben dir, sobald SaiHello beim {event.name} startet.
        </p>
      </div>

      {/* Founder badge */}
      {founderBadge && (
        <div className="bg-amber-900/30 border border-amber-700/40 rounded-3xl p-4 text-center space-y-1">
          <p className="text-3xl">🏅</p>
          <p className="text-amber-300 font-bold text-sm">Mitgründer #{founderPosition}</p>
          <p className="text-amber-600/70 text-xs">
            Du bist unter den ersten 100 — das vergessen wir nicht.
          </p>
        </div>
      )}

      {/* Share + referral */}
      <div className="bg-gray-900 rounded-3xl p-5 space-y-3">
        <p className="text-gray-300 text-sm font-medium text-center">
          Je mehr mitmachen, desto schneller startet SaiHello.
        </p>

        <ShareButton
          event={event}
          referralCode={referralCode}
          className="w-full bg-teal-600 hover:bg-teal-500 text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 transition active:scale-[0.98]"
        />

        {referralCount > 0 && (
          <div className="flex items-center justify-center gap-2 pt-1">
            <Users size={14} className="text-teal-400" />
            <p className="text-teal-400 text-sm font-medium">
              Du hast {referralCount} {referralCount === 1 ? 'Person' : 'Personen'} eingeladen!
            </p>
          </div>
        )}

        {referralCode && (
          <p className="text-gray-700 text-xs text-center">
            Dein Code: <span className="text-gray-500 font-mono tracking-wider">{referralCode}</span>
          </p>
        )}
      </div>
    </div>
  );
}
