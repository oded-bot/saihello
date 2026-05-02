import React from 'react';
import { ArrowRight } from 'lucide-react';
import ShareButton from './ShareButton';

export default function RegistrationForm({ event, name, setName, email, setEmail, city, setCity, onSubmit, submitting }) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="text-center mb-1">
        <h2 className="text-white font-bold text-xl">Sai You There! 👋</h2>
        <p className="text-gray-600 text-xs mt-1">Kein Passwort. Wir schreiben dir, wenn SaiHello startet.</p>
      </div>

      <input
        type="text"
        placeholder="Dein Name"
        value={name}
        onChange={e => setName(e.target.value)}
        className="w-full bg-gray-800 text-white placeholder-gray-600 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 border border-gray-700"
        required
      />
      <input
        type="email"
        placeholder="E-Mail-Adresse"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="w-full bg-gray-800 text-white placeholder-gray-600 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 border border-gray-700"
        required
      />
      <input
        type="text"
        placeholder="Deine Stadt (optional)"
        value={city}
        onChange={e => setCity(e.target.value)}
        className="w-full bg-gray-800 text-white placeholder-gray-600 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 border border-gray-700"
      />

      <button
        type="submit"
        disabled={submitting || !name.trim() || !email.trim()}
        className="w-full bg-teal-500 hover:bg-teal-400 text-white font-bold py-4 rounded-2xl text-base transition active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {submitting
          ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : <><span>Ich bin dabei!</span><ArrowRight size={18} /></>
        }
      </button>

      <ShareButton
        event={event}
        referralCode={null}
        className="w-full border border-gray-700 text-gray-500 py-3 rounded-2xl flex items-center justify-center gap-2 text-sm hover:border-gray-500 hover:text-gray-300 transition active:scale-[0.98]"
      />
    </form>
  );
}
