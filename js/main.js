/* main.js (fixed) */
// --- API base ---------------------------------------------------------------
const API_HOST = window.location.hostname || '127.0.0.1';
const API_BASE = `http://${API_HOST}:4000`;
console.log('[Ticketo] API_BASE =', API_BASE);

// Helper to safely parse JSON responses (handles empty/non-JSON bodies)
async function safeJson(res) {
  const ct = (res && res.headers && res.headers.get && res.headers.get('content-type')) || '';
  if (ct && ct.includes('application/json')) return res.json();
  const txt = await res.text().catch(() => '');
  if (!txt) return null;
  try { return JSON.parse(txt); } catch { return { raw: txt }; }
}

// --- Caches -----------------------------------------------------------------
let cachedEvents = null;
let cachedBookings = null;

// --- Normalizers ------------------------------------------------------------
function normalizeEvent(event) {
  if (!event) return null;
  const price = Number(event.price);
  const normalizedPrice = Number.isFinite(price) ? price : 0;
  const lat = event.lat != null ? Number(event.lat) : null;
  const lng = event.lng != null ? Number(event.lng) : null;
  return {
    id: event.id,
    title: event.title,
    category: event.category || (event.cat ? event.cat.charAt(0).toUpperCase() + event.cat.slice(1) : 'General'),
    venue: event.venue,
    city: event.city || event.map || '',
    date: event.date || new Date().toISOString().slice(0, 10),
    time: event.time || '00:00',
    price: normalizedPrice,
    description: event.description || event.desc || '',
    image: event.image || event.img || 'images/placeholder.jpg',
    promotion: event.promotion || false,
    lat: lat,
    lng: lng
  };
}

function normalizeBooking(record) {
  if (!record) return null;
  const quantityValue = Number(record.quantity ?? record.tickets ?? 1);
  const totalValue = Number(record.totalPrice ?? record.total ?? 0);
  return {
    id: record.id,
    eventId: record.eventId,
    eventTitle: record.eventTitle || record.title || 'Event',
    eventImage: record.eventImage || record.image || 'images/placeholder.jpg',
    venue: record.venue || '',
    date: record.date || record.bookedAt || '',
    time: record.time || '',
    ticketType: record.ticketType || 'General',
    quantity: Number.isFinite(quantityValue) && quantityValue > 0 ? quantityValue : 1,
    totalPrice: Number.isFinite(totalValue) ? totalValue : 0,
    userName: record.userName || record.name || '',
    userEmail: record.userEmail || record.email || '',
    status: record.status || 'confirmed',
    bookedAt: record.bookedAt || record.date || new Date().toISOString()
  };
}

// --- API calls --------------------------------------------------------------
async function fetchEventsFromApi() {
  try {
    const response = await fetch(`${API_BASE}/api/events`);
    if (!response.ok) throw new Error('Failed to load events');
    const payload = await safeJson(response);
    const eventsRaw = Array.isArray(payload) ? payload : (payload && payload.data) || [];
    const events = eventsRaw.map(normalizeEvent).filter(Boolean);
    let merged = events;
    if (typeof DB !== 'undefined' && typeof DB.setEvents === 'function'){
      const stored = DB.setEvents(events);
      if (Array.isArray(stored) && stored.length) merged = stored;
    }
    cachedEvents = merged;
    return merged;
  } catch (error) {
    console.error('Unable to fetch events from API:', error);
    return cachedEvents || (typeof DB !== 'undefined' ? DB.getAllEvents() : []);
  }
}

async function fetchEventFromApi(eventId) {
  if (!eventId) return null;
  try {
    const response = await fetch(`${API_BASE}/api/events/${encodeURIComponent(eventId)}`);
    if (!response.ok) throw new Error('Event not found');
    const payload = await safeJson(response);
    const event = normalizeEvent(payload?.data || payload);
    if (event) {
      cachedEvents = cachedEvents ? [...cachedEvents.filter((e) => String(e.id) !== String(event.id)), event] : [event];
      if (typeof DB !== 'undefined' && typeof DB.upsertEvent === 'function') DB.upsertEvent(event);
    }
    return event;
  } catch (error) {
    console.error('Unable to load event from API:', error);
    if (cachedEvents) return cachedEvents.find((e) => String(e.id) === String(eventId));
    return typeof DB !== 'undefined' ? DB.getEventById(eventId) : null;
  }
}

async function fetchBookingsFromApi() {
  try {
    const response = await fetch(`${API_BASE}/api/bookings`);
    if (!response.ok) throw new Error('Failed to load bookings');
    const payload = await safeJson(response);
    const bookingsRaw = Array.isArray(payload) ? payload : (payload && payload.data) || [];
    const bookings = bookingsRaw.map(normalizeBooking).filter(Boolean);
    cachedBookings = bookings;
    if (typeof DB !== 'undefined' && typeof DB.setBookings === 'function') DB.setBookings(bookings);
    return bookings;
  } catch (error) {
    console.error('Unable to fetch bookings from API:', error);
    const fallback = cachedBookings || (typeof DB !== 'undefined' ? DB.getAllBookings() : []);
    cachedBookings = fallback;
    return fallback;
  }
}

async function createBookingOnServer({ name, email, eventId, tickets }) {
  let response;
  try {
    response = await fetch(`${API_BASE}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, eventId, tickets })
    });
  } catch {
    throw new Error('Network unreachable');
  }
  const data = await safeJson(response);
  if (!response.ok || !data || !data.ok) throw new Error((data && data.error) || 'Booking failed');
  if (data.booking) {
    const normalized = normalizeBooking(data.booking);
    if (normalized) {
      cachedBookings = cachedBookings ? [normalized, ...cachedBookings.filter((b) => b.id !== normalized.id)] : [normalized];
      if (typeof DB !== 'undefined' && typeof DB.setBookings === 'function') DB.setBookings(cachedBookings);
    }
  }
  return data;
}

// --- Modal (UI) -------------------------------------------------------------
class Modal {
  constructor(){ this.ensureContainer(); }
  ensureContainer(){
    if (document.getElementById('modal-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'modal-overlay';
    overlay.className = 'modal-overlay';
    overlay.addEventListener('click', (e) => { if (e.target === overlay) this.close(); });
    document.body.appendChild(overlay);
  }
  show({title, message, icon='info', confirmText='Confirm', cancelText='Cancel', onConfirm=()=>{}, onCancel=()=>{}, showCancel=true}){
    const overlay = document.getElementById('modal-overlay');
    const iconMap = { info: 'i', warning: '!', success: 'ok', error: 'x' };
    const symbol = iconMap[icon] || iconMap.info;
    overlay.innerHTML = `
      <div class="modal-box">
        <button type="button" class="modal-close" onclick="window.modalInstance.close()">X</button>
        <div class="modal-header">
          <div class="modal-icon ${icon}"><span>${symbol}</span></div>
          <div class="modal-title"><h2>${title}</h2></div>
        </div>
        <div class="modal-body">${message}</div>
        <div class="modal-actions">
          ${showCancel ? `<button type="button" class="modal-btn modal-btn-secondary" onclick="window.modalInstance.handleCancel()">${cancelText}</button>` : ''}
          <button type="button" class="modal-btn ${icon === 'warning' ? 'modal-btn-danger' : 'modal-btn-primary'}" onclick="window.modalInstance.handleConfirm()">${confirmText}</button>
        </div>
      </div>`;
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    this.onConfirmCallback = onConfirm;
    this.onCancelCallback = onCancel;
  }
  showForm({title, fields=[], submitText='Save', cancelText='Cancel', onSubmit=()=>{}, onCancel=()=>{}}){
    const overlay = document.getElementById('modal-overlay');
    const fieldsHTML = fields.map((f)=>{
      const {name,label,type='text',value='',required=false,options=[],placeholder='',icon='>'} = f;
      if (type === 'select'){
        return `<div class="modal-form-group">
          <label for="${name}"><span class="modal-form-icon">${icon}</span>${label}${required?' *':''}</label>
          <select id="${name}" name="${name}" ${required?'required':''}>
            ${options.map((opt)=>`<option value="${opt}" ${opt===value?'selected':''}>${opt}</option>`).join('')}
          </select>
        </div>`;
      }
      if (type === 'textarea'){
        return `<div class="modal-form-group">
          <label for="${name}"><span class="modal-form-icon">${icon}</span>${label}${required?' *':''}</label>
          <textarea id="${name}" name="${name}" ${required?'required':''} placeholder="${placeholder}">${value}</textarea>
        </div>`;
      }
      return `<div class="modal-form-group">
        <label for="${name}"><span class="modal-form-icon">${icon}</span>${label}${required?' *':''}</label>
        <input type="${type}" id="${name}" name="${name}" value="${value}" ${required?'required':''} placeholder="${placeholder}">
      </div>`;
    }).join('');
    overlay.innerHTML = `
      <div class="modal-box" style="max-width: 600px;">
        <button type="button" class="modal-close" onclick="window.modalInstance.close()">X</button>
        <div class="modal-header"><div class="modal-icon info"><span>i</span></div><div class="modal-title"><h2>${title}</h2></div></div>
        <form class="modal-form" id="modal-form">
          ${fieldsHTML}
          <div class="modal-actions">
            <button type="button" class="modal-btn modal-btn-secondary" onclick="window.modalInstance.handleCancel()">${cancelText}</button>
            <button type="submit" class="modal-btn modal-btn-primary">${submitText}</button>
          </div>
        </form>
      </div>`;
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    this.onSubmitCallback = onSubmit;
    this.onCancelCallback = onCancel;
    document.getElementById('modal-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = {};
      fields.forEach((field) => { formData[field.name] = document.getElementById(field.name).value; });
      this.handleSubmit(formData);
    });
  }
  handleConfirm(){ if (this.onConfirmCallback) this.onConfirmCallback(); this.close(); }
  handleCancel(){ if (this.onCancelCallback) this.onCancelCallback(); this.close(); }
  handleSubmit(data){ if (this.onSubmitCallback) this.onSubmitCallback(data); this.close(); }
  close(){ const overlay = document.getElementById('modal-overlay'); overlay.classList.remove('active'); document.body.style.overflow=''; setTimeout(()=>{ overlay.innerHTML=''; },250); }
  confirm(t,m,onC,onX){ this.show({title:t,message:m,icon:'warning',confirmText:'Confirm',cancelText:'Cancel',onConfirm:onC,onCancel:onX,showCancel:true}); }
  alert(t,m,onC){ this.show({title:t,message:m,icon:'info',confirmText:'OK',onConfirm:onC,showCancel:false}); }
  success(t,m,onC){ this.show({title:t,message:m,icon:'success',confirmText:'OK',onConfirm:onC,showCancel:false}); }
  error(t,m,onC){ this.show({title:t,message:m,icon:'error',confirmText:'OK',onConfirm:onC,showCancel:false}); }
}
window.modalInstance = new Modal();

// --- Client DB --------------------------------------------------------------
class TicketoDatabase {
  constructor(){ this.initializeDatabase(); }
  initializeDatabase(){
    if (!localStorage.getItem('ticketo_db')){
      const initialDB = { users:[], bookings:[], events:[], settings:{theme:'light',currency:'SAR'}, stats:{ totalBookings:0,totalRevenue:0,totalUsers:0 } };
      localStorage.setItem('ticketo_db', JSON.stringify(initialDB));
    }
  }
  getDatabase(){ return JSON.parse(localStorage.getItem('ticketo_db')); }
  saveDatabase(db){ localStorage.setItem('ticketo_db', JSON.stringify(db)); }
  addUser(userData){
    const db = this.getDatabase(); const now = new Date().toISOString();
    // Find existing user by email AND role (to support same email with different roles)
    const i = db.users.findIndex(u=>u.email===userData.email && u.role===(userData.role||'user'));
    const base = {
      id: userData.id || (i!==-1? db.users[i].id : 'USER'+Date.now()+'-'+Math.random().toString(36).substr(2,5)),
      name: userData.name || userData.email.split('@')[0] || 'Guest',
      email: userData.email,
      phone: userData.phone || (i!==-1? db.users[i].phone : ''),
      createdAt: userData.createdAt || (i!==-1? db.users[i].createdAt : now),
      role: userData.role || (i!==-1? db.users[i].role : 'user'),
      password: userData.password || (i!==-1? db.users[i].password || '' : ''),
      disabled: userData.disabled || false
    };
    if (i!==-1){ db.users[i] = {...db.users[i], ...base}; this.saveDatabase(db); return db.users[i]; }
    db.users.push(base); db.stats.totalUsers = db.users.length; this.saveDatabase(db); return base;
  }
  getUserByEmail(email){ return this.getDatabase().users.find(u=>u.email===email); }
  getUserByEmailAndRole(email, role){ return this.getDatabase().users.find(u=>u.email===email && u.role===role); }
  getAllUsers(){ return this.getDatabase().users; }
  setBookings(bookings){
    if (!Array.isArray(bookings)) return;
    const db = this.getDatabase();
    db.bookings = bookings.map(b=>({...b}));
    db.stats.totalBookings = db.bookings.length;
    db.stats.totalRevenue = db.bookings.reduce((s,i)=>s+Number(i.totalPrice||0),0);
    this.saveDatabase(db);
  }
  addBooking(data){
    const db = this.getDatabase();
    const booking = {
      id: data.id || 'TKT'+Date.now(),
      userId: data.userId || null,
      eventId: data.eventId,
      eventTitle: data.eventTitle || data.title,
      eventImage: data.eventImage || data.image || '',
      venue: data.venue,
      date: data.date,
      time: data.time,
      ticketType: data.ticketType || 'General',
      quantity: Number(data.quantity ?? data.tickets ?? 1),
      totalPrice: Number(data.totalPrice ?? data.total ?? 0),
      userName: data.name,
      userEmail: data.email,
      status: data.status || 'confirmed',
      bookedAt: data.bookedAt || new Date().toISOString()
    };
    booking.totalPrice = Number(booking.totalPrice); if (!Number.isFinite(booking.totalPrice)) booking.totalPrice = 0;
    db.bookings.push(booking); db.stats.totalBookings = db.bookings.length; db.stats.totalRevenue += booking.totalPrice; this.saveDatabase(db); return booking;
  }
  getBookingById(id){ return this.getDatabase().bookings.find(b=>b.id===id); }
  getBookingsByEmail(email){ return this.getDatabase().bookings.filter(b=>b.userEmail===email); }
  getAllBookings(){ return this.getDatabase().bookings.sort((a,b)=> new Date(b.bookedAt)-new Date(a.bookedAt)); }
  updateBookingStatus(id, status='cancelled'){
    const db = this.getDatabase();
    const lookup = String(id);
    const b = db.bookings.find(x=>String(x.id)===lookup);
    if (!b) return false;
    b.status = status;
    db.stats.totalBookings = db.bookings.length;
    db.stats.totalRevenue = db.bookings.reduce((sum,item)=>sum+Number(item.totalPrice||0),0);
    this.saveDatabase(db);
    return true;
  }
  deleteBooking(id){
    const db = this.getDatabase(); const i = db.bookings.findIndex(b=>b.id===id);
    if (i!==-1){ const b=db.bookings[i]; db.stats.totalRevenue -= b.totalPrice; db.bookings.splice(i,1); db.stats.totalBookings = db.bookings.length; this.saveDatabase(db); return true; }
    return false;
  }
  seedEvents(initial){
    const db = this.getDatabase();
    if (!db.events || db.events.length===0){
      db.events = initial.map((e,i)=>({
        ...e,
        id: e.id!=null ? String(e.id) : String(i+1),
        createdAt: e.createdAt || new Date().toISOString()
      }));
      this.saveDatabase(db);
    }
  }
  setEvents(events){
    if (!Array.isArray(events)) return this.getAllEvents();
    const db=this.getDatabase();
    const makeKey=(ev)=> ev && ev.id!=null ? String(ev.id) : `__${(ev?.title||'unknown').toLowerCase()}_${ev?.date||''}`;
    const merged = {};
    db.events.forEach(ev=>{ if(!ev) return; merged[makeKey(ev)] = {...ev, id: ev.id!=null ? String(ev.id) : ev.id}; });
    events.forEach(ev=>{
      if (!ev) return;
      const key = makeKey(ev);
      const base = merged[key] || {};
      merged[key] = {...base, ...ev, id: ev.id!=null ? String(ev.id) : base.id || `local-${Date.now()}`};
    });
    db.events = Object.values(merged);
    this.saveDatabase(db);
    return db.events.slice();
  }
  upsertEvent(e){
    if (!e||e.id==null) return;
    const db=this.getDatabase();
    const lookup=String(e.id);
    const i=db.events.findIndex(x=>String(x.id)===lookup);
    if (i===-1) db.events.push({...e, id:lookup});
    else db.events[i] = {...db.events[i], ...e, id:lookup};
    this.saveDatabase(db);
  }
  addEvent(e){
    const db=this.getDatabase();
    const timestamp = Date.now();
    const generatedId = `local-${timestamp}-${Math.floor(Math.random()*10000)}`;
    const id = e.id!=null ? String(e.id) : generatedId;
    const ev={ ...e, id, createdAt:new Date().toISOString() };
    db.events.push(ev);
    this.saveDatabase(db);
    return ev;
  }
  updateEvent(id,e){
    const db=this.getDatabase();
    const lookup=String(id);
    const i=db.events.findIndex(x=>String(x.id)===lookup);
    if (i!==-1){ db.events[i] = {...db.events[i], ...e, id:lookup}; this.saveDatabase(db); return true; }
    return false;
  }
  deleteEvent(id){
    const db=this.getDatabase();
    const lookup=String(id);
    const i=db.events.findIndex(x=>String(x.id)===lookup);
    if (i!==-1){ db.events.splice(i,1); this.saveDatabase(db); return true; }
    return false;
  }
  getAllEvents(){ return this.getDatabase().events; }
  getEventById(id){ const db=this.getDatabase(); const lookup=String(id); return db.events.find(e=>String(e.id)===lookup); }
  getStats(){ return this.getDatabase().stats; }
  getRevenueByCategory(){
    const db=this.getDatabase(); const rev = {};
    db.bookings.forEach(b=>{
      const e=db.events.find(x=>String(x.id)===String(b.eventId));
      if (e){ rev[e.category]=(rev[e.category]||0)+Number(b.totalPrice||0); }
    });
    return rev;
  }
  getBookingsByMonth(){
    const db=this.getDatabase(); const by={};
    db.bookings.forEach(b=>{ const d=new Date(b.bookedAt); const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; by[k]=(by[k]||0)+1; });
    return by;
  }
  updateSettings(s){ const db=this.getDatabase(); db.settings={...db.settings,...s}; this.saveDatabase(db); }
  getSettings(){ return this.getDatabase().settings; }
  exportDatabase(){
    const db=this.getDatabase(); const str=JSON.stringify(db,null,2); const blob=new Blob([str],{type:'application/json'});
    const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`ticketo_backup_${Date.now()}.json`; a.click();
  }
  importDatabase(json){ try{ const db=JSON.parse(json); this.saveDatabase(db); return true; }catch(e){ console.error('Invalid database format', e); return false; } }
  clearDatabase(){ localStorage.removeItem('ticketo_db'); this.initializeDatabase(); }
}
const DB = new TicketoDatabase();

// --- Auth -------------------------------------------------------------------
class AuthSystem {
  constructor(){ this.currentUser = this.getCurrentUser(); }
  signup(name,email,password,role='user'){
    const em = email.trim().toLowerCase();
    // Allow same email for different roles (admin vs user)
    const existingWithRole = DB.getAllUsers().find(u => u.email === em && u.role === role);
    if (existingWithRole) return {success:false,message:'Email already registered for this role'};
    const user = DB.addUser({ name, email:em, password:this.hash(password), role });
    this.setCurrentUser(user); return {success:true,message:'Account created successfully', user};
  }
  signin(email,password,role='user'){
    const em=email.trim().toLowerCase();
    // Find user by email AND role
    const u=DB.getAllUsers().find(u => u.email === em && u.role === role);
    if (!u) return {success:false,message:'Invalid credentials for this role'};
    if (u.password !== this.hash(password)) return {success:false,message:'Incorrect password'};
    this.setCurrentUser(u); return {success:true,message:'Login successful', user:u};
  }
  ensureAdminAccess(email,password,name=''){
    if (!email) return {success:false,message:'Please provide an email address.'};
    const em=email.trim().toLowerCase(); const derived=name||em.split('@')[0].replace(/[._-]/g,' ')||'Admin User';
    const hashed=this.hash(password||'admin');
    const existing=DB.getAllUsers().find(u => u.email === em && u.role === 'admin');
    const admin=DB.addUser({ id:existing?.id, name: existing?.name || derived, email:em, role:'admin', password:hashed, createdAt:existing?.createdAt });
    this.setCurrentUser(admin);
    return {success:true, message: existing? 'Admin credentials updated for quick access.' : 'Admin account provisioned successfully.', user:admin};
  }
  signout(){ localStorage.removeItem('currentUser'); this.currentUser=null; window.location.href='index.html'; }
  getCurrentUser(){ const s=localStorage.getItem('currentUser'); return s? JSON.parse(s) : null; }
  setCurrentUser(u){ localStorage.setItem('currentUser', JSON.stringify(u)); this.currentUser=u; }
  isLoggedIn(){ return this.currentUser !== null; }
  isAdmin(){ return this.currentUser && this.currentUser.role === 'admin'; }
  hash(pw){ let h=0; for (let i=0;i<pw.length;i++){ const c=pw.charCodeAt(i); h=((h<<5)-h)+c; h=h&h; } return h.toString(); }
  hashPassword(pw){ return this.hash(pw); }
  updateProfile(up){ if (!this.currentUser) return false; const db=DB.getDatabase(); const i=db.users.findIndex(u=>u.id===this.currentUser.id); if (i!==-1){ db.users[i]={...db.users[i], ...up}; DB.saveDatabase(db); this.setCurrentUser(db.users[i]); return true;} return false; }
}
const Auth = new AuthSystem();

// --- Nav auth state ---------------------------------------------------------
let revealObserver;
function updateNavigation(){
  const navLinks = document.querySelector('.nav-links'); if (!navLinks) return;
  navLinks.querySelectorAll('.auth-link').forEach(l=>l.remove());
  if (Auth.isLoggedIn()){
    const li = document.createElement('li'); li.className='auth-link';
    const initials=(Auth.currentUser.name||'U').split(' ').filter(Boolean).map(p=>p[0].toUpperCase()).join('').slice(0,2)||'U';
    
    // Role-specific menu items
    let menuItems = '';
    if (Auth.isAdmin()) {
      // Admin sees: Home (customer site), Dashboard (admin), Sign out
      menuItems = `
        <a href="../index.html" class="nav-user-link">Home (Customer Site)</a>
        <a href="index.html" class="nav-user-link">Dashboard (Admin)</a>
        <button type="button" id="signout-btn" class="nav-user-link nav-user-signout">Sign Out</button>`;
    } else {
      // User sees: Home, My Profile, Sign out
      menuItems = `
        <a href="index.html" class="nav-user-link">Home</a>
        <a href="profile.html" class="nav-user-link">My Profile</a>
        <button type="button" id="signout-btn" class="nav-user-link nav-user-signout">Sign Out</button>`;
    }
    
    li.innerHTML = `<div class="nav-user-menu">
      <button id="user-menu-btn" class="nav-user-btn"><span class="nav-user-avatar">${initials}</span><span class="nav-user-label">${Auth.currentUser.name}</span></button>
      <div id="user-dropdown" class="nav-user-dropdown">${menuItems}</div></div>`;
    navLinks.insertBefore(li, navLinks.lastElementChild);
    setTimeout(()=>{
      const wrap = document.querySelector('.nav-user-menu');
      const btn = document.getElementById('user-menu-btn');
      const dd  = document.getElementById('user-dropdown');
      const so  = document.getElementById('signout-btn');
      if (wrap && btn && dd){
        const outside = (e)=>{ if (!wrap.contains(e.target)){ wrap.classList.remove('open'); document.removeEventListener('click', outside); } };
        btn.addEventListener('click',(e)=>{ e.preventDefault(); e.stopPropagation(); const open=wrap.classList.toggle('open'); if (open) document.addEventListener('click', outside); else document.removeEventListener('click', outside); });
      }
      if (so){ so.addEventListener('click',(e)=>{ e.preventDefault(); window.modalInstance.confirm('Sign Out','Are you sure you want to sign out?', ()=>{ wrap && wrap.classList.remove('open'); Auth.signout(); }); }); }
    },100);
  } else {
    const inLi=document.createElement('li'); inLi.className='auth-link'; inLi.innerHTML='<a href="signin.html">Sign In</a>';
    const upLi=document.createElement('li'); upLi.className='auth-link'; upLi.innerHTML='<a href="signup.html" class="btn-primary" style="padding:0.6rem 1.5rem;font-size:0.9rem;">Sign Up</a>';
    navLinks.insertBefore(inLi, navLinks.lastElementChild);
    navLinks.insertBefore(upLi, navLinks.lastElementChild);
  }
}
document.addEventListener('DOMContentLoaded', updateNavigation);

// --- UI init (theme/slider/etc.) -------------------------------------------
function initThemeToggle(){
  const t = document.getElementById('theme-toggle'); const cur=localStorage.getItem('theme')||'light';
  document.documentElement.setAttribute('data-theme', cur); updateThemeIcon(cur);
  if (!t) return;
  t.addEventListener('click', ()=>{
    const theme=document.documentElement.getAttribute('data-theme'); const next= theme==='light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next); localStorage.setItem('theme', next); updateThemeIcon(next);
  });
}
function updateThemeIcon(theme){
  const t=document.getElementById('theme-toggle'); if (!t) return;
  const isLight= theme==='light'; const label=isLight?'Light':'Dark';
  t.setAttribute('aria-label', isLight ? 'Switch to dark mode' : 'Switch to light mode');
  t.innerHTML = `<span class="material-symbols-rounded" aria-hidden="true">${isLight?'light_mode':'dark_mode'}</span><span class="theme-toggle-label">${label}</span>`;
}

function initHeroSlider(){
  const slides=document.querySelectorAll('.slide'); if (!slides.length) return;
  let current=0, timer;
  const show=(i)=>{ slides.forEach((s,idx)=>{ s.classList.toggle('active', idx===i); const dots=document.querySelectorAll('.slider-dot'); if (dots[idx]) dots[idx].classList.toggle('active', idx===i); }); };
  const next=()=>{ current=(current+1)%slides.length; show(current); };
  const prev=()=>{ current=(current-1+slides.length)%slides.length; show(current); };
  const start=()=>{ timer=setInterval(next, 5000); }; const stop=()=>{ clearInterval(timer); };
  const prevBtn=document.querySelector('.slider-nav.prev'); const nextBtn=document.querySelector('.slider-nav.next');
  prevBtn && prevBtn.addEventListener('click', ()=>{ stop(); prev(); start(); });
  nextBtn && nextBtn.addEventListener('click', ()=>{ stop(); next(); start(); });
  document.querySelectorAll('.slider-dot').forEach((d,i)=> d.addEventListener('click', ()=>{ stop(); current=i; show(current); start(); }));
  show(0); start();
  const cont=document.querySelector('.hero-slider'); cont && cont.addEventListener('mouseenter', stop) && cont.addEventListener('mouseleave', start);
}

// --- Events list / cards ----------------------------------------------------
// --- Events list / cards ----------------------------------------------------
const INITIAL_EVENTS = [
  { id: 1, title: 'Abdul Majeed Abdullah Concert', category: 'Concerts', city: 'Riyadh', venue: 'Riyadh Boulevard', date: '2025-11-15', time: '20:00', price: 350, image: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&h=600&fit=crop', description: 'Experience an unforgettable evening with Abdul Majeed Abdullah.' },
  { id: 2, title: 'The Godfather - Classic Cinema', category: 'Movies', city: 'Jeddah', venue: 'VOX Cinemas Red Sea Mall', date: '2025-10-20', time: '19:30', price: 45, image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&h=600&fit=crop', description: 'Watch the timeless masterpiece The Godfather.' },
  { id: 3, title: 'Al Nassr vs Al Ittihad', category: 'Sports', city: 'Riyadh', venue: 'King Fahd International Stadium', date: '2025-10-25', time: '18:00', price: 150, image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&h=600&fit=crop', description: 'Witness the epic clash between Al Nassr and Al Ittihad.' },
  { id: 4, title: 'Riyadh Season Festival', category: 'Festivals', city: 'Riyadh', venue: 'Boulevard Riyadh City', date: '2025-12-01', time: '17:00', price: 80, image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&h=600&fit=crop', description: 'Join the biggest entertainment festival in the region!' },
  { id: 5, title: "Shakespeare's Hamlet", category: 'Theatre', city: 'Jeddah', venue: 'King Abdullah Cultural Center', date: '2025-11-10', time: '20:30', price: 120, image: 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=800&h=600&fit=crop', description: "Experience Shakespeare's greatest tragedy brought to life." },
  { id: 6, title: 'Saudi National Day Celebration', category: 'Festivals', city: 'Dammam', venue: 'King Fahd Park', date: '2025-09-23', time: '16:00', price: 0, image: 'https://images.unsplash.com/photo-1527838832700-5059252407fa?w=800&h=600&fit=crop', description: 'Celebrate Saudi National Day with spectacular fireworks.' },
  { id: 7, title: 'Formula E Diriyah E-Prix', category: 'Sports', city: 'Riyadh', venue: 'Diriyah Street Circuit', date: '2025-12-15', time: '15:00', price: 450, image: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&h=600&fit=crop', description: 'Experience the thrill of electric racing at the Diriyah E-Prix.' },
  { id: 8, title: 'Dune: Part Two', category: 'Movies', city: 'Riyadh', venue: 'Muvi Cinemas The Esplanade', date: '2025-10-18', time: '21:00', price: 55, image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&h=600&fit=crop', description: "The epic saga continues in Dune: Part Two." }
];
DB.seedEvents(INITIAL_EVENTS);

DB.seedEvents(INITIAL_EVENTS);

const CATEGORY_ICON_MAP = { Movies:'movie', Sports:'stadium', Concerts:'music_note', Theatre:'theater_comedy', Festivals:'celebration' };

function displayEvents(events){
  const grid=document.getElementById('events-grid'); if (!grid) return;
  if (grid._loadingTimer) clearTimeout(grid._loadingTimer);
  const skeletonCount=Math.max(Math.min(events.length||0,6),3); grid.innerHTML='';
  for (let i=0;i<skeletonCount;i++) grid.appendChild(createEventSkeletonCard());
  grid._loadingTimer = setTimeout(()=>{
    delete grid._loadingTimer; grid.innerHTML='';
    if (!events || !events.length){ renderEmptyState(grid); initScrollAnimations(); return; }
    events.forEach(e=> grid.appendChild(createEventCard(e))); initScrollAnimations();
  },280);
}
function createEventCard(e){
  const card=document.createElement('div'); card.className='event-card'; card.setAttribute('data-animate','up');
  card.addEventListener('click', ()=> window.location.href=`event.html?id=${e.id}`);
  const icon=CATEGORY_ICON_MAP[e.category] || 'local_activity'; const price = e.price===0? 'Free' : `${e.price} SAR`;
  card.innerHTML = `
    <img src="${e.image}" alt="${e.title}">
    <div class="event-info">
      <div class="event-chip"><span class="material-symbols-rounded" aria-hidden="true">${icon}</span><span>${e.category}</span></div>
      <h3>${e.title}</h3>
      <div class="event-meta">
        <div><span class="material-symbols-rounded" aria-hidden="true">location_on</span><span>${e.venue}</span></div>
        <div><span class="material-symbols-rounded" aria-hidden="true">calendar_month</span><span>${formatDate(e.date)} - ${e.time}</span></div>
        <div><span class="material-symbols-rounded" aria-hidden="true">location_city</span><span>${e.city}</span></div>
      </div>
      <div class="event-price">${price}</div>
      <button class="btn-book" type="button"><span>Book Now</span><span class="material-symbols-rounded" aria-hidden="true">arrow_forward</span></button>
    </div>`;
  const btn=card.querySelector('.btn-book'); btn && btn.addEventListener('click', (ev)=>{ ev.stopPropagation(); window.location.href=`event.html?id=${e.id}`; });
  return card;
}
function createEventSkeletonCard(){
  const d=document.createElement('div'); d.className='event-card skeleton'; d.innerHTML = `
    <div class="skeleton-thumb"></div>
    <div class="skeleton-group"><div class="skeleton-line w-60"></div><div class="skeleton-line w-80"></div><div class="skeleton-line w-40"></div></div>`;
  return d;
}
function renderEmptyState(c){ const d=document.createElement('div'); d.className='empty-state'; d.setAttribute('data-animate','up'); d.innerHTML=`
  <div class="empty-icon material-symbols-rounded" aria-hidden="true">calendar_month</div>
  <h3>No events match your filters</h3><p>Try adjusting your filters or explore featured experiences across Saudi Arabia.</p>`; c.appendChild(d); }
function formatDate(s){ return new Date(s).toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'}); }

// Filters
function initFilters(){
  const searchInput=document.getElementById('search-input');
  const categoryFilter=document.getElementById('category-filter');
  const cityFilter=document.getElementById('city-filter');
  const priceRange=document.getElementById('price-range');
  const priceValue=document.getElementById('price-value');
  function run(){
    let filtered=[...(cachedEvents || DB.getAllEvents())];
    if (searchInput && searchInput.value){ const q=searchInput.value.toLowerCase(); filtered = filtered.filter(e=> e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q)); }
    if (categoryFilter && categoryFilter.value!=='all') filtered = filtered.filter(e=> e.category === categoryFilter.value);
    if (cityFilter && cityFilter.value!=='all') filtered = filtered.filter(e=> e.city === cityFilter.value);
    if (priceRange){ const max=parseInt(priceRange.value,10); filtered = filtered.filter(e=> e.price <= max); }
    displayEvents(filtered);
  }
  searchInput && searchInput.addEventListener('input', run);
  categoryFilter && categoryFilter.addEventListener('change', run);
  cityFilter && cityFilter.addEventListener('change', run);
  if (priceRange){
    priceRange.addEventListener('input', (e)=>{
      priceValue && (priceValue.textContent = e.target.value);
      const min=parseInt(e.target.min,10)||0, max=parseInt(e.target.max,10)||1, val=parseInt(e.target.value,10)||0;
      const pct=Math.min(Math.max(((val-min)/(max-min))*100,0),100);
      e.target.style.background = `linear-gradient(90deg, rgba(255,107,157,.7) 0%, rgba(139,92,246,.7) ${pct}%, rgba(148,163,184,.25) ${pct}%, rgba(148,163,184,.25) 100%)`;
      run();
    });
    priceRange.dispatchEvent(new Event('input'));
  }
}

// Event Detail
async function initEventDetail(){
  const p=new URLSearchParams(window.location.search); const id=p.get('id');
  let ev=await fetchEventFromApi(id); if (!ev && id){ const fallback=isNaN(Number(id))? id : Number(id); ev=DB.getEventById(fallback); }
  if (!ev){ window.location.href='events.html'; return; }
  const basePrice = Number(ev.price)||0;
  document.getElementById('event-title').textContent = ev.title;
  const img=document.getElementById('event-image'); if (img){ img.src=ev.image; img.alt=ev.title; }
  document.getElementById('event-venue').textContent = ev.venue;
  document.getElementById('event-date').textContent  = formatDate(ev.date);
  document.getElementById('event-time').textContent  = ev.time;
  document.getElementById('event-description').textContent = ev.description;

  // Initialize Leaflet map if coordinates exist
  initEventMap(ev);

  const types=document.querySelectorAll('.ticket-type');
  let selected={ type:'Regular', price: basePrice }, qty=1;
  [{selector:'[data-type="Regular"]',mult:1},{selector:'[data-type="VIP"]',mult:2},{selector:'[data-type="VVIP"]',mult:3}].forEach(({selector,mult})=>{
    const w=document.querySelector(selector); if (!w) return; const v=basePrice*mult; w.dataset.price=v; const label=w.querySelector('.ticket-price'); label && (label.textContent = `${v} SAR`);
  });
  types.forEach(t=> t.addEventListener('click', ()=>{ types.forEach(x=>x.classList.remove('selected')); t.classList.add('selected'); selected={ type:t.dataset.type, price:Number(t.dataset.price)||basePrice }; update(); }));
  document.getElementById('decrease-qty').addEventListener('click', ()=>{ if (qty>1){ qty--; document.getElementById('quantity').textContent=qty; update(); } });
  document.getElementById('increase-qty').addEventListener('click', ()=>{ if (qty<10){ qty++; document.getElementById('quantity').textContent=qty; update(); } });
  function update(){ const total=selected.price*qty; document.getElementById('total-price').textContent = total.toLocaleString()+' SAR'; }
  update();
  const btn=document.getElementById('book-btn'); btn && btn.addEventListener('click', ()=>{ localStorage.setItem('selectedEventId', String(ev.id)); localStorage.removeItem('last_booking'); window.location.href='booking.html'; });
}

// Initialize Leaflet map for event detail page
function initEventMap(event) {
  const mapSection = document.getElementById('event-map-section');
  const mapContainer = document.getElementById('event-map');
  
  // Check if Leaflet is loaded and event has coordinates
  if (typeof L === 'undefined' || !mapSection || !mapContainer) return;
  
  const lat = event.lat != null ? Number(event.lat) : null;
  const lng = event.lng != null ? Number(event.lng) : null;
  
  // If coordinates are missing or invalid, hide map section
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    mapSection.style.display = 'none';
    return;
  }
  
  // Show map section
  mapSection.style.display = 'block';
  
  // Initialize map
  try {
    const map = L.map('event-map', { 
      scrollWheelZoom: false,
      dragging: true,
      touchZoom: true,
      doubleClickZoom: true,
      boxZoom: true,
      keyboard: true,
      zoomControl: true
    }).setView([lat, lng], 13);
    
    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);
    
    // Create custom icon
    const customIcon = L.icon({
      iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDMyIDQwIj48cGF0aCBmaWxsPSIjRkY2QjlEIiBkPSJNMTYgMGMtOC44NCAwLTE2IDcuMTYtMTYgMTYgMCA4LjgzNyAxNiAyNCAxNiAyNHMxNi0xNS4xNjMgMTYtMjRjMC04Ljg0LTcuMTYtMTYtMTYtMTZ6bTAgMjJjLTMuMzEgMC02LTIuNjktNi02czIuNjktNiA2LTYgNiAyLjY5IDYgNi0yLjY5IDYtNiA2eiIvPjwvc3ZnPg==',
      iconSize: [32, 40],
      iconAnchor: [16, 40],
      popupAnchor: [0, -40]
    });
    
    // Format date and time for popup
    const formattedDate = formatDate(event.date);
    const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    
    // Create popup content with styling
    const popupContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-width: 200px;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1f2937;">${event.title}</h3>
        <p style="margin: 4px 0; font-size: 14px; color: #4b5563;">
          <strong>📍 Venue:</strong> ${event.venue}
        </p>
        <p style="margin: 4px 0; font-size: 14px; color: #4b5563;">
          <strong>🏙️ City:</strong> ${event.city}
        </p>
        <p style="margin: 4px 0; font-size: 14px; color: #4b5563;">
          <strong>📅 Date:</strong> ${formattedDate}
        </p>
        <p style="margin: 4px 0; font-size: 14px; color: #4b5563;">
          <strong>🕐 Time:</strong> ${event.time}
        </p>
        <a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer" 
           style="display: inline-block; margin-top: 12px; padding: 8px 16px; background: linear-gradient(135deg, rgba(255,107,157,0.9), rgba(139,92,246,0.9)); color: white; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 600; text-align: center; transition: transform 0.2s;">
          🗺️ Open in Google Maps
        </a>
      </div>
    `;
    
    // Add marker with popup
    const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
    marker.bindPopup(popupContent, { 
      maxWidth: 300,
      className: 'custom-popup'
    });
    
    // Open popup by default
    marker.openPopup();
    
    // Add click handler to re-center map
    marker.on('click', function() {
      map.setView([lat, lng], 13);
    });
    
    // Invalidate size after a short delay to ensure proper rendering
    setTimeout(() => {
      map.invalidateSize();
    }, 250);
    
  } catch (error) {
    console.error('Failed to initialize map:', error);
    mapSection.style.display = 'none';
  }
}

// Booking
async function initBookingPage(){
  let selected = localStorage.getItem('selectedEventId');
  if (!selected || selected==='undefined' || selected==='null'){
    try{ const evs=await fetchEventsFromApi(); if (Array.isArray(evs)&&evs.length>0){ selected=String(evs[0].id); localStorage.setItem('selectedEventId', selected); } } catch{}
    if (!selected){ alert('Please choose an event before booking.'); window.location.href='events.html'; return; }
  }
  const ev = await fetchEventFromApi(selected);
  if (!ev){ alert('We could not load that event. Please pick another experience.'); window.location.href='events.html'; return; }
  localStorage.removeItem('last_booking');
  const price=Number(ev.price)||0;
  const img=document.getElementById('booking-image'); if (img){ img.src=ev.image; img.alt=ev.title; }
  const title=document.getElementById('booking-title'); title && (title.textContent=ev.title);
  const venue=document.getElementById('booking-venue'); venue && (venue.textContent=ev.venue);
  const date=document.getElementById('booking-date'); date && (date.textContent=formatDate(ev.date));
  const time=document.getElementById('booking-time'); time && (time.textContent=ev.time);
  const priceEl=document.getElementById('booking-price'); priceEl && (priceEl.textContent = price.toLocaleString()+' SAR per ticket');
  const tickets=document.getElementById('tickets'); const total=document.getElementById('booking-total');
  const sum=()=>{ if (!tickets||!total) return; const q=Math.min(10, Math.max(1, parseInt(tickets.value,10)||1)); tickets.value=q; total.textContent=(price*q).toLocaleString()+' SAR'; };
  if (tickets){ tickets.addEventListener('input', sum); tickets.addEventListener('change', sum); if (!tickets.value) tickets.value='1'; sum(); }
  if (Auth.isLoggedIn()){ const n=document.getElementById('name'); const e=document.getElementById('email'); n&&(n.value=Auth.currentUser.name); e&&(e.value=Auth.currentUser.email); }
  const form=document.getElementById('booking-form'); form && form.addEventListener('submit', confirmBooking);
}

async function confirmBooking(e){
  e.preventDefault();
  const name=document.getElementById('name').value.trim();
  const email=document.getElementById('email').value.trim();
  const ticketsInput=document.getElementById('tickets');
  const raw=ticketsInput? ticketsInput.value : '1';
  const qty=Math.min(10, Math.max(1, parseInt(raw,10)||1));
  if (ticketsInput && ticketsInput.value !== String(qty)) ticketsInput.value=String(qty);
  let eventId=localStorage.getItem('selectedEventId');
  if (!eventId || eventId==='undefined' || eventId==='null'){
    const msg='Please choose an event before booking.';
    if (window.modalInstance){ window.modalInstance.error('Select Event', msg, ()=> window.location.href='events.html'); }
    else { alert(msg); window.location.href='events.html'; }
    return;
  }
  eventId=String(eventId);
  try{
    const data = await createBookingOnServer({ name, email, eventId, tickets: qty });
    if (data && data.ok){
      const payload = data.booking ? { ok:true, booking:data.booking, email_previewUrl: data.email_previewUrl || null } : data;
      try{ localStorage.setItem('last_booking', JSON.stringify(payload)); }catch{}
      try{ localStorage.removeItem('selectedEventId'); }catch{}
      cachedBookings=null;
      const url = `${window.location.origin}/confirm.html`;
      window.requestAnimationFrame(()=> window.location.assign(url));
      return;
    }
    const msg=(data && (data.error||data.message)) || 'Try again later.';
    window.modalInstance ? window.modalInstance.error('Booking Failed', msg) : alert('Booking failed: '+msg);
  }catch(err){
    const msg=(err&&err.message)||'Try again later.';
    window.modalInstance ? window.modalInstance.error('Booking Failed', msg) : alert('Booking failed: '+msg);
  }
}

// Confirmation page
function initConfirmationPage(){
  const stored = JSON.parse(localStorage.getItem('last_booking'));
  const container = document.querySelector('.confirmation-container');
  const details = document.querySelector('.confirmation-details');
  const actions = document.querySelector('.confirmation-actions');
  const previewWrapper = document.getElementById('email-preview-link');
  const previewAnchor  = document.getElementById('email-preview-anchor');
  if (!stored){
    if (container){
      container.innerHTML = `<div class="success-icon"><span class="material-symbols-rounded" aria-hidden="true">info</span></div>
      <h1>No booking found</h1><p class="confirmation-subtext">You can explore new experiences from the home page.</p>
      <div class="confirmation-actions"><a href="index.html" class="btn-primary">Back to Home</a><a href="events.html" class="btn-secondary">Browse Events</a></div>`;
    } return;
  }
  let booking = stored.booking; if (!booking && stored.id) booking = normalizeBooking(stored);
  if ((stored.ok===false && !booking) || !booking){
    if (container){
      container.innerHTML = `<div class="success-icon"><span class="material-symbols-rounded" aria-hidden="true">info</span></div>
      <h1>No booking found</h1><p class="confirmation-subtext">You can explore new experiences from the home page.</p>
      <div class="confirmation-actions"><a href="index.html" class="btn-primary">Back to Home</a><a href="events.html" class="btn-secondary">Browse Events</a></div>`;
    } return;
  }
  const totalValue=Number(booking.total ?? booking.totalPrice ?? 0);
  const ticketsValue=Number(booking.tickets ?? booking.quantity ?? 1);
  const idEl=document.getElementById('conf-booking-id'); idEl && (idEl.textContent=booking.id||'');
  const nameEl=document.getElementById('conf-name'); nameEl && (nameEl.textContent=booking.name||'');
  const evEl=document.getElementById('conf-event'); evEl && (evEl.textContent=booking.title||booking.eventTitle||'');
  const venueEl=document.getElementById('conf-venue'); venueEl && (venueEl.textContent=booking.venue||'');
  const dateEl=document.getElementById('conf-date'); dateEl && (dateEl.textContent= booking.date ? formatDate(booking.date) : '');
  const timeEl=document.getElementById('conf-time'); timeEl && (timeEl.textContent=booking.time||'');
  const tkEl=document.getElementById('conf-tickets'); tkEl && (tkEl.textContent=`${ticketsValue} ticket${ticketsValue===1?'':'s'}`);
  const totalEl=document.getElementById('conf-total'); totalEl && (totalEl.textContent=`${totalValue.toLocaleString()} SAR`);
  if (previewWrapper && previewAnchor){
    if (stored.email_previewUrl){ previewWrapper.style.display='block'; previewAnchor.href=stored.email_previewUrl; }
    else { previewWrapper.style.display='none'; previewAnchor.removeAttribute('href'); }
  }
  details && (details.style.display='block'); actions && (actions.style.display='flex');
}

// Profile page
async function initProfilePage(){ await fetchBookingsFromApi(); loadUserStats(); loadUserBookings(); initUserFilters(); }
function loadUserStats(){
  const all = cachedBookings || DB.getAllBookings(); let mine = all;
  if (Auth.isLoggedIn() && !Auth.isAdmin()) mine = all.filter(b=>b.userEmail===Auth.currentUser.email);
  const confirmed = mine.filter(b=>b.status==='confirmed'); const total=confirmed.reduce((s,b)=>s+b.totalPrice,0);
  document.getElementById('user-total-bookings').textContent = mine.length;
  document.getElementById('user-confirmed-bookings').textContent = confirmed.length;
  document.getElementById('user-total-spent').textContent = total.toLocaleString()+' SAR';
}
function loadUserBookings(status='all'){
  const all = cachedBookings || DB.getAllBookings();
  const container = document.getElementById('bookings-list');
  let mine = all; if (Auth.isLoggedIn() && !Auth.isAdmin()) mine = all.filter(b=>b.userEmail===Auth.currentUser.email);
  const filtered = status==='all'? mine : mine.filter(b=>b.status===status);
  if (!filtered.length){ container.innerHTML = '<p style="text-align:center;color:var(--text-light);padding:2rem;">No bookings found. Start exploring events!</p>'; return; }
  container.innerHTML='';
  filtered.forEach(b=>{
    const wrap=document.createElement('div'); wrap.className='booking-item';
    const color=b.status==='confirmed'? '#10B981' : b.status==='cancelled'? '#EF4444' : '#F59E0B';
    const dim=b.status==='cancelled'; wrap.innerHTML = `
      <img src="${b.eventImage}" alt="${b.eventTitle}" style="${dim?'opacity:.5;filter:grayscale(1);':''}">
      <div class="booking-item-info">
        <h3 style="${dim?'color:var(--text-light);':''}">${b.eventTitle}</h3>
        <p><strong>Booking ID:</strong> ${b.id}</p>
        <p><strong>Name:</strong> ${b.userName}</p>
        <p><strong>Date:</strong> ${formatDate(b.date)} at ${b.time}</p>
        <p><strong>Venue:</strong> ${b.venue}</p>
        <p><strong>Tickets:</strong> ${b.quantity} x ${b.ticketType}</p>
        <p><strong>Total:</strong> ${Number(b.totalPrice||0).toLocaleString()} SAR</p>
        <p><strong>Status:</strong> <span style="color:${color};text-transform:capitalize;">${b.status}</span></p>
        ${b.status==='confirmed'? `<button class="btn-cancel" onclick="cancelBooking('${b.id}')" style="margin-top:1rem;padding:.6rem 1.2rem;background:#EF4444;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;">Cancel Ticket</button>`:''}
      </div>`;
    container.appendChild(wrap);
  });
}
function cancelBooking(id){
  window.modalInstance.confirm('Cancel Booking','Are you sure you want to cancel this booking? This action cannot be undone.', ()=>{
    if (DB.updateBookingStatus(id, 'cancelled')){
      window.modalInstance.success('Booking Cancelled','Your booking has been cancelled successfully.', ()=>{
        cachedBookings = DB.getAllBookings(); loadUserStats(); loadUserBookings();
      });
    } else {
      window.modalInstance.error('Cancellation Failed','Failed to cancel booking. Please try again.');
    }
  });
}
function initUserFilters(){
  const btns=document.querySelectorAll('.bookings-section .filter-btn');
  btns.forEach(b=> b.addEventListener('click', ()=>{ btns.forEach(x=>x.classList.remove('active')); b.classList.add('active'); loadUserBookings(b.dataset.status); }));
}

// Categories nav
function initCategoryNavigation(){
  document.querySelectorAll('.category-item').forEach(i=> i.addEventListener('click', ()=>{
    const cat=i.dataset.category; window.location.href=`events.html?category=${cat}`;
  }));
}
function initScrollAnimations(){
  const nodes=document.querySelectorAll('[data-animate]'); if (!nodes.length) return;
  if (!('IntersectionObserver' in window)){ nodes.forEach(n=>n.classList.add('is-visible')); return; }
  if (!revealObserver){
    revealObserver = new IntersectionObserver((entries)=> entries.forEach(en=>{
      if (en.isIntersecting){ en.target.classList.add('is-visible'); revealObserver.unobserve(en.target); }
    }), {threshold:0.15, rootMargin:'0px 0px -40px 0px'});
  }
  nodes.forEach(n=>{ if (!n.classList.contains('is-visible')) revealObserver.observe(n); });
}

// Boot
document.addEventListener('DOMContentLoaded', async ()=>{
  initThemeToggle(); initHeroSlider(); initCategoryNavigation(); initScrollAnimations();
  const page = window.location.pathname.split('/').pop() || '';
  switch(page){
    case 'index.html':
    case '': {
      const events=await fetchEventsFromApi(); const list=events && events.length? events : DB.getAllEvents(); displayEvents(list.slice(0,6)); break;
    }
    case 'events.html': {
      const events=await fetchEventsFromApi(); const list=events && events.length? events : DB.getAllEvents(); displayEvents(list); initFilters();
      const p=new URLSearchParams(window.location.search); const category=p.get('category'); if (category){ const sel=document.getElementById('category-filter'); if (sel){ sel.value=category; sel.dispatchEvent(new Event('change')); } }
      break;
    }
    case 'event.html': await initEventDetail(); break;
    case 'booking.html': await initBookingPage(); break;
    case 'confirm.html': initConfirmationPage(); break;
    case 'profile.html': await initProfilePage(); break;
    default: break;
  }
});

// Navbar search
const navSearch=document.querySelector('.nav-search input');
navSearch && navSearch.addEventListener('keypress', (e)=>{ if (e.key==='Enter'){ const q=e.target.value; window.location.href=`events.html?search=${encodeURIComponent(q)}`; } });

// Edit Profile
function editProfile(){
  if (!Auth.isLoggedIn()){ window.modalInstance.error('Not Logged In','Please sign in to edit your profile.'); return; }
  const u=Auth.currentUser;
  window.modalInstance.showForm({
    title:'Edit Profile',
    fields:[
      {name:'name',label:'Full Name',type:'text',value:u.name||'',required:true,icon:'user'},
      {name:'email',label:'Email Address',type:'email',value:u.email||'',required:true,icon:'envelope'},
      {name:'phone',label:'Phone Number',type:'tel',value:u.phone||'',icon:'phone'},
      {name:'age',label:'Age',type:'number',value:u.age||'',icon:'calendar'},
      {name:'gender',label:'Gender',type:'select',value:u.gender||'Prefer not to say',options:['Male','Female','Other','Prefer not to say'],icon:'venus-mars'}
    ],
    submitText:'Save Changes',
    onSubmit:(data)=>{
      if (Auth.updateProfile(data)){
        window.modalInstance.success('Profile Updated','Your profile has been updated successfully!', ()=>{ if (window.location.pathname.includes('profile.html')) location.reload(); });
      } else {
        window.modalInstance.error('Update Failed','Failed to update profile. Please try again.');
      }
    }
  });
}
