const audio = document.querySelector('#audio');
const mainPlay = document.querySelector('#main-play');
const playIcon = mainPlay.querySelector('.play-icon');
const tracks = [...document.querySelectorAll('.track')];
const currentTitle = document.querySelector('#current-title');
const currentStyle = document.querySelector('#current-style');
const currentTime = document.querySelector('#current-time');
const duration = document.querySelector('#duration');
const progress = document.querySelector('#progress');
const canvas = document.querySelector('#waveform');
const context = canvas.getContext('2d');

let activeTrack = tracks[0];
let audioContext;
let analyser;
let source;
let animationFrame;
let phase = 0;
audio.src = activeTrack.dataset.src;

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '0:00';
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
}

function setupAudioGraph() {
  if (audioContext) return;
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.82;
  source = audioContext.createMediaElementSource(audio);
  source.connect(analyser);
  analyser.connect(audioContext.destination);
}

function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function drawWaveform() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const data = new Uint8Array(analyser ? analyser.frequencyBinCount : 64);
  if (analyser) analyser.getByteFrequencyData(data);
  context.clearRect(0, 0, width, height);

  const playing = !audio.paused;
  const bass = playing && analyser ? data.slice(0, 14).reduce((sum, value) => sum + value, 0) / 14 / 255 : 0.08;
  const stereo = playing && analyser ? data.slice(14, 48).reduce((sum, value) => sum + value, 0) / 34 / 255 : 0.06;
  phase += playing ? 0.045 + bass * 0.04 : 0.006;

  const bands = [
    { center: height * 0.34, amplitude: 14 + bass * height * 0.25, color: '#87CEEB', speed: 1.15, detail: 2.6 },
    { center: height * 0.64, amplitude: 10 + stereo * height * 0.23, color: '#E1F7FA', speed: 0.72, detail: 4.1 }
  ];

  bands.forEach((band, bandIndex) => {
    context.beginPath();
    context.strokeStyle = band.color;
    context.lineWidth = bandIndex === 0 ? 2.2 : 1.2;
    context.shadowColor = band.color;
    context.shadowBlur = playing ? 14 : 5;
    for (let x = 0; x <= width; x += 3) {
      const normalized = x / width;
      const envelope = Math.sin(normalized * Math.PI);
      const primary = Math.sin(normalized * Math.PI * band.detail + phase * band.speed);
      const harmonic = Math.sin(normalized * Math.PI * 13 - phase * 1.4) * 0.24;
      const y = band.center + (primary + harmonic) * band.amplitude * envelope;
      if (x === 0) context.moveTo(x, y); else context.lineTo(x, y);
    }
    context.stroke();
    context.shadowBlur = 0;
  });

  animationFrame = requestAnimationFrame(drawWaveform);
}

function setPlayingState(isPlaying) {
  playIcon.textContent = isPlaying ? 'Ⅱ' : '▶';
  mainPlay.setAttribute('aria-label', `${isPlaying ? 'Pause' : 'Play'} ${currentTitle.textContent}`);
  tracks.forEach((track) => {
    track.querySelector('b').textContent = track === activeTrack && isPlaying ? 'Pause' : 'Play';
  });
}

async function togglePlayback() {
  setupAudioGraph();
  if (audioContext.state === 'suspended') await audioContext.resume();
  if (audio.paused) await audio.play(); else audio.pause();
}

async function selectTrack(track) {
  const changed = track !== activeTrack;
  if (changed) {
    activeTrack.classList.remove('active');
    activeTrack = track;
    activeTrack.classList.add('active');
    audio.src = activeTrack.dataset.src;
    currentTitle.textContent = activeTrack.dataset.title;
    currentStyle.textContent = activeTrack.dataset.style;
  }
  try { await togglePlayback(); } catch { setPlayingState(false); }
}

mainPlay.addEventListener('click', async () => {
  try { await togglePlayback(); } catch { setPlayingState(false); }
});
tracks.forEach((track) => track.addEventListener('click', () => selectTrack(track)));
audio.addEventListener('play', () => setPlayingState(true));
audio.addEventListener('pause', () => setPlayingState(false));
audio.addEventListener('loadedmetadata', () => { duration.textContent = formatTime(audio.duration); });
audio.addEventListener('timeupdate', () => {
  currentTime.textContent = formatTime(audio.currentTime);
  progress.value = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
});
audio.addEventListener('ended', () => selectTrack(tracks[(tracks.indexOf(activeTrack) + 1) % tracks.length]));
progress.addEventListener('input', () => { if (audio.duration) audio.currentTime = Number(progress.value) / 100 * audio.duration; });

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));

const contactForm = document.querySelector('.contact-form');
const formStatus = document.querySelector('#form-status');
contactForm.addEventListener('submit', (event) => {
  if (!contactForm.getAttribute('action')) {
    event.preventDefault();
    formStatus.textContent = 'Add your Web3Forms action URL to activate this form.';
  }
});
document.querySelectorAll('a[href="#"]').forEach((link) => link.addEventListener('click', (event) => event.preventDefault()));
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
cancelAnimationFrame(animationFrame);
drawWaveform();
