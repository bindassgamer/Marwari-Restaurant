// --- GLOBAL STATE ---
let websiteData = null;
let currentLightboxIndex = 0;
let currentLightboxCategory = 'All';
let testimonialInterval = null;
let currentTestimonialIndex = 0;
// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Routing
  initRouter();
  // Load Website Content
  loadContent();
  // Initialize Header Scroll Behavior
  initHeaderScroll();
  // Initialize Mobile Nav Drawer
  initMobileNav();
  // Initialize Form Submissions
  initForms();
});
// --- CLIENT-SIDE SPA ROUTER ---
function initRouter() {
  const handleRoute = () => {
    let hash = window.location.hash || '#home';
    
    // Smooth transition between sections
    const sections = document.querySelectorAll('.page-section');
    let targetSection = document.querySelector(hash);
    
    if (!targetSection) {
      hash = '#home';
      targetSection = document.querySelector('#home');
    }
    sections.forEach(sec => {
      sec.classList.remove('active-view');
    });
    targetSection.classList.add('active-view');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Update active state in Navigation Links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      if (link.getAttribute('href') === hash) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
    // Close mobile nav drawer if open
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    if (navToggle && navToggle.classList.contains('open')) {
      navToggle.classList.remove('open');
      navMenu.classList.remove('open');
    }
  };
  window.addEventListener('hashchange', handleRoute);
  // Trigger initial route match
  handleRoute();
}
// --- HEADER SCROLL ACTION ---
function initHeaderScroll() {
  const header = document.getElementById('mainHeader');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });
}
// --- MOBILE NAVIGATION BAR ---
function initMobileNav() {
  const toggle = document.getElementById('navToggle');
  const menu = document.getElementById('navMenu');
  toggle.addEventListener('click', () => {
    toggle.classList.toggle('open');
    menu.classList.toggle('open');
  });
}
// --- API DATA FETCH & BINDING ---
async function loadContent() {
  const loader = document.getElementById('pageLoader');
  try {
    const res = await fetch('/api/content');
    const result = await res.json();
    
    if (result.success) {
      websiteData = result.data;
      bindDynamicData();
    } else {
      showToast('Failed to load page config', 'error');
    }
  } catch (error) {
    console.error('Error fetching website configs:', error);
    showToast('Network error loading configurations', 'error');
  } finally {
    // Dismiss page loader with a slight fade
    if (loader) {
      loader.classList.add('fade-out');
    }
  }
}
function bindDynamicData() {
  if (!websiteData) return;
  // Bind Home Banner Texts
  if (websiteData.banner) {
    const hl = document.getElementById('heroHeadline');
    const sh = document.getElementById('heroSubheading');
    if (hl) hl.innerHTML = websiteData.banner.headline.replace('\n', '<br>');
    if (sh) sh.innerText = websiteData.banner.subheading;
  }
  // Bind Contact Information
  if (websiteData.contact) {
    const phoneNodes = document.querySelectorAll('#contactPhone');
    const emailNodes = document.querySelectorAll('#contactEmail');
    const addressNodes = document.querySelectorAll('#contactAddress');
    const hoursNode = document.getElementById('contactHours');
    const mapNode = document.getElementById('contactMap');
    const whatsappNode = document.getElementById('contactWhatsapp');
    phoneNodes.forEach(n => n.innerText = websiteData.contact.phone);
    emailNodes.forEach(n => n.innerText = websiteData.contact.email);
    addressNodes.forEach(n => n.innerText = websiteData.contact.address);
    if (hoursNode) hoursNode.innerText = websiteData.contact.workingHours;
    if (mapNode && websiteData.contact.mapEmbed) mapNode.src = websiteData.contact.mapEmbed;
    
    if (whatsappNode && websiteData.contact.whatsapp) {
      whatsappNode.href = `https://wa.me/${websiteData.contact.whatsapp}`;
    }
  }
  // Bind Testimonials
  if (websiteData.testimonials && websiteData.testimonials.length > 0) {
    renderTestimonials(websiteData.testimonials);
  }
  // Bind Homepage Gallery Highlights (First 4 items)
  if (websiteData.gallery && websiteData.gallery.length > 0) {
    renderHomeGallery(websiteData.gallery.slice(0, 4));
    renderFullGallery(websiteData.gallery);
  }
  // Bind Restaurant Specials
  if (websiteData.menu && websiteData.menu.length > 0) {
    renderChefSpecials(websiteData.menu.filter(item => item.isChefSpecial));
    renderFullMenu(websiteData.menu);
  }
  // Bind Special Offers
  if (websiteData.offers && websiteData.offers.length > 0) {
    renderOffers(websiteData.offers);
  }
  // Bind Theatre Movies
  if (websiteData.movies && websiteData.movies.length > 0) {
    renderMovies(websiteData.movies);
  }
}
// --- RENDER TESTIMONIALS SLIDER ---
function renderTestimonials(testimonials) {
  const slider = document.getElementById('testimonialsSlider');
  const dotsContainer = document.getElementById('sliderDots');
  if (!slider) return;
  slider.innerHTML = '';
  if (dotsContainer) dotsContainer.innerHTML = '';
  testimonials.forEach((item, index) => {
    // Create testimonial slide
    const slide = document.createElement('div');
    slide.className = `testimonial-slide ${index === 0 ? 'active' : ''}`;
    
    let starsHtml = '';
    for (let i = 0; i < item.rating; i++) {
      starsHtml += '<i class="fa-solid fa-star"></i>';
    }
    slide.innerHTML = `
      <div class="test-stars">${starsHtml}</div>
      <p class="test-quote">${item.quote}</p>
      <div class="test-name">${item.name}</div>
      <div class="test-role">${item.role}</div>
    `;
    slider.appendChild(slide);
    // Create slider dot
    if (dotsContainer) {
      const dot = document.createElement('span');
      dot.className = `dot ${index === 0 ? 'active' : ''}`;
      dot.addEventListener('click', () => {
        goToTestimonial(index);
      });
      dotsContainer.appendChild(dot);
    }
  });
  // Start auto play slider
  startTestimonialSlider();
}
function startTestimonialSlider() {
  if (testimonialInterval) clearInterval(testimonialInterval);
  testimonialInterval = setInterval(() => {
    if (!websiteData || !websiteData.testimonials) return;
    let nextIndex = (currentTestimonialIndex + 1) % websiteData.testimonials.length;
    goToTestimonial(nextIndex);
  }, 6000);
}
function goToTestimonial(index) {
  const slides = document.querySelectorAll('.testimonial-slide');
  const dots = document.querySelectorAll('.testimonials-section .dot');
  if (slides.length === 0) return;
  slides.forEach((slide, idx) => {
    slide.classList.remove('active', 'prev');
    if (idx === index) {
      slide.classList.add('active');
    } else if (idx === currentTestimonialIndex) {
      slide.classList.add('prev');
    }
  });
  dots.forEach((dot, idx) => {
    if (idx === index) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });
  currentTestimonialIndex = index;
  startTestimonialSlider(); // Reset timer
}
// --- RENDER GALLERY ---
function renderHomeGallery(items) {
  const container = document.getElementById('homeGalleryGrid');
  if (!container) return;
  container.innerHTML = '';
  items.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'gallery-item';
    div.onclick = () => openLightbox(index, 'Highlight');
    div.innerHTML = `
      <img src="${item.url}" alt="${item.category}" class="gallery-img" loading="lazy">
      <div class="gallery-overlay">
        <div class="gallery-overlay-icon"><i class="fa-solid fa-magnifying-glass-plus"></i></div>
        <div class="gallery-overlay-title">View Image</div>
        <div class="gallery-overlay-cat">${item.category}</div>
      </div>
    `;
    container.appendChild(div);
  });
}
function renderFullGallery(items) {
  const container = document.getElementById('fullGalleryGrid');
  if (!container) return;
  container.innerHTML = '';
  items.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'gallery-item';
    div.dataset.category = item.category;
    div.onclick = () => openLightbox(index, 'All');
    div.innerHTML = `
      <img src="${item.url}" alt="${item.category}" class="gallery-img" loading="lazy">
      <div class="gallery-overlay">
        <div class="gallery-overlay-icon"><i class="fa-solid fa-magnifying-glass-plus"></i></div>
        <div class="gallery-overlay-title">View Image</div>
        <div class="gallery-overlay-cat">${item.category}</div>
      </div>
    `;
    container.appendChild(div);
  });
}
function filterGallery(category) {
  // Update tabs active state
  const tabs = document.querySelectorAll('#galleryTabs .filter-btn');
  tabs.forEach(tab => {
    if (tab.innerText.toLowerCase().includes(category.toLowerCase()) || 
       (category === 'All' && tab.innerText.toLowerCase() === 'all') ||
       (category === 'Banquet' && tab.innerText.toLowerCase().includes('lawn'))) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
  currentLightboxCategory = category;
  const items = document.querySelectorAll('#fullGalleryGrid .gallery-item');
  items.forEach((item, index) => {
    const cat = item.dataset.category;
    if (category === 'All') {
      item.style.display = 'block';
    } else if (category === 'Banquet' && cat === 'Banquet') {
      item.style.display = 'block';
    } else if (cat.toLowerCase().includes(category.toLowerCase())) {
      item.style.display = 'block';
    } else {
      item.style.display = 'none';
    }
  });
}
// --- LIGHTBOX CONTROLS ---
function openLightbox(index, categoryContext) {
  const lightbox = document.getElementById('galleryLightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  if (!lightbox || !lightboxImg || !websiteData) return;
  currentLightboxCategory = categoryContext;
  
  let sourceArray = websiteData.gallery;
  if (categoryContext === 'Highlight') {
    sourceArray = websiteData.gallery.slice(0, 4);
  } else if (categoryContext !== 'All') {
    sourceArray = websiteData.gallery.filter(item => {
      if (categoryContext === 'Banquet') return item.category === 'Banquet';
      return item.category.toLowerCase().includes(categoryContext.toLowerCase());
    });
  }
  // Find index in filtered source array
  let item = null;
  if (categoryContext === 'Highlight' || categoryContext === 'All') {
    currentLightboxIndex = index;
    item = sourceArray[index];
  } else {
    // Context is filtered category
    const originalItem = websiteData.gallery[index];
    currentLightboxIndex = sourceArray.findIndex(x => x.id === originalItem.id);
    item = sourceArray[currentLightboxIndex];
  }
  if (item) {
    lightboxImg.src = item.url;
    lightbox.classList.add('open');
  }
}
function closeLightbox() {
  const lightbox = document.getElementById('galleryLightbox');
  if (lightbox) lightbox.classList.remove('open');
}
function navigateLightbox(direction) {
  const lightboxImg = document.getElementById('lightboxImg');
  if (!lightboxImg || !websiteData) return;
  let sourceArray = websiteData.gallery;
  if (currentLightboxCategory === 'Highlight') {
    sourceArray = websiteData.gallery.slice(0, 4);
  } else if (currentLightboxCategory !== 'All') {
    sourceArray = websiteData.gallery.filter(item => {
      if (currentLightboxCategory === 'Banquet') return item.category === 'Banquet';
      return item.category.toLowerCase().includes(currentLightboxCategory.toLowerCase());
    });
  }
  currentLightboxIndex = (currentLightboxIndex + direction + sourceArray.length) % sourceArray.length;
  const item = sourceArray[currentLightboxIndex];
  if (item) {
    lightboxImg.src = item.url;
  }
}
// Close lightbox on click outside image
document.getElementById('galleryLightbox').addEventListener('click', (e) => {
  if (e.target.id === 'galleryLightbox') {
    closeLightbox();
  }
});
// --- RENDER MENU & SPECIALS ---
function renderChefSpecials(items) {
  const container = document.getElementById('chefSpecialsGrid');
  if (!container) return;
  container.innerHTML = '';
  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'special-dish-card glass-card';
    card.innerHTML = `
      <img src="${item.image}" alt="${item.name}" class="special-dish-img" loading="lazy">
      <div class="special-dish-details">
        <div class="dish-header">
          <h4 class="dish-name">${item.name} <span class="dish-badge">Signature</span></h4>
          <span class="dish-price">₹${item.price}</span>
        </div>
        <p class="dish-desc">${item.description}</p>
      </div>
    `;
    container.appendChild(card);
  });
}
function renderFullMenu(items) {
  const container = document.getElementById('menuGrid');
  if (!container) return;
  container.innerHTML = '';
  items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'menu-item-row';
    row.dataset.category = item.category;
    row.innerHTML = `
      <div class="menu-item-info">
        <h4 class="menu-item-title">
          ${item.name} 
          ${item.isChefSpecial ? '<span class="dish-badge">Chef Choice</span>' : ''}
        </h4>
        <p class="menu-item-desc">${item.description}</p>
      </div>
      <span class="menu-item-price">₹${item.price}</span>
    `;
    container.appendChild(row);
  });
}
function filterMenu(category) {
  // Update tab highlights
  const tabs = document.querySelectorAll('#menuTabs .filter-btn');
  tabs.forEach(tab => {
    if (tab.innerText.toLowerCase() === category.toLowerCase()) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
  const items = document.querySelectorAll('#menuGrid .menu-item-row');
  items.forEach(item => {
    const cat = item.dataset.category;
    if (category === 'All' || cat.toLowerCase() === category.toLowerCase()) {
      item.style.display = 'flex';
    } else {
      item.style.display = 'none';
    }
  });
}
// --- RENDER OFFERS ---
function renderOffers(offers) {
  const container = document.getElementById('offersGrid');
  if (!container) return;
  container.innerHTML = '';
  offers.forEach(offer => {
    const card = document.createElement('div');
    card.className = 'offer-card glass-card';
    card.innerHTML = `
      <span class="offer-badge">${offer.discount}</span>
      <h4 class="offer-title">${offer.title}</h4>
      <p class="offer-desc">${offer.description}</p>
      <div class="offer-footer">
        <span class="offer-code">${offer.code}</span>
        <span class="offer-validity">${offer.validity}</span>
      </div>
    `;
    container.appendChild(card);
  });
}
// --- RENDER CINEMA MOVIES ---
function renderMovies(movies) {
  const nowShowingGrid = document.getElementById('nowShowingGrid');
  const comingSoonGrid = document.getElementById('comingSoonGrid');
  if (!nowShowingGrid || !comingSoonGrid) return;
  nowShowingGrid.innerHTML = '';
  comingSoonGrid.innerHTML = '';
  movies.forEach(movie => {
    const card = document.createElement('div');
    card.className = 'movie-card glass-card';
    
    // Metadata block
    let metaHtml = `
      <span><i class="fa-regular fa-clock"></i> ${movie.duration}</span>
      <span><i class="fa-regular fa-closed-captioning"></i> ${movie.language}</span>
    `;
    
    // Show timings logic
    let showtimesHtml = '';
    if (movie.status === 'now-showing') {
      let todayShowtimes = '';
      if (movie.shows && movie.shows.today && movie.shows.today.length > 0) {
        movie.shows.today.forEach(time => {
          todayShowtimes += `<button type="button" class="showtime-chip" onclick="openTheatreBooking('${movie.id}', '${movie.title.replace(/'/g, "\\'")}', 'Today', '${time}')">${time}</button>`;
        });
      } else {
        todayShowtimes = '<span style="font-size: 0.8rem; color: var(--color-text-muted);">No shows scheduled today.</span>';
      }
      showtimesHtml = `
        <div class="showtimes-box">
          <span class="showtimes-label">Today's Timings</span>
          <div class="showtimes-list">${todayShowtimes}</div>
        </div>
      `;
    }
    card.innerHTML = `
      <div class="movie-poster-wrapper">
        <img src="${movie.poster}" alt="${movie.title}" class="movie-poster" loading="lazy">
        <span class="movie-rating-badge">${movie.rating}</span>
      </div>
      <div class="movie-details">
        <div class="movie-meta">${metaHtml}</div>
        <h4 class="movie-title">${movie.title}</h4>
        <p style="font-size: 0.85rem; color: var(--color-gold); text-transform: uppercase; margin-bottom: 12px;">${movie.genre}</p>
        ${showtimesHtml}
      </div>
    `;
    if (movie.status === 'now-showing') {
      nowShowingGrid.appendChild(card);
    } else {
      comingSoonGrid.appendChild(card);
    }
  });
  if (nowShowingGrid.children.length === 0) {
    nowShowingGrid.innerHTML = '<p class="section-subtitle" style="grid-column: 1/-1;">No movies scheduled currently.</p>';
  }
  if (comingSoonGrid.children.length === 0) {
    comingSoonGrid.innerHTML = '<p class="section-subtitle" style="grid-column: 1/-1;">Stay tuned for upcoming trailers!</p>';
  }
}
// --- BOOKING MODALS TOGGLE ---
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}
function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
}
function openBookingSelector() {
  openModal('bookingSelectorModal');
}
function selectRestaurantBooking() {
  closeModal('bookingSelectorModal');
  openModal('restaurantBookingModal');
}
function selectLawnBooking() {
  closeModal('bookingSelectorModal');
  window.location.hash = '#lawn';
  // Scroll to Lawn Booking form
  setTimeout(() => {
    const el = document.getElementById('lawnBookingForm');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 300);
}
function openRestaurantBooking() {
  openModal('restaurantBookingModal');
}
function openLawnBooking() {
  window.location.hash = '#lawn';
  setTimeout(() => {
    const el = document.getElementById('lawnBookingForm');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 300);
}
// --- CINEMA SHOWTIME BOOKING FORM ---
function openTheatreBooking(movieId, title, day, time) {
  const modal = document.getElementById('theatreBookingModal');
  const titleSpan = document.getElementById('theatreModalMovieName');
  const movieIdInput = document.getElementById('theatre-movie-id');
  const movieTitleInput = document.getElementById('theatre-movie-title');
  const dateSelect = document.getElementById('t-date');
  const timeSelect = document.getElementById('t-time');
  if (!modal || !websiteData) return;
  titleSpan.innerText = title;
  movieIdInput.value = movieId;
  movieTitleInput.value = title;
  dateSelect.value = day;
  // Find matching movie showtimes
  const movie = websiteData.movies.find(m => m.id === movieId);
  if (movie && movie.shows) {
    const times = day === 'Today' ? movie.shows.today : movie.shows.tomorrow;
    timeSelect.innerHTML = '';
    times.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.innerText = t;
      if (t === time) opt.selected = true;
      timeSelect.appendChild(opt);
    });
  }
  openModal('theatreBookingModal');
}
function updateModalShowtimes() {
  const movieId = document.getElementById('theatre-movie-id').value;
  const day = document.getElementById('t-date').value;
  const timeSelect = document.getElementById('t-time');
  if (!websiteData) return;
  const movie = websiteData.movies.find(m => m.id === movieId);
  if (movie && movie.shows) {
    const times = day === 'Today' ? movie.shows.today : movie.shows.tomorrow;
    timeSelect.innerHTML = '';
    times.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.innerText = t;
      timeSelect.appendChild(opt);
    });
  }
}
// --- FORM POST SUBMISSIONS ---
function initForms() {
  // General Contact Form
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(contactForm);
      const data = Object.fromEntries(formData.entries());
      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await res.json();
        if (result.success) {
          showToast(result.message, 'success');
          contactForm.reset();
        } else {
          showToast(result.message || 'Submission failed', 'error');
        }
      } catch (err) {
        showToast('Network error submitting contact request', 'error');
      }
    });
  }
  // Restaurant Table Booking Form
  const resForm = document.getElementById('restaurantBookingForm');
  if (resForm) {
    resForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(resForm);
      const data = Object.fromEntries(formData.entries());
      try {
        const res = await fetch('/api/book/restaurant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await res.json();
        if (result.success) {
          showToast(result.message, 'success');
          resForm.reset();
          closeModal('restaurantBookingModal');
        } else {
          showToast(result.message || 'Reservation failed', 'error');
        }
      } catch (err) {
        showToast('Network error reserving table', 'error');
      }
    });
  }
  // Event Lawn Booking Form
  const lawnForm = document.getElementById('lawnBookingForm');
  if (lawnForm) {
    lawnForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(lawnForm);
      const data = Object.fromEntries(formData.entries());
      try {
        const res = await fetch('/api/book/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await res.json();
        if (result.success) {
          showToast(result.message, 'success');
          lawnForm.reset();
        } else {
          showToast(result.message || 'Submission failed', 'error');
        }
      } catch (err) {
        showToast('Network error lodging event inquiry', 'error');
      }
    });
  }
  // Cinema Recliner Booking Form
  const theatreForm = document.getElementById('theatreBookingForm');
  if (theatreForm) {
    theatreForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(theatreForm);
      const data = Object.fromEntries(formData.entries());
      // We package movie info into the restaurant reservation API to keep backend simple
      const payload = {
        name: data.name,
        phone: data.phone,
        email: data.email,
        bookingDate: data.bookingDate,
        bookingTime: data.bookingTime,
        guests: data.guests,
        specialRequest: `Cinema Seat Booking - Movie: ${data.movieTitle}, Recliners: ${data.guests}, Time Slot: ${data.bookingTime} (${data.bookingDate})`
      };
      try {
        const res = await fetch('/api/book/restaurant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result.success) {
          showToast('Thank you! Your cinema seats have been reserved successfully.', 'success');
          theatreForm.reset();
          closeModal('theatreBookingModal');
        } else {
          showToast(result.message || 'Seat booking failed', 'error');
        }
      } catch (err) {
        showToast('Network error booking movie seats', 'error');
      }
    });
  }
}
// --- HERO BACKGROUND BANNER SLIDER ---
let heroSlideIndex = 0;
function nextHeroSlide() {
  const slides = document.querySelectorAll('.hero-slide');
  if (slides.length === 0) return;
  slides[heroSlideIndex].classList.remove('active');
  heroSlideIndex = (heroSlideIndex + 1) % slides.length;
  slides[heroSlideIndex].classList.add('active');
}
setInterval(nextHeroSlide, 5000);
// --- SCROLL TO ABOUT ---
function scrollToAbout() {
  const el = document.getElementById('aboutPreviewSection');
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
  }
}
// --- TOAST NOTIFICATIONS WRAPPER ---
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = '<i class="fa-solid fa-circle-check" style="color: #25D366;"></i>';
  if (type === 'error') {
    icon = '<i class="fa-solid fa-triangle-exclamation" style="color: #FF3B30;"></i>';
  }
  toast.innerHTML = `
    ${icon}
    <span>${message}</span>
  `;
  container.appendChild(toast);
  // Auto remove toast after 5s
  setTimeout(() => {
    toast.style.animation = 'toastIn 0.3s ease reverse forwards';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 5000);
}
