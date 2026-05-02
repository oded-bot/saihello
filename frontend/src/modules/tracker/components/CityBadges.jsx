import React from 'react';
import { MapPin } from 'lucide-react';

export default function CityBadges({ cities }) {
  if (!cities?.length) return null;
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <MapPin size={12} className="text-gray-600" />
        <span className="text-gray-600 text-xs">Dabei aus:</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {cities.map(({ city, cnt }) => (
          <span key={city} className="bg-gray-800 border border-gray-700 text-gray-300 text-xs px-3 py-1.5 rounded-full">
            {city}{cnt > 1 && <span className="text-gray-500 ml-1">({cnt})</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
