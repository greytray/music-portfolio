import { Renderer, Program, Mesh, Color, Triangle } from 'ogl';
import './Iridescence.css';

const vertexShader = `
attribute vec2 uv;
attribute vec2 position;

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 0, 1);
}
`;

const fragmentShader = `
precision highp float;

uniform float uTime;
uniform vec3 uColor;
uniform vec3 uResolution;
uniform vec2 uMouse;
uniform float uAmplitude;
uniform float uSpeed;

varying vec2 vUv;

void main() {
  float mr = min(uResolution.x, uResolution.y);
  vec2 uv = (vUv.xy * 2.0 - 1.0) * uResolution.xy / mr;

  uv += (uMouse - vec2(0.5)) * uAmplitude;

  float d = -uTime * 0.5 * uSpeed;
  float a = 0.0;
  for (float i = 0.0; i < 8.0; ++i) {
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
 * Mounts an animated Iridescence WebGL shader instance into a DOM element.
 * 
 * @param {HTMLElement} ctn - Target container element
 * @param {Object} options - Configuration options
 * @param {number[]} [options.color=[1, 1, 1]] - RGB color modulation [r, g, b]
 * @param {number} [options.speed=2.7] - Speed of wave motion
 * @param {number} [options.amplitude=1.0] - Distortion amplitude (including mouse reactivity)
 * @param {boolean} [options.mouseReact=true] - Whether to react to mouse movement
 * @param {HTMLElement} [options.mouseTarget] - Element to listen for mouse moves on (defaults to ctn or parent section)
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
      antialias: true,
      powerPreference: 'high-performance'
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

  function resize() {
    if (!ctn) return;
    const width = ctn.offsetWidth || ctn.clientWidth || 300;
    const height = ctn.offsetHeight || ctn.clientHeight || 300;
    
    // Scale for crisp rendering with maximum 2x DPR to save battery & GPU
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setSize(width * dpr, height * dpr);
    gl.canvas.style.width = '100%';
    gl.canvas.style.height = '100%';

    if (program && program.uniforms && program.uniforms.uResolution) {
      program.uniforms.uResolution.value.set(
        gl.canvas.width,
        gl.canvas.height,
        gl.canvas.width / Math.max(1, gl.canvas.height)
      );
    }
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

  // Animation loop with visibility optimization
  let lastTime = 0;
  function update(t) {
    animateId = requestAnimationFrame(update);
    if (!isVisible) return;

    // Smooth mouse interpolation for liquid feel
    mousePos.x += (targetMouse.x - mousePos.x) * 0.08;
    mousePos.y += (targetMouse.y - mousePos.y) * 0.08;
    program.uniforms.uMouse.value[0] = mousePos.x;
    program.uniforms.uMouse.value[1] = mousePos.y;

    program.uniforms.uTime.value = t * 0.001;
    renderer.render({ scene: mesh });
  }

  animateId = requestAnimationFrame(update);
  ctn.appendChild(gl.canvas);

  // Resize handling with ResizeObserver and window fallback
  let resizeObserver = null;
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(ctn);
  }
  window.addEventListener('resize', resize, { passive: true });

  // Pause render loop when section is offscreen to preserve 60fps & power
  let intersectionObserver = null;
  if (typeof IntersectionObserver !== 'undefined') {
    intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        isVisible = entry.isIntersecting;
      });
    }, { threshold: 0.05 });
    intersectionObserver.observe(mouseTarget || ctn);
  }

  // Mouse reaction handler using screen viewport coordinates for seamless full-page responsiveness
  function handleMouseMove(e) {
    const x = e.clientX / (window.innerWidth || 1);
    const y = 1.0 - (e.clientY / (window.innerHeight || 1));
    targetMouse.x = Math.max(0, Math.min(1, x));
    targetMouse.y = Math.max(0, Math.min(1, y));
  }

  // Touch support for mobile devices
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

  // Return cleanup method
  return function cleanup() {
    if (animateId) cancelAnimationFrame(animateId);
    window.removeEventListener('resize', resize);
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
