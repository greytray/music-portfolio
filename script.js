const audio = document.querySelector('#audio');
const playButton = document.querySelector('#play-button');
const playerTime = document.querySelector('#player-time');
const canvas = document.querySelector('#waveform');
const ctx = canvas.getContext('2d');
let animationFrame;

function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function drawWaveform() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const time = performance.now() / 650;
  ctx.clearRect(0, 0, width, height);
  ctx.beginPath();
  ctx.strokeStyle = '#bff4ff';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#87ceeb';
  ctx.shadowBlur = 10;
  for (let x = 0; x <= width; x += 4) {
    const energy = audio.paused ? 0.35 : 1;
    const envelope = Math.sin((x / width) * Math.PI);
    const y = height / 2 + Math.sin(x * 0.045 + time) * height * 0.28 * envelope * energy + Math.sin(x * 0.12 - time * 1.4) * 5 * energy;
    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
  animationFrame = requestAnimationFrame(drawWaveform);
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '0:00';
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
}

playButton.addEventListener('click', async () => {
  try {
    if (audio.paused) await audio.play(); else audio.pause();
  } catch {
    playButton.textContent = '▶';
  }
});
audio.addEventListener('play', () => { playButton.textContent = 'Ⅱ'; playButton.setAttribute('aria-label', 'Pause demo beat'); });
audio.addEventListener('pause', () => { playButton.textContent = '▶'; playButton.setAttribute('aria-label', 'Play demo beat'); });
audio.addEventListener('timeupdate', () => { playerTime.textContent = formatTime(audio.currentTime); });
document.querySelector('[data-scroll-player]').addEventListener('click', () => document.querySelector('#player').scrollIntoView({ behavior: 'smooth', block: 'center' }));

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));

const form = document.querySelector('.contact-form');
const status = document.querySelector('#form-status');
form.addEventListener('submit', (event) => {
  if (!form.getAttribute('action')) {
    event.preventDefault();
    status.textContent = 'Add your Web3Forms action URL to activate submissions.';
  }
});
document.querySelectorAll('a[href="#"]').forEach((link) => link.addEventListener('click', (event) => event.preventDefault()));
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
cancelAnimationFrame(animationFrame);
drawWaveform();
