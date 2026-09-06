import { ordersStore } from '../store/ordersStore.js';

export function createSendAudioView({ navigateTo }) {
  const container = document.createElement('div');
  container.className = 'view-page send-audio-view';
  container.id = 'send-audio-view-content';

  let uploadedFiles = [];

  container.innerHTML = `
    <div class="view-hero">
      <div class="view-pill-tag">Secure Ingestion · 24-Bit Lossless Transfer</div>
      <h1 class="view-title">Send Audio Files</h1>
      <p class="view-subtitle">Upload your multitrack stems, raw vocal takes, or rough mixes directly to the studio workstation. I check all stems within 2 hours of receipt.</p>
    </div>

    <div class="send-audio-grid">
      <!-- File Upload Column -->
      <div class="upload-column">
        <h2 class="view-section-label">1. Upload Stems or Mixes</h2>
        <div class="dropzone" id="audio-dropzone">
          <div class="dropzone-inner">
            <div class="dropzone-icon">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            </div>
            <h3>Drag &amp; Drop audio files or stems</h3>
            <p>Supported: WAV, AIFF, MP3, FLAC, or .ZIP multitrack archives (up to 2GB)</p>
            <button type="button" class="btn-outline btn-select-files" id="btn-browse-files">
              Browse Files from Computer
            </button>
            <input type="file" id="file-input" multiple accept=".wav,.aiff,.aif,.mp3,.flac,.zip,.rar" style="display: none;">
          </div>
        </div>

        <div class="file-list-wrap" id="file-list-wrap" style="display: none;">
          <h4 class="file-list-title">Staged Files (<span id="file-count">0</span>)</h4>
          <div class="file-list" id="file-list"></div>
        </div>

        <div class="audio-prep-tips">
          <h4>💡 Stem Preparation Checklist:</h4>
          <ul>
            <li>Export all stems starting at <strong>Bar 1, Beat 1 (0:00)</strong> so timing syncs automatically.</li>
            <li>Export at <strong>24-bit / 44.1kHz or 48kHz</strong> WAV with no peak limiting on the master.</li>
            <li>Label clearly: <code>01_Kick.wav</code>, <code>02_Snare.wav</code>, <code>03_LeadVocal_Dry.wav</code>.</li>
            <li>Bypass master reverb and limiters; keep individual tuning/creative modulation plugins on.</li>
          </ul>
        </div>
      </div>

      <!-- Project Details Column -->
      <div class="details-column">
        <div class="details-panel-shell">
          <h2 class="view-section-label">2. Project Specifications</h2>
          <form class="project-brief-form" id="send-audio-form">
            <div class="form-row">
              <label>Artist / Group Name
                <input type="text" name="artist" required placeholder="e.g. Jordan Cole" autocomplete="name">
              </label>
              <label>Contact Email
                <input type="email" name="email" required placeholder="jordan@recordlabel.com" autocomplete="email">
              </label>
            </div>

            <div class="form-row">
              <label>Song / Project Title
                <input type="text" name="title" required placeholder="e.g. Midnight Reverie">
              </label>
              <label>Service Requested
                <select name="service" required>
                  <option value="Mixing &amp; Mastering">Mixing &amp; Mastering ($149)</option>
                  <option value="Vocal Mixing &amp; Tuning">Vocal Mixing &amp; Tuning ($99)</option>
                  <option value="Audio Editing &amp; Restoration">Audio Editing &amp; Restoration ($79)</option>
                  <option value="Custom Beat Production">Custom Beat Production ($299)</option>
                  <option value="Mastering Only">Mastering Only ($49)</option>
                </select>
              </label>
            </div>

            <div class="form-row">
              <label>Tempo / BPM
                <input type="text" name="bpm" placeholder="e.g. 138 BPM (or unknown)">
              </label>
              <label>Musical Key
                <input type="text" name="key" placeholder="e.g. F Minor / Unknown">
              </label>
            </div>

            <label>Reference Tracks or External Links
              <input type="text" name="references" placeholder="Paste Spotify, Apple Music, or SoundCloud reference links...">
            </label>

            <label>Mix Notes &amp; Creative Direction
              <textarea name="notes" rows="4" required placeholder="Describe the vibe: e.g. bright vocal presence like Travis Scott, wide stereo synths, punchy low-end kick, punchy sidechain..."></textarea>
            </label>

            <button type="submit" class="button button-primary cta-button" id="submit-audio-btn" style="width: 100%; border-radius: 999px;">
              Submit Audio &amp; Ingest Stems <span aria-hidden="true">›</span>
            </button>
            <p class="form-status" id="send-audio-status"></p>
          </form>
        </div>
      </div>
    </div>

    <!-- Success Modal -->
    <div class="audio-success-banner" id="audio-success-banner" style="display: none;">
      <div class="success-banner-content">
        <div class="success-check-icon">✓</div>
        <div>
          <h3>Audio Received &amp; Order Created!</h3>
          <p>Your stems have been securely ingested into the workstation queue. Project ID: <strong id="new-order-id">EKO-0000</strong></p>
        </div>
        <button type="button" class="button button-primary cta-button" id="btn-goto-order" style="min-width: 180px; height: 3.5rem;">
          Track Project Now <span aria-hidden="true">›</span>
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

  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function renderFiles() {
    if (uploadedFiles.length === 0) {
      fileListWrap.style.display = 'none';
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
      amount: service.includes('149') ? 149 : (service.includes('299') ? 299 : (service.includes('79') ? 79 : 99)),
      notes: `BPM: ${bpm || 'N/A'}, Key: ${key || 'N/A'}. Files staged: ${uploadedFiles.length || 'Pending upload'}. Notes: ${notes}`,
      stemsCount: uploadedFiles.length || 1
    });

    newOrderId.textContent = createdOrder.id;
    successBanner.style.display = 'block';
    successBanner.scrollIntoView({ behavior: 'smooth' });

    btnGotoOrder.onclick = () => {
      navigateTo('orders');
    };

    sendForm.reset();
    uploadedFiles = [];
    renderFiles();
  });

  return container;
}
