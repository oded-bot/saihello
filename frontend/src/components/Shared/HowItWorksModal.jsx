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
              <p className="font-semibold text-gray-900 dark:text-white mb-0.5">Komm' mit! – Platz anbieten</p>
              <p>Du hast einen reservierten Tisch oder einen freien Platz bei einem Event? Erstelle ein Angebot mit Ort, Datum und Uhrzeit – und finde passende Leute, die mitmachen wollen.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-xl shrink-0">🔍</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white mb-0.5">Ich komme dazu! – Platz finden</p>
              <p>Swipe durch Angebote in deiner Nähe. Gefällt dir eins, tippe auf Herz oder wische nach rechts. Der Anbieter bekommt deine Anfrage und entscheidet, ob er dich bestätigt.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-xl shrink-0">✅</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white mb-0.5">Match &amp; Chat</p>
              <p>Bestätigt der Anbieter deine Anfrage, ist der Platz gesichert und der Chat öffnet sich. Dort klärt ihr alles Weitere – Treffpunkt, Uhrzeit, wie ihr euch erkennt.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-xl shrink-0">🎥</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white mb-0.5">Life Feed</p>
              <p>Teile kurze Videos oder Fotos von deiner aktuellen Situation und entdecke, was bei anderen gerade los ist – von Clubs über Restaurants bis zu Events.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-xl shrink-0">🔥</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white mb-0.5">Where's the heat?</p>
              <p>Sieh auf der Karte, wo gerade Angebote und Suchende in deiner Nähe sind – und entdecke, wo in der Stadt gerade am meisten los ist.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-xl shrink-0">💬</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white mb-0.5">About Yesterday – Gestrige Begegnungen</p>
              <p>Hast du gestern jemanden getroffen, mit dem du gerne in Kontakt bleiben würdest? Im "About Yesterday"-Feed kannst du andere User von gestern finden. Ein gegenseitiges Like öffnet den Chat.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-xl shrink-0">🎯</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white mb-0.5">Suchprofil anlegen</p>
              <p>Suchst du für einen bestimmten Termin in der Zukunft? Lege ein Suchprofil an – mit Ort, Datum, Uhrzeit und Kategorie. Deine Suche erscheint als Pin auf der Karte, damit Anbieter in deiner Nähe dich finden können.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
