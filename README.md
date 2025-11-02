# Ticketo

<!-- Backend Quick Start -->
## Backend Quick Start
```bash
cd backend
npm install
npm run dev   # or npm start
# test:
curl http://127.0.0.1:4000/health
```

### Quick Test Commands
```bash
# events
curl -s http://127.0.0.1:4000/api/events | jq length

# one event
curl -s http://127.0.0.1:4000/api/events/1 | jq .id

# promos
curl -s http://127.0.0.1:4000/api/promotions | jq length

# login (demo)
curl -s -X POST http://127.0.0.1:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ticketo.sa","password":"admin"}' | jq .ok

# booking
curl -s -X POST http://127.0.0.1:4000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"name":"Aziz","email":"a@a.com","eventId":"1","tickets":2,"promoCode":"STUDENT15"}' | jq .ok
```

Ticketo is a modern Saudi event booking experience built with vanilla HTML, CSS, and JavaScript. It lets fans explore concerts, films, sports fixtures, and festivals, reserve seats, and review past tickets, while administrators manage the catalog through a dedicated dashboard.

## Highlights
- Light/dark theme toggle with preference stored in localStorage.
- LocalStorage-backed database layer for events, users, and bookings.
- Complete booking journey: browse -> event details -> booking -> confirmation.
- Profile dashboard with personal stats, booking filters, and cancellation flow.
- Admin console for statistics, events, users, analytics, and database tools.

## Live Pages
- `index.html` - Home with hero slider, categories, and featured events.
- `events.html` - Filterable catalog with search, category, city, price.
- `event.html` - Ticket selector with live pricing and booking handoff.
- `booking.html` - Booking summary and attendee form.
- `confirm.html` - Success screen with booking receipt.
- `profile.html` - User dashboard, booking history, editable profile.
- `signin.html` / `signup.html` - Authentication flows for regular users.
- `admin/login.html` - Restricted admin sign in.
- `admin/index.html` - Admin dashboard (requires admin role).

## Project Structure
```
ticketo/
- admin/
    - index.html
    - login.html
- css/
    - styles.css
- js/
    - main.js
    - admin.js
- images/               (placeholder assets)
- index.html
- events.html
- event.html
- booking.html
- confirm.html
- profile.html
- signin.html
- signup.html
- README.md
- FEATURES.md
- IMPROVEMENTS.md
- database.sql          (schema reference)
```

## Data Model
All runtime data lives inside `localStorage` under the `ticketo_db` key. The bundled `database.sql` describes an equivalent relational schema for future migrations.

### Core Collections
- `events` - Catalog entries, seeded on first run.
- `users` - Registered users (auto-created during signup or booking).
- `bookings` - Ticket purchases with status and totals.
- `stats` - Aggregated counters for bookings, revenue, users.
- `settings` - Theme preference and currency.

## Admin Access
1. Open `admin/login.html`.
2. Use demo credentials:
   - Email: `admin@ticketo.com`
   - Password: `admin123`
3. On success you are redirected to `admin/index.html`.

## Tech Stack
- **HTML5** for structure.
- **CSS3** (flexbox, grid, custom properties, animations) in `css/styles.css`.
- **JavaScript (ES6+)** in `js/main.js` and `js/admin.js` for state, routing, and UI logic.
- **localStorage** for persistence; no external dependencies are required.

## Getting Started
1. Clone or download the repository.
2. Open `index.html` in any modern browser to explore the public experience.
3. Use `signin.html` / `signup.html` for user accounts, or `admin/login.html` for the admin console.

## Backend API (Node.js)
- The optional Express API lives in `backend/` and mirrors the localStorage data model.
- Install and run: `cd backend && npm install && npm start` (default port `4000`).
- Configure environment variables with `backend/.env` (see `.env.example` for keys). Without SMTP details the server auto-provisions an Ethereal test inbox and prints credentials in the console.
- Core endpoints:
  - `GET /health` - server + stats heartbeat.
  - `GET /api/events` / `:id` - browse event catalogue.
  - `GET /api/bookings` - list stored bookings.
  - `POST /api/bookings` - create a booking and trigger confirmation email.
  - `POST /api/users`, `POST /api/auth/login` - basic auth flows.
- Data is persisted to `backend/data/db.json`, seeded with the same demo users and events as the front-end.

## License
This project is provided for educational and demonstration purposes. Feel free to tailor it to your needs.

