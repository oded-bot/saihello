import { X } from 'lucide-react';

export default function HowItWorksModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-white dark:bg-dark-card rounded-t-3xl w-full max-w-md p-6 shadow-2xl"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Wie funktioniert SaiHello?</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-dark-elevated flex items-center justify-center">
            <X size={16} className="text-gray-500" />
          </button>
        </div>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
          <div className="flex gap-3">
            <span className="text-xl shrink-0">🎉</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white mb-0.5">Ich lade ein!</p>
              <p>Du hast heute Abend was vor und willst Leute dabei haben? Erstelle eine Einladung mit Ort, Datum und Uhrzeit – und finde passende Leute.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-xl shrink-0">🔍</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white mb-0.5">Einladung finden</p>
              <p>Swipe durch Einladungen in deiner Nähe. Gefällt dir ein Angebot, wische nach rechts. Der Gastgeber entscheidet, ob er dich einlädt.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-xl shrink-0">✅</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white mb-0.5">Match &amp; Chat</p>
              <p>Nimmst du eine Einladung an, ist der Platz gesichert. Im Chat klärt ihr die Details.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-xl shrink-0">🎥</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white mb-0.5">Life Feed</p>
              <p>Teile kurze Videos von deiner Feier-Situation und entdecke, was bei anderen gerade los ist.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-xl shrink-0">🔥</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white mb-0.5">Where's the heat?</p>
              <p>Sieh auf der Karte, wo gerade am meisten los ist – basierend auf echten Besucherdaten.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
