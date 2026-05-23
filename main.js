import init, { PhysicsEngine } from "./pkg/wasm_compare.js";

// =========================================================================
// Physics simulation class on the JavaScript side
// =========================================================================
class JSPhysicsEngine {
  constructor(width, height, count) {
    this.width = width;
    this.height = height;
    this.particles = [];
    this.coords = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: ((i * 17.5) % (width - 20)) + 10,
        y: ((i * 13.2) % (height - 20)) + 10,
        vx: ((i * 1.5) % 3.0) - 1.5,
        vy: ((i * 2.3) % 3.0) - 1.5,
        radius: 2.0,
      });
    }
  }
  update() {
    const gravity = 0.03;
    const bounce = -0.7;
    const len = this.particles.length;
    const minDist = 4.0;
    const minDistSq = minDist * minDist;

    for (let i = 0; i < len; i++) {
      const pi = this.particles[i];
      for (let j = i + 1; j < len; j++) {
        const pj = this.particles[j];
        const dx = pj.x - pi.x;
        const dy = pj.y - pi.y;
        const distanceSq = dx * dx + dy * dy;
        if (distanceSq < minDistSq && distanceSq > 0) {
          const distance = Math.sqrt(distanceSq);
          const overlap = minDist - distance;
          const nx = dx / distance;
          const ny = dy / distance;
          const push = overlap * 0.5;
          pi.x -= nx * push;
          pi.y -= ny * push;
          pj.x += nx * push;
          pj.y += ny * push;
          const kx = pi.vx - pj.vx;
          const ky = pi.vy - pj.vy;
          const p = 0.1 * (kx * nx + ky * ny);
          pi.vx -= p * nx;
          pi.vy -= p * ny;
          pj.vx += p * nx;
          pj.vy += p * ny;
        }
      }
    }
    for (let i = 0; i < len; i++) {
      const p = this.particles[i];
      p.vy += gravity;
      p.x += p.vx;
      p.y += p.vy;
      if (p.x - p.radius < 0) {
        p.x = p.radius;
        p.vx *= bounce;
      } else if (p.x + p.radius > this.width) {
        p.x = this.width - p.radius;
        p.vx *= bounce;
      }
      if (p.y - p.radius < 0) {
        p.y = p.radius;
        p.vy *= bounce;
      } else if (p.y + p.radius > this.height) {
        p.y = this.height - p.radius;
        p.vy *= bounce;
      }
      this.coords[i * 2] = p.x;
      this.coords[i * 2 + 1] = p.y;
    }
  }
  getCoordinates() {
    return this.coords;
  }
}

async function run() {
  await init();

  // Canvas information
  const WIDTH = 400;
  const HEIGHT = 400;
  const rCtx = document.getElementById("rust-canvas").getContext("2d");
  const jCtx = document.getElementById("js-canvas").getContext("2d");

  // 💡 Dynamically insert operation UI menu at the top
  const menu = document.createElement("div");
  menu.style.cssText =
    "margin-bottom: 20px; padding: 15px; background: #161925; border-radius: 12px; border: 1px solid #2a2f45; display: flex; flex-direction: column; gap: 12px; width: 860px; box-sizing: border-box;";
  menu.innerHTML = `
    <div style="display: flex; align-items: center; gap: 15px;">
      <span style="font-weight: bold; color: #fff;">👥 Particle Count:</span>
      <input type="range" id="particle-slider" min="500" max="15000" step="100" value="2500" style="flex-grow: 1; cursor: pointer;">
      <span id="slider-value" style="font-family: monospace; font-size: 1.2rem; font-weight: bold; color: #00ffcc; width: 80px; text-align: right;">2,500</span>
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-weight: bold; color: #fff; margin-right: 7px;">⚡ Measurement Mode:</span>
      <button id="btn-both" style="padding: 6px 14px; cursor:pointer; background:#2a2f45; color:#fff; border:none; border-radius:4px;">Run Both</button>
      <button id="btn-rust" style="padding: 6px 14px; cursor:pointer; background:#00ffcc; color:#000; border:none; border-radius:4px; font-weight:bold;">Rust Only (Full Power)</button>
      <button id="btn-js" style="padding: 6px 14px; cursor:pointer; background:#ff0055; color:#fff; border:none; border-radius:4px; font-weight:bold;">JS Only (Full Power)</button>
    </div>
  `;
  document.body.insertBefore(menu, document.body.firstChild);

  // State management variables
  let currentCount = 2500;
  let activeMode = "both"; // "both", "rust", "js"

  // Instance references for each engine
  let rustEngine = null;
  let jsEngine = null;

  // 💡 Core function to initialize/recreate engines
  function resetEngines(count) {
    currentCount = count;
    document.getElementById("count-view").innerText = count.toLocaleString();
    document.getElementById("slider-value").innerText = count.toLocaleString();

    // Create new instances (old memory is automatically released)
    rustEngine = new PhysicsEngine(WIDTH, HEIGHT, currentCount);
    jsEngine = new JSPhysicsEngine(WIDTH, HEIGHT, currentCount);
  }

  // Initial generation
  resetEngines(currentCount);

  // Slider change event handling
  const slider = document.getElementById("particle-slider");
  slider.addEventListener("input", (e) => {
    const nextCount = parseInt(e.target.value, 10);
    resetEngines(nextCount);
  });

  // Mode switch events
  document.getElementById("btn-both").onclick = () => {
    activeMode = "both";
  };
  document.getElementById("btn-rust").onclick = () => {
    activeMode = "rust";
    jCtx.clearRect(0, 0, WIDTH, HEIGHT);
    document.getElementById("js-fps").innerText = "OFF";
  };
  document.getElementById("btn-js").onclick = () => {
    activeMode = "js";
    rCtx.clearRect(0, 0, WIDTH, HEIGHT);
    document.getElementById("rust-fps").innerText = "OFF";
  };

  // --- Rust Loop ---
  let rLastTime = performance.now();
  let rFrameCount = 0;
  function loopRust() {
    if (activeMode === "both" || activeMode === "rust") {
      rFrameCount++;
      const now = performance.now();
      if (now >= rLastTime + 1000) {
        document.getElementById("rust-fps").innerText =
          Math.round((rFrameCount * 1000) / (now - rLastTime)) + " FPS";
        rFrameCount = 0;
        rLastTime = now;
      }
      rustEngine.update();
      const coords = rustEngine.get_coordinates();
      rCtx.fillStyle = "rgba(15, 17, 26, 0.4)";
      rCtx.fillRect(0, 0, WIDTH, HEIGHT);
      rCtx.fillStyle = "#00ffcc";
      for (let i = 0; i < coords.length; i += 2) {
        rCtx.fillRect(coords[i] | 0, coords[i + 1] | 0, 2, 2);
      }
    }
    requestAnimationFrame(loopRust);
  }

  // --- JavaScript Loop ---
  let jLastTime = performance.now();
  let jFrameCount = 0;
  function loopJS() {
    if (activeMode === "both" || activeMode === "js") {
      jFrameCount++;
      const now = performance.now();
      if (now >= jLastTime + 1000) {
        document.getElementById("js-fps").innerText =
          Math.round((jFrameCount * 1000) / (now - jLastTime)) + " FPS";
        jFrameCount = 0;
        jLastTime = now;
      }
      jsEngine.update();
      const coords = jsEngine.getCoordinates();
      jCtx.fillStyle = "rgba(15, 17, 26, 0.4)";
      jCtx.fillRect(0, 0, WIDTH, HEIGHT);
      jCtx.fillStyle = "#ff0055";
      for (let i = 0; i < coords.length; i += 2) {
        jCtx.fillRect(coords[i] | 0, coords[i + 1] | 0, 2, 2);
      }
    }
    requestAnimationFrame(loopJS);
  }

  requestAnimationFrame(loopRust);
  requestAnimationFrame(loopJS);
}

run();
