const https = require('https');
const db = require('../../config/database');
const { geocode } = require('../../lib/geocode');

function httpPost(hostname, path, params) {
  return new Promise((resolve, reject) => {
    const qs = new URLSearchParams(params).toString();
    const options = {
      hostname,
      path: `${path}?${qs}`,
      method: 'POST',
      headers: { 'User-Agent': 'SaiHello/1.0', 'Content-Length': 0 },
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(null); } });
    });
    req.on('error', reject);
    req.setTimeout(12000, () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

function httpGet(hostname, path) {
  return new Promise((resolve, reject) => {
    const options = { hostname, path, headers: { 'User-Agent': 'SaiHello/1.0' } };
    const req = https.get(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(null); } });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

// Find nearby POIs via Overpass API (free, no credits)
async function findNearbyVenues(lat, lng, radiusM = 500, limit = 30) {
  const query = `[out:json][timeout:15];(node["amenity"~"restaurant|bar|cafe|pub|nightclub|biergarten|food_court"](around:${radiusM},${lat},${lng});node["tourism"~"attraction"](around:${radiusM},${lat},${lng}););out ${limit};`;
  const encoded = encodeURIComponent(query);
  const data = await httpGet('overpass-api.de', `/api/interpreter?data=${encoded}`);
  if (!data || !data.elements) return [];
  return data.elements
    .filter(e => e.tags?.name)
    .map(e => ({
      name: e.tags.name,
      address: [e.tags['addr:street'], e.tags['addr:city'] || 'Germany'].filter(Boolean).join(', ') || 'Germany',
      lat: e.lat,
      lng: e.lon,
    }));
}

// Get BestTime forecast for a venue (costs 2 credits per new venue)
async function getBestTimeForecast(venueName, venueAddress) {
  const apiKey = process.env.BESTTIME_API_KEY;
  return httpPost('besttime.app', '/api/v1/forecasts', {
    api_key_private: apiKey,
    venue_name: venueName,
    venue_address: venueAddress,
  });
}

function getOfferPins(req, res) {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().slice(0, 10);

    const profile = db.prepare('SELECT age, gender FROM profiles WHERE user_id = ?').get(userId);
    if (!profile) return res.status(400).json({ error: 'Profil nicht vollständig' });

    const mySearch = db.prepare(
      "SELECT * FROM seeker_searches WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1"
    ).get(userId);

    const offers = db.prepare(`
      SELECT o.id, o.user_id, o.location_lat, o.location_lng, o.location_text,
             o.date, o.time_from, o.time_until, o.available_seats,
             o.preferred_genders, o.preferred_age_min, o.preferred_age_max,
             o.seats_for_women, o.seats_for_men, o.seats_any_gender,
             o.group_age_min, o.group_age_max,
             p.display_name, p.age as offerer_age, p.gender as offerer_gender,
             p.photo_1, p.is_verified, p.bio, p.rating, p.emoji as offerer_emoji, p.badges as offerer_badges
      FROM table_offers o
      JOIN profiles p ON p.user_id = o.user_id
      WHERE o.status = 'active'
        AND o.user_id != ?
        AND o.date >= ?
        AND o.location_lat IS NOT NULL
        AND o.location_lng IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM swipes s WHERE s.swiper_id = ? AND s.target_offer_id = o.id
        )
    `).all(userId, today, userId);

    const filtered = offers.filter(o => {
      const genders = JSON.parse(o.preferred_genders || '["m","f","d"]');
      if (!genders.includes(profile.gender)) return false;
      if (profile.age < o.preferred_age_min || profile.age > o.preferred_age_max) return false;
      if (mySearch) {
        if (mySearch.date && o.date !== mySearch.date) return false;
        if (mySearch.time_from && mySearch.time_until) {
          if (o.time_until <= mySearch.time_from || o.time_from >= mySearch.time_until) return false;
        }
        if (o.available_seats < mySearch.seats_needed) return false;
        if (o.group_age_min && profile.age < o.group_age_min) return false;
        if (o.group_age_max && profile.age > o.group_age_max) return false;
      }
      return true;
    });

    const myProfile = db.prepare('SELECT display_name, age, gender, photo_1, is_verified, bio, rating, emoji, badges FROM profiles WHERE user_id = ?').get(userId);
    const ownPin = mySearch && mySearch.location_lat != null && mySearch.location_lng != null ? [{
      id: mySearch.id,
      lat: mySearch.location_lat,
      lng: mySearch.location_lng,
      locationText: mySearch.location_text,
      date: mySearch.date,
      timeFrom: mySearch.time_from,
      timeUntil: mySearch.time_until,
      seatsNeeded: mySearch.seats_needed,
      isOwn: true,
      profile: {
        displayName: myProfile?.display_name,
        age: myProfile?.age,
        gender: myProfile?.gender,
        photo: myProfile?.photo_1,
        isVerified: !!myProfile?.is_verified,
        bio: myProfile?.bio,
        rating: myProfile?.rating,
        emoji: myProfile?.emoji || null,
        badges: myProfile?.badges ? JSON.parse(myProfile.badges) : [],
      },
    }] : [];

    const pins = filtered.map(o => ({
      id: o.id,
      lat: o.location_lat,
      lng: o.location_lng,
      locationText: o.location_text,
      date: o.date,
      timeFrom: o.time_from,
      timeUntil: o.time_until,
      availableSeats: o.available_seats,
      isOwn: false,
      profile: {
        displayName: o.display_name,
        age: o.offerer_age,
        gender: o.offerer_gender,
        photo: o.photo_1,
        isVerified: !!o.is_verified,
        bio: o.bio,
        rating: o.rating,
        emoji: o.offerer_emoji || null,
        badges: o.offerer_badges ? JSON.parse(o.offerer_badges) : [],
      },
    }));

    res.json([...ownPin, ...pins]);
  } catch (err) {
    console.error('getOfferPins Fehler:', err);
    res.status(500).json({ error: 'Pins laden fehlgeschlagen' });
  }
}

function getSeekerPins(req, res) {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().slice(0, 10);

    const myOffer = db.prepare(
      "SELECT * FROM table_offers WHERE user_id = ? AND status = 'active' AND date >= ? ORDER BY date ASC, time_from ASC LIMIT 1"
    ).get(userId, today);

    const pins = [];

    if (myOffer && myOffer.location_lat != null && myOffer.location_lng != null) {
      const myProfile = db.prepare('SELECT display_name, age, gender, photo_1, is_verified, bio, rating, emoji, badges FROM profiles WHERE user_id = ?').get(userId);
      pins.push({
        id: myOffer.id,
        lat: myOffer.location_lat,
        lng: myOffer.location_lng,
        locationText: myOffer.location_text,
        date: myOffer.date,
        timeFrom: myOffer.time_from,
        timeUntil: myOffer.time_until,
        availableSeats: myOffer.available_seats,
        isOwn: true,
        profile: {
          displayName: myProfile?.display_name,
          age: myProfile?.age,
          gender: myProfile?.gender,
          photo: myProfile?.photo_1,
          isVerified: !!myProfile?.is_verified,
          bio: myProfile?.bio,
          rating: myProfile?.rating,
          emoji: myProfile?.emoji || null,
          badges: myProfile?.badges ? JSON.parse(myProfile.badges) : [],
        },
      });
    }

    if (!myOffer) return res.json(pins);

    const offerGenders = JSON.parse(myOffer.preferred_genders || '["m","f","d"]');

    const searches = db.prepare(`
      SELECT s.id, s.user_id, s.location_lat, s.location_lng, s.location_text,
             s.date, s.time_from, s.time_until, s.seats_needed,
             s.preferred_genders, s.preferred_age_min, s.preferred_age_max,
             p.display_name, p.age as seeker_age, p.gender as seeker_gender,
             p.photo_1, p.is_verified, p.bio, p.rating, p.emoji as seeker_emoji, p.badges as seeker_badges
      FROM seeker_searches s
      JOIN profiles p ON p.user_id = s.user_id
      WHERE s.status = 'active'
        AND s.user_id != ?
        AND s.date >= ?
        AND s.location_lat IS NOT NULL
        AND s.location_lng IS NOT NULL
    `).all(userId, today);

    const filtered = searches.filter(s => {
      if (!offerGenders.includes(s.seeker_gender)) return false;
      if (s.seeker_age < myOffer.preferred_age_min || s.seeker_age > myOffer.preferred_age_max) return false;
      if (s.date !== myOffer.date) return false;
      if (s.time_until <= myOffer.time_from || s.time_from >= myOffer.time_until) return false;
      if (myOffer.available_seats < s.seats_needed) return false;
      if (myOffer.group_age_min && s.seeker_age < myOffer.group_age_min) return false;
      if (myOffer.group_age_max && s.seeker_age > myOffer.group_age_max) return false;
      return true;
    });

    filtered.forEach(s => {
      pins.push({
        id: s.id,
        userId: s.user_id,
        lat: s.location_lat,
        lng: s.location_lng,
        locationText: s.location_text,
        date: s.date,
        timeFrom: s.time_from,
        timeUntil: s.time_until,
        seatsNeeded: s.seats_needed,
        isOwn: false,
        profile: {
          displayName: s.display_name,
          age: s.seeker_age,
          gender: s.seeker_gender,
          photo: s.photo_1,
          isVerified: !!s.is_verified,
          bio: s.bio,
          rating: s.rating,
          emoji: s.seeker_emoji || null,
          badges: s.seeker_badges ? JSON.parse(s.seeker_badges) : [],
        },
      });
    });

    res.json(pins);
  } catch (err) {
    console.error('getSeekerPins Fehler:', err);
    res.status(500).json({ error: 'Pins laden fehlgeschlagen' });
  }
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getOfferFeed(req, res) {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().slice(0, 10);

    const profile = db.prepare('SELECT age, gender FROM profiles WHERE user_id = ?').get(userId);
    if (!profile) return res.status(400).json({ error: 'Profil nicht vollständig' });

    const mySearch = db.prepare(
      "SELECT * FROM seeker_searches WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1"
    ).get(userId);

    const offers = db.prepare(`
      SELECT o.id, o.user_id, o.location_lat, o.location_lng, o.location_text,
             o.date, o.time_from, o.time_until, o.available_seats,
             o.preferred_genders, o.preferred_age_min, o.preferred_age_max,
             o.seats_for_women, o.seats_for_men, o.seats_any_gender,
             o.group_age_min, o.group_age_max,
             p.display_name, p.age as offerer_age, p.gender as offerer_gender,
             p.photo_1, p.is_verified, p.bio, p.rating, p.emoji as offerer_emoji, p.badges as offerer_badges
      FROM table_offers o
      JOIN profiles p ON p.user_id = o.user_id
      WHERE o.status = 'active'
        AND o.user_id != ?
        AND o.date >= ?
        AND o.location_lat IS NOT NULL
        AND o.location_lng IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM swipes s WHERE s.swiper_id = ? AND s.target_offer_id = o.id
        )
    `).all(userId, today, userId);

    const filtered = offers.filter(o => {
      const genders = JSON.parse(o.preferred_genders || '["m","f","d"]');
      if (!genders.includes(profile.gender)) return false;
      if (profile.age < o.preferred_age_min || profile.age > o.preferred_age_max) return false;
      if (mySearch) {
        if (mySearch.date && o.date !== mySearch.date) return false;
        if (mySearch.time_from && mySearch.time_until) {
          if (o.time_until <= mySearch.time_from || o.time_from >= mySearch.time_until) return false;
        }
        if (o.available_seats < mySearch.seats_needed) return false;
        if (o.group_age_min && profile.age < o.group_age_min) return false;
        if (o.group_age_max && profile.age > o.group_age_max) return false;
      }
      return true;
    });

    const seekerLat = mySearch?.location_lat;
    const seekerLng = mySearch?.location_lng;

    const withDistance = filtered.map(o => {
      const distKm = (seekerLat != null && seekerLng != null)
        ? haversineKm(seekerLat, seekerLng, o.location_lat, o.location_lng)
        : null;
      return {
        id: o.id,
        lat: o.location_lat,
        lng: o.location_lng,
        locationText: o.location_text,
        date: o.date,
        timeFrom: o.time_from,
        timeUntil: o.time_until,
        availableSeats: o.available_seats,
        distanceKm: distKm != null ? Math.round(distKm * 10) / 10 : null,
        profile: {
          displayName: o.display_name,
          age: o.offerer_age,
          gender: o.offerer_gender,
          photo: o.photo_1,
          isVerified: !!o.is_verified,
          bio: o.bio,
          rating: o.rating,
          emoji: o.offerer_emoji || null,
          badges: o.offerer_badges ? JSON.parse(o.offerer_badges) : [],
        },
      };
    });

    withDistance.sort((a, b) => {
      if (a.distanceKm == null && b.distanceKm == null) return 0;
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    });

    res.json(withDistance);
  } catch (err) {
    console.error('getOfferFeed Fehler:', err);
    res.status(500).json({ error: 'Feed laden fehlgeschlagen' });
  }
}

function getSeekerFeed(req, res) {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().slice(0, 10);

    const myOffer = db.prepare(
      "SELECT * FROM table_offers WHERE user_id = ? AND status = 'active' AND date >= ? ORDER BY date ASC, time_from ASC LIMIT 1"
    ).get(userId, today);

    if (!myOffer) return res.json([]);

    const offerGenders = JSON.parse(myOffer.preferred_genders || '["m","f","d"]');

    const searches = db.prepare(`
      SELECT s.id, s.user_id, s.location_lat, s.location_lng, s.location_text,
             s.date, s.time_from, s.time_until, s.seats_needed, s.category,
             s.preferred_genders, s.preferred_age_min, s.preferred_age_max,
             p.display_name, p.age as seeker_age, p.gender as seeker_gender,
             p.photo_1, p.is_verified, p.bio, p.rating, p.emoji as seeker_emoji, p.badges as seeker_badges
      FROM seeker_searches s
      JOIN profiles p ON p.user_id = s.user_id
      WHERE s.status = 'active'
        AND s.user_id != ?
        AND s.date >= ?
        AND s.location_lat IS NOT NULL
        AND s.location_lng IS NOT NULL
    `).all(userId, today);

    const filtered = searches.filter(s => {
      if (!offerGenders.includes(s.seeker_gender)) return false;
      if (s.seeker_age < myOffer.preferred_age_min || s.seeker_age > myOffer.preferred_age_max) return false;
      if (s.date !== myOffer.date) return false;
      if (s.time_until <= myOffer.time_from || s.time_from >= myOffer.time_until) return false;
      if (myOffer.available_seats < s.seats_needed) return false;
      if (myOffer.group_age_min && s.seeker_age < myOffer.group_age_min) return false;
      if (myOffer.group_age_max && s.seeker_age > myOffer.group_age_max) return false;
      return true;
    });

    const offerLat = myOffer.location_lat;
    const offerLng = myOffer.location_lng;

    const withDistance = filtered.map(s => {
      const distKm = (offerLat != null && offerLng != null)
        ? haversineKm(offerLat, offerLng, s.location_lat, s.location_lng)
        : null;
      return {
        id: s.id,
        userId: s.user_id,
        lat: s.location_lat,
        lng: s.location_lng,
        locationText: s.location_text,
        date: s.date,
        timeFrom: s.time_from,
        timeUntil: s.time_until,
        seatsNeeded: s.seats_needed,
        category: s.category || null,
        distanceKm: distKm != null ? Math.round(distKm * 10) / 10 : null,
        profile: {
          displayName: s.display_name,
          age: s.seeker_age,
          gender: s.seeker_gender,
          photo: s.photo_1,
          isVerified: !!s.is_verified,
          bio: s.bio,
          rating: s.rating,
          emoji: s.seeker_emoji || null,
          badges: s.seeker_badges ? JSON.parse(s.seeker_badges) : [],
        },
      };
    });

    withDistance.sort((a, b) => {
      if (a.distanceKm == null && b.distanceKm == null) return 0;
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    });

    res.json(withDistance);
  } catch (err) {
    console.error('getSeekerFeed Fehler:', err);
    res.status(500).json({ error: 'Feed laden fehlgeschlagen' });
  }
}

async function getHeatmap(req, res) {
  try {
    const { lat, lng, query } = req.query;
    // GPS-Modus: 15 km Radius für Pin-Suche; Frontend löst Re-Fetch aus wenn User weiter scrollt
    const pinRadius = lat && lng && !query ? 15000 : 500;
    const radius = 500;

    let centerLat, centerLng, locationLabel;

    if (lat && lng) {
      centerLat = parseFloat(lat);
      centerLng = parseFloat(lng);
      locationLabel = 'Aktueller Standort';
    } else if (query) {
      const coords = await geocode(query);
      if (!coords) return res.status(400).json({ error: 'Ort nicht gefunden' });
      centerLat = coords.lat;
      centerLng = coords.lng;
      locationLabel = query;
    } else {
      return res.status(400).json({ error: 'Ort oder Koordinaten erforderlich' });
    }

    // 1. Find nearby venues via Overpass (free) — large pool for geographic spread
    let venues = [];
    try { venues = await findNearbyVenues(centerLat, centerLng, radius, 30); } catch { /* Overpass timeout/unavailable — weiter mit Fake-Daten */ }

    // Always include the searched location itself as the first venue
    const searchedVenue = query
      ? { name: query, address: query, lat: centerLat, lng: centerLng }
      : { name: locationLabel, address: locationLabel, lat: centerLat, lng: centerLng };
    const allVenues = [searchedVenue, ...venues];

    const now = new Date();

    // TODO: FAKE DATA ENTFERNEN sobald BestTime-Daten zuverlässig für alle Zielstädte
    // verfügbar sind. Fake-Punkte sind Münchner Landmarks (Gärtnerplatz-Umgebung)
    // und sollen durch echte venue-basierte Daten aus BestTime.app ersetzt werden.
    const FAKE_HEAT_POINTS = [
      // 3 Wirtshäuser — sehr heiß (rot, intensity ≥ 0.75)
      [48.13765, 11.57992, 0.92], // Hofbräuhaus
      [48.13590, 11.57935, 0.88], // Weisses Bräuhaus
      [48.14220, 11.57010, 0.85], // Augustinerkeller Innenstadt

      // 4 Bars — warm/belebt (orange, intensity 0.55–0.74)
      [48.14350, 11.56280, 0.68], // Sonnenstraße
      [48.14490, 11.58610, 0.63], // Maximilianstraße
      [48.14080, 11.57920, 0.61], // Odeonsplatz Bereich
      [48.13320, 11.56540, 0.57], // Sendlinger-Tor Bereich

      // 6 Restaurants rund um Gärtnerplatz — mäßig (gelb, intensity 0.35–0.54)
      [48.12980, 11.57570, 0.50], // Gärtnerplatz
      [48.13180, 11.57820, 0.47], // Klenzestraße
      [48.12760, 11.57250, 0.45], // Reichenbachstraße
      [48.13050, 11.57150, 0.43], // Buttermelcherstraße
      [48.12650, 11.57850, 0.42], // Müllerstraße Süd
      [48.13380, 11.58120, 0.40], // Isartorplatz
    ];

    let liveHeatPoints = [];

    if (process.env.BESTTIME_API_KEY) {
      // Live BestTime-Daten als Ergänzung zu den Fake-Daten
      const dayInt = now.getDay();
      const hourInt = now.getHours();

      const forecasts = await Promise.allSettled(
        allVenues.map(v => getBestTimeForecast(v.name, `${v.name}, ${v.address}`))
      );

      forecasts.forEach((result, i) => {
        if (result.status !== 'fulfilled' || !result.value || result.value.status !== 'OK') return;
        const bt = result.value;
        const vLat = bt.venue_info?.venue_lat ?? allVenues[i].lat;
        const vLng = bt.venue_info?.venue_lon ?? allVenues[i].lng;

        let intensity = 0;
        try {
          const dayData = bt.analysis?.find(d => d.day_info?.day_int === dayInt);
          const hourData = dayData?.hour_analysis?.find(h => h.hour_int === hourInt);
          if (hourData?.intensity_nr != null) intensity = hourData.intensity_nr / 100;
          else if (dayData?.day_info?.day_mean != null) intensity = dayData.day_info.day_mean / 100;
        } catch {}

        liveHeatPoints.push([vLat, vLng, Math.max(0.1, intensity)]);
      });

      liveHeatPoints.sort((a, b) => b[2] - a[2]);
      liveHeatPoints = liveHeatPoints.slice(0, 8);
    }

    // Fake-Daten als Basis, Live-Daten vorne (höhere Priorität)
    const combined = [...liveHeatPoints, ...FAKE_HEAT_POINTS];
    const topHeatPoints = combined.slice(0, 13);

    // 3. App-Pins im Bereich — anonym oder mit Profil je nach Nutzerstatus
    const today = now.toISOString().slice(0, 10);
    const userId = req.user.id;
    const activeOffer = db.prepare("SELECT id FROM table_offers WHERE user_id = ? AND status = 'active' AND date >= ? LIMIT 1").get(userId, today);
    const activeSearch = db.prepare("SELECT id FROM seeker_searches WHERE user_id = ? AND status = 'active' LIMIT 1").get(userId);
    const isActive = !!(activeOffer || activeSearch);

    // Aktive Nutzer sehen Profile im 5km-Umkreis, inaktive Nutzer sehen anonyme Pins im pinRadius
    const profileRadius = isActive ? 5000 : pinRadius;
    const latDelta = profileRadius / 111000;
    const lngDelta = profileRadius / (111000 * Math.cos(centerLat * Math.PI / 180));

    let offerPins, seekerPins;

    if (isActive) {
      offerPins = db.prepare(`
        SELECT o.id, o.location_lat as lat, o.location_lng as lng,
               o.location_text, o.time_from, o.time_until, o.available_seats, o.date,
               p.display_name, p.emoji, p.photo_1, p.age, p.gender, p.bio, p.is_verified, p.badges
        FROM table_offers o JOIN profiles p ON p.user_id = o.user_id
        WHERE o.status = 'active' AND o.date >= ? AND o.user_id != ?
          AND o.location_lat BETWEEN ? AND ? AND o.location_lng BETWEEN ? AND ?
      `).all(today, userId, centerLat - latDelta, centerLat + latDelta, centerLng - lngDelta, centerLng + lngDelta)
        .map(r => ({
          id: r.id, lat: r.lat, lng: r.lng, type: 'offer',
          locationText: r.location_text, timeFrom: r.time_from, timeUntil: r.time_until,
          availableSeats: r.available_seats, date: r.date,
          profile: {
            displayName: r.display_name, emoji: r.emoji, photo: r.photo_1,
            age: r.age, gender: r.gender, bio: r.bio,
            isVerified: !!r.is_verified,
            badges: r.badges ? JSON.parse(r.badges) : [],
          },
        }));

      seekerPins = db.prepare(`
        SELECT s.id, s.location_lat as lat, s.location_lng as lng,
               s.location_text, s.time_from, s.time_until, s.seats_needed, s.date,
               p.display_name, p.emoji, p.photo_1, p.age, p.gender, p.bio, p.is_verified, p.badges
        FROM seeker_searches s JOIN profiles p ON p.user_id = s.user_id
        WHERE s.status = 'active' AND s.date >= ? AND s.user_id != ?
          AND s.location_lat BETWEEN ? AND ? AND s.location_lng BETWEEN ? AND ?
      `).all(today, userId, centerLat - latDelta, centerLat + latDelta, centerLng - lngDelta, centerLng + lngDelta)
        .map(r => ({
          id: r.id, lat: r.lat, lng: r.lng, type: 'seeker',
          locationText: r.location_text, timeFrom: r.time_from, timeUntil: r.time_until,
          seatsNeeded: r.seats_needed, date: r.date,
          profile: {
            displayName: r.display_name, emoji: r.emoji, photo: r.photo_1,
            age: r.age, gender: r.gender, bio: r.bio,
            isVerified: !!r.is_verified,
            badges: r.badges ? JSON.parse(r.badges) : [],
          },
        }));
    } else {
      offerPins = db.prepare(`
        SELECT o.id, o.location_lat as lat, o.location_lng as lng
        FROM table_offers o
        WHERE o.status = 'active' AND o.date >= ?
          AND o.location_lat BETWEEN ? AND ? AND o.location_lng BETWEEN ? AND ?
      `).all(today, centerLat - latDelta, centerLat + latDelta, centerLng - lngDelta, centerLng + lngDelta)
        .map(r => ({ ...r, type: 'offer' }));

      seekerPins = db.prepare(`
        SELECT s.id, s.location_lat as lat, s.location_lng as lng
        FROM seeker_searches s
        WHERE s.status = 'active' AND s.date >= ?
          AND s.location_lat BETWEEN ? AND ? AND s.location_lng BETWEEN ? AND ?
      `).all(today, centerLat - latDelta, centerLat + latDelta, centerLng - lngDelta, centerLng + lngDelta)
        .map(r => ({ ...r, type: 'seeker' }));
    }

    res.json({
      centerLat, centerLng, locationLabel,
      heatPoints: topHeatPoints,
      venueCount: allVenues.length,
      isActive,
      offerPins,
      seekerPins,
    });
  } catch (err) {
    console.error('getHeatmap Fehler:', err);
    res.status(500).json({ error: 'Heatmap laden fehlgeschlagen' });
  }
}

module.exports = { getOfferPins, getSeekerPins, getOfferFeed, getSeekerFeed, getHeatmap };
