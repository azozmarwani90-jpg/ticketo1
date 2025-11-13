# Ticketo - Running Guide

## Prerequisites
- Node.js (v14 or higher)
- A browser (Chrome, Firefox, Safari recommended)
- Live Server extension for VS Code (or similar)

## Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

The backend will run on `http://127.0.0.1:4000`

## Frontend Setup

1. Open the project root in VS Code (or your preferred editor)

2. Start Live Server on port 5500:
   - Right-click `index.html`
   - Select "Open with Live Server"
   - Or configure Live Server to use port 5500

3. Access the application:
   - User site: `http://127.0.0.1:5500/`
   - Admin panel: `http://127.0.0.1:5500/admin/`

## Features

### User Site
- **Promotions**: All offers unified in `/promotions.html`
- **Events**: Browse and view event details with maps
- **Booking**: Book tickets with confirmation
- **Profile**: View and manage bookings, cancel tickets
- **Dark Mode**: Premium dark theme with violet (#7C5CFF) accents

### Admin Panel
- **Dashboard**: Overview statistics
- **Events**: Create, edit, delete events
- **Bookings**: View and manage all bookings
- **Users**: View user information
- **Scoped Search**: Search within each section

## API Endpoints

### Events
- `GET /api/events` - List all events
- `GET /api/events/:id` - Get event by ID
- `POST /api/events` - Create new event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

### Bookings
- `GET /api/bookings` - List all bookings
- `POST /api/bookings` - Create booking
- `PUT /api/bookings/:id` - Update booking (cancel)
- `DELETE /api/bookings/:id` - Delete booking

### Health
- `GET /health` - Health check endpoint

## Testing

1. **Promotions Flow**:
   - Visit homepage
   - Click any slider CTA → should go to promotions.html

2. **Booking Flow**:
   - Browse events
   - Click "Book Now"
   - Fill booking form
   - Confirm booking
   - View in profile

3. **Cancel Flow**:
   - Go to profile
   - Find confirmed booking
   - Click "Cancel Ticket"
   - Confirm cancellation
   - Verify status updated

4. **Admin Flow**:
   - Access admin panel
   - Create/edit/delete events
   - View bookings and users
   - Use scoped searches

## Dark Mode

Toggle dark mode using the theme button in navigation.
Premium palette includes:
- Background: #0B0B0D
- Primary: #7C5CFF (violet)
- Accent: #FF6EA8 (pink)
- Text: #E7E7EA
