import { cartStore } from '../store/cartStore.js';
import { ordersStore } from '../store/ordersStore.js';

export function createSessionsView({ navigateTo }) {
  const container = document.createElement('div');
  container.className = 'view-page sessions-view';
  container.id = 'sessions-view-content';

  const SESSION_SERVICES = [
    {
      id: 'sess-mentorship',
      title: '1-on-1 Production Mentorship',
      desc: 'Deep dive into sound design, arrangement, drum synthesis, and mix technique.'
    },
    {
      id: 'sess-mixing',
      title: 'Live Remote Mixing Session',
      desc: 'Direct stem breakdown, EQ/compression calibration, and mix tweak review.'
    },
    {
      id: 'sess-vocal',
      title: 'Vocal Recording & Direction',
      desc: 'Real-time vocal production coaching, Melodyne tuning, and harmony stacking.'
    },
    {
      id: 'sess-consult',
      title: 'Track Critique & Release Strategy',
      desc: 'Loudness/LUFS audit, reference system check, and release-ready feedback.'
    }
  ];

  const DURATION_OPTIONS = [
    { value: '15 min', minutes: 15, price: 25, tag: 'Quick Consult' },
    { value: '30 min', minutes: 30, price: 45, tag: 'Focused Review' },
    { value: '45 min', minutes: 45, price: 65, tag: 'Standard Session' },
    { value: '60 min', minutes: 60, price: 85, tag: 'Full Deep Dive' }
  ];

  // Base IST availability slots (Indian Standard Time · UTC+05:30)
  const IST_BASE_SLOTS = [
    '11:00 AM',
    '11:30 AM',
    '12:00 PM',
    '12:30 PM',
    '04:00 PM',
    '04:30 PM',
    '05:00 PM',
    '05:30 PM',
    '06:00 PM',
    '06:30 PM',
    '08:30 PM'
  ];

  // Common regions & timezones for smart conversion
  const detectedTz = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
    } catch {
      return 'America/New_York';
    }
  })();

  const TIMEZONE_REGIONS = [
    { id: 'auto', name: `📍 Auto-detect Local Timezone (${detectedTz.split('/').pop().replace('_', ' ')})`, tz: detectedTz },
    { id: 'Asia/Kolkata', name: '🇮🇳 India (IST · UTC+5:30)', tz: 'Asia/Kolkata' },
    { id: 'America/New_York', name: '🇺🇸 US Eastern (ET · New York, Miami, Toronto)', tz: 'America/New_York' },
    { id: 'America/Chicago', name: '🇺🇸 US Central (CT · Chicago, Dallas, Houston)', tz: 'America/Chicago' },
    { id: 'America/Denver', name: '🇺🇸 US Mountain (MT · Denver, Phoenix, Calgary)', tz: 'America/Denver' },
    { id: 'America/Los_Angeles', name: '🇺🇸 US Pacific (PT · Los Angeles, SF, Seattle)', tz: 'America/Los_Angeles' },
    { id: 'Europe/London', name: '🇬🇧 United Kingdom (GMT / BST · London)', tz: 'Europe/London' },
    { id: 'Europe/Paris', name: '🇪🇺 Central Europe (CET / CEST · Paris, Berlin, Amsterdam)', tz: 'Europe/Paris' },
    { id: 'Europe/Athens', name: '🇪🇺 Eastern Europe (EET / EEST · Athens, Bucharest)', tz: 'Europe/Athens' },
    { id: 'Asia/Dubai', name: '🇦🇪 UAE / Middle East (GST · Dubai, Abu Dhabi)', tz: 'Asia/Dubai' },
    { id: 'Asia/Singapore', name: '🇸🇬 Singapore / Malaysia (SGT · Singapore, KL)', tz: 'Asia/Singapore' },
    { id: 'Asia/Tokyo', name: '🇯🇵 Japan / South Korea (JST / KST · Tokyo, Seoul)', tz: 'Asia/Tokyo' },
    { id: 'Australia/Sydney', name: '🇦🇺 Australia Eastern (AEST / AEDT · Sydney, Melbourne)', tz: 'Australia/Sydney' },
    { id: 'Pacific/Auckland', name: '🇳🇿 New Zealand (NZST / NZDT · Auckland)', tz: 'Pacific/Auckland' },
    { id: 'America/Sao_Paulo', name: '🇧🇷 Brazil (BRT · São Paulo, Rio)', tz: 'America/Sao_Paulo' }
  ];

  // Generate 7-day calendar availability strictly starting from today
  const availableDates = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const iso = d.toISOString().split('T')[0];
    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
    const fullWeekday = d.toLocaleDateString('en-US', { weekday: 'long' });
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const day = d.getDate();
    const relTag = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : weekday;

    availableDates.push({
      iso,
      dayName: fullWeekday,
      monthName: month,
      dayNum: day,
      label: `${relTag} · ${fullWeekday}, ${month} ${day}`
    });
  }

  let selectedService = SESSION_SERVICES[0];
  let selectedDuration = DURATION_OPTIONS[3]; // default 60 min
  let selectedTimezone = detectedTz;
  let selectedDateIso = availableDates[0].iso;

  // Initialize sample local appointments if not already stored
  let storedAppointments = [];
  try {
    const raw = localStorage.getItem('eko_booked_sessions');
    if (raw) {
      storedAppointments = JSON.parse(raw);
    } else {
      storedAppointments = [
        {
          service: '1-on-1 Production Mentorship',
          duration: '60 min',
          artist: 'Alex Rivera',
          email: 'alex@riverasound.com',
          location: 'Online (Meet, Zoom, Discord etc)',
          timeString: `${availableDates[1].label.split('·')[1].trim()} at 06:30 PM EDT (11:00 AM IST)`
        },
        {
          service: 'Track Critique & Release Strategy',
          duration: '30 min',
          artist: 'Maya Lin',
          email: 'maya@singersong.co',
          location: 'Online (Meet, Zoom, Discord etc)',
          timeString: `${availableDates[2].label.split('·')[1].trim()} at 04:00 PM EDT (08:30 PM IST)`
        }
      ];
      localStorage.setItem('eko_booked_sessions', JSON.stringify(storedAppointments));
    }
  } catch (err) {
    storedAppointments = [];
  }

  // Convert IST base slot to target timezone transparently
  function convertIstToTarget(dateIso, istTimeStr, targetTz) {
    const [timePart, modifier] = istTimeStr.split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;

    const [year, month, day] = dateIso.split('-').map(Number);
    // IST is UTC+05:30. Subtract 5h 30m to get UTC timestamp
    const utcDate = new Date(Date.UTC(year, month - 1, day, hours - 5, minutes - 30, 0));

    try {
      const timeFormatted = new Intl.DateTimeFormat('en-US', {
        timeZone: targetTz,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).format(utcDate);

      return {
        converted: timeFormatted,
        istRef: istTimeStr,
        display: timeFormatted
      };
    } catch {
      return {
        converted: istTimeStr,
        istRef: istTimeStr,
        display: istTimeStr
      };
    }
  }

  function getConvertedTimeSlots(dateIso, targetTz) {
    return IST_BASE_SLOTS.map(istSlot => {
      const conv = convertIstToTarget(dateIso, istSlot, targetTz);
      return {
        ist: istSlot,
        display: conv.display
      };
    });
  }

  let currentTimeSlots = getConvertedTimeSlots(selectedDateIso, selectedTimezone);

  container.innerHTML = `
    <div class="view-hero">
      <div class="view-pill-tag">Live Studio Sessions · 1-on-1 Production &amp; Mixing</div>
      <h1 class="view-title">Book a Session</h1>
      <p class="view-subtitle">Select your service, choose your preferred time slot, and reserve your 1-on-1 studio session.</p>
    </div>

    <div class="kokonut-form-container">
      <div class="kokonut-form-card" id="kokonut-form-card">
        
        <!-- Header -->
        <div class="kokonut-card-header">
          <div class="kokonut-header-left">
            <div class="kokonut-icon-badge" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 2v4"></path>
                <path d="M16 2v4"></path>
                <rect width="18" height="18" x="3" y="4" rx="2"></rect>
                <path d="M3 10h18"></path>
              </svg>
            </div>
            <div>
              <h3 class="kokonut-card-title">Schedule Appointment</h3>
              <p class="kokonut-card-subtitle">Book your next 1-on-1 studio session</p>
            </div>
          </div>
          <div class="kokonut-live-badge">
            <span class="kokonut-pulse-dot"></span> Available
          </div>
        </div>

        <!-- Form Body -->
        <form class="kokonut-card-body" id="kokonut-booking-form">
          
          <!-- Service Selector & Duration Row (Pixel-perfect Grid Alignment) -->
          <div class="kokonut-grid-service-duration">
            <div class="kokonut-select-wrap">
              <select id="session-service-select" class="kokonut-select" aria-label="Select Studio Service" required>
                ${SESSION_SERVICES.map(s => `
                  <option value="${s.id}" ${s.id === selectedService.id ? 'selected' : ''}>
                    ${s.title}
                  </option>
                `).join('')}
              </select>
              <svg class="kokonut-select-arrow" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m6 9 6 6 6-6"></path>
              </svg>
            </div>

            <!-- Duration Selector: 15 min, 30 min, 45 min, 60 min (Flush Right Aligned with Hourglass Icon) -->
            <div class="kokonut-input-icon-wrap">
              <svg class="kokonut-input-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 22h14"></path>
                <path d="M5 2h14"></path>
                <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"></path>
                <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"></path>
              </svg>
              <select id="session-duration-select" class="kokonut-select with-icon" aria-label="Session Duration" required>
                ${DURATION_OPTIONS.map(d => `
                  <option value="${d.value}" ${d.value === selectedDuration.value ? 'selected' : ''}>
                    ${d.value} ($${d.price})
                  </option>
                `).join('')}
              </select>
              <svg class="kokonut-select-arrow" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m6 9 6 6 6-6"></path>
              </svg>
            </div>
          </div>

          <!-- Timezone / Region Selector -->
          <div class="kokonut-input-icon-wrap" title="Select your timezone / region">
            <svg class="kokonut-input-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" x2="22" y1="12" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
            <select id="session-timezone-select" class="kokonut-select with-icon" aria-label="Your Region / Timezone" required>
              ${TIMEZONE_REGIONS.map(r => `
                <option value="${r.tz}" ${r.tz === selectedTimezone ? 'selected' : ''}>
                  ${r.name}
                </option>
              `).join('')}
            </select>
            <svg class="kokonut-select-arrow" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m6 9 6 6 6-6"></path>
            </svg>
          </div>

          <!-- Date & Time Row (Expanded Date Box & Collapsed Time Box) -->
          <div class="kokonut-grid-date-time">
            <!-- 7-Day Calendar Date Picker (Expanded to the right) -->
            <div class="kokonut-input-icon-wrap">
              <svg class="kokonut-input-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 2v4"></path>
                <path d="M16 2v4"></path>
                <rect width="18" height="18" x="3" y="4" rx="2"></rect>
                <path d="M3 10h18"></path>
              </svg>
              <select id="session-date-select" class="kokonut-select with-icon" aria-label="Select Date (7-Day Availability)" required>
                ${availableDates.map(d => `
                  <option value="${d.iso}">${d.label}</option>
                `).join('')}
              </select>
              <svg class="kokonut-select-arrow" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m6 9 6 6 6-6"></path>
              </svg>
            </div>

            <!-- Time Slot Picker (Collapsed / Compact Width) -->
            <div class="kokonut-input-icon-wrap">
              <svg class="kokonut-input-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 6v6l4 2"></path>
              </svg>
              <select id="session-time-select" class="kokonut-select with-icon" aria-label="Select Time Slot" required>
                ${currentTimeSlots.map(t => `
                  <option value="${t.display}">${t.display}</option>
                `).join('')}
              </select>
              <svg class="kokonut-select-arrow" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m6 9 6 6 6-6"></path>
              </svg>
            </div>
          </div>

          <!-- Artist Name & Email Row -->
          <div class="kokonut-grid-2">
            <div class="kokonut-input-icon-wrap">
              <svg class="kokonut-input-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <input type="text" id="session-artist-name" name="name" class="kokonut-input with-icon" placeholder="Your name / artist alias" required autocomplete="name" />
            </div>

            <div class="kokonut-input-icon-wrap">
              <svg class="kokonut-input-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
              </svg>
              <input type="email" id="session-artist-email" name="email" class="kokonut-input with-icon" placeholder="Email address" required autocomplete="email" />
            </div>
          </div>

          <!-- Add Focus Topic / Notes / Links -->
          <div class="kokonut-input-icon-wrap">
            <svg class="kokonut-input-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <input type="text" id="session-topic-notes" name="notes" class="kokonut-input with-icon" placeholder="Focus topic, DAW, or link (optional)" />
          </div>

          <!-- Location & Language Row (Spacious & Clean) -->
          <div class="kokonut-grid-2">
            <!-- Location (Online grouped, In-Person unavailable) -->
            <div class="kokonut-input-icon-wrap kokonut-location-wrap" title="Session Platform">
              <svg class="kokonut-input-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <select id="session-location-select" class="kokonut-select with-icon" aria-label="Select Location" required>
                <option value="Online (Meet, Zoom, Discord etc)">Online (Meet, Zoom, Discord etc)</option>
                <option value="In-Person Studio (Los Angeles / NY)" disabled>In-Person Studio (Los Angeles / NY) — Unavailable</option>
              </select>
              <svg class="kokonut-select-arrow" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m6 9 6 6 6-6"></path>
              </svg>
            </div>

            <!-- Language Badge (Fixed to English) -->
            <div class="kokonut-fixed-pill" title="All sessions are conducted in English">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" x2="22" y1="12" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              </svg>
              <span>Language: <strong>English</strong></span>
            </div>
          </div>

          <!-- Pricing Line Preview -->
          <div class="kokonut-price-preview">
            <div class="kokonut-price-info">
              <span class="kokonut-price-label">Selected Rate</span>
              <span class="kokonut-service-desc" id="kokonut-service-desc">${selectedService.title} (${selectedDuration.value})</span>
            </div>
            <strong class="kokonut-price-amount" id="kokonut-price-amount">$${selectedDuration.price}</strong>
          </div>

          <!-- Submit Button -->
          <button type="submit" class="kokonut-submit-btn" id="kokonut-schedule-btn">
            Schedule Appointment <span aria-hidden="true" style="margin-left: 4px;">›</span>
          </button>
          
          <p class="form-status" id="booking-status" style="margin-top: 6px; text-align: center;"></p>
        </form>

        <!-- Upcoming Appointments Footer Section (Tied to User Email) -->
        <div class="kokonut-card-footer">
          <div class="kokonut-footer-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 2v4"></path>
                <path d="M16 2v4"></path>
                <rect width="18" height="18" x="3" y="4" rx="2"></rect>
                <path d="M3 10h18"></path>
              </svg>
              <span>Upcoming Appointments</span>
            </div>
            <span class="kokonut-email-sync-indicator" id="email-sync-indicator">Awaiting email</span>
          </div>

          <div class="kokonut-upcoming-list" id="kokonut-upcoming-list">
            <!-- Dynamically rendered based on entered email -->
          </div>
        </div>

      </div>
    </div>
  `;

  // Interactive Elements
  const serviceSelect = container.querySelector('#session-service-select');
  const durationSelect = container.querySelector('#session-duration-select');
  const timezoneSelect = container.querySelector('#session-timezone-select');
  const dateSelect = container.querySelector('#session-date-select');
  const timeSelect = container.querySelector('#session-time-select');
  const artistEmailInput = container.querySelector('#session-artist-email');
  const locationSelect = container.querySelector('#session-location-select');
  const priceAmount = container.querySelector('#kokonut-price-amount');
  const serviceDesc = container.querySelector('#kokonut-service-desc');
  const bookingForm = container.querySelector('#kokonut-booking-form');
  const bookingStatus = container.querySelector('#booking-status');
  const upcomingListContainer = container.querySelector('#kokonut-upcoming-list');
  const emailSyncIndicator = container.querySelector('#email-sync-indicator');

  function updatePriceAndSummary() {
    serviceDesc.textContent = `${selectedService.title} (${selectedDuration.value})`;
    priceAmount.textContent = `$${selectedDuration.price}`;
  }

  function refreshTimeSlots() {
    selectedDateIso = dateSelect.value;
    currentTimeSlots = getConvertedTimeSlots(selectedDateIso, selectedTimezone);
    timeSelect.innerHTML = currentTimeSlots.map(t => `
      <option value="${t.display}">${t.display}</option>
    `).join('');
  }

  // Handle service change
  serviceSelect.addEventListener('change', () => {
    const found = SESSION_SERVICES.find(s => s.id === serviceSelect.value);
    if (found) {
      selectedService = found;
      updatePriceAndSummary();
    }
  });

  // Handle duration change (15 min, 30 min, 45 min, 60 min)
  durationSelect.addEventListener('change', () => {
    const found = DURATION_OPTIONS.find(d => d.value === durationSelect.value);
    if (found) {
      selectedDuration = found;
      updatePriceAndSummary();
    }
  });

  // Handle timezone change -> Smartly convert IST slots
  timezoneSelect.addEventListener('change', () => {
    selectedTimezone = timezoneSelect.value;
    refreshTimeSlots();
  });

  // Handle date change
  dateSelect.addEventListener('change', () => {
    refreshTimeSlots();
  });

  // Render Upcoming Appointments tied to Email
  function renderUpcomingForEmail(email) {
    const clean = (email || '').trim().toLowerCase();
    
    if (!clean) {
      emailSyncIndicator.textContent = 'Awaiting email';
      emailSyncIndicator.className = 'kokonut-email-sync-indicator';
      upcomingListContainer.innerHTML = `
        <div class="kokonut-empty-state">
          <span class="kokonut-empty-icon">✉️</span>
          <p class="kokonut-empty-msg">Enter your email above to check your upcoming scheduled sessions.</p>
        </div>
      `;
      return;
    }

    // Search stored sessions matching email
    const userAppointments = storedAppointments.filter(item => 
      (item.email || '').toLowerCase() === clean
    );

    if (userAppointments.length === 0) {
      emailSyncIndicator.textContent = 'No records';
      emailSyncIndicator.className = 'kokonut-email-sync-indicator idle';
      upcomingListContainer.innerHTML = `
        <div class="kokonut-empty-state">
          <p class="kokonut-empty-msg">No upcoming appointments for <strong class="kokonut-email-highlight">${email.trim()}</strong> yet.</p>
        </div>
      `;
    } else {
      emailSyncIndicator.textContent = `${userAppointments.length} found`;
      emailSyncIndicator.className = 'kokonut-email-sync-indicator active';
      upcomingListContainer.innerHTML = userAppointments.map(item => `
        <div class="kokonut-upcoming-item">
          <div class="kokonut-upcoming-left">
            <div class="kokonut-avatar-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <div>
              <p class="kokonut-upcoming-title">${item.service} (${item.duration || '60 min'})</p>
              <p class="kokonut-upcoming-sub">${item.artist || 'Artist'} · ${item.location || 'Online'}</p>
            </div>
          </div>
          <span class="kokonut-upcoming-badge">${item.timeString}</span>
        </div>
      `).join('');
    }
  }

  // Initial render (empty email prompt)
  renderUpcomingForEmail('');

  // Listen to email input changes in real time
  artistEmailInput.addEventListener('input', () => {
    renderUpcomingForEmail(artistEmailInput.value);
  });
  artistEmailInput.addEventListener('blur', () => {
    renderUpcomingForEmail(artistEmailInput.value);
  });

  // Handle booking form submission
  bookingForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(bookingForm);
    const artistName = formData.get('name') || 'Artist';
    const artistEmail = formData.get('email') || '';
    const notes = formData.get('notes') || '';
    const chosenDateLabel = dateSelect.options[dateSelect.selectedIndex].text;
    const chosenTimeDisplay = timeSelect.value;
    const chosenLocation = locationSelect.value;

    const newAppointment = {
      service: selectedService.title,
      duration: selectedDuration.value,
      artist: artistName,
      email: artistEmail,
      location: 'Online (Meet, Zoom, Discord etc)',
      timeString: `${chosenDateLabel.split('·')[0].trim()} · ${chosenTimeDisplay}`
    };

    // Store in localStorage
    storedAppointments.unshift(newAppointment);
    try {
      localStorage.setItem('eko_booked_sessions', JSON.stringify(storedAppointments));
    } catch (err) {
      console.error(err);
    }

    // Refresh email-tied appointments view
    renderUpcomingForEmail(artistEmail);

    // Add item to cart
    cartStore.addItem({
      id: `session-${selectedService.id}-${selectedDateIso}-${Date.now()}`,
      title: `${selectedService.title} (${selectedDuration.value})`,
      category: 'Sessions',
      license: `${chosenDateLabel} at ${chosenTimeDisplay}`,
      duration: selectedDuration.value,
      price: selectedDuration.price,
      artist: artistName,
      email: artistEmail,
      location: chosenLocation,
      language: 'English',
      notes: notes
    });

    bookingStatus.textContent = 'Appointment reserved! Proceeding to cart...';
    bookingStatus.style.color = '#10b981';

    setTimeout(() => {
      navigateTo('cart');
    }, 700);
  });

  return container;
}


