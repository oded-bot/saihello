import React from 'react';
import CityBadges from './CityBadges';

function ProgressBar({ pct }) {
  return (
    <div className="w-full bg-gray-800 rounded-full h-4 overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-teal-700 to-teal-300 transition-all duration-1000"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function PhaseOne({ data }) {
  const { count, recentCount, recentNames, event, cities } = data;
  return (
    <div className="w-full bg-gray-900 rounded-3xl p-6 space-y-4">
      <div className="text-center space-y-1">
        <p className="text-7xl font-black text-white tabular-nums">{count}</p>
        <p className="text-gray-400 text-base">Menschen sind bereits dabei</p>
        {recentCount > 0 && (
          <p className="text-teal-400 text-sm font-semibold">+{recentCount} in den letzten 48h 🔥</p>
        )}
      </div>

      {recentNames.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {recentNames.map((name, i) => (
            <span key={i} className="bg-gray-800 text-gray-300 text-xs px-3 py-1.5 rounded-full">{name}</span>
          ))}
          {count > recentNames.length && (
            <span className="text-gray-600 text-xs self-center">& {count - recentNames.length} mehr</span>
          )}
        </div>
      )}

      <CityBadges cities={cities} />

      <p className="text-gray-600 text-xs text-center">
        Noch <span className="text-gray-400 font-semibold">{event.threshold_hard - count}</span> bis zum vollen Start
      </p>
    </div>
  );
}

export function PhaseTwo({ data }) {
  const { count, recentCount, event, cities, nextMilestone, softThresholdReached } = data;
  const pct = Math.min(100, Math.round((count / event.threshold_hard) * 100));
  return (
    <div className="w-full bg-gray-900 rounded-3xl p-6 space-y-4">
      <div className="flex justify-between items-end">
        <div>
          <p className="text-5xl font-black text-white tabular-nums">{count}</p>
          <p className="text-gray-500 text-sm">von {event.threshold_hard}</p>
        </div>
        <p className="text-4xl font-black text-teal-400">{pct}%</p>
      </div>

      <ProgressBar pct={pct} />

      {!softThresholdReached && nextMilestone && (
        <p className="text-gray-500 text-xs text-center">
          Bei <span className="text-teal-400 font-semibold">{nextMilestone}</span> öffnet sich die App 🔓
        </p>
      )}
      {softThresholdReached && (
        <p className="text-teal-400 text-xs text-center font-medium">
          Die App ist bereits offen — die Community wächst weiter 🚀
        </p>
      )}
      {recentCount > 0 && (
        <p className="text-teal-500 text-xs text-center">+{recentCount} neue in den letzten 48h</p>
      )}

      <CityBadges cities={cities} />
    </div>
  );
}

export function PhaseThree({ data }) {
  const { count, recentCount, event, cities } = data;
  const pct = Math.min(100, Math.round((count / event.threshold_hard) * 100));
  const remaining = event.threshold_hard - count;
  return (
    <div className="w-full bg-gray-900 rounded-3xl p-6 space-y-4">
      <p className="text-teal-300 text-xl font-black text-center">
        Noch {remaining} bis zum vollen Start! 🚀
      </p>

      <div className="flex justify-between items-end">
        <div>
          <p className="text-4xl font-black text-white tabular-nums">{count}</p>
          <p className="text-gray-500 text-sm">von {event.threshold_hard}</p>
        </div>
        <p className="text-3xl font-black text-teal-400">{pct}%</p>
      </div>

      <ProgressBar pct={pct} />

      {recentCount > 0 && (
        <p className="text-teal-400 text-sm text-center font-semibold">+{recentCount} in den letzten 48h 🔥</p>
      )}

      <CityBadges cities={cities} />
    </div>
  );
}
