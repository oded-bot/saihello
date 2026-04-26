const db = require('../../config/database');

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
             p.photo_1, p.is_verified, p.bio, p.rating, p.emoji as offerer_emoji
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

    const myProfile = db.prepare('SELECT display_name, age, gender, photo_1, is_verified, bio, rating, emoji FROM profiles WHERE user_id = ?').get(userId);
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
      const myProfile = db.prepare('SELECT display_name, age, gender, photo_1, is_verified, bio, rating, emoji FROM profiles WHERE user_id = ?').get(userId);
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
             p.photo_1, p.is_verified, p.bio, p.rating, p.emoji as seeker_emoji
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
             p.photo_1, p.is_verified, p.bio, p.rating, p.emoji as offerer_emoji
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
             s.date, s.time_from, s.time_until, s.seats_needed,
             s.preferred_genders, s.preferred_age_min, s.preferred_age_max,
             p.display_name, p.age as seeker_age, p.gender as seeker_gender,
             p.photo_1, p.is_verified, p.bio, p.rating, p.emoji as seeker_emoji
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

module.exports = { getOfferPins, getSeekerPins, getOfferFeed, getSeekerFeed };
