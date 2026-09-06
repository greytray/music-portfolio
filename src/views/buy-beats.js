import { cartStore } from '../store/cartStore.js';

export function createBuyBeatsView({ navigateTo }) {
  const container = document.createElement('div');
  container.className = 'view-page beats-view';
  container.id = 'buy-beats-view-content';

  const BEATS = [
    {
      id: 'beat-1',
      title: 'Feeling Mello',
      genre: 'Lo-Fi / Chillhop',
      bpm: 110,
      key: 'C Maj',
      duration: '0:44',
      src: './assets/feeling mello.wav',
      tags: ['Smooth', 'Guitar', 'Warm Drums', 'Relaxed'],
      description: 'Lush Rhodes chords, organic rimshots, and a laid-back melodic groove built for reflective verses.',
      prices: { mp3: 49, wav: 99, stems: 199, exclusive: 599 }
    },
    {
      id: 'beat-2',
      title: 'Broken Jar',
      genre: 'Trap & Hip-Hop',
      bpm: 132,
      key: 'G Min',
      duration: '0:38',
      src: './assets/broken jar mastered.mp3',
      tags: ['Heavy 808', 'Dark Bells', 'Punchy', 'Hard'],
      description: 'Menacing dark piano arpeggios layered over distorted slide 808s and razor-sharp hi-hat rolls.',
      prices: { mp3: 49, wav: 99, stems: 199, exclusive: 599 }
    },
    {
      id: 'beat-3',
      title: 'Kpop Beat',
      genre: 'K-Pop & Dance',
      bpm: 124,
      key: 'A Min',
      duration: '1:14',
      src: './assets/Kpop beat.mp3',
      tags: ['Upbeat', 'Synth Brass', 'Energetic', 'Anthemic'],
      description: 'High-energy hook-driven beat with punchy four-on-the-floor groove and vibrant melodic brass.',
      prices: { mp3: 49, wav: 99, stems: 199, exclusive: 599 }
    },
    {
      id: 'beat-4',
      title: 'Kensuke',
      genre: 'Cinematic & Anime',
      bpm: 95,
      key: 'D Min',
      duration: '0:45',
      src: './assets/Kensuke.mp3',
      tags: ['Dramatic', 'East Asian Flute', 'Taiko Drums', 'Atmospheric'],
      description: 'Original soundtrack composition with ethereal flute melodies, heavy cinematic percussion, and ambient pads.',
      prices: { mp3: 49, wav: 99, stems: 199, exclusive: 599 }
    },
    {
      id: 'beat-5',
      title: 'K-Pop Post FX',
      genre: 'K-Pop & Dance',
      bpm: 128,
      key: 'E Maj',
      duration: '0:14',
      src: './assets/K-Pop post fx.mp3',
      tags: ['Vocal Chops', 'Future Pop', 'Bright', 'Dance'],
      description: 'Crisp future-bass drop synth chords with pitch-shifted vocal chops and pumping sidechain compression.',
      prices: { mp3: 49, wav: 99, stems: 199, exclusive: 599 }
    },
    {
      id: 'beat-6',
      title: 'Aiobahn Maybe Last Mix',
      genre: 'Electronic & Melodic',
      bpm: 140,
      key: 'F# Min',
      duration: '0:53',
      src: './assets/Aiobahn maybe last mix.mp3',
      tags: ['Speedy', 'Melodic Bass', 'Euphoric', 'Club'],
      description: 'Fast-paced melodic electronic track combining Japanese club energy with soaring lead synths.',
      prices: { mp3: 49, wav: 99, stems: 199, exclusive: 599 }
    }
  ];

  let activeGenre = 'all';
  let searchQuery = '';
  let currentPlayingBeat = null;
  const storeAudio = new Audio();
  storeAudio.preload = 'none';

  container.innerHTML = `
    <div class="view-hero">
      <div class="view-pill-tag">Instant Delivery · 100% Royalty Free Option</div>
      <h1 class="view-title">Original Beat Store</h1>
      <p class="view-subtitle">High-end production, analog warmth, and release-ready masters. Choose non-exclusive licenses or full exclusive track stems.</p>
    </div>

    <!-- Active Player Bar inside store -->
    <div class="store-player-bar" id="store-player-bar" style="display: none;">
      <div class="store-player-info">
        <div class="store-player-icon" id="store-player-icon">▶</div>
        <div>
          <strong id="store-now-title">—</strong>
          <span id="store-now-meta">—</span>
        </div>
      </div>
      <div class="store-player-scrub">
        <span id="store-time-cur">0:00</span>
        <input type="range" id="store-seek" min="0" max="100" value="0" step="0.1">
        <span id="store-time-dur">0:00</span>
      </div>
      <div class="store-player-actions">
        <button type="button" class="btn-sm btn-outline" id="store-stop-btn">Stop</button>
      </div>
    </div>

    <!-- Filter & Search Toolbar -->
    <div class="store-toolbar">
      <div class="genre-tabs" id="genre-tabs">
        <button type="button" class="genre-tab active" data-genre="all">All Genres</button>
        <button type="button" class="genre-tab" data-genre="Trap & Hip-Hop">Trap &amp; Hip-Hop</button>
        <button type="button" class="genre-tab" data-genre="K-Pop & Dance">K-Pop &amp; Dance</button>
        <button type="button" class="genre-tab" data-genre="Cinematic & Anime">Cinematic &amp; Anime</button>
        <button type="button" class="genre-tab" data-genre="Lo-Fi / Chillhop">Lo-Fi &amp; Chill</button>
      </div>
      <div class="store-search-wrap">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg>
        <input type="text" id="store-search-input" placeholder="Search by title, BPM, key...">
      </div>
    </div>

    <!-- Beats Grid / List -->
    <div class="beats-list" id="beats-list"></div>

    <!-- Licensing Guide Modal / Info Section -->
    <div class="licensing-section">
      <div class="licensing-header">
        <h2>Transparent Licensing Rights</h2>
        <p>Pick the rights that match your release tier. Every file is instantly delivered to your inbox upon purchase.</p>
      </div>
      <div class="license-cards-grid">
        <div class="license-card">
          <div class="lic-name">Standard MP3</div>
          <div class="lic-price">$49 <span>/ track</span></div>
          <p class="lic-desc">For demo releases, mixtapes &amp; social teasers.</p>
          <ul class="lic-perks">
            <li>✓ Untagged 320kbps MP3</li>
            <li>✓ Up to 50,000 audio streams</li>
            <li>✓ 1 Music Video</li>
            <li>✓ Non-exclusive license agreement</li>
          </ul>
        </div>
        <div class="license-card featured">
          <div class="lic-badge">Most Popular</div>
          <div class="lic-name">Premium WAV</div>
          <div class="lic-price">$99 <span>/ track</span></div>
          <p class="lic-desc">The industry standard for commercial streaming releases.</p>
          <ul class="lic-perks">
            <li>✓ 24-bit 48kHz WAV + MP3</li>
            <li>✓ Up to 250,000 audio streams</li>
            <li>✓ Monetized YouTube &amp; TikTok sync</li>
            <li>✓ 2 Music Videos &amp; Live Performances</li>
          </ul>
        </div>
        <div class="license-card">
          <div class="lic-name">Trackout Stems</div>
          <div class="lic-price">$199 <span>/ track</span></div>
          <p class="lic-desc">Complete creative freedom for mixing your vocals.</p>
          <ul class="lic-perks">
            <li>✓ All individual WAV multitrack stems</li>
            <li>✓ Master WAV + Untagged MP3</li>
            <li>✓ Up to 1,000,000 audio streams</li>
            <li>✓ Unlimited video sync &amp; radio play</li>
          </ul>
        </div>
        <div class="license-card">
          <div class="lic-name">Exclusive Rights</div>
          <div class="lic-price">$599 <span>/ track</span></div>
          <p class="lic-desc">100% sole ownership. Beat is removed from the store.</p>
          <ul class="lic-perks">
            <li>✓ Sole ownership &amp; master rights transfer</li>
            <li>✓ Unlimited commercial streaming</li>
            <li>✓ Untagged Stems + WAV + MP3</li>
            <li>✓ Signed Exclusive Contract PDF</li>
          </ul>
        </div>
      </div>
    </div>
  `;

  const beatsList = container.querySelector('#beats-list');
  const storePlayerBar = container.querySelector('#store-player-bar');
  const storeNowTitle = container.querySelector('#store-now-title');
  const storeNowMeta = container.querySelector('#store-now-meta');
  const storeTimeCur = container.querySelector('#store-time-cur');
  const storeTimeDur = container.querySelector('#store-time-dur');
  const storeSeek = container.querySelector('#store-seek');
  const storeStopBtn = container.querySelector('#store-stop-btn');
  const storeSearchInput = container.querySelector('#store-search-input');
  const genreTabs = container.querySelectorAll('.genre-tab');

  function formatTime(sec) {
    if (!Number.isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function renderBeats() {
    const filtered = BEATS.filter(b => {
      const matchGenre = activeGenre === 'all' || b.genre === activeGenre;
      const q = searchQuery.toLowerCase();
      const matchSearch = !q || 
        b.title.toLowerCase().includes(q) || 
        b.genre.toLowerCase().includes(q) || 
        b.bpm.toString().includes(q) || 
        b.key.toLowerCase().includes(q) ||
        b.tags.some(t => t.toLowerCase().includes(q));
      return matchGenre && matchSearch;
    });

    if (filtered.length === 0) {
      beatsList.innerHTML = `
        <div class="empty-state">
          <p>No beats match your filter. Try clearing your search query.</p>
        </div>
      `;
      return;
    }

    beatsList.innerHTML = filtered.map((beat, i) => {
      const isPlaying = currentPlayingBeat && currentPlayingBeat.id === beat.id && !storeAudio.paused;
      return `
        <article class="beat-card ${isPlaying ? 'is-playing' : ''}" data-id="${beat.id}" id="beat-card-${beat.id}">
          <div class="beat-main-col">
            <button type="button" class="beat-play-btn ${isPlaying ? 'playing' : ''}" data-action="preview" aria-label="Play ${beat.title}">
              ${isPlaying ? `
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              ` : `
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              `}
            </button>
            <div class="beat-info">
              <div class="beat-title-row">
                <h3 class="beat-name">${beat.title}</h3>
                <span class="beat-badge">${beat.genre}</span>
              </div>
              <p class="beat-desc">${beat.description}</p>
              <div class="beat-specs">
                <span class="spec-tag"><strong>BPM:</strong> ${beat.bpm}</span>
                <span class="spec-tag"><strong>Key:</strong> ${beat.key}</span>
                <span class="spec-tag"><strong>Length:</strong> ${beat.duration}</span>
                ${beat.tags.map(t => `<span class="beat-tag">#${t}</span>`).join('')}
              </div>
            </div>
          </div>

          <div class="beat-buy-col">
            <div class="beat-license-selector">
              <label for="lic-sel-${beat.id}">License:</label>
              <select id="lic-sel-${beat.id}" class="license-dropdown">
                <option value="mp3" data-price="49">Standard MP3 — $49</option>
                <option value="wav" data-price="99" selected>Premium WAV — $99</option>
                <option value="stems" data-price="199">Trackout Stems — $199</option>
                <option value="exclusive" data-price="599">Exclusive Rights — $599</option>
              </select>
            </div>
            <button type="button" class="btn-buy-beat" data-action="add-cart">
              <span>Add to Cart</span>
              <strong class="price-display" id="price-display-${beat.id}">$99</strong>
            </button>
          </div>
        </article>
      `;
    }).join('');

    // Attach card event listeners
    filtered.forEach(beat => {
      const card = beatsList.querySelector(`#beat-card-${beat.id}`);
      if (!card) return;

      const playBtn = card.querySelector('[data-action="preview"]');
      const addCartBtn = card.querySelector('[data-action="add-cart"]');
      const licenseSelect = card.querySelector(`#lic-sel-${beat.id}`);
      const priceDisplay = card.querySelector(`#price-display-${beat.id}`);

      licenseSelect.addEventListener('change', () => {
        const tier = licenseSelect.value;
        const price = beat.prices[tier];
        priceDisplay.textContent = `$${price}`;
      });

      playBtn.addEventListener('click', () => {
        togglePlayBeat(beat);
      });

      addCartBtn.addEventListener('click', () => {
        const tier = licenseSelect.value;
        const price = beat.prices[tier];
        const licenseLabels = {
          mp3: 'Standard MP3 Lease',
          wav: 'Premium WAV Lease',
          stems: 'Trackout Stems License',
          exclusive: 'Exclusive Ownership'
        };

        cartStore.addItem({
          id: `${beat.id}-${tier}`,
          beatId: beat.id,
          title: beat.title,
          category: 'Beats',
          license: licenseLabels[tier],
          licenseTier: tier,
          price: price,
          bpm: beat.bpm,
          key: beat.key
        });

        // Visual feedback
        addCartBtn.classList.add('added');
        addCartBtn.innerHTML = '<span>Added to Cart ✓</span>';
        setTimeout(() => {
          addCartBtn.classList.remove('added');
          addCartBtn.innerHTML = `<span>Add to Cart</span> <strong class="price-display">$${price}</strong>`;
        }, 1600);
      });
    });
  }

  function togglePlayBeat(beat) {
    if (currentPlayingBeat && currentPlayingBeat.id === beat.id) {
      if (storeAudio.paused) {
        storeAudio.play();
      } else {
        storeAudio.pause();
      }
    } else {
      currentPlayingBeat = beat;
      storeAudio.src = beat.src;
      storeAudio.play();
      storePlayerBar.style.display = 'flex';
      storeNowTitle.textContent = beat.title;
      storeNowMeta.textContent = `${beat.bpm} BPM · Key of ${beat.key} · ${beat.genre}`;
    }
    renderBeats();
  }

  storeAudio.addEventListener('timeupdate', () => {
    if (storeAudio.duration) {
      storeTimeCur.textContent = formatTime(storeAudio.currentTime);
      storeTimeDur.textContent = formatTime(storeAudio.duration);
      storeSeek.value = (storeAudio.currentTime / storeAudio.duration) * 100;
    }
  });

  storeAudio.addEventListener('ended', () => {
    currentPlayingBeat = null;
    storePlayerBar.style.display = 'none';
    renderBeats();
  });

  storeAudio.addEventListener('pause', () => {
    renderBeats();
  });

  storeAudio.addEventListener('play', () => {
    renderBeats();
  });

  storeSeek.addEventListener('input', () => {
    if (storeAudio.duration) {
      storeAudio.currentTime = (storeSeek.value / 100) * storeAudio.duration;
    }
  });

  storeStopBtn.addEventListener('click', () => {
    storeAudio.pause();
    storeAudio.currentTime = 0;
    currentPlayingBeat = null;
    storePlayerBar.style.display = 'none';
    renderBeats();
  });

  genreTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      genreTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeGenre = tab.dataset.genre;
      renderBeats();
    });
  });

  storeSearchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderBeats();
  });

  renderBeats();

  // Cleanup hook if container is removed
  container.pausePlayback = () => {
    if (!storeAudio.paused) {
      storeAudio.pause();
    }
  };

  return container;
}
