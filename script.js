const audio = document.querySelector('#audio');
const mainPlay = document.querySelector('#main-play');
const tracks = [...document.querySelectorAll('.track')];
const currentTitle = document.querySelector('#current-title');
const currentStyle = document.querySelector('#current-style');
const currentTime = document.querySelector('#current-time');
const duration = document.querySelector('#duration');
const progress = document.querySelector('#progress');

let activeTrack = tracks[0];
let audioContext;
let analyser;
let sourceNode;
let frequencyData;
let visualizerFrame;
let smoothedBass = 0.16;
let smoothedMids = 0.12;
const playerEnergy = document.querySelector('.player-energy');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
audio.src = activeTrack.dataset.src;

function averageRange(data, start, end) {
  let total = 0;
  for (let index = start; index <= end; index += 1) total += data[index] || 0;
  return total / Math.max(1, end - start + 1) / 255;
}

function renderVisualizer() {
  if (!analyser || audio.paused || document.hidden || reduceMotion.matches) {
    visualizerFrame = undefined;
    return;
  }

  analyser.getByteFrequencyData(frequencyData);
  const bass = averageRange(frequencyData, 1, 9);
  const mids = averageRange(frequencyData, 10, 34);
  smoothedBass += (bass - smoothedBass) * 0.2;
  smoothedMids += (mids - smoothedMids) * 0.26;
  playerEnergy?.style.setProperty('--bass', Math.min(1, 0.12 + smoothedBass * 1.35).toFixed(3));
  playerEnergy?.style.setProperty('--mids', Math.min(1, 0.1 + smoothedMids * 1.55).toFixed(3));
  visualizerFrame = requestAnimationFrame(renderVisualizer);
}

async function ensureAudioGraph() {
  if (!playerEnergy || reduceMotion.matches) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  try {
    if (!audioContext) {
      audioContext = new AudioContext();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.72;
      sourceNode = audioContext.createMediaElementSource(audio);
      sourceNode.connect(analyser);
      analyser.connect(audioContext.destination);
      frequencyData = new Uint8Array(analyser.frequencyBinCount);
    }
    if (audioContext.state === 'suspended') await audioContext.resume();
  } catch {
    playerEnergy.classList.add('is-static');
  }
}

function startVisualizer() {
  if (!visualizerFrame && !reduceMotion.matches) visualizerFrame = requestAnimationFrame(renderVisualizer);
}

function stopVisualizer() {
  if (visualizerFrame) cancelAnimationFrame(visualizerFrame);
  visualizerFrame = undefined;
  playerEnergy?.style.setProperty('--bass', '.16');
  playerEnergy?.style.setProperty('--mids', '.12');
}

function loadTrackDurations() {
  tracks.forEach((track) => {
    const metadataAudio = new Audio();
    metadataAudio.preload = 'metadata';
    metadataAudio.src = track.dataset.src;
    metadataAudio.addEventListener('loadedmetadata', () => {
      track.querySelector('.track-length').textContent = formatTime(metadataAudio.duration);
    }, { once: true });
  });
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remaining}`;
}

function setPlayingState(isPlaying) {
  mainPlay.classList.toggle('is-playing', isPlaying);
  mainPlay.setAttribute('aria-label', `${isPlaying ? 'Pause' : 'Play'} ${currentTitle.textContent}`);
  tracks.forEach((track) => {
    const isCurrent = track === activeTrack;
    track.classList.toggle('is-playing', isCurrent && isPlaying);
    track.setAttribute('aria-label', `${isCurrent && isPlaying ? 'Pause' : 'Play'} ${track.dataset.title}`);
  });
}

function updateNowPlaying(track) {
  currentTitle.textContent = track.dataset.title;
  currentStyle.textContent = track.dataset.title === 'Kensuke'
    ? 'Soundtrack by Eko for Anime Teaser'
    : 'Original production';
}

function selectTrack(track, shouldPlay = true) {
  const changed = track !== activeTrack;
  if (changed) {
    activeTrack.classList.remove('active');
    activeTrack = track;
    activeTrack.classList.add('active');
    audio.src = activeTrack.dataset.src;
    currentTime.textContent = '0:00';
    duration.textContent = '0:00';
    progress.value = 0;
    updateNowPlaying(activeTrack);
  }

  if (shouldPlay) {
    if (!changed && !audio.paused) audio.pause();
    else ensureAudioGraph().then(() => audio.play()).catch(() => setPlayingState(false));
  }
}

mainPlay.addEventListener('click', () => {
  if (audio.paused) ensureAudioGraph().then(() => audio.play()).catch(() => setPlayingState(false));
  else audio.pause();
});

tracks.forEach((track) => track.addEventListener('click', () => selectTrack(track)));
audio.addEventListener('play', () => {
  setPlayingState(true);
  startVisualizer();
});
audio.addEventListener('pause', () => {
  setPlayingState(false);
  stopVisualizer();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopVisualizer();
  else if (!audio.paused) startVisualizer();
});
reduceMotion.addEventListener?.('change', () => {
  if (reduceMotion.matches) stopVisualizer();
  else if (!audio.paused) startVisualizer();
});
audio.addEventListener('loadedmetadata', () => {
  const formattedDuration = formatTime(audio.duration);
  duration.textContent = formattedDuration;
  activeTrack.querySelector('.track-length').textContent = formattedDuration;
});
audio.addEventListener('timeupdate', () => {
  currentTime.textContent = formatTime(audio.currentTime);
  progress.value = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
});
audio.addEventListener('ended', () => {
  const nextIndex = (tracks.indexOf(activeTrack) + 1) % tracks.length;
  selectTrack(tracks[nextIndex]);
});
progress.addEventListener('input', () => {
  if (audio.duration) audio.currentTime = (Number(progress.value) / 100) * audio.duration;
});

updateNowPlaying(activeTrack);
loadTrackDurations();
document.querySelector('#year').textContent = new Date().getFullYear();

const contactForm = document.querySelector('.contact-form');
const formStatus = document.querySelector('#form-status');
contactForm.addEventListener('submit', (event) => {
  if (!contactForm.getAttribute('action')) {
    event.preventDefault();
    formStatus.textContent = 'Add your Web3Forms action URL to activate this form.';
  }
});

document.querySelectorAll('a[href="#"]').forEach((link) => {
  link.addEventListener('click', (event) => event.preventDefault());
});
