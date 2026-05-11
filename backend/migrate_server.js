const Database = require('better-sqlite3');
const db = new Database('./data/servus_wiesn.db');

// ── 1. Create upcoming_events if not exists ────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS upcoming_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    city TEXT,
    state TEXT,
    date_text TEXT,
    emoji TEXT,
    event_type TEXT DEFAULT 'mixed',
    estimated_visitors TEXT,
    sort_order INTEGER DEFAULT 999,
    threshold_soft INTEGER DEFAULT 75,
    threshold_hard INTEGER DEFAULT 150,
    is_tracker_active INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

const eventCount = db.prepare('SELECT COUNT(*) as c FROM upcoming_events').get().c;
if (eventCount === 0) {
  db.exec(`INSERT INTO upcoming_events (name,city,state,date_text,emoji,event_type,estimated_visitors,sort_order,threshold_soft,threshold_hard) VALUES
  ('Oktoberfest', 'München', 'Bayern', '18.09.–03.10.2027', '🍺', 'table', '7200000', '0', '75', '150'),
  ('Cannstatter Volksfest', 'Stuttgart', 'Baden-Württemberg', '24.09.–10.10.2027', '🎡', 'table', '4600000', '1', '75', '150'),
  ('Frühlingsfest Stuttgart', 'Stuttgart', 'Baden-Württemberg', '17.04.–09.05.2027', '🌸', 'table', '1200000', '2', '75', '150'),
  ('Cranger Kirmes', 'Herne', 'NRW', '05.08.–15.08.2027', '🎠', 'table', '4200000', '3', '75', '150'),
  ('Rheinkirmes Düsseldorf', 'Düsseldorf', 'NRW', '09.07.–18.07.2027', '🎡', 'table', '3900000', '4', '75', '150'),
  ('Kölner Karneval (inkl. Rosenmontag)', 'Köln', 'NRW', '08.02.2027 (Rosenmontag)', '🎭', 'street', '1.000.000+', '5', '50', '100'),
  ('Düsseldorfer Karneval', 'Düsseldorf', 'NRW', '08.02.2027', '🃏', 'street', '1.000.000+', '6', '50', '100'),
  ('Schützenfest Hannover', 'Hannover', 'Niedersachsen', '02.07.–11.07.2027', '🎯', 'table', '650000', '7', '75', '150'),
  ('Maschseefest', 'Hannover', 'Niedersachsen', '28.07.–15.08.2027', '🌊', 'mixed', '2100000', '8', '75', '150'),
  ('Kieler Woche', 'Kiel', 'Schleswig-Holstein', '19.06.–27.06.2027', '⛵', 'mixed', '3800000', '9', '75', '150'),
  ('Hamburger Hafengeburtstag', 'Hamburg', 'Hamburg', '07.05.–09.05.2027', '⚓', 'mixed', '1000000', '10', '75', '150'),
  ('Hamburger Dom (Sommer)', 'Hamburg', 'Hamburg', '23.07.–22.08.2027', '☀️', 'table', '1500000', '11', '75', '150'),
  ('Hamburger Dom (Winter)', 'Hamburg', 'Hamburg', '05.11.–05.12.2027', '❄️', 'table', '1400000', '12', '75', '150'),
  ('Reeperbahn Festival', 'Hamburg', 'Hamburg', '22.09.–25.09.2027', '🎸', 'street', '50.000+', '13', '35', '70'),
  ('Schlagermove', 'Hamburg', 'Hamburg', '10.07.2027 (vorauss.)', '🎤', 'street', '400.000+', '14', '50', '100'),
  ('Bremer Freimarkt', 'Bremen', 'Bremen', '15.10.–31.10.2027', '🎡', 'table', '4000000', '15', '75', '150'),
  ('Osterwiese Bremen', 'Bremen', 'Bremen', '19.03.–11.04.2027', '🐣', 'table', '1000000', '16', '75', '150'),
  ('Gäubodenvolksfest', 'Straubing', 'Bayern', '13.08.–23.08.2027', '🍺', 'table', '1200000', '17', '75', '150'),
  ('Nürnberger Volksfest (Frühjahr)', 'Nürnberg', 'Bayern', '27.03.–11.04.2027', '🌷', 'table', '2300000', '18', '75', '150'),
  ('Nürnberger Volksfest (Herbst)', 'Nürnberg', 'Bayern', '27.08.–12.09.2027', '🍂', 'table', '2000000', '19', '75', '150'),
  ('Christkindlesmarkt', 'Nürnberg', 'Bayern', '26.11.–24.12.2027', '⭐', 'table', '2.000.000+', '20', '75', '150'),
  ('Bergkirchweih', 'Erlangen', 'Bayern', '20.05.–31.05.2027', '🌳', 'table', '1000000', '21', '75', '150'),
  ('Tollwood Sommer', 'München', 'Bayern', '24.06.–18.07.2027', '🎪', 'mixed', '600.000+', '22', '75', '150'),
  ('Tollwood Winter', 'München', 'Bayern', '25.11.–31.12.2027', '🎪', 'mixed', '900.000+', '23', '75', '150'),
  ('Parookaville', 'Weeze', 'NRW', '16.07.–18.07.2027', '🏕️', 'camping', '225000', '24', '100', '200'),
  ('Rock am Ring', 'Nürburg', 'Rheinland-Pfalz', '04.06.–06.06.2027', '🎸', 'camping', '90000', '25', '70', '140'),
  ('Rock im Park', 'Nürnberg', 'Bayern', '04.06.–06.06.2027', '🎸', 'camping', '90000', '26', '70', '140'),
  ('Hurricane Festival', 'Scheeßel', 'Niedersachsen', '18.06.–20.06.2027', '🌪️', 'camping', '80000', '27', '70', '140'),
  ('Southside Festival', 'Neuhausen', 'Baden-Württemberg', '18.06.–20.06.2027', '🎵', 'camping', '65000', '28', '70', '140'),
  ('Fusion Festival', 'Lärz', 'Mecklenburg-Vorp.', '30.06.–04.07.2027', '🔮', 'camping', '70000', '29', '70', '140'),
  ('Nature One', 'Kastellaun', 'Rheinland-Pfalz', '06.08.–08.08.2027', '🔊', 'camping', '65000', '30', '70', '140'),
  ('Melt Festival', 'Ferropolis', 'Sachsen-Anhalt', '07.2027 (tbd)', '🎧', 'camping', '50000', '31', '70', '140'),
  ('CSD Berlin', 'Berlin', 'Berlin', '24.07.2027', '🏳️‍🌈', 'street', '500000', '32', '50', '100'),
  ('Karneval der Kulturen', 'Berlin', 'Berlin', '14.05.–16.05.2027', '🌍', 'street', '1000000', '33', '50', '100'),
  ('CSD Köln', 'Köln', 'NRW', '04.07.2027', '🏳️‍🌈', 'street', '1200000', '34', '50', '100'),
  ('Berliner Silvester am Brandenburger Tor', 'Berlin', 'Berlin', '31.12.2027', '🎆', 'street', '1.000.000+', '35', '50', '100'),
  ('Stadtfest Leipzig', 'Leipzig', 'Sachsen', '03.09.–05.09.2027', '🎵', 'street', '300000', '36', '50', '100'),
  ('Stadtfest Dresden', 'Dresden', 'Sachsen', '08.05.–10.05.2027', '🏰', 'street', '500.000+', '37', '50', '100'),
  ('Mainzer Johannisnacht', 'Mainz', 'Rheinland-Pfalz', '25.06.–28.06.2027', '🌙', 'street', '500000', '38', '50', '100'),
  ('Rhein in Flammen', 'Koblenz', 'Rheinland-Pfalz', '14.08.2027', '🎆', 'street', '150.000+', '39', '50', '100'),
  ('Hansesail', 'Rostock', 'Mecklenburg-Vorp.', '05.08.–08.08.2027', '⛵', 'mixed', '1000000', '40', '75', '150'),
  ('Baumblütenfest', 'Werder (Havel)', 'Brandenburg', '24.04.–02.05.2027', '🌸', 'mixed', '500000', '41', '75', '150'),
  ('Sandkerwa', 'Bamberg', 'Bayern', '26.08.–30.08.2027', '🏮', 'table', '200.000+', '42', '75', '150'),
  ('Gillamoos', 'Abensberg', 'Bayern', '02.09.–06.09.2027', '🍺', 'table', '300.000+', '43', '75', '150'),
  ('Cannstatter Wasen Frühlingsfest', 'Stuttgart', 'Baden-Württemberg', '17.04.–09.05.2027', '🌼', 'table', '1200000', '44', '75', '150'),
  ('Freimarkt (kleine Ergänzung)', 'Bremen', 'Bremen', '15.10.–31.10.2027', '🎡', 'table', '4000000', '45', '75', '150'),
  ('Weihnachtsmarkt Dortmund', 'Dortmund', 'NRW', '22.11.–30.12.2027', '🎄', 'table', '3.000.000+', '46', '75', '150'),
  ('Hamburger Weihnachtsmärkte', 'Hamburg', 'Hamburg', '22.11.–30.12.2027', '🎄', 'table', '2.000.000+', '47', '75', '150'),
  ('Wiener Wiesn-Fest', 'Wien', 'Österreich', 'Okt 2027', '🍺', 'table', '300.000+', '1000', '75', '150'),
  ('Villacher Kirchtag', 'Villach', 'Österreich', '31.07.–08.08.2027', '🎡', 'table', '500.000+', '1001', '75', '150'),
  ('Linzer Volksfest', 'Linz', 'Österreich', 'Mai 2027', '🎠', 'table', '400.000+', '1002', '75', '150'),
  ('Donauinselfest', 'Wien', 'Österreich', '25.–27.06.2027', '🌊', 'street', '3.000.000+', '1003', '50', '100'),
  ('Frequency Festival', 'St. Pölten', 'Österreich', '19.–22.08.2027', '🎵', 'camping', '200.000+', '1004', '100', '200'),
  ('Electric Love Festival', 'Salzburg', 'Österreich', 'Jul 2027', '⚡', 'camping', '150.000+', '1005', '100', '200'),
  ('Salzburger Festspiele', 'Salzburg', 'Österreich', '18.07.–31.08.2027', '🎭', 'mixed', '260.000+', '1006', '75', '150'),
  ('Basler Fasnacht', 'Basel', 'Schweiz', '08.–18.03.2027', '🎭', 'street', '200.000+', '1007', '50', '100'),
  ('Zürich Street Parade', 'Zürich', 'Schweiz', '14.08.2027', '🌈', 'street', '1.000.000+', '1008', '50', '100'),
  ('Montreux Jazz Festival', 'Montreux', 'Schweiz', '02.–17.07.2027', '🎷', 'mixed', '250.000+', '1009', '75', '150'),
  ('Paléo Festival Nyon', 'Nyon', 'Schweiz', '20.–25.07.2027', '🎸', 'camping', '230.000+', '1010', '100', '200'),
  ('Openair St. Gallen', 'St. Gallen', 'Schweiz', '01.–04.07.2027', '🎵', 'camping', '100.000+', '1011', '100', '200'),
  ('Luzerner Fasnacht', 'Luzern', 'Schweiz', 'Feb 2027', '🃏', 'street', '100.000+', '1012', '50', '100'),
  ('Berner Münsterfest', 'Bern', 'Schweiz', 'Jun 2027', '🏰', 'street', '50.000+', '1013', '35', '70'),
  ('Koningsdag (Königstag)', 'Amsterdam', 'Niederlande', '27.04.2027', '🟠', 'street', '1.000.000+', '1014', '50', '100'),
  ('Amsterdam Pride', 'Amsterdam', 'Niederlande', '31.07.–08.08.2027', '🏳️‍🌈', 'street', '500.000+', '1015', '50', '100'),
  ('Lowlands Festival', 'Biddinghuizen', 'Niederlande', '19.–21.08.2027', '🎪', 'camping', '55.000+', '1016', '70', '140'),
  ('Pinkpop', 'Landgraaf', 'Niederlande', 'Jun 2027', '🎸', 'camping', '70.000+', '1017', '70', '140'),
  ('Amsterdam Dance Event (ADE)', 'Amsterdam', 'Niederlande', 'Okt 2027', '🎧', 'mixed', '400.000+', '1018', '75', '150'),
  ('Rotterdam Unlimited', 'Rotterdam', 'Niederlande', 'Jul 2027', '🌍', 'street', '700.000+', '1019', '50', '100'),
  ('Bevrijdingsfestival (Befreiungstag)', 'Amsterdam', 'Niederlande', '05.05.2027', '🕊️', 'street', '500.000+', '1020', '50', '100'),
  ('Tomorrowland', 'Boom', 'Belgien', '16.–18. & 23.–25.07.2027', '🎆', 'camping', '400.000+', '1021', '100', '200'),
  ('Gentse Feesten', 'Gent', 'Belgien', '16.–25.07.2027', '🎉', 'street', '1.500.000+', '1022', '50', '100'),
  ('Rock Werchter', 'Werchter', 'Belgien', '01.–04.07.2027', '🎸', 'camping', '220.000+', '1023', '100', '200'),
  ('Bruges Beer Festival', 'Brügge', 'Belgien', 'Feb 2027', '🍺', 'table', '50.000+', '1024', '53', '105'),
  ('Ommegang Brüssel', 'Brüssel', 'Belgien', 'Jul 2027', '👑', 'street', '80.000+', '1025', '35', '70'),
  ('Glastonbury Festival', 'Pilton', 'England', '25.–29.06.2027', '🎸', 'camping', '210.000+', '1026', '100', '200'),
  ('Notting Hill Carnival', 'London', 'England', '28.–29.08.2027', '🥁', 'street', '1.000.000+', '1027', '50', '100'),
  ('Edinburgh Festival Fringe', 'Edinburgh', 'Schottland', '06.–30.08.2027', '🎭', 'mixed', '3.000.000+', '1028', '75', '150'),
  ('Reading Festival', 'Reading', 'England', '27.–29.08.2027', '🎵', 'camping', '105.000+', '1029', '100', '200'),
  ('Leeds Festival', 'Leeds', 'England', '27.–29.08.2027', '🎵', 'camping', '100.000+', '1030', '100', '200'),
  ('Creamfields', 'Daresbury', 'England', 'Aug 2027', '🎧', 'camping', '70.000+', '1031', '70', '140'),
  ('Download Festival', 'Castle Donington', 'England', 'Jun 2027', '🤘', 'camping', '110.000+', '1032', '100', '200'),
  ('British Summer Time (BST)', 'London', 'England', 'Jul 2027', '☀️', 'mixed', '65.000+', '1033', '53', '105'),
  ('St. Patrick''s Festival', 'Dublin', 'Irland', '12.–17.03.2027', '☘️', 'street', '500.000+', '1034', '50', '100'),
  ('Electric Picnic', 'Stradbally', 'Irland', 'Sep 2027', '🎪', 'camping', '70.000+', '1035', '70', '140'),
  ('Galway International Arts Festival', 'Galway', 'Irland', 'Jul 2027', '🎨', 'mixed', '200.000+', '1036', '75', '150'),
  ('Carnaval de Nice', 'Nizza', 'Frankreich', 'Feb 2027', '🎭', 'street', '1.000.000+', '1037', '50', '100'),
  ('Carnaval de Dunkerque', 'Dunkerque', 'Frankreich', 'Feb 2027', '🎊', 'street', '150.000+', '1038', '50', '100'),
  ('Fête de la Musique', 'Frankreichweit', 'Frankreich', '21.06.2027', '🎶', 'street', '10.000.000+', '1039', '50', '100'),
  ('Fête Nationale (Bastille)', 'Paris', 'Frankreich', '14.07.2027', '🗼', 'street', '600.000+', '1040', '50', '100'),
  ('Fête des Lumières', 'Lyon', 'Frankreich', 'Dez 2027', '💡', 'street', '2.000.000+', '1041', '50', '100'),
  ('Les Vieilles Charrues', 'Carhaix', 'Frankreich', 'Jul 2027', '🌾', 'camping', '280.000+', '1042', '100', '200'),
  ('Hellfest', 'Clisson', 'Frankreich', 'Jun 2027', '🤘', 'camping', '180.000+', '1043', '100', '200'),
  ('Eurockéennes de Belfort', 'Belfort', 'Frankreich', 'Jul 2027', '🎸', 'camping', '120.000+', '1044', '100', '200'),
  ('Fête de la Bière Strasbourg', 'Strasbourg', 'Frankreich', 'Sep 2027', '🍺', 'table', '500.000+', '1045', '75', '150'),
  ('Rock en Seine', 'Paris', 'Frankreich', 'Aug 2027', '🎵', 'mixed', '120.000+', '1046', '75', '150'),
  ('Festival de Cannes', 'Cannes', 'Frankreich', 'Mai 2027', '🎬', 'mixed', '200.000+', '1047', '75', '150'),
  ('Francofolies de La Rochelle', 'La Rochelle', 'Frankreich', 'Jul 2027', '🎤', 'mixed', '150.000+', '1048', '75', '150'),
  ('Feria de Abril', 'Sevilla', 'Spanien', 'Apr 2027', '💃', 'table', '1.000.000+', '1049', '75', '150'),
  ('Las Fallas', 'Valencia', 'Spanien', '15.–19.03.2027', '🔥', 'street', '1.500.000+', '1050', '50', '100'),
  ('San Fermín (Stierlauf)', 'Pamplona', 'Spanien', '06.–14.07.2027', '🐂', 'street', '1.000.000+', '1051', '50', '100'),
  ('La Tomatina', 'Buñol', 'Spanien', 'Aug 2027', '🍅', 'street', '20.000+', '1052', '35', '70'),
  ('Carnaval de Tenerife', 'Santa Cruz de Tenerife', 'Spanien', 'Feb 2027', '🎭', 'street', '250.000+', '1053', '50', '100'),
  ('Primavera Sound', 'Barcelona', 'Spanien', 'Jun 2027', '🎵', 'mixed', '220.000+', '1054', '75', '150'),
  ('Sónar Barcelona', 'Barcelona', 'Spanien', 'Jun 2027', '🎧', 'mixed', '120.000+', '1055', '75', '150'),
  ('Mad Cool Festival', 'Madrid', 'Spanien', 'Jul 2027', '🎸', 'mixed', '180.000+', '1056', '75', '150'),
  ('FIB Benicàssim', 'Benicàssim', 'Spanien', 'Jul 2027', '🎵', 'camping', '150.000+', '1057', '100', '200'),
  ('La Mercè', 'Barcelona', 'Spanien', '24.09.2027', '🎆', 'street', '600.000+', '1058', '50', '100'),
  ('Semana Grande Bilbao', 'Bilbao', 'Spanien', 'Aug 2027', '🎉', 'street', '500.000+', '1059', '50', '100'),
  ('Carnevale di Venezia', 'Venedig', 'Italien', 'Feb 2027', '🎭', 'mixed', '3.000.000+', '1060', '75', '150'),
  ('Carnevale di Viareggio', 'Viareggio', 'Italien', 'Feb 2027', '🎊', 'street', '600.000+', '1061', '50', '100'),
  ('Palio di Siena', 'Siena', 'Italien', '02.07. & 16.08.2027', '🐴', 'street', '50.000+', '1062', '35', '70'),
  ('Umbria Jazz Festival', 'Perugia', 'Italien', 'Jul 2027', '🎷', 'mixed', '200.000+', '1063', '75', '150'),
  ('Festa della Repubblica', 'Rom', 'Italien', '02.06.2027', '🇮🇹', 'street', '500.000+', '1064', '50', '100'),
  ('Milano Fashion Week', 'Mailand', 'Italien', 'Sep 2027', '👗', 'mixed', '100.000+', '1065', '75', '150'),
  ('Settimana della Birra', 'Mailand', 'Italien', 'Sep 2027', '🍺', 'table', '80.000+', '1066', '53', '105'),
  ('Festa de São João', 'Porto', 'Portugal', '23.–24.06.2027', '🔨', 'street', '1.000.000+', '1067', '50', '100'),
  ('NOS Alive', 'Lissabon', 'Portugal', 'Jul 2027', '🎵', 'mixed', '150.000+', '1068', '75', '150'),
  ('Super Bock Super Rock', 'Lissabon', 'Portugal', 'Jul 2027', '🎸', 'mixed', '100.000+', '1069', '75', '150'),
  ('Carnaval de Torres Vedras', 'Torres Vedras', 'Portugal', 'Feb 2027', '🎭', 'street', '300.000+', '1070', '50', '100'),
  ('Boom Festival', 'Idanha-a-Nova', 'Portugal', 'Jul 2027 (2-jährig)', '🌙', 'camping', '40.000+', '1071', '70', '140'),
  ('MEO Marés Vivas', 'Vila Nova de Gaia', 'Portugal', 'Jul 2027', '🌊', 'mixed', '80.000+', '1072', '53', '105'),
  ('Roskilde Festival', 'Roskilde', 'Dänemark', '26.06.–03.07.2027', '🎸', 'camping', '130.000+', '1073', '100', '200'),
  ('Smukfest', 'Skanderborg', 'Dänemark', 'Aug 2027', '🌲', 'camping', '50.000+', '1074', '70', '140'),
  ('Copenhagen Jazz Festival', 'Kopenhagen', 'Dänemark', 'Jul 2027', '🎷', 'mixed', '250.000+', '1075', '75', '150'),
  ('Øya Festival', 'Oslo', 'Norwegen', 'Aug 2027', '🎵', 'mixed', '80.000+', '1076', '53', '105'),
  ('Bergen Festspillene', 'Bergen', 'Norwegen', 'Mai–Jun 2027', '🏔️', 'mixed', '200.000+', '1077', '75', '150'),
  ('Way Out West', 'Göteborg', 'Schweden', 'Aug 2027', '🎵', 'camping', '55.000+', '1078', '70', '140'),
  ('Sweden Rock Festival', 'Sölvesborg', 'Schweden', 'Jun 2027', '🤘', 'camping', '35.000+', '1079', '70', '140'),
  ('Midsommar', 'Schwedenweit', 'Schweden', '25.06.2027', '🌸', 'street', '5.000.000+', '1080', '50', '100'),
  ('Flow Festival', 'Helsinki', 'Finnland', 'Aug 2027', '🎵', 'mixed', '80.000+', '1081', '53', '105'),
  ('Tuska Open Air', 'Helsinki', 'Finnland', 'Jul 2027', '🤘', 'mixed', '35.000+', '1082', '53', '105'),
  ('Colours of Ostrava', 'Ostrava', 'Tschechien', 'Jul 2027', '🎵', 'camping', '40.000+', '1083', '70', '140'),
  ('Metronome Prague', 'Prag', 'Tschechien', 'Jun 2027', '🎸', 'mixed', '50.000+', '1084', '53', '105'),
  ('Pilsner Fest', 'Pilsen', 'Tschechien', 'Sep 2027', '🍺', 'table', '100.000+', '1085', '75', '150'),
  ('Pol''and''Rock Festival', 'Kostrzyn', 'Polen', 'Aug 2027', '✌️', 'camping', '750.000+', '1086', '100', '200'),
  ('Open''er Festival', 'Gdynia', 'Polen', 'Jul 2027', '🎵', 'camping', '120.000+', '1087', '100', '200'),
  ('OFF Festival', 'Katowice', 'Polen', 'Aug 2027', '🎸', 'camping', '30.000+', '1088', '70', '140'),
  ('Sziget Festival', 'Budapest', 'Ungarn', '11.–16.08.2027', '🏝️', 'camping', '565.000+', '1089', '100', '200'),
  ('VOLT Festival', 'Sopron', 'Ungarn', 'Jun 2027', '⚡', 'camping', '100.000+', '1090', '100', '200'),
  ('Budapest Beer Week', 'Budapest', 'Ungarn', 'Mai 2027', '🍺', 'table', '100.000+', '1091', '75', '150'),
  ('UNTOLD Festival', 'Cluj-Napoca', 'Rumänien', 'Aug 2027', '🎆', 'camping', '350.000+', '1092', '100', '200'),
  ('Electric Castle', 'Cluj-Napoca', 'Rumänien', 'Jul 2027', '🏰', 'camping', '230.000+', '1093', '100', '200'),
  ('EXIT Festival', 'Novi Sad', 'Serbien', 'Jul 2027', '🎵', 'camping', '200.000+', '1094', '100', '200'),
  ('Ultra Europe', 'Split', 'Kroatien', 'Jul 2027', '🎧', 'mixed', '150.000+', '1095', '75', '150'),
  ('INmusic Festival', 'Zagreb', 'Kroatien', 'Jun 2027', '🎸', 'camping', '90.000+', '1096', '70', '140'),
  ('Outlook Festival', 'Pula', 'Kroatien', 'Sep 2027', '🌊', 'camping', '25.000+', '1097', '70', '140'),
  ('Carnival of Rijeka', 'Rijeka', 'Kroatien', 'Feb 2027', '🎭', 'street', '100.000+', '1098', '50', '100'),
  ('Patras Karneval', 'Patras', 'Griechenland', 'Feb 2027', '🎊', 'street', '500.000+', '1099', '50', '100'),
  ('Athens & Epidaurus Festival', 'Athen', 'Griechenland', 'Jun–Aug 2027', '🏛️', 'mixed', '200.000+', '1100', '75', '150'),
  ('Release Athens', 'Athen', 'Griechenland', 'Jun 2027', '🎵', 'mixed', '80.000+', '1101', '53', '105'),
  ('Rockwave Festival', 'Athen', 'Griechenland', 'Jul 2027', '🎸', 'mixed', '50.000+', '1102', '53', '105'),
  ('Positivus Festival', 'Salacgrīva', 'Lettland', 'Jul 2027', '🌲', 'camping', '35.000+', '1103', '70', '140'),
  ('Tallinn Music Week', 'Tallinn', 'Estland', 'Apr 2027', '🎵', 'mixed', '40.000+', '1104', '53', '105')
  `);
  console.log(`✓ upcoming_events: ${db.prepare('SELECT COUNT(*) as c FROM upcoming_events').get().c} events seeded`);
} else {
  // Ensure threshold columns exist
  try { db.exec('ALTER TABLE upcoming_events ADD COLUMN threshold_soft INTEGER DEFAULT 75'); } catch(e) {}
  try { db.exec('ALTER TABLE upcoming_events ADD COLUMN threshold_hard INTEGER DEFAULT 150'); } catch(e) {}
  try { db.exec('ALTER TABLE upcoming_events ADD COLUMN is_tracker_active INTEGER DEFAULT 0'); } catch(e) {}
  console.log(`✓ upcoming_events: ${eventCount} events already present`);
}

// ── 2. Fix tracker_registrations: make event_id nullable, add upcoming_event_id ──
try { db.exec('ALTER TABLE tracker_registrations ADD COLUMN upcoming_event_id INTEGER REFERENCES upcoming_events(id)'); } catch(e) {}

const cols = db.prepare('PRAGMA table_info(tracker_registrations)').all();
const eventIdCol = cols.find(c => c.name === 'event_id');
const isNullable = eventIdCol && eventIdCol.notnull === 0;

if (!isNullable) {
  // tracker_registrations_new may already exist from a prior attempt — drop it
  try { db.exec('DROP TABLE IF EXISTS tracker_registrations_new'); } catch(e) {}
  db.exec(`
    PRAGMA foreign_keys=OFF;
    CREATE TABLE tracker_registrations_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER,
      upcoming_event_id INTEGER REFERENCES upcoming_events(id),
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      city TEXT,
      referral_code TEXT UNIQUE,
      referred_by TEXT
    );
    INSERT INTO tracker_registrations_new SELECT id,event_id,upcoming_event_id,name,email,created_at,city,referral_code,referred_by FROM tracker_registrations;
    DROP TABLE tracker_registrations;
    ALTER TABLE tracker_registrations_new RENAME TO tracker_registrations;
    PRAGMA foreign_keys=ON;
  `);
  console.log('✓ tracker_registrations: event_id now nullable');
} else {
  // Clean up leftover _new table if exists
  try { db.exec('DROP TABLE IF EXISTS tracker_registrations_new'); } catch(e) {}
  console.log('✓ tracker_registrations: already nullable, cleaned up');
}

db.close();
console.log('\nMigration complete.');
