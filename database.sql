-- Ticketo reference schema
-- This SQL mirrors the client-side localStorage structure for future migrations.

CREATE TABLE users (
    id            VARCHAR(40) PRIMARY KEY,
    name          VARCHAR(120) NOT NULL,
    email         VARCHAR(160) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone         VARCHAR(40),
    role          VARCHAR(20) DEFAULT 'user',
    created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE events (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(200) NOT NULL,
    category    VARCHAR(60)  NOT NULL,
    city        VARCHAR(60)  NOT NULL,
    venue       VARCHAR(160) NOT NULL,
    date        DATE         NOT NULL,
    time        TIME         NOT NULL,
    price_sar   DECIMAL(10,2) NOT NULL,
    image_url   TEXT,
    description TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bookings (
    id            VARCHAR(40) PRIMARY KEY,
    user_id       VARCHAR(40) REFERENCES users(id) ON DELETE SET NULL,
    event_id      INTEGER     REFERENCES events(id) ON DELETE CASCADE,
    event_title   VARCHAR(200) NOT NULL,
    event_image   TEXT,
    venue         VARCHAR(160) NOT NULL,
    event_date    DATE        NOT NULL,
    event_time    TIME        NOT NULL,
    ticket_type   VARCHAR(40) NOT NULL,
    quantity      INTEGER     NOT NULL CHECK (quantity BETWEEN 1 AND 10),
    total_price   DECIMAL(10,2) NOT NULL,
    user_name     VARCHAR(120) NOT NULL,
    user_email    VARCHAR(160) NOT NULL,
    status        VARCHAR(20)  NOT NULL DEFAULT 'confirmed',
    booked_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE settings (
    key   VARCHAR(40) PRIMARY KEY,
    value TEXT NOT NULL
);

INSERT INTO settings (key, value) VALUES
    ('theme', 'light'),
    ('currency', 'SAR');

-- Seed events can be migrated from the INITIAL_EVENTS array in js/main.js.
-- Aggregated statistics (bookings count, revenue, users) can be derived via SQL views:
CREATE VIEW stats_summary AS
SELECT
    (SELECT COUNT(*) FROM bookings)                  AS total_bookings,
    (SELECT COALESCE(SUM(total_price), 0) FROM bookings) AS total_revenue,
    (SELECT COUNT(*) FROM users)                     AS total_users;
