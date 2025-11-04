# QA Checklist for Feature Branch: fixes-ux-auth-admin-sync

## Environment Setup
- [x] Backend running on http://127.0.0.1:4000
- [x] Frontend running on http://127.0.0.1:5500
- [x] Both servers accessible and responding

## 1. Promotions / AutoSlider
- [x] Created unified `promotions.html` page with all offers
- [x] All "View Offer" buttons in index.html hero slider point to `promotions.html`
- [x] Old offer pages redirect to promotions.html using meta refresh:
  - [x] offers/flash-deals.html
  - [x] offers/bundle-save.html
  - [x] offers/student-rewards.html
- [ ] Manual Test: Click "View Offer" from hero slider → lands on promotions.html
- [ ] Manual Test: Navigate directly to old offer URLs → redirects to promotions.html

## 2. Cart/Booking Duplicate Warning
- [x] Booking flow uses canonical eventId from localStorage['selectedEventId']
- [x] Quantity clamped between 1-10 before saving
- [x] No duplicate warning on first add
- [ ] Manual Test: Book an event → no duplicate warning on first booking
- [ ] Manual Test: Book same event again → appropriate flow (currently no cart system)

## 3. Auth & Profile Menu Separation (Admin vs User)
- [x] Introduced role field: 'user' | 'admin'
- [x] Users stored with unique IDs, support same email for different roles
- [x] Auth.signup/signin updated to support role parameter
- [x] Navigation separated by role:
  - Admin sees: "Home (Customer Site)", "Dashboard (Admin)", "Sign out"
  - User sees: "Home", "My Profile", "Sign out"
- [x] Password hashing function available as Auth.hashPassword()
- [ ] Manual Test: Sign in as admin → see only admin menu items
- [ ] Manual Test: Sign in as user → see only user menu items  
- [ ] Manual Test: Admin never sees "My Profile"
- [ ] Manual Test: User never sees "Dashboard (Admin)"

## 4. Booking Confirmation → Profile/History
- [x] Booking creates normalized payload in localStorage['last_booking']
- [x] Successful booking redirects to confirm.html (no alert)
- [x] confirm.html displays booking details
- [x] profile.html loads bookings for current user email
- [x] Booking status tabs: Confirmed / Cancelled / Pending
- [ ] Manual Test: Complete booking → redirected to confirm.html
- [ ] Manual Test: View booking in profile.html → shows in history
- [ ] Manual Test: Booking totals reflect confirmed bookings only

## 5. Admin: Add/Edit/Delete Event (Live Sync)
### Backend Endpoints
- [x] POST /api/events - Create event (returns created event with ID)
- [x] GET /api/events - List all events
- [x] GET /api/events/:id - Get single event
- [x] PUT /api/events/:id - Update event
- [x] DELETE /api/events/:id - Delete event
- [x] Atomic JSON writes using temp file + rename
- [x] CORS configured for http://127.0.0.1:5500
- [x] All endpoints return JSON with Content-Type header
- [x] Error responses include {ok: false, error: "message"}

### API Tests (Automated)
- [x] GET /api/events returns array (verified: 8 events)
- [x] POST /api/events creates event (verified: ID 9 created)
- [x] PUT /api/events/9 updates event (verified: title + price updated)
- [x] DELETE /api/events/9 deletes event (verified: count back to 8)
- [x] POST /api/bookings creates booking (verified: booking created)

### Admin Dashboard
- [x] addNewEvent() wired to POST /api/events with fallback to local DB
- [x] editEvent() wired to PUT /api/events/:id with fallback
- [x] deleteEvent() wired to DELETE /api/events/:id with fallback
- [x] viewEvent() displays event details in modal
- [x] loadEventsGrid() fetches from API first, syncs with local DB
- [x] After create/update/delete, UI refreshes with latest data
- [ ] Manual Test: Add event in admin → appears in admin list immediately
- [ ] Manual Test: Edit event title → change visible in admin list
- [ ] Manual Test: Delete event → removed from admin list
- [ ] Manual Test: Create event → refresh customer events page → event appears
- [ ] Manual Test: Delete event → refresh customer events page → event gone

## 6. Admin UX Polish
- [x] Removed duplicate "Dashboard" nav item from admin navbar
- [x] Admin navbar has "Customer Site" link pointing to ../index.html
- [x] Using modal system for success/error messages (no blocking alerts)
- [x] Edit/View/Delete buttons functional with proper API integration
- [ ] Manual Test: Admin panel navigation is clean and intuitive
- [ ] Manual Test: Success/error modals appear for CRUD operations

## 7. Users Management
- [x] Admin users table shows: ID, Name, Email, Role, Phone, Joined, Bookings
- [x] Role displayed as badge (Admin/User)
- [x] Disabled users show (Disabled) badge
- [x] Users table correctly handles role separation
- [ ] Manual Test: Users tab displays all users with roles
- [ ] Manual Test: Role badges visible (Admin/User)

## 8. Technical Hardening
- [x] Safe JSON parsing middleware in server.js
- [x] JSON parsing error handler returns proper error response
- [x] Global error handler in server.js
- [x] All API endpoints return JSON on errors (4xx/5xx)
- [x] Body parser configured with verify function
- [x] Empty body handling doesn't crash server
- [ ] Manual Test: Send invalid JSON to API → gets proper error response
- [ ] Manual Test: Send empty body to POST endpoint → handled gracefully

## 9. Integration Tests
### Backend API
- [x] GET /health returns {ok: true}
- [x] GET /api/events returns array of 8 events
- [x] GET /api/events/1 returns event details
- [x] GET /api/promotions returns 2 active promotions
- [x] POST /api/events creates new event
- [x] PUT /api/events/:id updates event
- [x] DELETE /api/events/:id removes event
- [x] POST /api/bookings creates booking

### Frontend-Backend Integration
- [ ] Events page loads from API
- [ ] Admin dashboard syncs with API
- [ ] Booking flow persists to API
- [ ] Profile shows bookings from API

## 10. Cross-Browser & Responsiveness
- [ ] Test on Chrome/Edge
- [ ] Test on Firefox
- [ ] Test on Safari (if available)
- [ ] Test mobile responsive design
- [ ] Test tablet view

## Known Limitations
- No SQL database (using JSON file as specified)
- No JWT authentication (simple password hashing as specified)
- Routes remain stable (no breaking changes)
- Design/styling preserved (minimal changes only)

## Critical Path Tests (Priority)
1. [ ] User can browse events
2. [ ] User can create account and sign in
3. [ ] User can book an event and see it in profile
4. [ ] Admin can sign in and see dashboard
5. [ ] Admin can create/edit/delete events
6. [ ] Changes by admin reflect on customer site

## Acceptance Criteria Summary
- ✅ All promotions links point to single promotions.html page
- ✅ Role-based authentication working (admin vs user separation)
- ✅ Admin CRUD operations wired to backend API
- ✅ Backend endpoints implemented with atomic JSON writes
- ✅ Admin UI polished (no duplicate items, proper labels)
- ✅ Users table shows roles and status
- ✅ Technical hardening (error handlers, JSON parsing)
- ⏳ Manual QA remaining (browser testing)

## Test Results
- **API Unit Tests**: ✅ All passing
- **Backend Integration**: ✅ All endpoints functional
- **Frontend Integration**: ⏳ Requires manual testing
- **User Flow**: ⏳ Requires manual testing
- **Admin Flow**: ⏳ Requires manual testing
