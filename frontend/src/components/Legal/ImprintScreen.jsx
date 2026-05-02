import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export default function ImprintScreen() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white dark:bg-dark-bg" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex items-center px-4 pt-4 pb-4">
        <button onClick={() => navigate(-1)} className="text-gray-400 p-1">
          <ChevronLeft size={28} />
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white ml-2">Impressum</h1>
      </div>

      <div className="px-6 pb-12 text-gray-700 dark:text-gray-300 text-sm leading-relaxed space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Angaben gemäß § 5 TMG</h2>
        <p>
          The Brand Circle<br />
          Vanessa Schein<br />
          Ludwig-Schaefer-Weg 3<br />
          65779 Kelkheim<br />
          Deutschland
        </p>

        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Kontakt</h2>
        <p>
          E-Mail: info@thebrandcircle.de
        </p>

        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Umsatzsteuer-ID</h2>
        <p>
          Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: noch nicht vergeben
        </p>

        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
        <p>
          Vanessa Schein<br />
          Ludwig-Schaefer-Weg 3<br />
          65779 Kelkheim
        </p>

        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">EU-Streitbeilegung</h2>
        <p>
          Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:<br />
          <a href="https://ec.europa.eu/consumers/odr/" className="text-tinder-pink" target="_blank" rel="noopener noreferrer">
            https://ec.europa.eu/consumers/odr/
          </a>
        </p>

        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Haftungsausschluss</h2>
        <h3 className="font-semibold text-gray-800 dark:text-gray-200">Haftung für Inhalte</h3>
        <p>
          Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit,
          Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen.
          Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten
          nach den allgemeinen Gesetzen verantwortlich.
        </p>

        <h3 className="font-semibold text-gray-800 dark:text-gray-200">Haftung für Links</h3>
        <p>
          Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren Inhalte wir keinen Einfluss haben.
          Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen.
        </p>

        <h3 className="font-semibold text-gray-800 dark:text-gray-200">Plattform-Haftungsausschluss</h3>
        <p>
          SaiHello ist eine Vermittlungsplattform für Oktoberfest-Tischplätze. Wir übernehmen keine Haftung
          für die tatsächliche Verfügbarkeit oder Qualität von Tischplätzen. Alle Vereinbarungen werden
          direkt zwischen den Nutzern getroffen. Ein Anspruch auf erfolgreiche Vermittlung besteht nicht.
        </p>

        <p className="text-gray-400 dark:text-gray-500 text-xs mt-8">Stand: April 2026</p>
      </div>
    </div>
  );
}
