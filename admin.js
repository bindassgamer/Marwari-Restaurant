// --- GLOBAL STATE ---
let token = localStorage.getItem('aurum_admin_token') || null;
let websiteData = null;
let bookings = [];
let activePanel = 'bookings';
// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initSidebar();
  initForms();
});
// --- AUTHENTICATION PIPELINE ---
async function initAuth() {
  const loginWrapper = document.getElementById('loginWrapper');
  const dashboardWrapper = document.getElementById('dashboardWrapper');
  if (token) {
    // Verify token
    try {
      const res = await fetch('/api/admin/verify', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success) {
        // Show dashboard
        loginWrapper.classList.add('hidden');
        dashboardWrapper.classList.remove('hidden');
        loadDashboardData();
      } else {
        // Expired session
        localStorage.removeItem('aurum_admin_token');
        token = null;
        showLoginScreen();
      }
    } catch (err) {
      console.error('Error verifying admin session:', err);
      showToast('Network error verifying session', 'error');
      showLoginScreen();
    }
  } else {
    showLoginScreen();
  }
  // Handle Login Form Submit
  const loginForm = document.getElementById('loginForm');
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const usernameInput = document.getElementById('username').value;
    const passwordInput = document.getElementById('password').value;
    const errorMsg = document.getElementById('loginError');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput, password: passwordInput })
      });
      const result = await res.json();
      if (result.success) {
        token = result.token;
        localStorage.setItem('aurum_admin_token', token);
        loginWrapper.classList.add('hidden');
        dashboardWrapper.classList.remove('hidden');
        showToast('Welcome back, Administrator.', 'success');
        loadDashboardData();
        loginForm.reset();
        errorMsg.style.display = 'none';
      } else {
        errorMsg.innerText = result.message || 'Invalid username or password.';
        errorMsg.style.display = 'block';
      }
    } catch (err) {
      errorMsg.innerText = 'Network error authenticating. Try again.';
      errorMsg.style.display = 'block';
    }
  });
  // Handle Logout
  const logoutBtn = document.getElementById('logoutBtn');
  logoutBtn.addEventListener('click', async () => {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Error logging out from backend:', err);
    }
    localStorage.removeItem('aurum_admin_token');
    token = null;
    showLoginScreen();
    showToast('Logged out successfully', 'success');
  });
}
function showLoginScreen() {
  document.getElementById('loginWrapper').classList.remove('hidden');
  document.getElementById('dashboardWrapper').classList.add('hidden');
}
// --- SIDEBAR TABS ROUTING ---
function initSidebar() {
  const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
  const panels = document.querySelectorAll('.admin-panel');
  const title = document.getElementById('activePanelTitle');
  const subtitle = document.getElementById('activePanelSubtitle');
  const panelMetadata = {
    bookings: { title: 'Bookings & Inquiries', sub: 'Track table reservations, event planners, and general patron messages.' },
    movies: { title: 'Cinema Movie Listings', sub: 'Add, update timings, or edit screen statuses for our Gold Class Theatre.' },
    menu: { title: 'Restaurant Menu Manager', sub: 'Manage dishes, prices, descriptions, and signature specialties.' },
    gallery: { title: 'Image Gallery Archive', sub: 'Upload and categorize high-resolution media highlights.' },
    offers: { title: 'Promo Codes & Packages', sub: 'Distribute marketing discounts, offers codes, and wedding packages.' },
    testimonials: { title: 'Guest Review Stories', sub: 'Display or delete five-star reviews on the main website.' },
    settings: { title: 'General Site Settings', sub: 'Modify main contact details, WhatsApp channels, and landing hero headlines.' }
  };
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetPanel = item.dataset.panel;
      if (!targetPanel) return;
      navItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      panels.forEach(p => {
        p.classList.remove('active-panel');
        if (p.id === `panel-${targetPanel}`) {
          p.classList.add('active-panel');
        }
      });
      // Update titles
      const meta = panelMetadata[targetPanel];
      title.innerText = meta.title;
      subtitle.innerText = meta.sub;
      activePanel = targetPanel;
    });
  });
  // Booking Filters Action Listener
  document.getElementById('filterType').addEventListener('change', bindBookingsTable);
  document.getElementById('filterStatus').addEventListener('change', bindBookingsTable);
  document.getElementById('refreshBtn').addEventListener('click', loadDashboardData);
  document.getElementById('exportCsvBtn').addEventListener('click', exportBookingsCsv);
}
// --- LOAD DATA PIPELINE ---
async function loadDashboardData() {
  try {
    // 1. Fetch public content
    const contentRes = await fetch('/api/content');
    const contentResult = await contentRes.json();
    if (contentResult.success) {
      websiteData = contentResult.data;
    }
    // 2. Fetch admin submissions
    const submissionsRes = await fetch('/api/admin/submissions', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const submissionsResult = await submissionsRes.json();
    if (submissionsResult.success) {
      bookings = submissionsResult.data;
    }
    bindAllData();
  } catch (err) {
    console.error('Error fetching dashboard details:', err);
    showToast('Failed to load dashboard data. Check connections.', 'error');
  }
}
function bindAllData() {
  if (bookings) bindBookingsTable();
  if (websiteData) {
    bindMoviesManager();
    bindMenuManager();
    bindGalleryManager();
    bindOffersManager();
    bindTestimonialsManager();
    bindSettingsForm();
  }
}
// --- BIND BOOKINGS TABLE ---
function bindBookingsTable() {
  const tbody = document.getElementById('leadsTableBody');
  const countSpan = document.getElementById('leadsCount');
  if (!tbody) return;
  const typeFilter = document.getElementById('filterType').value;
  const statusFilter = document.getElementById('filterStatus').value;
  tbody.innerHTML = '';
  
  // Filter bookings
  let filtered = bookings;
  if (typeFilter !== 'ALL') {
    filtered = filtered.filter(b => b.type === typeFilter);
  }
  if (statusFilter !== 'ALL') {
    filtered = filtered.filter(b => b.status === statusFilter);
  }
  // Bind Metrics counters
  document.getElementById('metricTotal').innerText = bookings.length;
  document.getElementById('metricNew').innerText = bookings.filter(b => b.status === 'New').length;
  document.getElementById('metricConfirmed').innerText = bookings.filter(b => b.status === 'Confirmed').length;
  document.getElementById('metricCancelled').innerText = bookings.filter(b => b.status === 'Cancelled').length;
  countSpan.innerText = `${filtered.length} entries`;
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="loading-row">No bookings match the selected filters.</td></tr>';
    return;
  }
  filtered.forEach(book => {
    const row = document.createElement('tr');
    
    // Format submission date
    const dateFormatted = new Date(book.date).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    // Format type column
    let typeBadge = '';
    if (book.type === 'restaurant') {
      typeBadge = '<i class="fa-solid fa-utensils"></i> Restaurant';
    } else if (book.type === 'event') {
      typeBadge = '<i class="fa-solid fa-champagne-glasses"></i> Banquet Lawn';
    } else {
      typeBadge = '<i class="fa-solid fa-envelope"></i> Message';
    }
    // Format details block
    let detailsHtml = '';
    if (book.type === 'restaurant') {
      detailsHtml = `
        <strong>Date:</strong> ${book.bookingDate}<br>
        <strong>Time:</strong> ${book.bookingTime}<br>
        <strong>Guests:</strong> ${book.guests}
      `;
    } else if (book.type === 'event') {
      detailsHtml = `
        <strong>Type:</strong> ${book.eventType}<br>
        <strong>Date:</strong> ${book.bookingDate}<br>
        <strong>Guests:</strong> ${book.guests}<br>
        <strong>Budget:</strong> ${book.budget}
      `;
    } else {
      detailsHtml = 'General Query';
    }
    // Status styling
    let statusClass = `status-${book.status.toLowerCase()}`;
    // Action drop select options
    let statusDropdown = `
      <select onchange="updateBookingStatus('${book.id}', this.value)" style="background: rgba(5,5,5,0.8); color:#fff; border: 1px solid var(--color-border); border-radius: 4px; padding: 4px 8px; font-size: 0.8rem; cursor: pointer;">
        <option value="New" ${book.status === 'New' ? 'selected' : ''}>New</option>
        <option value="Confirmed" ${book.status === 'Confirmed' ? 'selected' : ''}>Confirm</option>
        <option value="Completed" ${book.status === 'Completed' ? 'selected' : ''}>Complete</option>
        <option value="Cancelled" ${book.status === 'Cancelled' ? 'selected' : ''}>Cancel</option>
      </select>
    `;
    row.innerHTML = `
      <td>${dateFormatted}</td>
      <td style="white-space: nowrap;">${typeBadge}</td>
      <td class="client-name">${book.name}</td>
      <td>
        <i class="fa-solid fa-phone"></i> ${book.phone}<br>
        <i class="fa-solid fa-envelope"></i> <span style="font-size: 0.75rem;">${book.email}</span>
      </td>
      <td style="font-size: 0.8rem; line-height: 1.5;">${detailsHtml}</td>
      <td style="max-width: 250px; font-size: 0.8rem;">${book.specialRequest || '<span style="color: var(--color-text-muted);">None</span>'}</td>
      <td>
        <span class="status-badge ${statusClass}">${book.status}</span>
        <div style="margin-top: 8px;">${statusDropdown}</div>
      </td>
      <td>
        <div class="action-buttons">
          <button class="action-btn action-btn-danger" onclick="deleteBooking('${book.id}')" title="Delete Booking Log"><i class="fa-regular fa-trash-can"></i></button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
}
// --- UPDATE/DELETE BOOKINGS ENDPOINTS ---
async function updateBookingStatus(id, newStatus) {
  try {
    const res = await fetch(`/api/admin/submissions/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: newStatus })
    });
    const result = await res.json();
    if (result.success) {
      showToast(`Booking updated to ${newStatus}`, 'success');
      loadDashboardData();
    } else {
      showToast(result.message || 'Status update failed', 'error');
    }
  } catch (err) {
    showToast('Network error updating status', 'error');
  }
}
async function deleteBooking(id) {
  if (!confirm('Are you sure you want to permanently delete this booking log? This action is irreversible.')) return;
  try {
    const res = await fetch(`/api/admin/submissions/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const result = await res.json();
    if (result.success) {
      showToast('Booking log deleted', 'success');
      loadDashboardData();
    } else {
      showToast(result.message || 'Deletion failed', 'error');
    }
  } catch (err) {
    showToast('Network error deleting log', 'error');
  }
}
// --- EXPORT TO CSV SHEET ---
function exportBookingsCsv() {
  if (bookings.length === 0) {
    showToast('No booking logs available to export.', 'error');
    return;
  }
  let csvContent = 'data:text/csv;charset=utf-8,';
  // Headers
  csvContent += 'Date Logged,Type,Patron Name,Phone,Email,Booking Date,Booking Time/Details,Guests,Budget,Special Requests,Status\r\n';
  bookings.forEach(b => {
    let date = new Date(b.date).toISOString().slice(0, 10);
    let type = b.type;
    let name = `"${b.name.replace(/"/g, '""')}"`;
    let phone = `"${b.phone}"`;
    let email = b.email;
    let bookingDate = b.bookingDate || 'N/A';
    let details = b.type === 'restaurant' ? b.bookingTime : (b.eventType || 'N/A');
    let guests = b.guests || 0;
    let budget = b.budget || 'N/A';
    let request = `"${(b.specialRequest || '').replace(/\r?\n|\r/g, ' ').replace(/"/g, '""')}"`;
    let status = b.status;
    csvContent += `${date},${type},${name},${phone},${email},${bookingDate},${details},${guests},${budget},${request},${status}\r\n`;
  });
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `aurum_estate_bookings_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Spreadsheet downloaded successfully', 'success');
}
// --- POST CONFIG DATA UPDATE ---
async function saveWebsiteConfig(successMsg = 'Website data updated successfully!') {
  try {
    const res = await fetch('/api/admin/content', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(websiteData)
    });
    const result = await res.json();
    if (result.success) {
      showToast(successMsg, 'success');
      loadDashboardData();
      return true;
    } else {
      showToast(result.message || 'Config save failed', 'error');
      return false;
    }
  } catch (err) {
    showToast('Network error saving config details', 'error');
    return false;
  }
}
// --- MOVIES MANAGER WORKFLOW ---
function bindMoviesManager() {
  const grid = document.getElementById('adminMoviesGrid');
  if (!grid) return;
  grid.innerHTML = '';
  websiteData.movies.forEach(movie => {
    const card = document.createElement('div');
    card.className = 'admin-item-card';
    card.innerHTML = `
      <img src="${movie.poster}" alt="${movie.title}" class="admin-item-img">
      <div class="admin-item-body">
        <div>
          <div class="admin-item-title">${movie.title}</div>
          <div class="admin-item-desc">${movie.genre} | ${movie.duration} | ${movie.language} | Rating: ${movie.rating}</div>
        </div>
        <div class="admin-item-footer">
          <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--color-gold);">${movie.status.replace('-', ' ')}</span>
          <div class="admin-card-actions">
            <button class="action-btn" onclick="editMovie('${movie.id}')" title="Edit Movie Details"><i class="fa-solid fa-pen"></i></button>
            <button class="action-btn action-btn-danger" onclick="deleteMovie('${movie.id}')" title="Delete Movie"><i class="fa-regular fa-trash-can"></i></button>
          </div>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}
function clearMovieForm() {
  document.getElementById('movieForm').reset();
  document.getElementById('movie-edit-id').value = '';
}
function editMovie(id) {
  const movie = websiteData.movies.find(m => m.id === id);
  if (!movie) return;
  document.getElementById('movie-edit-id').value = movie.id;
  document.getElementById('movie-title').value = movie.title;
  document.getElementById('movie-genre').value = movie.genre;
  document.getElementById('movie-duration').value = movie.duration;
  document.getElementById('movie-language').value = movie.language;
  document.getElementById('movie-rating').value = movie.rating;
  document.getElementById('movie-poster').value = movie.poster;
  document.getElementById('movie-status').value = movie.status;
  if (movie.shows) {
    document.getElementById('movie-shows-today').value = (movie.shows.today || []).join(', ');
    document.getElementById('movie-shows-tomorrow').value = (movie.shows.tomorrow || []).join(', ');
  } else {
    document.getElementById('movie-shows-today').value = '';
    document.getElementById('movie-shows-tomorrow').value = '';
  }
  // Scroll to edit form
  document.getElementById('movieForm').scrollIntoView({ behavior: 'smooth' });
}
async function deleteMovie(id) {
  if (!confirm('Are you sure you want to delete this movie from listings?')) return;
  
  websiteData.movies = websiteData.movies.filter(m => m.id !== id);
  await saveWebsiteConfig('Movie deleted from listings.');
}
// --- MENU MANAGER WORKFLOW ---
function bindMenuManager() {
  const grid = document.getElementById('adminMenuGrid');
  if (!grid) return;
  grid.innerHTML = '';
  websiteData.menu.forEach(dish => {
    const card = document.createElement('div');
    card.className = 'admin-item-card';
    card.innerHTML = `
      <img src="${dish.image}" alt="${dish.name}" class="admin-item-img">
      <div class="admin-item-body">
        <div>
          <div class="admin-item-title">
            ${dish.name}
            ${dish.isChefSpecial ? '<span style="font-size:0.6rem; background: var(--color-gold); color: #000; padding:1px 4px; border-radius:2px; margin-left:5px;">Chef Choice</span>' : ''}
          </div>
          <div class="admin-item-desc">${dish.description}</div>
        </div>
        <div class="admin-item-footer">
          <span class="admin-item-price">₹${dish.price}</span>
          <div class="admin-card-actions">
            <button class="action-btn" onclick="editMenuDish('${dish.id}')" title="Edit Dish Details"><i class="fa-solid fa-pen"></i></button>
            <button class="action-btn action-btn-danger" onclick="deleteMenuDish('${dish.id}')" title="Delete Dish"><i class="fa-regular fa-trash-can"></i></button>
          </div>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}
function clearMenuForm() {
  document.getElementById('menuForm').reset();
  document.getElementById('menu-edit-id').value = '';
}
function editMenuDish(id) {
  const dish = websiteData.menu.find(d => d.id === id);
  if (!dish) return;
  document.getElementById('menu-edit-id').value = dish.id;
  document.getElementById('menu-name').value = dish.name;
  document.getElementById('menu-category').value = dish.category;
  document.getElementById('menu-price').value = dish.price;
  document.getElementById('menu-image').value = dish.image;
  document.getElementById('menu-chef-special').checked = dish.isChefSpecial;
  document.getElementById('menu-desc').value = dish.description;
  // Scroll to edit form
  document.getElementById('menuForm').scrollIntoView({ behavior: 'smooth' });
}
async function deleteMenuDish(id) {
  if (!confirm('Are you sure you want to delete this dish from the menu?')) return;
  
  websiteData.menu = websiteData.menu.filter(d => d.id !== id);
  await saveWebsiteConfig('Dish deleted from the restaurant menu.');
}
// --- GALLERY MANAGER WORKFLOW ---
function bindGalleryManager() {
  const grid = document.getElementById('adminGalleryGrid');
  if (!grid) return;
  grid.innerHTML = '';
  websiteData.gallery.forEach(img => {
    const card = document.createElement('div');
    card.className = 'admin-item-card';
    card.style.height = '160px';
    card.innerHTML = `
      <img src="${img.url}" alt="${img.category}" class="admin-item-img" style="width: 120px;">
      <div class="admin-item-body">
        <div>
          <div class="admin-item-title" style="font-size:0.8rem;">Category</div>
          <div class="admin-item-desc" style="color:var(--color-gold); font-weight:bold;">${img.category}</div>
        </div>
        <div style="text-align: right;">
          <button class="action-btn action-btn-danger" onclick="deleteGalleryImage('${img.id}')" title="Delete Image"><i class="fa-regular fa-trash-can"></i></button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}
async function deleteGalleryImage(id) {
  if (!confirm('Delete this image from gallery archive?')) return;
  
  websiteData.gallery = websiteData.gallery.filter(g => g.id !== id);
  await saveWebsiteConfig('Image deleted from gallery.');
}
// --- OFFERS MANAGER WORKFLOW ---
function bindOffersManager() {
  const grid = document.getElementById('adminOffersGrid');
  if (!grid) return;
  grid.innerHTML = '';
  websiteData.offers.forEach(offer => {
    const card = document.createElement('div');
    card.className = 'admin-item-card';
    card.innerHTML = `
      <div class="admin-item-body" style="padding-left: 20px;">
        <div>
          <div class="admin-item-title">${offer.title}</div>
          <div class="admin-item-desc">${offer.description}</div>
        </div>
        <div class="admin-item-footer">
          <div>
            <span style="font-size:0.75rem; background: var(--color-bg-deep); border: 1px dashed var(--color-gold); color: var(--color-gold); padding:2px 8px; border-radius:3px; margin-right:8px;">${offer.code}</span>
            <span style="font-size:0.75rem; color:var(--color-text-muted);">${offer.validity}</span>
          </div>
          <div class="admin-card-actions">
            <button class="action-btn" onclick="editOffer('${offer.id}')" title="Edit Offer"><i class="fa-solid fa-pen"></i></button>
            <button class="action-btn action-btn-danger" onclick="deleteOffer('${offer.id}')" title="Delete Offer"><i class="fa-regular fa-trash-can"></i></button>
          </div>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}
function clearOfferForm() {
  document.getElementById('offerForm').reset();
  document.getElementById('offer-edit-id').value = '';
}
function editOffer(id) {
  const offer = websiteData.offers.find(o => o.id === id);
  if (!offer) return;
  document.getElementById('offer-edit-id').value = offer.id;
  document.getElementById('offer-title').value = offer.title;
  document.getElementById('offer-code').value = offer.code;
  document.getElementById('offer-discount').value = offer.discount;
  document.getElementById('offer-validity').value = offer.validity;
  document.getElementById('offer-desc').value = offer.description;
  document.getElementById('offerForm').scrollIntoView({ behavior: 'smooth' });
}
async function deleteOffer(id) {
  if (!confirm('Are you sure you want to delete this offer?')) return;
  
  websiteData.offers = websiteData.offers.filter(o => o.id !== id);
  await saveWebsiteConfig('Special offer deleted.');
}
// --- TESTIMONIALS MANAGER WORKFLOW ---
function bindTestimonialsManager() {
  const grid = document.getElementById('adminTestimonialsGrid');
  if (!grid) return;
  grid.innerHTML = '';
  websiteData.testimonials.forEach(test => {
    const card = document.createElement('div');
    card.className = 'admin-item-card';
    card.innerHTML = `
      <div class="admin-item-body" style="padding-left: 20px;">
        <div>
          <div class="admin-item-title">${test.name}</div>
          <div class="admin-item-desc">"${test.quote}"</div>
        </div>
        <div class="admin-item-footer">
          <span style="font-size:0.75rem; color:var(--color-gold);">${test.role} | Stars: ${test.rating}</span>
          <div class="admin-card-actions">
            <button class="action-btn" onclick="editTestimonial('${test.id}')" title="Edit Testimonial"><i class="fa-solid fa-pen"></i></button>
            <button class="action-btn action-btn-danger" onclick="deleteTestimonial('${test.id}')" title="Delete Review"><i class="fa-regular fa-trash-can"></i></button>
          </div>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}
function clearTestimonialForm() {
  document.getElementById('testimonialForm').reset();
  document.getElementById('testimonial-edit-id').value = '';
}
function editTestimonial(id) {
  const test = websiteData.testimonials.find(t => t.id === id);
  if (!test) return;
  document.getElementById('testimonial-edit-id').value = test.id;
  document.getElementById('test-name').value = test.name;
  document.getElementById('test-role').value = test.role;
  document.getElementById('test-rating').value = test.rating;
  document.getElementById('test-quote').value = test.quote;
  document.getElementById('testimonialForm').scrollIntoView({ behavior: 'smooth' });
}
async function deleteTestimonial(id) {
  if (!confirm('Are you sure you want to delete this guest review?')) return;
  
  websiteData.testimonials = websiteData.testimonials.filter(t => t.id !== id);
  await saveWebsiteConfig('Review testimonial deleted.');
}
// --- CONFIG GENERAL SETTINGS FORM ---
function bindSettingsForm() {
  if (!websiteData.banner || !websiteData.contact) return;
  
  document.getElementById('set-headline').value = websiteData.banner.headline;
  document.getElementById('set-subheading').value = websiteData.banner.subheading;
  
  document.getElementById('set-phone').value = websiteData.contact.phone;
  document.getElementById('set-email').value = websiteData.contact.email;
  document.getElementById('set-whatsapp').value = websiteData.contact.whatsapp;
  document.getElementById('set-address').value = websiteData.contact.address;
  document.getElementById('set-hours').value = websiteData.contact.workingHours;
  document.getElementById('set-map').value = websiteData.contact.mapEmbed;
}
// --- SUBMIT EDITORS (INTERCEPTS & SAVE TO CONFIG) ---
function initForms() {
  
  // Save Movie Form
  const movieForm = document.getElementById('movieForm');
  movieForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(movieForm);
    const data = Object.fromEntries(formData.entries());
    // Format showtimes today/tomorrow
    const showsToday = data.showsToday ? data.showsToday.split(',').map(s => s.trim()).filter(Boolean) : [];
    const showsTomorrow = data.showsTomorrow ? data.showsTomorrow.split(',').map(s => s.trim()).filter(Boolean) : [];
    const movieObj = {
      id: data.id || `movie_${Date.now()}`,
      title: data.title,
      genre: data.genre,
      duration: data.duration,
      language: data.language,
      rating: data.rating,
      poster: data.poster,
      status: data.status,
      shows: {
        today: showsToday,
        tomorrow: showsTomorrow,
        upcoming: showsToday // fallback
      }
    };
    if (data.id) {
      // Edit
      const idx = websiteData.movies.findIndex(m => m.id === data.id);
      if (idx !== -1) websiteData.movies[idx] = movieObj;
    } else {
      // Add new
      websiteData.movies.push(movieObj);
    }
    const success = await saveWebsiteConfig('Movie list settings saved.');
    if (success) clearMovieForm();
  });
  // Save Menu Form
  const menuForm = document.getElementById('menuForm');
  menuForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(menuForm);
    const data = Object.fromEntries(formData.entries());
    const dishObj = {
      id: data.id || `dish_${Date.now()}`,
      name: data.name,
      category: data.category,
      price: parseFloat(data.price),
      image: data.image,
      isChefSpecial: document.getElementById('menu-chef-special').checked,
      description: data.description
    };
    if (data.id) {
      const idx = websiteData.menu.findIndex(d => d.id === data.id);
      if (idx !== -1) websiteData.menu[idx] = dishObj;
    } else {
      websiteData.menu.push(dishObj);
    }
    const success = await saveWebsiteConfig('Menu dish settings saved.');
    if (success) clearMenuForm();
  });
  // Add Gallery Form
  const galleryForm = document.getElementById('galleryForm');
  galleryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(galleryForm);
    const data = Object.fromEntries(formData.entries());
    const imgObj = {
      id: `img_${Date.now()}`,
      url: data.url,
      category: data.category
    };
    websiteData.gallery.unshift(imgObj);
    const success = await saveWebsiteConfig('Image added to gallery database.');
    if (success) galleryForm.reset();
  });
  // Save Offer Form
  const offerForm = document.getElementById('offerForm');
  offerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(offerForm);
    const data = Object.fromEntries(formData.entries());
    const offerObj = {
      id: data.id || `offer_${Date.now()}`,
      title: data.title,
      code: data.code,
      discount: data.discount,
      validity: data.validity,
      description: data.description
    };
    if (data.id) {
      const idx = websiteData.offers.findIndex(o => o.id === data.id);
      if (idx !== -1) websiteData.offers[idx] = offerObj;
    } else {
      websiteData.offers.push(offerObj);
    }
    const success = await saveWebsiteConfig('Promotion offer saved.');
    if (success) clearOfferForm();
  });
  // Save Testimonial Form
  const testimonialForm = document.getElementById('testimonialForm');
  testimonialForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(testimonialForm);
    const data = Object.fromEntries(formData.entries());
    const testObj = {
      id: data.id || `test_${Date.now()}`,
      name: data.name,
      role: data.role,
      rating: parseInt(data.rating),
      quote: data.quote
    };
    if (data.id) {
      const idx = websiteData.testimonials.findIndex(t => t.id === data.id);
      if (idx !== -1) websiteData.testimonials[idx] = testObj;
    } else {
      websiteData.testimonials.push(testObj);
    }
    const success = await saveWebsiteConfig('Patron testimonial saved.');
    if (success) clearTestimonialForm();
  });
  // Save General Settings Form
  const settingsForm = document.getElementById('settingsForm');
  settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(settingsForm);
    const data = Object.fromEntries(formData.entries());
    websiteData.banner.headline = data.headline;
    websiteData.banner.subheading = data.subheading;
    websiteData.contact.phone = data.phone;
    websiteData.contact.email = data.email;
    websiteData.contact.whatsapp = data.whatsapp;
    websiteData.contact.address = data.address;
    websiteData.contact.workingHours = data.workingHours;
    websiteData.contact.mapEmbed = data.mapEmbed;
    await saveWebsiteConfig('General banner and contact configurations updated.');
  });
}
// --- TOAST NOTIFICATIONS HELPER ---
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = '<i class="fa-solid fa-circle-check" style="color: #30D158;"></i>';
  if (type === 'error') {
    icon = '<i class="fa-solid fa-triangle-exclamation" style="color: #FF3B30;"></i>';
  }
  toast.innerHTML = `
    ${icon}
    <span>${message}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastIn 0.3s ease reverse forwards';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 5000);
}
