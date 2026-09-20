/**
 * Eko In-Context Visual Editor (Design Mode) — Main Application Controller
 * Mounts the Figma / Chrome Dev Tools visual editing workspace at /admin.
 */

import './adminStyles.css';
import { SelectionEngine } from './selectionEngine.js';
import { SidePanel } from './sidePanel.js';
import { ExportSystem } from './exportSystem.js';
import { applyDesignSchema } from '../utils/schemaApplier.js';

export class AdminApp {
  constructor(mountContainer = document.body) {
    this.mountContainer = mountContainer;
    this.exportSystem = new ExportSystem();
    this.selectionEngine = null;
    this.sidePanel = null;
    this.currentBreakpoint = 'desktop'; // 'desktop' | 'tablet' | 'mobile'
    this.currentMode = 'select'; // 'select' | 'interactive'
    this.rootElement = null;

    this.mount();
  }

  mount() {
    // Remove any existing admin workspace
    const existing = document.getElementById('eko-admin-workspace');
    if (existing) existing.remove();

    this.rootElement = document.createElement('div');
    this.rootElement.id = 'eko-admin-workspace';
    this.rootElement.className = 'admin-workspace';

    this.rootElement.innerHTML = `
      <!-- Top Navigation Toolbar -->
      <header class="admin-topbar">
        <div class="admin-topbar-left">
          <div class="admin-brand">
            <span>EKO</span>
            <span class="badge-mode">Design Mode</span>
          </div>

          <!-- Mode Selector (Inspect vs Interactive) -->
          <div class="admin-segmented-control" role="tablist">
            <button type="button" class="admin-segment-btn is-active" id="btn-mode-select" title="Inspect & Select Elements (Figma Click Mode)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="m13 13 6 6"/></svg>
              <span>Inspect</span>
            </button>
            <button type="button" class="admin-segment-btn" id="btn-mode-interactive" title="Interact Normally with Page (Play Music, Click Buttons)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
              <span>Interactive</span>
            </button>
          </div>

          <!-- Active Element Breadcrumb -->
          <div class="admin-breadcrumb" id="admin-breadcrumb" title="Selected Element Path">
            <span>Target:</span>
            <span class="active-tag" id="breadcrumb-target">None (Click any component)</span>
          </div>
        </div>

        <div class="admin-topbar-center">
          <!-- Device Breakpoint Toggles -->
          <div class="admin-device-toggles">
            <button type="button" class="admin-device-btn is-active" id="btn-device-desktop" title="Desktop View (100%)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            </button>
            <button type="button" class="admin-device-btn" id="btn-device-tablet" title="Tablet View (768px)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
            </button>
            <button type="button" class="admin-device-btn" id="btn-device-mobile" title="Mobile View (390px)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
            </button>
          </div>
        </div>

        <div class="admin-topbar-right">
          <!-- View JSON Schema -->
          <button type="button" class="admin-btn admin-btn-ghost" id="btn-view-schema" title="Inspect Serialized JSON Schema">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            <span>Schema</span>
          </button>

          <!-- Revert Changes -->
          <button type="button" class="admin-btn admin-btn-ghost" id="btn-revert-changes" title="Revert pending changes">
            <span>Revert</span>
          </button>

          <!-- Publish Changes Button -->
          <button type="button" class="admin-btn admin-btn-primary admin-btn-publish" id="btn-publish-changes" title="Serialize visual states, write to metadata.json, and attempt git commit">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            <span id="btn-publish-label">Publish Changes</span>
          </button>

          <!-- Exit Admin -->
          <button type="button" class="admin-btn admin-btn-ghost" id="btn-exit-admin" title="Exit to Live Storefront">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            <span>Exit</span>
          </button>
        </div>
      </header>

      <!-- Main Body: Canvas Stage + Inspector Side Panel -->
      <main class="admin-body">
        <div class="admin-stage-container">
          <div class="admin-viewport-wrapper is-desktop" id="admin-viewport-wrapper">
            <iframe id="admin-preview-frame" class="admin-preview-frame" src="/?admin_preview=1" title="Visual Preview Canvas"></iframe>
          </div>
          <div class="admin-resolution-pill" id="admin-resolution-pill">100% Desktop Viewport</div>
        </div>

        <aside class="admin-sidepanel" id="admin-sidepanel-root"></aside>
      </main>

      <!-- Toast Feedback -->
      <div class="admin-toast" id="admin-toast">
        <div class="toast-icon">✓</div>
        <div id="admin-toast-text">Changes published successfully!</div>
      </div>

      <!-- JSON Schema Modal -->
      <div class="admin-modal-backdrop" id="admin-schema-modal">
        <div class="admin-modal">
          <div class="admin-modal-header">
            <h3>Published Design Schema (metadata.json)</h3>
            <button type="button" class="admin-btn admin-btn-ghost" id="btn-close-schema-modal">✕</button>
          </div>
          <div class="admin-modal-body">
            <div class="admin-json-viewer" id="admin-json-content"></div>
          </div>
          <div class="admin-modal-footer">
            <button type="button" class="admin-btn admin-btn-ghost" id="btn-copy-schema-json">Copy JSON</button>
            <button type="button" class="admin-btn admin-btn-primary" id="btn-done-schema-modal">Close</button>
          </div>
        </div>
      </div>
    `;

    this.mountContainer.appendChild(this.rootElement);

    this._bindControls();
    this._initIframeBridge();
  }

  _bindControls() {
    // 1. Mode toggles
    const selectBtn = this.rootElement.querySelector('#btn-mode-select');
    const interBtn = this.rootElement.querySelector('#btn-mode-interactive');

    selectBtn.addEventListener('click', () => {
      selectBtn.classList.add('is-active');
      interBtn.classList.remove('is-active');
      this.currentMode = 'select';
      if (this.selectionEngine) this.selectionEngine.setMode('select');
      this._showToast('Inspect Mode: Click elements to edit styles and spacing');
    });

    interBtn.addEventListener('click', () => {
      interBtn.classList.add('is-active');
      selectBtn.classList.remove('is-active');
      this.currentMode = 'interactive';
      if (this.selectionEngine) this.selectionEngine.setMode('interactive');
      this._showToast('Interactive Mode: Click buttons & play tracks normally');
    });

    // 2. Breakpoint toggles
    const deskBtn = this.rootElement.querySelector('#btn-device-desktop');
    const tabBtn = this.rootElement.querySelector('#btn-device-tablet');
    const mobBtn = this.rootElement.querySelector('#btn-device-mobile');
    const viewportWrap = this.rootElement.querySelector('#admin-viewport-wrapper');
    const resPill = this.rootElement.querySelector('#admin-resolution-pill');

    const setBreakpoint = (bp, name, dim) => {
      [deskBtn, tabBtn, mobBtn].forEach(b => b.classList.remove('is-active'));
      viewportWrap.className = `admin-viewport-wrapper is-${bp}`;
      resPill.textContent = `${name} (${dim})`;
      if (this.selectionEngine) {
        setTimeout(() => this.selectionEngine._updateBoxes(), 260);
      }
    };

    deskBtn.addEventListener('click', () => {
      deskBtn.classList.add('is-active');
      setBreakpoint('desktop', 'Desktop Viewport', 'Fluid 100%');
    });

    tabBtn.addEventListener('click', () => {
      tabBtn.classList.add('is-active');
      setBreakpoint('tablet', 'Tablet Viewport', '768px × 100%');
    });

    mobBtn.addEventListener('click', () => {
      mobBtn.classList.add('is-active');
      setBreakpoint('mobile', 'Mobile Viewport (iPhone 14)', '390px × 844px');
    });

    // 3. Publish button
    const publishBtn = this.rootElement.querySelector('#btn-publish-changes');
    const publishLabel = this.rootElement.querySelector('#btn-publish-label');

    publishBtn.addEventListener('click', async () => {
      publishBtn.classList.add('is-publishing');
      publishLabel.textContent = 'Publishing...';

      try {
        const result = await this.exportSystem.publish();
        publishBtn.classList.remove('has-changes');
        publishLabel.textContent = 'Published!';
        const gitMsg = result.gitStatus ? ` [${result.gitStatus}]` : '';
        this._showToast(`✓ Published to metadata.json!${gitMsg}`);

        setTimeout(() => {
          publishLabel.textContent = 'Publish Changes';
          publishBtn.classList.remove('is-publishing');
        }, 2000);
      } catch (err) {
        publishLabel.textContent = 'Error';
        publishBtn.classList.remove('is-publishing');
        this._showToast(`Failed to publish: ${err.message}`, true);
      }
    });

    // 4. Revert changes button
    const revertBtn = this.rootElement.querySelector('#btn-revert-changes');
    revertBtn.addEventListener('click', () => {
      if (confirm('Revert all pending visual modifications and reload preview?')) {
        this.exportSystem.revertAll();
        publishBtn.classList.remove('has-changes');
        const iframe = this.rootElement.querySelector('#admin-preview-frame');
        if (iframe) iframe.src = '/?admin_preview=1&r=' + Date.now();
        this._showToast('Pending visual changes reverted');
      }
    });

    // 5. Schema Modal
    const schemaBtn = this.rootElement.querySelector('#btn-view-schema');
    const modalBackdrop = this.rootElement.querySelector('#admin-schema-modal');
    const closeModalBtn = this.rootElement.querySelector('#btn-close-schema-modal');
    const doneModalBtn = this.rootElement.querySelector('#btn-done-schema-modal');
    const jsonContent = this.rootElement.querySelector('#admin-json-content');
    const copySchemaBtn = this.rootElement.querySelector('#btn-copy-schema-json');

    const openSchemaModal = () => {
      const schema = this.exportSystem.serializeSchema();
      jsonContent.textContent = JSON.stringify(schema, null, 2);
      modalBackdrop.classList.add('is-open');
    };

    const closeSchemaModal = () => {
      modalBackdrop.classList.remove('is-open');
    };

    schemaBtn.addEventListener('click', openSchemaModal);
    closeModalBtn.addEventListener('click', closeSchemaModal);
    doneModalBtn.addEventListener('click', closeSchemaModal);

    copySchemaBtn.addEventListener('click', () => {
      const schema = this.exportSystem.serializeSchema();
      navigator.clipboard.writeText(JSON.stringify(schema, null, 2)).then(() => {
        copySchemaBtn.textContent = 'Copied!';
        setTimeout(() => { copySchemaBtn.textContent = 'Copy JSON'; }, 1500);
      });
    });

    // 6. Exit Admin
    const exitBtn = this.rootElement.querySelector('#btn-exit-admin');
    exitBtn.addEventListener('click', () => {
      window.location.href = '/';
    });
  }

  _initIframeBridge() {
    const iframe = this.rootElement.querySelector('#admin-preview-frame');
    const sidepanelContainer = this.rootElement.querySelector('#admin-sidepanel-root');

    // Initialize side panel
    this.sidePanel = new SidePanel(sidepanelContainer, {
      onElementChange: (element, metadata, changeDetail) => {
        // Record in Export System
        const selector = metadata.selector;
        this.exportSystem.recordChange(selector, changeDetail);

        // Update breadcrumb and publish button indicator
        const publishBtn = this.rootElement.querySelector('#btn-publish-changes');
        if (publishBtn) publishBtn.classList.add('has-changes');

        // Reposition selection highlight box
        if (this.selectionEngine) {
          this.selectionEngine._updateBoxes();
        }
      },
      onDeselect: () => {
        if (this.selectionEngine) this.selectionEngine.deselect();
        const breadcrumbTarget = this.rootElement.querySelector('#breadcrumb-target');
        if (breadcrumbTarget) breadcrumbTarget.textContent = 'None (Click any component)';
      }
    });

    iframe.addEventListener('load', () => {
      try {
        const iDoc = iframe.contentDocument || iframe.contentWindow.document;

        // Apply published schema on canvas preview
        if (this.exportSystem.initialSchema) {
          applyDesignSchema(this.exportSystem.initialSchema, iDoc);
        }

        // Initialize Selection Engine
        this.selectionEngine = new SelectionEngine(iframe, {
          onSelect: (element, metadata) => {
            // Update Topbar breadcrumb
            const breadcrumbTarget = this.rootElement.querySelector('#breadcrumb-target');
            if (breadcrumbTarget) {
              breadcrumbTarget.textContent = `${metadata.tagName.toLowerCase()}${metadata.id ? '#' + metadata.id : ''} (${metadata.selector})`;
            }

            // Inspect in side panel
            this.sidePanel.inspect(element, metadata);
          },
          onDeselect: () => {
            const breadcrumbTarget = this.rootElement.querySelector('#breadcrumb-target');
            if (breadcrumbTarget) {
              breadcrumbTarget.textContent = 'None (Click any component)';
            }
            this.sidePanel.clear();
          }
        });

        // Set active mode
        this.selectionEngine.setMode(this.currentMode);

      } catch (err) {
        console.error('[Admin Preview Bridge Init Failed]:', err);
      }
    });
  }

  _showToast(message, isError = false) {
    const toast = this.rootElement.querySelector('#admin-toast');
    const toastText = this.rootElement.querySelector('#admin-toast-text');
    if (!toast || !toastText) return;

    toastText.textContent = message;
    toast.style.borderColor = isError ? 'rgba(244, 67, 54, 0.6)' : 'rgba(0, 229, 255, 0.5)';
    toast.classList.add('is-visible');

    setTimeout(() => {
      toast.classList.remove('is-visible');
    }, 3200);
  }

  destroy() {
    if (this.selectionEngine) this.selectionEngine.destroy();
    if (this.rootElement) this.rootElement.remove();
  }
}
