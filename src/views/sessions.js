import { cartStore } from '../store/cartStore.js';

export function createSessionsView({ navigateTo }) {
  const container = document.createElement('div');
  container.className = 'view-page sessions-view';
  container.id = 'sessions-view-content';

  const SESSION_TYPES = [
    {
      id: 'sess-mentorship',
      title: '1-on-1 Production Mentorship',
      duration: '60 minutes',
      price: 75,
      tag: 'Most Popular',
      desc: 'Deep dive into your DAW project files. We unpack drum synthesis, chord voicings, arrangement tension, and sound design techniques tailored to your style.',
      features: [
        'Live screen share & real-time feedback',
        'Ableton, FL Studio, Logic, or Pro Tools',
        'Custom MIDI & preset packs sent after session',
        'Full 1080p recording of our session provided'
      ]
    },
    {
      id: 'sess-mixing',
      title: 'Live Remote Mixing Session',
      duration: '90 minutes',
      price: 120,
      tag: 'Artist Favorite',
      desc: 'Sit in the virtual engineer chair. Using lossless Audiomovers Listento audio streaming, you hear every EQ cut, compressor clamp, and spatial delay in real time.',
      features: [
        'Audiomovers 32-bit lossless streaming (no latency)',
        'Vocal chain calibration and de-masking',
        'Analog modeled saturation & bus gluing',
        'Immediate test bounce delivered at session end'
      ]
    },
    {
      id: 'sess-vocal',
      title: 'Vocal Recording & Direction',
      duration: '120 minutes',
      price: 150,
      tag: 'Studio Classic',
      desc: 'Real-time vocal production guidance. From microphone technique and room acoustics to live harmony stacks, ad-lib comping, and timing correction.',
      features: [
        'Tone placement & phrasing coaching',
        'Live Melodyne comping direction',
        'Stacking triples, harmonies & ad-libs',
        'Pre-mixed rough vocal stem export'
      ]
    },
    {
      id: 'sess-consult',
      title: 'Track Critique & Release Strategy',
      duration: '45 minutes',
      price: 50,
      tag: 'Quick Consult',
      desc: 'Pre-release sonic check. We compare your mix against billboard commercial references, check phase coherence, mono fold-down, and Spotify/Apple loudness limits.',
      features: [
        'Metered LUFS & true-peak headroom audit',
        'Low-end translation test on 3 reference systems',
        'Arrangement pacing & transition audit',
        'Written checklist with actionable fix notes'
      ]
    }
  ];

  let selectedSession = SESSION_TYPES[0];
  let selectedDate = null;
  let selectedTime = null;

  // Generate next 14 available dates
  const availableDates = [];
  const now = new Date();
  for (let i = 1; i <= 14; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    // Skip Sundays
    if (d.getDay() !== 0) {
      availableDates.push({
        dateObj: d,
        iso: d.toISOString().split('T')[0],
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        monthName: d.toLocaleDateString('en-US', { month: 'short' }),
        dayNum: d.getDate()
      });
    }
  }
  selectedDate = availableDates[0].iso;

  const timeSlots = [
    '11:00 AM EST',
    '01:30 PM EST',
    '04:00 PM EST',
    '06:30 PM EST',
    '08:30 PM EST'
  ];
  selectedTime = timeSlots[0];

  container.innerHTML = `
    <div class="view-hero">
      <div class="view-pill-tag">Live Studio Sessions · Audiomovers Lossless Feed</div>
      <h1 class="view-title">Book a Studio Session</h1>
      <p class="view-subtitle">Work directly with Eko via high-definition audio link. Whether breaking through beat block or perfecting an album mix, reserve your session below.</p>
    </div>

    <div class="sessions-layout">
      <!-- Session Cards Column -->
      <div class="sessions-selection">
        <h2 class="view-section-label">1. Choose Session Format</h2>
        <div class="session-cards" id="session-cards">
          ${SESSION_TYPES.map(sess => `
            <div class="session-type-card ${sess.id === selectedSession.id ? 'active' : ''}" data-id="${sess.id}">
              <div class="sess-header">
                <div>
                  <span class="sess-tag">${sess.tag}</span>
                  <h3 class="sess-title">${sess.title}</h3>
                </div>
                <div class="sess-price-block">
                  <span class="sess-price">$${sess.price}</span>
                  <span class="sess-dur">${sess.duration}</span>
                </div>
              </div>
              <p class="sess-desc">${sess.desc}</p>
              <ul class="sess-features">
                ${sess.features.map(f => `<li>✓ ${f}</li>`).join('')}
              </ul>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Booking Form & Calendar Column -->
      <div class="sessions-booking-panel">
        <div class="booking-panel-shell">
          <h2 class="view-section-label">2. Select Date &amp; Time</h2>
          
          <div class="dates-scroll-wrap">
            <div class="dates-scroll" id="dates-scroll">
              ${availableDates.map(d => `
                <button type="button" class="date-chip ${d.iso === selectedDate ? 'active' : ''}" data-iso="${d.iso}">
                  <span class="date-weekday">${d.dayName}</span>
                  <strong class="date-num">${d.dayNum}</strong>
                  <span class="date-month">${d.monthName}</span>
                </button>
              `).join('')}
            </div>
          </div>

          <div class="time-slots-wrap">
            <label class="input-label">Available Time Slots (EST):</label>
            <div class="time-slots-grid" id="time-slots-grid">
              ${timeSlots.map(t => `
                <button type="button" class="time-slot-chip ${t === selectedTime ? 'active' : ''}" data-time="${t}">
                  ${t}
                </button>
              `).join('')}
            </div>
          </div>

          <h2 class="view-section-label" style="margin-top: 28px;">3. Artist Information</h2>
          <form class="booking-form" id="session-booking-form">
            <div class="form-row">
              <label>Artist / Producer Name
                <input type="text" name="name" required placeholder="e.g. Maya Lin" autocomplete="name">
              </label>
              <label>Email Address
                <input type="email" name="email" required placeholder="you@email.com" autocomplete="email">
              </label>
            </div>
            <div class="form-row">
              <label>Primary DAW
                <select name="daw" required>
                  <option value="Ableton Live">Ableton Live</option>
                  <option value="FL Studio">FL Studio</option>
                  <option value="Logic Pro">Logic Pro</option>
                  <option value="Pro Tools">Pro Tools</option>
                  <option value="Cubase / Studio One">Cubase / Studio One</option>
                  <option value="Reaper / Other">Reaper / Other</option>
                </select>
              </label>
              <label>Project Genre / Style
                <input type="text" name="genre" placeholder="e.g. Dark R&amp;B / Hyperpop">
              </label>
            </div>
            <label>Session Goals &amp; Project Links
              <textarea name="notes" rows="3" placeholder="Paste Dropbox, Google Drive, or SoundCloud private link. Tell me what we'll be focusing on..."></textarea>
            </label>

            <div class="booking-summary-box">
              <div class="summary-line">
                <span id="summary-session-name">${selectedSession.title}</span>
                <strong id="summary-session-price">$${selectedSession.price}</strong>
              </div>
              <div class="summary-sub" id="summary-session-meta">
                ${selectedDate} · ${selectedTime} (${selectedSession.duration})
              </div>
            </div>

            <button type="submit" class="button button-primary cta-button" id="book-session-btn" style="width: 100%; border-radius: 999px;">
              Book &amp; Add to Cart <span aria-hidden="true">›</span>
            </button>
            <p class="form-status" id="booking-status"></p>
          </form>
        </div>
      </div>
    </div>
  `;

  // Event handlers
  const sessionCards = container.querySelectorAll('.session-type-card');
  const dateChips = container.querySelectorAll('.date-chip');
  const timeChips = container.querySelectorAll('.time-slot-chip');
  const summaryName = container.querySelector('#summary-session-name');
  const summaryPrice = container.querySelector('#summary-session-price');
  const summaryMeta = container.querySelector('#summary-session-meta');
  const bookingForm = container.querySelector('#session-booking-form');
  const bookingStatus = container.querySelector('#booking-status');

  function updateSummary() {
    summaryName.textContent = selectedSession.title;
    summaryPrice.textContent = `$${selectedSession.price}`;
    summaryMeta.textContent = `${selectedDate} · ${selectedTime} (${selectedSession.duration})`;
  }

  sessionCards.forEach(card => {
    card.addEventListener('click', () => {
      sessionCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      selectedSession = SESSION_TYPES.find(s => s.id === card.dataset.id);
      updateSummary();
    });
  });

  dateChips.forEach(chip => {
    chip.addEventListener('click', () => {
      dateChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      selectedDate = chip.dataset.iso;
      updateSummary();
    });
  });

  timeChips.forEach(chip => {
    chip.addEventListener('click', () => {
      timeChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      selectedTime = chip.dataset.time;
      updateSummary();
    });
  });

  bookingForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(bookingForm);
    const artistName = formData.get('name');
    const artistEmail = formData.get('email');
    const daw = formData.get('daw');
    const genre = formData.get('genre') || 'Music';
    const notes = formData.get('notes') || '';

    cartStore.addItem({
      id: `session-${selectedSession.id}-${selectedDate}`,
      title: selectedSession.title,
      category: 'Sessions',
      license: `${selectedDate} at ${selectedTime}`,
      duration: selectedSession.duration,
      price: selectedSession.price,
      artist: artistName,
      email: artistEmail,
      daw: daw,
      notes: notes
    });

    bookingStatus.textContent = 'Session reserved and added to cart! Proceeding to cart...';
    bookingStatus.style.color = 'var(--signal-bright)';

    setTimeout(() => {
      navigateTo('cart');
    }, 800);
  });

  return container;
}
