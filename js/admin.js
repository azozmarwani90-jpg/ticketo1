// Admin-specific navigation (shows only Profile and Sign Out)
function updateAdminNavigation() {
  const navLinks = document.querySelector('.nav-links');
  if (!navLinks) return;
  
  navLinks.querySelectorAll('.auth-link').forEach(l => l.remove());
  
  if (Auth.isLoggedIn()) {
    const li = document.createElement('li');
    li.className = 'auth-link';
    const initials = (Auth.currentUser.name || 'A').split(' ').filter(Boolean).map(p => p[0].toUpperCase()).join('').slice(0, 2) || 'A';
    
    // Admin nav: only Profile and Sign Out
    li.innerHTML = `<div class="nav-user-menu">
      <button id="user-menu-btn" class="nav-user-btn"><span class="nav-user-avatar">${initials}</span><span class="nav-user-label">${Auth.currentUser.name}</span></button>
      <div id="user-dropdown" class="nav-user-dropdown">
        <a href="../profile.html" class="nav-user-link">Profile</a>
        <button type="button" id="signout-btn" class="nav-user-link nav-user-signout">Sign Out</button>
      </div></div>`;
    
    navLinks.insertBefore(li, navLinks.lastElementChild);
    
    setTimeout(() => {
      const wrap = document.querySelector('.nav-user-menu');
      const btn = document.getElementById('user-menu-btn');
      const dd = document.getElementById('user-dropdown');
      const so = document.getElementById('signout-btn');
      
      if (wrap && btn && dd) {
        const outside = (e) => { if (!wrap.contains(e.target)) { wrap.classList.remove('open'); document.removeEventListener('click', outside); } };
        btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); const open = wrap.classList.toggle('open'); if (open) document.addEventListener('click', outside); else document.removeEventListener('click', outside); });
      }
      
      if (so) { so.addEventListener('click', (e) => { e.preventDefault(); window.modalInstance.confirm('Sign Out', 'Are you sure you want to sign out?', () => { wrap && wrap.classList.remove('open'); Auth.signout(); }); }); }
    }, 100);
  }
}

// Call on page load
document.addEventListener('DOMContentLoaded', updateAdminNavigation);

﻿// Admin Dashboard JavaScript

// Initialize Admin Dashboard
function initAdminDashboard() {
  loadStatistics();
  loadBookingsTable();
  loadEventsGrid();
  loadUsersTable();
  loadAnalytics();
  initTabSwitching();
  initFilterButtons();
  initSettingsActions();
}

// Load Statistics
function loadStatistics() {
  const stats = DB.getStats();
  document.getElementById('total-bookings').textContent = stats.totalBookings;
  document.getElementById('total-revenue').textContent = stats.totalRevenue.toLocaleString() + ' SAR';
  document.getElementById('total-users').textContent = stats.totalUsers;
  
  const eventsCountEl = document.getElementById('total-events');
  if (eventsCountEl) {
    eventsCountEl.textContent = DB.getAllEvents().length;
  }
  
  // Calculate storage used
  const dbSize = new Blob([localStorage.getItem('ticketo_db')]).size;
  document.getElementById('storage-used').textContent = (dbSize / 1024).toFixed(2) + ' KB';
}

// Tab Switching
function initTabSwitching() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      
      // Remove active class from all
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      // Add active class to clicked
      btn.classList.add('active');
      document.getElementById(tabName + '-tab').classList.add('active');
    });
  });
}

// Load Bookings Table
function loadBookingsTable(status = 'all') {
  const bookings = DB.getAllBookings();
  const tbody = document.getElementById('bookings-table-body');
  
  const filteredBookings = status === 'all' 
    ? bookings 
    : bookings.filter(b => b.status === status);
  
  if (filteredBookings.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">
          <div class="empty-icon">--</div>
          <h3>No bookings found</h3>
          <p>There are no bookings matching your criteria.</p>
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = '';
  
  filteredBookings.forEach(booking => {
    const row = document.createElement('tr');
    const statusClass = `status-${booking.status}`;
    
    row.innerHTML = `
      <td><strong>${booking.id}</strong></td>
      <td>
        <div>${booking.userName}</div>
        <small style="color: var(--text-light);">${booking.userEmail}</small>
      </td>
      <td>${booking.eventTitle}</td>
      <td>${formatDate(booking.date)}</td>
      <td>${booking.quantity} x ${booking.ticketType}</td>
      <td><strong>${booking.totalPrice} SAR</strong></td>
      <td><span class="status-badge ${statusClass}">${booking.status}</span></td>
      <td>
        <div class="action-btns">
          <button class="action-btn view" onclick="viewBooking('${booking.id}')">View</button>
          <button class="action-btn delete" onclick="deleteBooking('${booking.id}')">Delete</button>
        </div>
      </td>
    `;
    
    tbody.appendChild(row);
  });
}

// Filter Buttons
function initFilterButtons() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const status = btn.dataset.status;
      loadBookingsTable(status);
    });
  });
}

// View Booking
function viewBooking(bookingId) {
  const booking = DB.getBookingById(bookingId);
  if (booking) {
    const details = `
      <div style="text-align: left;">
        <p><strong>Booking ID:</strong> ${booking.id}</p>
        <p><strong>Customer:</strong> ${booking.userName}</p>
        <p><strong>Email:</strong> ${booking.userEmail}</p>
        <p><strong>Event:</strong> ${booking.eventTitle}</p>
        <p><strong>Date:</strong> ${formatDate(booking.date)} at ${booking.time}</p>
        <p><strong>Venue:</strong> ${booking.venue}</p>
        <p><strong>Tickets:</strong> ${booking.quantity} x ${booking.ticketType}</p>
        <p><strong>Total:</strong> ${booking.totalPrice} SAR</p>
        <p><strong>Status:</strong> ${booking.status}</p>
      </div>
    `;
    window.modalInstance.alert('Booking Details', details);
  }
}

// Delete Booking
function deleteBooking(bookingId) {
  window.modalInstance.confirm(
    'Delete Booking',
    'Are you sure you want to delete this booking? This action cannot be undone.',
    () => {
      if (DB.deleteBooking(bookingId)) {
        window.modalInstance.success('Booking Deleted', 'The booking has been deleted successfully!', () => {
          loadStatistics();
          loadBookingsTable();
          loadAnalytics();
        });
      }
    }
  );
}

// Load Events Grid
function loadEventsGrid() {
  const events = DB.getAllEvents();
  const grid = document.getElementById('admin-events-grid');

  if (!grid) {
    return;
  }

  grid.innerHTML = '';

  if (!events || events.length === 0) {
    grid.innerHTML = '<div class="admin-empty">No events available. Use "Add Event" to create one.</div>';
    return;
  }

  events.forEach((event) => {
    const card = document.createElement('div');
    card.className = 'admin-event-card';

    card.innerHTML = `
      <img src="${event.image}" alt="${event.title}">
      <div class="admin-event-info">
        <h3>${event.title}</h3>
        <div class="admin-event-meta">
          <span><strong>Category:</strong> ${event.category}</span>
          <span><strong>City:</strong> ${event.city}</span>
          <span><strong>Date:</strong> ${formatDate(event.date)}</span>
          <span><strong>Price:</strong> ${event.price} SAR</span>
        </div>
        <div class="admin-event-actions">
          <button class="action-btn view" onclick="viewEvent('${event.id}')">View</button>
          <button class="action-btn edit" onclick="editEvent('${event.id}')">Edit</button>
          <button class="action-btn delete" onclick="deleteEvent('${event.id}')">Delete</button>
        </div>
      </div>
    `;

    grid.appendChild(card);
  });

  const addEventBtn = document.getElementById('add-event-btn');
  if (addEventBtn) {
    addEventBtn.onclick = addNewEvent;
  }
}

// Delete Event
function deleteEvent(eventId) {
  window.modalInstance.confirm(
    'Delete Event',
    'Are you sure you want to delete this event? This action cannot be undone.',
    () => {
      if (DB.deleteEvent(eventId)) {
        window.modalInstance.success('Event Deleted', 'The event has been deleted successfully!', () => {
          loadEventsGrid();
          loadStatistics();
        });
      } else {
        window.modalInstance.error('Delete Failed', 'Unable to locate the selected event.');
      }
    }
  );
}

// Add New Event
function addNewEvent() {
  window.modalInstance.showForm({
    title: 'Add New Event',
    fields: [
      { name: 'title', label: 'Event Title', type: 'text', required: true, icon: 'T', placeholder: 'Enter event title' },
      { name: 'category', label: 'Category', type: 'select', options: ['Movies', 'Sports', 'Concerts', 'Theatre', 'Festivals'], required: true, icon: 'C' },
      { name: 'city', label: 'City', type: 'select', options: ['Riyadh', 'Jeddah', 'Dammam'], required: true, icon: 'City' },
      { name: 'venue', label: 'Venue', type: 'text', required: true, icon: 'V', placeholder: 'Enter venue name' },
      { name: 'date', label: 'Date', type: 'date', required: true, icon: 'D' },
      { name: 'time', label: 'Time', type: 'time', required: true, icon: 'T' },
      { name: 'price', label: 'Price (SAR)', type: 'number', required: true, icon: 'P', placeholder: '0' },
      { name: 'image', label: 'Image URL', type: 'url', value: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&h=600&fit=crop', icon: 'Img' },
      { name: 'description', label: 'Description', type: 'textarea', icon: 'Info', placeholder: 'Enter event description' }
    ],
    submitText: 'Add Event',
    onSubmit: (data) => {
      const newEvent = {
        title: data.title,
        category: data.category,
        city: data.city,
        venue: data.venue,
        date: data.date,
        time: data.time,
        price: parseFloat(data.price),
        image: data.image,
        description: data.description
      };

      const createdEvent = DB.addEvent(newEvent);

      if (createdEvent) {
        window.modalInstance.success('Event Added', 'The new event has been added successfully!', () => {
          loadEventsGrid();
          loadStatistics();
        });
      } else {
        window.modalInstance.error('Add Failed', 'Unable to save the new event.');
      }
    }
  });
}

// Load Users Table
function loadUsersTable() {
  const users = DB.getAllUsers();
  const bookings = DB.getAllBookings();
  const tbody = document.getElementById('users-table-body');
  
  // Create users from bookings if not exists
  const uniqueEmails = new Set();
  bookings.forEach(booking => {
    if (!uniqueEmails.has(booking.userEmail)) {
      uniqueEmails.add(booking.userEmail);
      if (!DB.getUserByEmail(booking.userEmail)) {
        DB.addUser({
          name: booking.userName,
          email: booking.userEmail
        });
      }
    }
  });
  
  const allUsers = DB.getAllUsers();
  
  if (allUsers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          <div class="empty-icon">--</div>
          <h3>No users yet</h3>
          <p>Users will appear here once they make bookings.</p>
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = '';
  
  allUsers.forEach(user => {
    const userBookings = bookings.filter(b => b.userEmail === user.email);
    const row = document.createElement('tr');
    
    row.innerHTML = `
      <td><strong>${user.id}</strong></td>
      <td>${user.name}</td>
      <td>${user.email}</td>
      <td>${user.phone || 'N/A'}</td>
      <td>${new Date(user.createdAt).toLocaleDateString()}</td>
      <td><strong>${userBookings.length}</strong></td>
    `;
    
    tbody.appendChild(row);
  });
}

// Load Analytics
function loadAnalytics() {
  loadRevenueByCategory();
  loadBookingsOverTime();
  loadPopularEvents();
  loadRecentActivity();
}

// Revenue by Category
function loadRevenueByCategory() {
  const revenueData = DB.getRevenueByCategory();
  const container = document.getElementById('revenue-by-category');
  
  container.innerHTML = '';
  
  if (Object.keys(revenueData).length === 0) {
    container.innerHTML = '<p style="color: var(--text-light);">No revenue data available</p>';
    return;
  }
  
  Object.entries(revenueData).forEach(([category, revenue]) => {
    const item = document.createElement('div');
    item.className = 'analytics-item';
    item.innerHTML = `
      <span class="analytics-label">${category}</span>
      <span class="analytics-value">${revenue.toLocaleString()} SAR</span>
    `;
    container.appendChild(item);
  });
}

// Bookings Over Time
function loadBookingsOverTime() {
  const bookingsData = DB.getBookingsByMonth();
  const container = document.getElementById('bookings-over-time');
  
  container.innerHTML = '';
  
  if (Object.keys(bookingsData).length === 0) {
    container.innerHTML = '<p style="color: var(--text-light);">No booking data available</p>';
    return;
  }
  
  Object.entries(bookingsData).forEach(([month, count]) => {
    const item = document.createElement('div');
    item.className = 'analytics-item';
    const date = new Date(month + '-01');
    const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    item.innerHTML = `
      <span class="analytics-label">${monthName}</span>
      <span class="analytics-value">${count}</span>
    `;
    container.appendChild(item);
  });
}

// Popular Events
function loadPopularEvents() {
  const bookings = DB.getAllBookings();
  const container = document.getElementById('popular-events');
  
  if (bookings.length === 0) {
    container.innerHTML = '<p style="color: var(--text-light);">No booking data available</p>';
    return;
  }
  
  // Count bookings per event
  const eventCounts = {};
  bookings.forEach(booking => {
    eventCounts[booking.eventTitle] = (eventCounts[booking.eventTitle] || 0) + 1;
  });
  
  // Sort by count
  const sorted = Object.entries(eventCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  
  container.innerHTML = '';
  
  sorted.forEach(([event, count]) => {
    const item = document.createElement('div');
    item.className = 'analytics-item';
    item.innerHTML = `
      <span class="analytics-label">${event}</span>
      <span class="analytics-value">${count}</span>
    `;
    container.appendChild(item);
  });
}

// Recent Activity
function loadRecentActivity() {
  const bookings = DB.getAllBookings().slice(0, 5);
  const container = document.getElementById('recent-activity');
  
  if (bookings.length === 0) {
    container.innerHTML = '<p style="color: var(--text-light);">No recent activity</p>';
    return;
  }
  
  container.innerHTML = '';
  
  bookings.forEach(booking => {
    const item = document.createElement('div');
    item.className = 'analytics-item';
    const timeAgo = getTimeAgo(new Date(booking.bookedAt));
    item.innerHTML = `
      <span class="analytics-label">${booking.userName} booked ${booking.eventTitle}</span>
      <span class="analytics-value" style="font-size: 0.85rem;">${timeAgo}</span>
    `;
    container.appendChild(item);
  });
}

// Time Ago Helper
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + ' years ago';
  
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + ' months ago';
  
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + ' days ago';
  
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + ' hours ago';
  
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + ' minutes ago';
  
  return 'Just now';
}

// Settings Actions
function initSettingsActions() {
  // Export Database
  document.getElementById('export-db-btn').addEventListener('click', () => {
    DB.exportDatabase();
    window.modalInstance.success('Export Successful', 'Database has been exported successfully!');
  });
  
  // Import Database
  document.getElementById('import-db-btn').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });
  
  document.getElementById('import-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (DB.importDatabase(event.target.result)) {
          window.modalInstance.success('Import Successful', 'Database has been imported successfully!', () => {
            location.reload();
          });
        } else {
          window.modalInstance.error('Import Failed', 'Failed to import database. Invalid format.');
        }
      };
      reader.readAsText(file);
    }
  });
  
  // Clear Database
  document.getElementById('clear-db-btn').addEventListener('click', () => {
    window.modalInstance.confirm(
      'Clear All Data',
      'Are you sure you want to clear all data? This will delete ALL bookings, users, and events. This action cannot be undone!',
      () => {
        window.modalInstance.confirm(
          'Final Confirmation',
          'This is your last chance! Are you absolutely sure you want to delete everything?',
          () => {
            DB.clearDatabase();
            window.modalInstance.success('Database Cleared', 'All data has been cleared successfully!', () => {
              location.reload();
            });
          }
        );
      }
    );
  });
}

// Format Date Helper
function formatDate(dateString) {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
}

// Initialize when page loads
if (window.location.pathname.endsWith('admin/index.html')) {
  document.addEventListener('DOMContentLoaded', initAdminDashboard);
}



