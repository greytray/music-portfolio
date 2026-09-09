import { Renderer, Program, Mesh, Color, Triangle } from 'ogl';
import './Iridescence.css';

const vertexShader = `
attribute vec2 uv;
attribute vec2 position;

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShader = `
precision mediump float;

uniform float uTime;
uniform vec3 uColor;
uniform vec3 uResolution;
uniform vec2 uMouse;
uniform float uAmplitude;
uniform float uSpeed;

varying vec2 vUv;

void main() {
  float mr = min(uResolution.x, uResolution.y);
  vec2 uv = (vUv * 2.0 - 1.0) * (uResolution.xy / mr);

  uv += (uMouse - vec2(0.5)) * uAmplitude;

  float d = -uTime * 0.5 * uSpeed;
  float a = 0.0;
  for (float i = 0.0; i < 6.0; ++i) {
    a += cos(i - d - a * uv.x);
    d += sin(uv.y * i + a);
  }
  d += uTime * 0.5 * uSpeed;
  vec3 col = vec3(cos(uv * vec2(d, a)) * 0.6 + 0.4, cos(a + d) * 0.5 + 0.5);
  col = cos(col * cos(vec3(d, a, 2.5)) * 0.5 + 0.5) * uColor;
  gl_FragColor = vec4(col, 1.0);
}
`;

/**
 * Mounts an optimized Iridescence WebGL background shader instance into a DOM element.
 * 
 * @param {HTMLElement} ctn - Target container element
 * @param {Object} options - Configuration options
 * @param {number[]} [options.color=[1, 1, 1]] - RGB color modulation [r, g, b]
 * @param {number} [options.speed=2.7] - Speed of wave motion
 * @param {number} [options.amplitude=1.0] - Distortion amplitude (including mouse reactivity)
 * @param {boolean} [options.mouseReact=true] - Whether to react to mouse movement
 * @param {HTMLElement} [options.mouseTarget] - Element to listen for mouse moves on
 * @returns {Function} cleanup - Function to destroy and dispose the WebGL instance
 */
export function mountIridescence(ctn, options = {}) {
  if (!ctn) return () => {};

  const {
    color = [1, 1, 1],
    speed = 2.7,
    amplitude = 1.0,
    mouseReact = true,
    mouseTarget = ctn.closest('section') || ctn
  } = options;

  let renderer;
  try {
    renderer = new Renderer({
      alpha: true,
      antialias: false, // Turned off for dramatic performance boost with zero perceived loss on high DPI
      powerPreference: 'high-performance',
      dpr: Math.min(window.devicePixelRatio || 1, 1.35)
    });
  } catch (err) {
    console.warn('WebGL not supported for Iridescence background:', err);
    return () => {};
  }

  const gl = renderer.gl;
  gl.clearColor(0, 0, 0, 0);

  const mousePos = { x: 0.5, y: 0.5 };
  let targetMouse = { x: 0.5, y: 0.5 };
  let program;
  let isVisible = true;
  let animateId = null;
  let resizeRafId = null;

  function resize() {
    if (!ctn) return;
    const width = ctn.offsetWidth || ctn.clientWidth || window.innerWidth || 300;
    const height = ctn.offsetHeight || ctn.clientHeight || window.innerHeight || 300;
    
    // Balanced DPR for flawless 60-120fps on all mobile and desktop devices
    const dpr = Math.min(window.devicePixelRatio || 1, 1.35);
    renderer.setSize(width * dpr, height * dpr);
    gl.canvas.style.width = '100%';
    gl.canvas.style.height = '100%';
    gl.canvas.style.transform = 'translateZ(0)';
    gl.canvas.style.willChange = 'transform';
    gl.canvas.style.pointerEvents = 'none';

    if (program && program.uniforms && program.uniforms.uResolution) {
      program.uniforms.uResolution.value.set(
        gl.canvas.width,
        gl.canvas.height,
        gl.canvas.width / Math.max(1, gl.canvas.height)
      );
    }
  }

  function queueResize() {
    if (resizeRafId) cancelAnimationFrame(resizeRafId);
    resizeRafId = requestAnimationFrame(resize);
  }

  const geometry = new Triangle(gl);
  program = new Program(gl, {
    vertex: vertexShader,
    fragment: fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new Color(...color) },
      uResolution: {
        value: new Color(gl.canvas.width || 300, gl.canvas.height || 300, (gl.canvas.width || 300) / Math.max(1, gl.canvas.height || 300))
      },
      uMouse: { value: new Float32Array([mousePos.x, mousePos.y]) },
      uAmplitude: { value: amplitude },
      uSpeed: { value: speed }
    }
  });

  const mesh = new Mesh(gl, { geometry, program });

  // Initial sizing
  resize();

  // Animation loop with steady framerate preservation
  function update(t) {
    animateId = requestAnimationFrame(update);
    if (!isVisible || document.hidden) return;

    // Smooth mouse interpolation for fluid liquid feel
    mousePos.x += (targetMouse.x - mousePos.x) * 0.08;
    mousePos.y += (targetMouse.y - mousePos.y) * 0.08;
    program.uniforms.uMouse.value[0] = mousePos.x;
    program.uniforms.uMouse.value[1] = mousePos.y;

    program.uniforms.uTime.value = t * 0.001;
    renderer.render({ scene: mesh });
  }

  animateId = requestAnimationFrame(update);
  ctn.appendChild(gl.canvas);

  // Resize handling
  let resizeObserver = null;
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => queueResize());
    resizeObserver.observe(ctn);
  }
  window.addEventListener('resize', queueResize, { passive: true });

  // Keep background alive when in viewport without stutter
  let intersectionObserver = null;
  if (typeof IntersectionObserver !== 'undefined') {
    intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        // As long as any portion of the zone or stage is visible, keep background running
        isVisible = entry.isIntersecting || entry.intersectionRatio > 0;
      });
    }, { threshold: [0, 0.01] });
    intersectionObserver.observe(mouseTarget || ctn);
  }

  // Mouse movement tracking (uses normalized viewport coords)
  function handleMouseMove(e) {
    const x = e.clientX / (window.innerWidth || 1);
    const y = 1.0 - (e.clientY / (window.innerHeight || 1));
    targetMouse.x = Math.max(0, Math.min(1, x));
    targetMouse.y = Math.max(0, Math.min(1, y));
  }

  // Touch move tracking for mobile
  function handleTouchMove(e) {
    if (e.touches && e.touches[0]) {
      const touch = e.touches[0];
      const x = touch.clientX / (window.innerWidth || 1);
      const y = 1.0 - (touch.clientY / (window.innerHeight || 1));
      targetMouse.x = Math.max(0, Math.min(1, x));
      targetMouse.y = Math.max(0, Math.min(1, y));
    }
  }

  if (mouseReact) {
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
  }

  // Tab visibility listener
  function handleVisibilityChange() {
    if (!document.hidden) {
      // Re-trigger render immediately when returning to tab
      isVisible = true;
    }
  }
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Return cleanup method
  return function cleanup() {
    if (animateId) cancelAnimationFrame(animateId);
    if (resizeRafId) cancelAnimationFrame(resizeRafId);
    window.removeEventListener('resize', queueResize);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    if (resizeObserver) resizeObserver.disconnect();
    if (intersectionObserver) intersectionObserver.disconnect();
    
    if (mouseReact) {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
    }

    if (gl.canvas && gl.canvas.parentNode === ctn) {
      ctn.removeChild(gl.canvas);
    }
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  };
}

export default mountIridescence;

