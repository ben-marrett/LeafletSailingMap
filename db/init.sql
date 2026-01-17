-- Sailing Adventure Map Database Schema

-- Users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Routes (per-user)
CREATE TABLE routes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    distance_km DECIMAL(10, 2),
    color VARCHAR(20) DEFAULT '#3388ff',
    geojson JSONB NOT NULL,
    is_sample BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tracked vessels
CREATE TABLE tracked_vessels (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    mmsi VARCHAR(20) NOT NULL,
    name VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, mmsi)
);

-- Ship position history
CREATE TABLE ship_positions (
    id SERIAL PRIMARY KEY,
    mmsi VARCHAR(20) NOT NULL,
    latitude DECIMAL(9, 6) NOT NULL,
    longitude DECIMAL(9, 6) NOT NULL,
    speed_knots DECIMAL(5, 1),
    course DECIMAL(5, 1),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_ship_positions_mmsi ON ship_positions(mmsi);
CREATE INDEX idx_ship_positions_recorded_at ON ship_positions(recorded_at);

-- Session store (for express-session)
CREATE TABLE "session" (
    "sid" VARCHAR NOT NULL PRIMARY KEY,
    "sess" JSON NOT NULL,
    "expire" TIMESTAMP(6) NOT NULL
);
CREATE INDEX "IDX_session_expire" ON "session" ("expire");
