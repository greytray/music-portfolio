import { ordersStore } from '../store/ordersStore.js';
import { fastSmoothScrollTo } from '../utils/scroll.js';

const AUDIO_SERVICES = [
  { id: 'mix-master', name: 'Mixing & Mastering', price: 149, turn: 'Estimated turnaround: 2–3 business days', desc: 'Full song balance, warm analog tone, crisp vocals & loud streaming master' },
  { id: 'vocal-mix', name: 'Vocal Mixing & Tuning', price: 99, turn: 'Estimated turnaround: 1–2 business days', desc: 'Pitch correction (AutoTune / Melodyne), vocal clarity & smooth stereo reverb' },
  { id: 'restoration', name: 'Audio Editing & Cleanup', price: 79, turn: 'Estimated turnaround: 1–2 business days', desc: 'Remove background noise, clicks, mouth sounds & fix timing errors' },
  { id: 'beat-prod', name: 'Custom Beat Production', price: 299, turn: 'Estimated turnaround: 3–5 business days', desc: 'Original custom production created from scratch to match your vocal style' },
  { id: 'mastering', name: 'Mastering Only', price: 49, turn: 'Estimated turnaround: 24 hours', desc: 'Final loudness boost, clean EQ polish & streaming-ready master' }
];

export function createSendAudioView({ navigateTo }) {
  const container = document.createElement('div');
  container.className = 'view-page send-audio-view';
  container.id = 'send-audio-view-content';

  let uploadedFiles = [];
  let selectedService = AUDIO_SERVICES[0];

  container.innerHTML = `
    <div class="view-hero">
      <div class="view-pill-tag">Direct Studio Upload · High Quality Audio</div>
      <h1 class="view-title">Send Audio Files</h1>
      <p class="view-subtitle">Upload your individual audio tracks, vocal recordings, or rough demo mixes. I'll personally review your files within 2 hours of receiving them.</p>
    </div>

    <div class="send-audio-grid">
      <!-- File Upload Column -->
      <div class="upload-column">
        <h2 class="view-section-label">1. Add Your Audio Files</h2>
        <div class="dropzone" id="audio-dropzone">
          <div class="dropzone-inner">
            <div class="dropzone-icon">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            </div>
            <h3>Drag &amp; drop your audio files or folder here</h3>
            <p>Supported: WAV, MP3, AIFF, FLAC, or .ZIP folder (up to 2GB)</p>
            <button type="button" class="btn-outline btn-select-files" id="btn-browse-files">
              Browse Files from Computer
            </button>
            <input type="file" id="file-input" multiple accept=".wav,.aiff,.aif,.mp3,.flac,.zip,.rar" style="display: none;">
          </div>
        </div>

        <div class="file-list-wrap" id="file-list-wrap" style="display: none;">
          <h4 class="file-list-title">Files Ready to Send (<span id="file-count">0</span>)</h4>
          <div class="file-list" id="file-list"></div>
        </div>

        <div class="audio-prep-tips">
          <h4>💡 Helpful Tips Before Sending:</h4>
          <ul>
            <li>Start all exported tracks from the very beginning (<strong>0:00 / Bar 1</strong>) so they line up automatically.</li>
            <li>High-quality <strong>WAV or MP3</strong> files work great (turn off master limiters if possible).</li>
            <li>Label your files clearly (e.g. <code>01_Kick.wav</code>, <code>02_Snare.wav</code>, <code>Main_Vocal.wav</code>).</li>
            <li>Keep any creative vocal effects (like auto-tune or delays) on if you like how they sound!</li>
          </ul>
        </div>
      </div>

      <!-- Project Details Column (KokonutUI Form 04 Design) -->
      <div class="details-column">
        <h2 class="view-section-label">2. Project Details</h2>
        
        <div class="kokonut-form-card" id="send-audio-kokonut-card">
          <!-- Card Header -->
          <div class="kokonut-card-header">
            <div class="kokonut-header-left">
              <div class="kokonut-icon-badge" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 2v20"></path>
                  <path d="M17 5v14"></path>
                  <path d="M22 8v8"></path>
                  <path d="M7 5v14"></path>
                  <path d="M2 8v8"></path>
                </svg>
              </div>
              <div>
                <h3 class="kokonut-card-title">Project Details</h3>
                <p class="kokonut-card-subtitle">Tell me about your song &amp; how you want it to sound</p>
              </div>
            </div>
            <div class="kokonut-live-badge">
              <span class="kokonut-pulse-dot"></span> Ready for Upload
            </div>
          </div>

          <!-- Form Body -->
          <form class="kokonut-card-body" id="send-audio-form">
            <!-- Artist Name & Contact Email Row -->
            <div class="kokonut-grid-2">
              <div class="kokonut-input-icon-wrap">
                <svg class="kokonut-input-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <input type="text" name="artist" id="audio-artist-input" class="kokonut-input with-icon" required placeholder="Artist or Band Name" autocomplete="name">
              </div>

              <div class="kokonut-input-icon-wrap">
                <svg class="kokonut-input-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                </svg>
                <input type="email" name="email" id="audio-email-input" class="kokonut-input with-icon" required placeholder="Your Email Address" autocomplete="email">
              </div>
            </div>

            <!-- Song Title & Service Selection Row -->
            <div class="kokonut-grid-2">
              <div class="kokonut-input-icon-wrap">
                <svg class="kokonut-input-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 18V5l12-2v13"></path>
                  <circle cx="6" cy="18" r="3"></circle>
                  <circle cx="18" cy="16" r="3"></circle>
                </svg>
                <input type="text" name="title" id="audio-title-input" class="kokonut-input with-icon" required placeholder="Song Title">
              </div>

              <div class="kokonut-input-icon-wrap">
                <svg class="kokonut-input-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="4" x2="20" y1="12" y2="12"></line>
                  <line x1="4" x2="20" y1="6" y2="6"></line>
                  <line x1="4" x2="20" y1="18" y2="18"></line>
                </svg>
                <select name="service" id="audio-service-select" class="kokonut-select with-icon" aria-label="Service Requested" required>
                  ${AUDIO_SERVICES.map(s => `
                    <option value="${s.name}" ${s.id === selectedService.id ? 'selected' : ''}>
                      ${s.name} ($${s.price})
                    </option>
                  `).join('')}
                </select>
                <svg class="kokonut-select-arrow" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m6 9 6 6 6-6"></path>
                </svg>
              </div>
            </div>

            <!-- Tempo & Musical Key Row -->
            <div class="kokonut-grid-2">
              <div class="kokonut-input-icon-wrap">
                <svg class="kokonut-input-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
                <input type="text" name="bpm" id="audio-bpm-input" class="kokonut-input with-icon" placeholder="Tempo / BPM (e.g. 138 BPM, or leave empty)">
              </div>

              <div class="kokonut-input-icon-wrap">
                <svg class="kokonut-input-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <input type="text" name="key" id="audio-key-input" class="kokonut-input with-icon" placeholder="Song Key (e.g. F Minor, or leave empty)">
              </div>
            </div>

            <!-- References Input -->
            <div class="kokonut-input-icon-wrap">
              <svg class="kokonut-input-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
              </svg>
              <input type="text" name="references" id="audio-references-input" class="kokonut-input with-icon" placeholder="Reference song links with a vibe you like (Spotify, YouTube, Apple Music...)">
            </div>

            <!-- Mix Notes Textarea -->
            <div class="kokonut-textarea-wrap">
              <svg class="kokonut-textarea-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <textarea name="notes" id="audio-notes-input" class="kokonut-textarea with-icon" rows="3" required placeholder="Describe your vision: the mood, vocal style you want, bass punch, reference artists, or any specific requests..."></textarea>
            </div>

            <!-- Live Service & Price Preview Card -->
            <div class="kokonut-price-preview" id="audio-price-preview">
              <div class="kokonut-price-info">
                <span class="kokonut-price-label" id="audio-preview-turn">${selectedService.turn}</span>
                <span class="kokonut-service-desc" id="audio-preview-desc">${selectedService.desc}</span>
              </div>
              <div class="kokonut-price-amount" id="audio-preview-price">$${selectedService.price}</div>
            </div>

            <!-- Kokonut Primary Action Button -->
            <button type="submit" class="kokonut-submit-btn" id="submit-audio-btn">
              Send Audio &amp; Start Project
            </button>
            <p class="form-status" id="send-audio-status"></p>
          </form>

          <!-- Card Footer - Selected Files Status -->
          <div class="kokonut-card-footer">
            <div class="kokonut-footer-header">
              <span>SELECTED FILES</span>
              <span class="kokonut-email-sync-indicator idle" id="stems-sync-indicator">0 FILES SELECTED</span>
            </div>
            <div class="kokonut-upcoming-item" style="padding: 10px 14px;">
              <div class="kokonut-upcoming-left">
                <div class="kokonut-avatar-icon" style="color: #10b981; background: rgba(16, 185, 129, 0.12);">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  </svg>
                </div>
                <div>
                  <p class="kokonut-upcoming-title" id="stems-summary-text">No audio files selected yet</p>
                  <p class="kokonut-upcoming-sub">Files will be securely sent directly to the studio</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Success Modal -->
    <div class="audio-success-banner" id="audio-success-banner" style="display: none;">
      <div class="success-banner-content">
        <div class="success-check-icon">✓</div>
        <div>
          <h3>Audio Received &amp; Project Started!</h3>
          <p>Your audio files have been received. We'll start working on your music right away! Project ID: <strong id="new-order-id">EKO-0000</strong></p>
        </div>
        <button type="button" class="button button-primary cta-button" id="btn-goto-order" style="min-width: 180px; height: 3.5rem;">
          View Project Status <span aria-hidden="true">›</span>
        </button>
      </div>
    </div>
  `;

  const dropzone = container.querySelector('#audio-dropzone');
  const fileInput = container.querySelector('#file-input');
  const btnBrowse = container.querySelector('#btn-browse-files');
  const fileListWrap = container.querySelector('#file-list-wrap');
  const fileList = container.querySelector('#file-list');
  const fileCount = container.querySelector('#file-count');
  const sendForm = container.querySelector('#send-audio-form');
  const statusMsg = container.querySelector('#send-audio-status');
  const successBanner = container.querySelector('#audio-success-banner');
  const newOrderId = container.querySelector('#new-order-id');
  const btnGotoOrder = container.querySelector('#btn-goto-order');

  const serviceSelect = container.querySelector('#audio-service-select');
  const previewTurn = container.querySelector('#audio-preview-turn');
  const previewDesc = container.querySelector('#audio-preview-desc');
  const previewPrice = container.querySelector('#audio-preview-price');
  const stemsSyncIndicator = container.querySelector('#stems-sync-indicator');
  const stemsSummaryText = container.querySelector('#stems-summary-text');

  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function updateStemsQueueDisplay() {
    if (uploadedFiles.length === 0) {
      if (stemsSyncIndicator) {
        stemsSyncIndicator.textContent = '0 FILES SELECTED';
        stemsSyncIndicator.className = 'kokonut-email-sync-indicator idle';
      }
      if (stemsSummaryText) {
        stemsSummaryText.textContent = 'No audio files selected yet';
      }
    } else {
      const totalBytes = uploadedFiles.reduce((acc, f) => acc + (f.size || 0), 0);
      if (stemsSyncIndicator) {
        stemsSyncIndicator.textContent = `${uploadedFiles.length} FILE${uploadedFiles.length > 1 ? 'S' : ''} READY`;
        stemsSyncIndicator.className = 'kokonut-email-sync-indicator active';
      }
      if (stemsSummaryText) {
        stemsSummaryText.textContent = `${uploadedFiles.length} audio file${uploadedFiles.length > 1 ? 's' : ''} ready (${formatBytes(totalBytes)})`;
      }
    }
  }

  serviceSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    const found = AUDIO_SERVICES.find(s => s.name === val) || AUDIO_SERVICES[0];
    selectedService = found;
    previewTurn.textContent = found.turn;
    previewDesc.textContent = found.desc;
    previewPrice.textContent = `$${found.price}`;
  });

  function renderFiles() {
    if (uploadedFiles.length === 0) {
      fileListWrap.style.display = 'none';
      updateStemsQueueDisplay();
      return;
    }
    fileListWrap.style.display = 'block';
    fileCount.textContent = uploadedFiles.length;
    fileList.innerHTML = uploadedFiles.map((file, idx) => `
      <div class="file-item">
        <div class="file-item-left">
          <span class="file-ext">${file.name.split('.').pop().toUpperCase()}</span>
          <div class="file-meta">
            <strong class="file-name">${file.name}</strong>
            <span class="file-size">${formatBytes(file.size)}</span>
          </div>
        </div>
        <div class="file-item-right">
          <span class="file-status">Ready</span>
          <button type="button" class="btn-remove-file" data-idx="${idx}" aria-label="Remove ${file.name}">×</button>
        </div>
      </div>
    `).join('');

    fileList.querySelectorAll('.btn-remove-file').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        uploadedFiles.splice(idx, 1);
        renderFiles();
      });
    });

    updateStemsQueueDisplay();
  }

  function handleFiles(files) {
    for (let i = 0; i < files.length; i++) {
      uploadedFiles.push(files[i]);
    }
    renderFiles();
  }

  btnBrowse.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
    fileInput.value = '';
  });

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('drag-over');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  });

  sendForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(sendForm);
    const artist = formData.get('artist');
    const email = formData.get('email');
    const title = formData.get('title');
    const service = formData.get('service');
    const bpm = formData.get('bpm');
    const key = formData.get('key');
    const references = formData.get('references');
    const notes = formData.get('notes');

    const createdOrder = ordersStore.addOrder({
      title: `${title} — ${service}`,
      service: service,
      client: artist,
      email: email,
      amount: selectedService.price || 149,
      notes: `BPM: ${bpm || 'N/A'}, Key: ${key || 'N/A'}. References: ${references || 'None'}. Files: ${uploadedFiles.length ? `${uploadedFiles.length} file(s)` : 'Pending upload'}. Notes: ${notes}`,
      stemsCount: uploadedFiles.length || 1
    });

    newOrderId.textContent = createdOrder.id;
    successBanner.style.display = 'block';
    fastSmoothScrollTo(successBanner);

    btnGotoOrder.onclick = () => {
      navigateTo('orders');
    };

    sendForm.reset();
    uploadedFiles = [];
    renderFiles();
  });

  return container;
}

