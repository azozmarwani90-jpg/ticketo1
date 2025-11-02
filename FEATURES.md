# Ticketo Feature Overview

## Core Experience
- Hero slider with manual controls, indicators, and direct booking links.
- Category shortcuts for Movies, Sports, Concerts, Theatre, and Festivals.
- Filterable events catalog (search, category, city, price).
- Event detail page with dynamic pricing and ticket quantity selection.
- End-to-end booking flow culminating in confirmation receipt.
- Profile dashboard featuring personal stats, booking filters, and cancellation.
- Dark/light theme toggle persisted per user.

## Admin Suite
- Statistics cards for bookings, revenue, users, and events.
- Tabbed management for bookings, events, users, analytics, settings.
- Event CRUD with modal forms and instant updates.
- Booking viewer with status filters and action buttons.
- Analytics summaries: revenue by category, booking trends, popular events, recent activity.
- Database utilities: export, import, and full reset (protected by confirmations).

## Data & Persistence
- Client-side database stored in `localStorage`.
- Automatic seeding of showcase events on first run.
- User accounts created via signup or bookings.
- Booking records include unique IDs, pricing, and status updates.
- `database.sql` documents the relational schema equivalent.

## Auth Flows
- `signup.html` and `signin.html` for regular users.
- `admin/login.html` for administrators.
- Demo credentials available for instant testing.
- Navigation updates dynamically to show user menu and sign out.

## File Inventory (Key Assets)
- Public pages: `index`, `events`, `event`, `booking`, `confirm`, `profile`.
- Auth pages: `signin`, `signup`.
- Admin pages: `admin/login`, `admin/index`.
- Styles: `css/styles.css` (consolidated).
- Scripts: `js/main.js`, `js/admin.js`.
- Data reference: `database.sql`.

## Demo Credentials
- **Admin:** admin@ticketo.com / admin123
- **User:** user@ticketo.com / user123

## Browser Support
Chrome, Firefox, Edge, Safari, and other modern ES6-compatible browsers.
