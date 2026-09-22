/**
 * Eko In-Context Visual Editor (Design Mode) — Main Application Controller
 * Mounts the Figma / Chrome Dev Tools visual editing workspace at /admin.
 */

import './adminStyles.css';
import { SelectionEngine } from './selectionEngine.js';
import { SidePanel } from './sidePanel.js';
import { ExportSystem } from './exportSystem.js';
import { TooltipManager } from './tooltipSystem.js';
import { applyDesignSchema } from '../utils/schemaApplier.js';

export class AdminApp {
  constructor(mountContainer = document.body) {
    this.mountContainer = mountContainer;
    this.exportSystem = new ExportSystem();
    this.tooltipManager = new TooltipManager();
    this.selectionEngine = null;
    this.sidePanel = null;
    this.currentBreakpoint = 'universal'; // 'universal' | 'desktop' | 'tablet' | 'mobile'
    this.activeDeviceMode = 'desktop'; // 'desktop' | 'tablet' | 'mobile'
    this.currentMode = 'interactive'; // 'interactive' (Normal Mode, default) | 'select' (Inspect Mode)
    this.sidebarPosition = localStorage.getItem('eko_admin_sidebar_pos') || 'right'; // 'right' | 'left'
    this.isSidebarCollapsed = false;
    this.rootElement = null;
    this.toastTimer = null;

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
          </div>

          <!-- Combined Mode Toggle (Normal vs Inspect) - Starts in Normal by default -->
          <div class="admin-mode-toggle-wrap">
            <button type="button" class="admin-mode-toggle-btn" id="btn-toggle-mode" data-tooltip="Click to switch between Normal and Inspect mode">
              <span class="mode-status-dot" id="mode-status-dot"></span>
              <span class="mode-icon" id="mode-icon">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
              </span>
              <span class="mode-text-wrap">
                <span class="mode-name" id="mode-name-label">Normal</span>
              </span>
            </button>
          </div>

          <!-- Active Element Breadcrumb -->
          <div class="admin-breadcrumb" id="admin-breadcrumb" data-tooltip="Selected Element Path">
            <span>Target:</span>
            <span class="active-tag" id="breadcrumb-target">None (Click Inspect to select)</span>
          </div>
        </div>

        <div class="admin-topbar-center">
          <!-- Device Breakpoint & Universal Mode Toggles -->
          <div class="admin-device-group">
            <button type="button" class="admin-device-btn admin-device-universal is-active" id="btn-device-universal" data-tooltip="Universal Device (Changes apply to all devices)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              <span>Universal</span>
            </button>
            <div class="admin-device-divider"></div>
            <!-- Combined Desktop/Tablet/Mobile Device Toggle Button -->
            <button type="button" class="admin-device-btn admin-device-cycle" id="btn-device-cycle" data-tooltip="Device Viewport (Click to switch Desktop / Tablet / Mobile)">
              <span class="device-icon" id="device-mode-icon">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
              </span>
              <span id="device-mode-label">Desktop</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="opacity: 0.6;"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
          </div>
        </div>

        <div class="admin-topbar-right">
          <!-- Sidebar Position Switch (Left / Right) with Stacked Arrows Symbol -->
          <button type="button" class="admin-btn admin-btn-ghost" id="btn-toggle-sidebar-pos" data-tooltip="Dock Sidebar Left / Right">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 8h16M16 4l4 4-4 4"/>
              <path d="M20 16H4M8 20l-4-4 4-4"/>
            </svg>
            <span id="btn-sidebar-pos-label">${this.sidebarPosition === 'left' ? 'Dock Right' : 'Dock Left'}</span>
          </button>

          <!-- View JSON Schema -->
          <button type="button" class="admin-btn admin-btn-ghost" id="btn-view-schema" data-tooltip="Inspect Serialized JSON Schema">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            <span>Schema</span>
          </button>

          <!-- Checkpoint History -->
          <button type="button" class="admin-btn admin-btn-ghost" id="btn-publish-history" data-tooltip="Publish Checkpoint History & Restore Points">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 14 14"/></svg>
            <span>History</span>
            <span class="admin-history-badge" id="admin-history-count" style="display: none;">0</span>
          </button>

          <!-- Revert Changes -->
          <button type="button" class="admin-btn admin-btn-ghost" id="btn-revert-changes" data-tooltip="Revert pending changes">
            <span>Revert</span>
          </button>

          <!-- Publish Changes Button -->
          <button type="button" class="admin-btn admin-btn-primary admin-btn-publish" id="btn-publish-changes" data-tooltip="Serialize visual states, write to metadata.json, and attempt git commit">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            <span id="btn-publish-label">Publish Changes</span>
          </button>

          <!-- Exit Admin -->
          <button type="button" class="admin-btn admin-btn-ghost" id="btn-exit-admin" data-tooltip="Exit to Live Storefront">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            <span>Exit</span>
          </button>
        </div>
      </header>

      <!-- Main Body: Canvas Stage + Inspector Side Panel -->
      <main class="admin-body ${this.sidebarPosition === 'left' ? 'sidebar-left' : ''}" id="admin-main-body">
        <div class="admin-stage-container">
          <div class="admin-viewport-wrapper is-universal" id="admin-viewport-wrapper">
            <iframe id="admin-preview-frame" class="admin-preview-frame" src="/?admin_preview=1" title="Visual Preview Canvas"></iframe>
          </div>

          <!-- Quick Re-expand tab when sidebar is collapsed -->
          <button type="button" class="admin-sidebar-expand-tab" id="btn-expand-sidebar-tab" data-tooltip="Expand Inspector Sidebar">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M15 3v18"/><path d="m14 9 3 3-3 3"/></svg>
            <span>Inspector</span>
          </button>
        </div>

        <aside class="admin-sidepanel" id="admin-sidepanel-root"></aside>
      </main>

      <!-- Toast Feedback (Bright Modern Floating Bar) -->
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

      <!-- Publish History & Checkpoints Modal (Google AI Studio Checkpoint / Restore UX) -->
      <div class="admin-modal-backdrop" id="admin-history-modal">
        <div class="admin-modal history-modal-window">
          <div class="admin-modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 14 14"/></svg>
              <h3>Publish Checkpoint History</h3>
            </div>
            <button type="button" class="admin-btn admin-btn-ghost" id="btn-close-history-modal">✕</button>
          </div>
          <div class="admin-modal-desc">
            Review past saved publish checkpoints. You can inspect changes and revert/restore any checkpoint back onto the active canvas and frontend.
          </div>
          <div class="admin-history-list" id="admin-history-list">
            <div class="history-loading-indicator">Loading publish history...</div>
          </div>
          <div class="admin-modal-footer">
            <button type="button" class="admin-btn admin-btn-ghost" id="btn-refresh-history">Refresh</button>
            <button type="button" class="admin-btn admin-btn-primary" id="btn-done-history-modal">Close</button>
          </div>
        </div>
      </div>
    `;

    this.mountContainer.appendChild(this.rootElement);

    this._bindControls();
    this._initIframeBridge();
  }

  toggleSidebarPosition() {
    this.sidebarPosition = this.sidebarPosition === 'left' ? 'right' : 'left';
    localStorage.setItem('eko_admin_sidebar_pos', this.sidebarPosition);

    const mainBody = this.rootElement.querySelector('#admin-main-body');
    if (mainBody) {
      if (this.sidebarPosition === 'left') {
        mainBody.classList.add('sidebar-left');
      } else {
        mainBody.classList.remove('sidebar-left');
      }
    }

    const posLabel = this.rootElement.querySelector('#btn-sidebar-pos-label');
    if (posLabel) {
      posLabel.textContent = this.sidebarPosition === 'left' ? 'Dock Right' : 'Dock Left';
    }

    if (this.selectionEngine) {
      setTimeout(() => this.selectionEngine._updateBoxes(), 260);
    }

    this._showToast(`Sidebar docked to ${this.sidebarPosition}`);
  }

  toggleSidebarCollapse() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    const mainBody = this.rootElement.querySelector('#admin-main-body');
    const sidepanelRoot = this.rootElement.querySelector('#admin-sidepanel-root');

    if (mainBody && sidepanelRoot) {
      if (this.isSidebarCollapsed) {
        mainBody.classList.add('sidebar-collapsed');
        sidepanelRoot.classList.add('is-collapsed');
      } else {
        mainBody.classList.remove('sidebar-collapsed');
        sidepanelRoot.classList.remove('is-collapsed');
      }
    }

    if (this.selectionEngine) {
      setTimeout(() => this.selectionEngine._updateBoxes(), 260);
    }

    this._showToast(this.isSidebarCollapsed ? 'Inspector Sidebar Collapsed' : 'Inspector Sidebar Expanded');
  }

  _bindControls() {
    // 1. Combined Normal / Inspect Mode Toggle Button
    const modeToggleBtn = this.rootElement.querySelector('#btn-toggle-mode');
    const modeIcon = this.rootElement.querySelector('#mode-icon');
    const modeLabel = this.rootElement.querySelector('#mode-name-label');
    const breadcrumbTarget = this.rootElement.querySelector('#breadcrumb-target');

    const updateModeUI = () => {
      if (this.currentMode === 'select') {
        modeToggleBtn.classList.add('is-inspect');
        modeIcon.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="m13 13 6 6"/></svg>`;
        modeLabel.textContent = 'Inspect';
        modeToggleBtn.title = 'Current: Inspect Mode (Click to switch to Normal mode)';
      } else {
        modeToggleBtn.classList.remove('is-inspect');
        modeIcon.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>`;
        modeLabel.textContent = 'Normal';
        modeToggleBtn.title = 'Current: Normal Mode (Click to switch to Inspect mode)';
      }
    };

    modeToggleBtn.addEventListener('click', () => {
      if (this.currentMode === 'interactive') {
        this.currentMode = 'select';
        if (this.selectionEngine) this.selectionEngine.setMode('select');
        updateModeUI();
        this._showToast('Inspect Mode: Click any element to select and edit');
        if (breadcrumbTarget && breadcrumbTarget.textContent.includes('Click Inspect')) {
          breadcrumbTarget.textContent = 'None (Click any component)';
        }
      } else {
        this.currentMode = 'interactive';
        if (this.selectionEngine) this.selectionEngine.setMode('interactive');
        updateModeUI();
        this._showToast('Normal Mode: Interact with the page freely');
      }
    });

    // 2. Breakpoint & Universal device toggles
    const univBtn = this.rootElement.querySelector('#btn-device-universal');
    const cycleBtn = this.rootElement.querySelector('#btn-device-cycle');
    const deviceIcon = this.rootElement.querySelector('#device-mode-icon');
    const deviceLabel = this.rootElement.querySelector('#device-mode-label');
    const viewportWrap = this.rootElement.querySelector('#admin-viewport-wrapper');

    const deviceModes = ['desktop', 'tablet', 'mobile'];
    const deviceLabels = {
      desktop: 'Desktop',
      tablet: 'Tablet',
      mobile: 'Mobile'
    };
    const deviceIcons = {
      desktop: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
      tablet: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`,
      mobile: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`
    };
    const deviceDescs = {
      desktop: '🖥️ Desktop View (Fluid 100% — Scoped to Desktop)',
      tablet: '📱 Tablet View (768px — Scoped to Tablet)',
      mobile: '📱 Mobile View (390px — Scoped to Mobile)'
    };

    univBtn.addEventListener('click', () => {
      this.currentBreakpoint = 'universal';
      univBtn.classList.add('is-active');
      cycleBtn.classList.remove('is-active');
      viewportWrap.className = 'admin-viewport-wrapper is-universal';

      if (this.sidePanel) {
        this.sidePanel.setBreakpoint('universal');
      }

      if (this.selectionEngine) {
        requestAnimationFrame(() => this.selectionEngine._updateBoxes());
      }
      this._showToast('🌐 Universal Device: Changes apply to all devices');
    });

    cycleBtn.addEventListener('click', () => {
      // If currently universal, switch to active device mode; otherwise cycle to next device
      if (this.currentBreakpoint === 'universal') {
        this.currentBreakpoint = this.activeDeviceMode || 'desktop';
      } else {
        const currentIndex = deviceModes.indexOf(this.currentBreakpoint);
        const nextIndex = (currentIndex + 1) % deviceModes.length;
        this.activeDeviceMode = deviceModes[nextIndex];
        this.currentBreakpoint = this.activeDeviceMode;
      }

      univBtn.classList.remove('is-active');
      cycleBtn.classList.add('is-active');
      deviceIcon.innerHTML = deviceIcons[this.currentBreakpoint];
      deviceLabel.textContent = deviceLabels[this.currentBreakpoint];
      viewportWrap.className = `admin-viewport-wrapper is-${this.currentBreakpoint}`;

      if (this.sidePanel) {
        this.sidePanel.setBreakpoint(this.currentBreakpoint);
      }

      if (this.selectionEngine) {
        requestAnimationFrame(() => this.selectionEngine._updateBoxes());
      }
      this._showToast(deviceDescs[this.currentBreakpoint]);
    });

    // 3. Sidebar Dock Switch
    const toggleSidebarBtn = this.rootElement.querySelector('#btn-toggle-sidebar-pos');
    if (toggleSidebarBtn) {
      toggleSidebarBtn.addEventListener('click', () => {
        this.toggleSidebarPosition();
      });
    }

    // 4. Sidebar Expand Tab (when collapsed)
    const expandTabBtn = this.rootElement.querySelector('#btn-expand-sidebar-tab');
    if (expandTabBtn) {
      expandTabBtn.addEventListener('click', () => {
        this.toggleSidebarCollapse();
      });
    }

    // 5. Publish button
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
        updateHistoryCount();

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

    // 6. Master Revert changes button (Hard-refresh preview reset)
    const revertBtn = this.rootElement.querySelector('#btn-revert-changes');
    revertBtn.addEventListener('click', () => {
      this.exportSystem.revertAll();
      try {
        localStorage.removeItem('eko_published_design_schema');
      } catch (_) {}
      publishBtn.classList.remove('has-changes');

      // Clear element baselines and sidepanel state
      if (this.sidePanel) {
        this.sidePanel.elementBaselines.clear();
        this.sidePanel.clear();
        this.sidePanel.updateTabCounters();
        this.sidePanel._updateResetButtonVisibility();
      }

      if (this.selectionEngine) {
        this.selectionEngine.deselect();
      }

      const breadcrumbTarget = this.rootElement.querySelector('#breadcrumb-target');
      if (breadcrumbTarget) {
        breadcrumbTarget.textContent = 'None (Click any component)';
      }

      // Completely refresh preview frame as if hard-refreshed
      const iframe = this.rootElement.querySelector('#admin-preview-frame');
      if (iframe) {
        try {
          iframe.src = `/?admin_preview=1&_t=${Date.now()}`;
        } catch (_) {}
      }

      this._showToast('Master reset complete — preview reverted to original state');
    });

    // 7. Schema Modal
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

    // 8. Publish Checkpoints History & Restore Modal
    const historyBtn = this.rootElement.querySelector('#btn-publish-history');
    const historyModalBackdrop = this.rootElement.querySelector('#admin-history-modal');
    const closeHistoryModalBtn = this.rootElement.querySelector('#btn-close-history-modal');
    const doneHistoryModalBtn = this.rootElement.querySelector('#btn-done-history-modal');
    const refreshHistoryBtn = this.rootElement.querySelector('#btn-refresh-history');
    const historyListContainer = this.rootElement.querySelector('#admin-history-list');
    const historyCountBadge = this.rootElement.querySelector('#admin-history-count');

    const updateHistoryCount = async () => {
      try {
        const history = await this.exportSystem.getHistory();
        if (history && history.length > 0 && historyCountBadge) {
          historyCountBadge.textContent = history.length;
          historyCountBadge.style.display = 'inline-flex';
        }
      } catch (_) {}
    };
    updateHistoryCount();

    const renderHistoryModal = async () => {
      historyListContainer.innerHTML = '<div class="history-loading-indicator">Loading publish checkpoints...</div>';
      const history = await this.exportSystem.getHistory();

      if (!history || history.length === 0) {
        historyListContainer.innerHTML = '<div class="history-loading-indicator">No saved publish checkpoints found. Click "Publish Changes" to record your first checkpoint.</div>';
        return;
      }

      if (historyCountBadge) {
        historyCountBadge.textContent = history.length;
        historyCountBadge.style.display = 'inline-flex';
      }

      const activeSerialized = JSON.stringify(this.exportSystem.serializeSchema());

      historyListContainer.innerHTML = history.map((cp, idx) => {
        const isLatest = idx === 0;
        const cpSerialized = cp.schema ? JSON.stringify(cp.schema) : '';
        const isCurrentActive = cpSerialized && (cpSerialized === activeSerialized);
        const dateStr = cp.timestamp ? new Date(cp.timestamp).toLocaleString() : 'Unknown date';
        const elemCount = cp.elementsCount !== undefined ? cp.elementsCount : (cp.schema && cp.schema.elements ? Object.keys(cp.schema.elements).length : 0);

        return `
          <div class="history-item-card ${isCurrentActive ? 'is-active-checkpoint' : ''}" data-cp-id="${cp.id}">
            <div class="history-item-left">
              <div class="history-item-top">
                <span class="history-item-label">${cp.label || `Checkpoint #${history.length - idx}`}</span>
                ${isLatest ? '<span class="history-item-badge is-live">Latest</span>' : ''}
                ${isCurrentActive ? '<span class="history-item-badge is-live">Active on Canvas</span>' : ''}
                <span class="history-item-badge">${elemCount} element${elemCount === 1 ? '' : 's'}</span>
              </div>
              <div class="history-item-date">Published: ${dateStr}</div>
              <div class="history-item-desc">${cp.description || 'Saved design checkpoint'}</div>
            </div>
            <div class="history-item-right">
              <button type="button" class="btn-restore-checkpoint ${isCurrentActive ? 'is-active-btn' : ''}" data-restore-id="${cp.id}" ${isCurrentActive ? 'disabled' : ''}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                <span>${isCurrentActive ? 'Active' : 'Revert to this'}</span>
              </button>
            </div>
          </div>
        `;
      }).join('');

      // Bind restore buttons
      historyListContainer.querySelectorAll('.btn-restore-checkpoint[data-restore-id]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const targetId = btn.dataset.restoreId;
          btn.disabled = true;
          btn.textContent = 'Restoring...';

          try {
            const restored = await this.exportSystem.restoreCheckpoint(targetId);
            const iframe = this.rootElement.querySelector('#admin-preview-frame');
            if (iframe) {
              const iDoc = iframe.contentDocument || iframe.contentWindow.document;
              applyDesignSchema(restored.schema, iDoc);
            }

            // Clear element baselines in side panel and re-inspect
            if (this.sidePanel) {
              this.sidePanel.elementBaselines.clear();
              if (this.sidePanel.activeElement) {
                this.sidePanel.inspect(this.sidePanel.activeElement, this.sidePanel.activeMeta);
              }
              this.sidePanel.updateTabCounters();
            }

            this._showToast(`✓ Reverted to checkpoint: ${restored.checkpoint?.label || targetId}`);
            await renderHistoryModal();
          } catch (err) {
            btn.disabled = false;
            btn.textContent = 'Retry Restore';
            this._showToast(`Failed to restore: ${err.message}`, true);
          }
        });
      });
    };

    if (historyBtn) {
      historyBtn.addEventListener('click', () => {
        historyModalBackdrop.classList.add('is-open');
        renderHistoryModal();
      });
    }

    if (closeHistoryModalBtn) {
      closeHistoryModalBtn.addEventListener('click', () => {
        historyModalBackdrop.classList.remove('is-open');
      });
    }

    if (doneHistoryModalBtn) {
      doneHistoryModalBtn.addEventListener('click', () => {
        historyModalBackdrop.classList.remove('is-open');
      });
    }

    if (refreshHistoryBtn) {
      refreshHistoryBtn.addEventListener('click', () => {
        renderHistoryModal();
      });
    }

    // 9. Exit Admin
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
      exportSystem: this.exportSystem,
      onElementChange: (element, metadata, changeDetail, breakpoint = this.currentBreakpoint) => {
        // Record in Export System with active device breakpoint
        const selector = metadata.selector;
        this.exportSystem.recordChange(selector, changeDetail, breakpoint);

        // Update breadcrumb and publish button indicator
        const publishBtn = this.rootElement.querySelector('#btn-publish-changes');
        if (publishBtn) publishBtn.classList.add('has-changes');

        // Apply updated schema styles dynamically in iframe DOM
        try {
          const iDoc = iframe.contentDocument || iframe.contentWindow.document;
          applyDesignSchema(this.exportSystem.serializeSchema(), iDoc);
        } catch (_) {}

        // Reposition selection highlight box
        if (this.selectionEngine) {
          this.selectionEngine._updateBoxes();
        }
      },
      onDeselect: () => {
        if (this.selectionEngine) this.selectionEngine.deselect();
        const breadcrumbTarget = this.rootElement.querySelector('#breadcrumb-target');
        if (breadcrumbTarget) breadcrumbTarget.textContent = 'None (Click any component)';
      },
      onToggleCollapse: () => {
        this.toggleSidebarCollapse();
      }
    });

    this.sidePanel.setBreakpoint(this.currentBreakpoint);

    iframe.addEventListener('load', () => {
      try {
        const iDoc = iframe.contentDocument || iframe.contentWindow.document;

        // Apply published schema on canvas preview
        if (this.exportSystem.initialSchema) {
          applyDesignSchema(this.exportSystem.initialSchema, iDoc);
        }

        // Initialize Selection Engine starting in Normal (interactive) mode
        this.selectionEngine = new SelectionEngine(iframe, {
          mode: this.currentMode,
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

        // Ensure engine is set to current mode
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

    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }

    toastText.textContent = message;
    toast.style.borderColor = isError ? 'rgba(239, 68, 68, 0.8)' : 'var(--admin-border-focus)';
    toast.classList.add('is-visible');

    this.toastTimer = setTimeout(() => {
      toast.classList.remove('is-visible');
      this.toastTimer = null;
    }, 1400);
  }

  destroy() {
    if (this.tooltipManager) this.tooltipManager.destroy();
    if (this.selectionEngine) this.selectionEngine.destroy();
    if (this.rootElement) this.rootElement.remove();
  }
}
