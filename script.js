const audio = document.querySelector('#audio');
const mainPlay = document.querySelector('#main-play');
const tracks = [...document.querySelectorAll('.track')];
const currentTitle = document.querySelector('#current-title');
const currentStyle = document.querySelector('#current-style');
const currentTime = document.querySelector('#current-time');
const duration = document.querySelector('#duration');
const progress = document.querySelector('#progress');

let activeTrack = tracks[0];
audio.src = activeTrack.dataset.src;

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
  currentStyle.textContent = `${track.dataset.style} · ${track.dataset.status}`;
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
    else audio.play().catch(() => setPlayingState(false));
  }
}

mainPlay.addEventListener('click', () => {
  if (audio.paused) audio.play().catch(() => setPlayingState(false));
  else audio.pause();
});

tracks.forEach((track) => track.addEventListener('click', () => selectTrack(track)));
audio.addEventListener('play', () => setPlayingState(true));
audio.addEventListener('pause', () => setPlayingState(false));
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
