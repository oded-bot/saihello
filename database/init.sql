-- TableR Database Schema
-- Oktoberfest Tisch-Matching Platform

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- USERS & PROFILES
-- ============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    phone_verified BOOLEAN DEFAULT FALSE,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    is_banned BOOLEAN DEFAULT FALSE,
    ban_reason TEXT
);

CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(100) NOT NULL,
    bio TEXT,
    age INTEGER CHECK (age >= 18 AND age <= 120),
    gender VARCHAR(10) CHECK (gender IN ('m', 'f', 'd')),
    -- Profilbilder (bis zu 6)
    photo_1 TEXT,
    photo_2 TEXT,
    photo_3 TEXT,
    photo_4 TEXT,
    photo_5 TEXT,
    photo_6 TEXT,
    -- Verifizierung
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    -- Stats
    rating DECIMAL(2,1) DEFAULT 0.0,
    total_ratings INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- OKTOBERFEST ZELTE & TISCHE
-- ============================================

CREATE TABLE tents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    capacity INTEGER,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- Vordefinierte Oktoberfest-Zelte
INSERT INTO tents (name, slug, description, capacity) VALUES
    ('Augustiner-Festhalle', 'augustiner', 'Traditionelles Bier, gemütliche Atmosphäre', 6000),
    ('Hacker-Festzelt', 'hacker', 'Himmel der Bayern — bekannt für Stimmung', 6900),
    ('Hofbräu-Festzelt', 'hofbraeu', 'Das internationalste Zelt', 6896),
    ('Löwenbräu-Festhalle', 'loewenbraeu', 'Der Löwe brüllt — Party-Zelt', 5700),
    ('Marstall', 'marstall', 'Modernes Zelt mit gehobener Küche', 3200),
    ('Ochsenbraterei', 'ochsenbraterei', 'Tradition seit 1881 — Ochsen am Spieß', 5900),
    ('Paulaner-Festzelt', 'paulaner', 'Winzerer Fähndl — Stimmungszelt', 8450),
    ('Schottenhamel', 'schottenhamel', 'Das Anstich-Zelt — O''zapft is!', 6000),
    ('Schützen-Festzelt', 'schuetzen', 'Bayerische Tradition', 4442),
    ('Käfer Wiesn-Schänke', 'kaefer', 'VIP und Promis — exklusiv', 1000),
    ('Weinzelt', 'weinzelt', 'Wein statt Bier — gehoben', 1300),
    ('Fischer-Vroni', 'fischer-vroni', 'Steckerlfisch-Spezialität', 2695),
    ('Armbrustschützenzelt', 'armbrustschuetzen', 'Armbrust-Tradition', 5830),
    ('Bräurosl', 'braerosl', 'Pschorr-Bräurosl — Familienzelt', 6220);

CREATE TABLE table_offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tent_id UUID NOT NULL REFERENCES tents(id),
    -- Tisch-Details
    total_seats INTEGER NOT NULL CHECK (total_seats >= 1 AND total_seats <= 20),
    available_seats INTEGER NOT NULL CHECK (available_seats >= 1),
    -- Zeitfenster
    date DATE NOT NULL,
    time_from TIME NOT NULL,
    time_until TIME NOT NULL,
    -- Präferenzen: Wen möchte der Anbieter am Tisch?
    preferred_genders TEXT[] DEFAULT ARRAY['m','f','d'],
    preferred_age_min INTEGER DEFAULT 18,
    preferred_age_max INTEGER DEFAULT 99,
    -- Beschreibung
    description TEXT,
    group_description TEXT,  -- "Wir sind 5 Jungs, Mitte 20, feiern Geburtstag"
    -- Foto vom Tisch/Gruppe
    photo_url TEXT,
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'expired', 'full')),
    -- Preis (optional, 0 = kostenlos)
    price_per_seat DECIMAL(8,2) DEFAULT 0.00,
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Constraints
    CHECK (available_seats <= total_seats),
    CHECK (time_until > time_from),
    CHECK (date >= CURRENT_DATE)
);

-- ============================================
-- MATCHING & SWIPES
-- ============================================

CREATE TABLE swipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Wer swiped
    swiper_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Auf welches Angebot/Profil
    target_offer_id UUID REFERENCES table_offers(id) ON DELETE CASCADE,
    target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Richtung
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('like', 'pass', 'superlike')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Ein User kann ein Angebot nur einmal swipen
    UNIQUE(swiper_id, target_offer_id)
);

CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Die beiden gematchten User
    offer_id UUID NOT NULL REFERENCES table_offers(id) ON DELETE CASCADE,
    offerer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seeker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Plätze die vergeben werden
    seats_granted INTEGER NOT NULL DEFAULT 1,
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'confirmed', 'cancelled', 'completed', 'no_show')),
    -- Bewertungen nach dem Treffen
    offerer_rating INTEGER CHECK (offerer_rating >= 1 AND offerer_rating <= 5),
    seeker_rating INTEGER CHECK (seeker_rating >= 1 AND seeker_rating <= 5),
    offerer_review TEXT,
    seeker_review TEXT,
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    -- Ein Suchender kann pro Angebot nur einmal matchen
    UNIQUE(offer_id, seeker_id)
);

-- ============================================
-- CHAT / NACHRICHTEN
-- ============================================

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'system')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- REPORTS & SAFETY
-- ============================================

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES users(id),
    reported_user_id UUID NOT NULL REFERENCES users(id),
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('fake_profile', 'inappropriate', 'harassment', 'scam', 'no_show', 'other')),
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL,  -- 'match', 'message', 'offer_expired', etc.
    title VARCHAR(255) NOT NULL,
    body TEXT,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_table_offers_user_id ON table_offers(user_id);
CREATE INDEX idx_table_offers_status ON table_offers(status);
CREATE INDEX idx_table_offers_date ON table_offers(date);
CREATE INDEX idx_table_offers_tent ON table_offers(tent_id);
CREATE INDEX idx_swipes_swiper ON swipes(swiper_id);
CREATE INDEX idx_swipes_target ON swipes(target_user_id);
CREATE INDEX idx_matches_offerer ON matches(offerer_id);
CREATE INDEX idx_matches_seeker ON matches(seeker_id);
CREATE INDEX idx_matches_offer ON matches(offer_id);
CREATE INDEX idx_messages_match ON messages(match_id);
CREATE INDEX idx_messages_created ON messages(created_at);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER table_offers_updated_at BEFORE UPDATE ON table_offers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
