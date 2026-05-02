import React from 'react';
import { Calendar } from 'lucide-react';
import { getDaysUntil } from '../utils';

export default function EventCountdown({ event }) {
  const days = getDaysUntil(event.event_date);
  if (days <= 0) return null;

  return (
    <div className="w-full bg-gray-900 rounded-2xl p-4 flex items-center gap-4">
      <div className="w-12 h-12 bg-teal-900/50 rounded-xl flex items-center justify-center shrink-0">
        <Calendar size={22} className="text-teal-400" />
      </div>
      <div>
        <p className="text-white font-bold text-xl tabular-nums">{days} Tage</p>
        <p className="text-gray-500 text-xs">bis zum {event.name} in {event.city}</p>
      </div>
    </div>
  );
}
