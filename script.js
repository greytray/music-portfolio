const audio = document.querySelector('#audio');
const mainPlay = document.querySelector('#main-play');
const playIcon = mainPlay.querySelector('.play-icon');
const tracks = [...document.querySelectorAll('.track')];
const currentTitle = document.querySelector('#current-title');
const currentStyle = document.querySelector('#current-style');
const currentTime = document.querySelector('#current-time');
const duration = document.querySelector('#duration');
const progress = document.querySelector('#progress');

let activeTrack = tracks[0];
audio.src = activeTrack.dataset.src;

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remaining}`;
}

function setPlayingState(isPlaying) {
  playIcon.textContent = isPlaying ? 'Ⅱ' : '▶';
  mainPlay.setAttribute('aria-label', `${isPlaying ? 'Pause' : 'Play'} ${currentTitle.textContent}`);
  tracks.forEach((track) => {
    track.querySelector('.track-action').textContent = track === activeTrack && isPlaying ? 'Pause' : 'Play';
  });
}

function selectTrack(track, shouldPlay = true) {
  const changed = track !== activeTrack;
  if (changed) {
    activeTrack.classList.remove('active');
    activeTrack = track;
    activeTrack.classList.add('active');
    audio.src = activeTrack.dataset.src;
    currentTitle.textContent = activeTrack.dataset.title;
    currentStyle.textContent = activeTrack.dataset.style;
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
audio.addEventListener('loadedmetadata', () => { duration.textContent = formatTime(audio.duration); });
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
