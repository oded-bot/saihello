import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export default function PrivacyScreen() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white dark:bg-dark-bg" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex items-center px-4 pt-4 pb-4">
        <button onClick={() => navigate(-1)} className="text-gray-400 p-1">
          <ChevronLeft size={28} />
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white ml-2">Datenschutzerkl&auml;rung</h1>
      </div>

      <div className="px-6 pb-12 text-gray-700 dark:text-gray-300 text-sm leading-relaxed space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">1. Verantwortlicher</h2>
        <p>
          Verantwortlich für die Datenverarbeitung im Sinne der DSGVO:<br />
          The Brand Circle<br />
          Vanessa Schein<br />
          Ludwig-Schaefer-Weg 3, 65779 Kelkheim<br />
          E-Mail: info@thebrandcircle.de
        </p>

        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">2. Welche Daten wir erheben</h2>
        <p>Im Rahmen der Nutzung von Servus Wiesn werden folgende personenbezogene Daten verarbeitet:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Name (Anzeigename)</li>
          <li>Telefonnummer oder E-Mail-Adresse</li>
          <li>Alter und Geschlecht</li>
          <li>Profilfotos</li>
          <li>Chat-Nachrichten</li>
          <li>Standortbezogene Angaben (Zelt-Auswahl)</li>
          <li>Nutzungsdaten (Swipes, Matches, Bewertungen)</li>
        </ul>

        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">3. Zweck der Datenverarbeitung</h2>
        <p>Deine Daten werden ausschlie&szlig;lich f&uuml;r folgende Zwecke verwendet:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Bereitstellung der Matching-Funktionalit&auml;t (Tisch-Angebote und -Suche)</li>
          <li>Erm&ouml;glichung der Chat-Kommunikation zwischen gematchten Nutzern</li>
          <li>Tischvermittlung auf dem Oktoberfest</li>
          <li>Verbesserung des Dienstes</li>
        </ul>

        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">4. Rechtsgrundlage</h2>
        <p>
          Die Verarbeitung erfolgt auf Grundlage deiner Einwilligung gem&auml;&szlig; Art. 6 Abs. 1 lit. a DSGVO.
          Du kannst deine Einwilligung jederzeit widerrufen, indem du deinen Account l&ouml;schst.
        </p>

        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">5. Speicherdauer</h2>
        <p>
          Deine Daten werden gespeichert, solange dein Account besteht. Bei L&ouml;schung deines Accounts
          werden alle personenbezogenen Daten unwiderruflich gel&ouml;scht, einschlie&szlig;lich Nachrichten,
          Matches, Swipes und Profilinformationen.
        </p>

        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">6. Deine Rechte</h2>
        <p>Du hast gem&auml;&szlig; DSGVO folgende Rechte:</p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Auskunftsrecht</strong> (Art. 15 DSGVO) &mdash; Welche Daten wir &uuml;ber dich speichern</li>
          <li><strong>Recht auf Berichtigung</strong> (Art. 16 DSGVO) &mdash; Korrektur unrichtiger Daten</li>
          <li><strong>Recht auf L&ouml;schung</strong> (Art. 17 DSGVO) &mdash; L&ouml;schung deines Accounts und aller Daten</li>
          <li><strong>Recht auf Einschr&auml;nkung</strong> (Art. 18 DSGVO)</li>
          <li><strong>Recht auf Datenportabilit&auml;t</strong> (Art. 20 DSGVO)</li>
          <li><strong>Widerspruchsrecht</strong> (Art. 21 DSGVO)</li>
        </ul>
        <p>Zur Aus&uuml;bung deiner Rechte wende dich an: <strong>info@whatstalk.de</strong></p>

        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">7. Datensicherheit</h2>
        <p>
          Wir setzen technische und organisatorische Ma&szlig;nahmen ein, um deine Daten zu sch&uuml;tzen.
          Die &Uuml;bertragung erfolgt verschl&uuml;sselt &uuml;ber HTTPS. Passw&ouml;rter werden gehasht gespeichert.
        </p>

        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">8. Beschwerderecht</h2>
        <p>
          Du hast das Recht, dich bei einer Datenschutz-Aufsichtsbeh&ouml;rde zu beschweren.
          Zust&auml;ndig ist das Bayerische Landesamt f&uuml;r Datenschutzaufsicht (BayLDA).
        </p>

        <p className="text-gray-400 dark:text-gray-500 text-xs mt-8">Stand: April 2026</p>
      </div>
    </div>
  );
}
