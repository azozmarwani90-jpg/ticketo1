// Ticketo backend (Express 5 + JSON storage)

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const PORT = Number(process.env.PORT || 4000);
const HOST = '127.0.0.1';
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

const DEFAULT_DB = {
  events: [
    {
      id: 1,
      title: 'Abdul Majeed Abdullah Concert',
      category: 'Concerts',
      city: 'Riyadh',
      venue: 'Riyadh Boulevard',
      date: '2025-11-15',
      time: '20:00',
      price: 350,
      image: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&h=600&fit=crop',
      description: 'Legendary evening at Riyadh Boulevard.',
      lat: 24.7136,
      lng: 46.6753
    },
    {
      id: 2,
      title: 'The Godfather - Classic Cinema',
      category: 'Movies',
      city: 'Jeddah',
      venue: 'VOX Cinemas Red Sea Mall',
      date: '2025-10-20',
      time: '19:30',
      price: 45,
      image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&h=600&fit=crop',
      description: 'Timeless masterpiece on big screen.',
      lat: 21.4858,
      lng: 39.1925
    }
  ],
  promotions: [
    { id: 'SAUDIDAY25', title: 'Saudi Day 25% Off', discount: 25, active: true },
    { id: 'STUDENT15', title: 'Student 15% Off', discount: 15, active: true }
  ],
  users: [
    { id: 'u1', name: 'Admin', email: 'admin@ticketo.sa', password: 'admin', role: 'admin' }
  ],
  bookings: []
};

function ensureDB() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2));
  }
}

function readDB() {
  ensureDB();
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(raw || '{}');
  } catch (error) {
    console.error('Failed to read database:', error);
    throw new Error('Database read error');
  }
}

function writeDB(data) {
  ensureDB();
  // Atomic write: write to temp file then rename
  const tmp = DB_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, DB_PATH);
}

function findEvent(events, rawId) {
  if (!Array.isArray(events)) return null;
  const idStr = String(rawId);
  let event = events.find((item) => String(item.id) === idStr);
  if (!event) {
    const numeric = Number(rawId);
    if (!Number.isNaN(numeric)) {
      event = events.find((item) => Number(item.id) === numeric) || events[numeric - 1];
    }
  }
  return event || null;
}

ensureDB();

const app = express();

app.use(
  cors({
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With']
  })
);

app.use(express.json());

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

app.get('/health', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({ ok: true });
});

app.get('/api/health', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({ ok: true });
});

app.get('/api/events', (_req, res) => {
  try {
    const db = readDB();
    res.setHeader('Content-Type', 'application/json');
    res.json(db.events || []);
  } catch (error) {
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ ok: false, error: 'Failed to load events' });
  }
});

app.get('/api/events/:id', (req, res) => {
  try {
    const db = readDB();
    const event = findEvent(db.events || [], req.params.id);
    if (!event) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(404).json({ ok: false, error: 'Event not found' });
    }
    res.setHeader('Content-Type', 'application/json');
    res.json(event);
  } catch (error) {
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ ok: false, error: 'Failed to load event' });
  }
});

app.get('/api/promotions', (_req, res) => {
  try {
    const db = readDB();
    const promos = (db.promotions || []).filter((promo) => promo && promo.active);
    res.setHeader('Content-Type', 'application/json');
    res.json(promos);
  } catch (error) {
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ ok: false, error: 'Failed to load promotions' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(400).json({ ok: false, error: 'Missing email or password' });
    }

    const db = readDB();
    const users = db.users || [];
    const user = users.find(
      (u) =>
        String(u.email).trim().toLowerCase() === String(email).trim().toLowerCase() &&
        String(u.password) === String(password)
    );

    if (!user) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(401).json({ ok: false, error: 'Invalid email or password' });
    }

    const { password: _pw, ...safeUser } = user;
    res.setHeader('Content-Type', 'application/json');
    res.json({ ok: true, user: safeUser });
  } catch (error) {
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ ok: false, error: 'Login failed' });
  }
});

app.get('/api/bookings', (_req, res) => {
  try {
    const db = readDB();
    res.setHeader('Content-Type', 'application/json');
    res.json(db.bookings || []);
  } catch (error) {
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ ok: false, error: 'Failed to load bookings' });
  }
});

app.post('/api/bookings', (req, res) => {
  try {
    const { name, email, eventId, tickets, promoCode } = req.body || {};

    if (!name || !email || !eventId) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(400).json({ ok: false, error: 'Missing required fields' });
    }

    const quantity = Math.min(Math.max(Number(tickets) || 1, 1), 10);
    const db = readDB();

    const event = findEvent(db.events || [], eventId);
    if (!event) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(404).json({ ok: false, error: 'Event not found' });
    }

    const normalizedPromo = promoCode ? String(promoCode).trim().toUpperCase() : null;
    const promotions = db.promotions || [];
    const promo = normalizedPromo
      ? promotions.find(
          (entry) => entry && entry.active && String(entry.id).toUpperCase() === normalizedPromo
        )
      : null;

    const subtotal = Number(event.price || 0) * quantity;
    const total =
      promo && promo.discount
        ? Number((subtotal * (1 - Number(promo.discount) / 100)).toFixed(2))
        : subtotal;

    const booking = {
      id: `b${Date.now()}`,
      eventId: event.id,
      title: event.title,
      venue: event.venue,
      time: event.time,
      image: event.image,
      date: event.date,
      tickets: quantity,
      total,
      promo: promo ? promo.id : null,
      name,
      email,
      status: 'confirmed',
      bookedAt: new Date().toISOString()
    };

    db.bookings = Array.isArray(db.bookings) ? db.bookings : [];
    db.bookings.push(booking);
    writeDB(db);

    res.setHeader('Content-Type', 'application/json');
    res.status(201).json({ ok: true, booking, email_previewUrl: null });
  } catch (error) {
    console.error('Failed to create booking:', error);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ ok: false, error: 'Failed to create booking' });
  }
});

// PUT /api/bookings/:id - Update booking status (for cancel)
app.put('/api/bookings/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    
    if (!status) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(400).json({ ok: false, error: 'Status is required' });
    }
    
    const db = readDB();
    const bookings = db.bookings || [];
    const index = bookings.findIndex((b) => String(b.id) === String(id));
    
    if (index === -1) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(404).json({ ok: false, error: 'Booking not found' });
    }
    
    bookings[index] = { ...bookings[index], status };
    db.bookings = bookings;
    writeDB(db);
    
    res.setHeader('Content-Type', 'application/json');
    res.json({ ok: true, booking: bookings[index] });
  } catch (error) {
    console.error('Failed to update booking:', error);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ ok: false, error: 'Failed to update booking' });
  }
});

// DELETE /api/bookings/:id - Delete booking
app.delete('/api/bookings/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = readDB();
    const bookings = db.bookings || [];
    const index = bookings.findIndex((b) => String(b.id) === String(id));
    
    if (index === -1) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(404).json({ ok: false, error: 'Booking not found' });
    }
    
    bookings.splice(index, 1);
    db.bookings = bookings;
    writeDB(db);
    
    res.setHeader('Content-Type', 'application/json');
    res.json({ ok: true, message: 'Booking deleted' });
  } catch (error) {
    console.error('Failed to delete booking:', error);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ ok: false, error: 'Failed to delete booking' });
  }
});

// POST /api/events - Create new event
app.post('/api/events', (req, res) => {
  try {
    const eventData = req.body || {};
    
    if (!eventData.title || !eventData.category) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(400).json({ ok: false, error: 'Title and category are required' });
    }
    
    const db = readDB();
    const events = db.events || [];
    
    // Generate new ID
    const maxId = events.reduce((max, e) => Math.max(max, Number(e.id) || 0), 0);
    const newId = maxId + 1;
    
    const newEvent = {
      id: newId,
      title: eventData.title,
      category: eventData.category,
      city: eventData.city || '',
      venue: eventData.venue || '',
      date: eventData.date || new Date().toISOString().slice(0, 10),
      time: eventData.time || '00:00',
      price: Number(eventData.price) || 0,
      image: eventData.image || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&h=600&fit=crop',
      description: eventData.description || '',
      lat: eventData.lat != null ? Number(eventData.lat) : null,
      lng: eventData.lng != null ? Number(eventData.lng) : null,
      createdAt: new Date().toISOString()
    };
    
    events.push(newEvent);
    db.events = events;
    writeDB(db);
    
    res.setHeader('Content-Type', 'application/json');
    res.status(201).json({ ok: true, event: newEvent });
  } catch (error) {
    console.error('Failed to create event:', error);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ ok: false, error: 'Failed to create event' });
  }
});

// PUT /api/events/:id - Update event
app.put('/api/events/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};
    
    const db = readDB();
    const events = db.events || [];
    const event = findEvent(events, id);
    
    if (!event) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(404).json({ ok: false, error: 'Event not found' });
    }
    
    const index = events.indexOf(event);
    const updatedEvent = {
      ...event,
      ...updates,
      id: event.id, // Preserve ID
      lat: updates.lat != null ? Number(updates.lat) : event.lat,
      lng: updates.lng != null ? Number(updates.lng) : event.lng,
      price: updates.price != null ? Number(updates.price) : event.price
    };
    
    events[index] = updatedEvent;
    db.events = events;
    writeDB(db);
    
    res.setHeader('Content-Type', 'application/json');
    res.json({ ok: true, event: updatedEvent });
  } catch (error) {
    console.error('Failed to update event:', error);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ ok: false, error: 'Failed to update event' });
  }
});

// DELETE /api/events/:id - Delete event
app.delete('/api/events/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = readDB();
    const events = db.events || [];
    const event = findEvent(events, id);
    
    if (!event) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(404).json({ ok: false, error: 'Event not found' });
    }
    
    const index = events.indexOf(event);
    events.splice(index, 1);
    db.events = events;
    writeDB(db);
    
    res.setHeader('Content-Type', 'application/json');
    res.json({ ok: true, message: 'Event deleted' });
  } catch (error) {
    console.error('Failed to delete event:', error);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ ok: false, error: 'Failed to delete event' });
  }
});

// Optional static hosting (uncomment when needed)
// const FRONTEND_DIR = path.resolve(__dirname, '..');
// app.use(express.static(FRONTEND_DIR));

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.setHeader('Content-Type', 'application/json');
  res.status(err.status || 500).json({ ok: false, error: err.message || 'Server error' });
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

app.listen(PORT, HOST, () => {
  console.log(`✅ Ticketo backend running on http://${HOST}:${PORT}`);
  console.log(`📦 Database file: ${DB_PATH}`);
});
