console.log("✅ app.js loaded");
/* =========================================================
   Global scene navigation (works even if showScene is missing)
========================================================= */
function __setActiveScene(num){
  const n = Number(num);
  if (!Number.isFinite(n)) return;

  const scenes = document.querySelectorAll(".scene");
  scenes.forEach(s => s.classList.remove("active"));

  const target = document.querySelector(`.scene[data-scene="${n}"]`);
  if (target) target.classList.add("active");

  const pt = document.querySelector("#progressText");
  if (pt) pt.textContent = `Scene ${n}/4`;
}

// If the project already defines showScene elsewhere, keep it.
// Otherwise define a compatible showScene that uses our fallback.
if (typeof window.showScene !== "function") {
  window.showScene = (n) => __setActiveScene(n);
}

// back buttons: <button data-back="2">...</button>
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-back]");
  if (!btn) return;
  e.preventDefault();
  const to = btn.getAttribute("data-back");
  window.showScene(Number(to));
});

const $ = (q) => document.querySelector(q);
const $$ = (q) => Array.from(document.querySelectorAll(q));

/* -------------------------
   Scene routing + unlocking
-------------------------- */
const state = {
  scene: 1,
  unlocked: 1,
  spinDone: false,
};

const progressText = $("#progressText");
const stageEl = $("#stage");
const copyLinkBtn = $("#copyLinkBtn");

function showScene(n){
  state.scene = n;
  $$(".scene").forEach(s => s.classList.remove("active","show"));
  const el = document.querySelector(`[data-scene="${n}"]`);
  el.classList.add("active");
  // allow transition
  requestAnimationFrame(() => el.classList.add("show"));
  progressText.textContent = `Scene ${n}/4`;
  persistProgress();
}

function unlockNext(){
  state.unlocked = Math.max(state.unlocked, state.scene + 1);
  persistProgress();
}

function persistProgress(){
  try{
    localStorage.setItem("skyval_progress", JSON.stringify({
      unlocked: state.unlocked
    }));
  }catch{}
}

function loadProgress(){
  try{
    const p = JSON.parse(localStorage.getItem("skyval_progress") || "{}");
    if (p.unlocked) state.unlocked = p.unlocked;
  }catch{}
}

function baseURL(){
  const url = new URL(window.location.href);
  url.hash = "";
  url.search = "";
  if (url.pathname.endsWith("/index.html")) {
    url.pathname = url.pathname.replace(/\/index\.html$/, "/");
  }
  return url.toString();
}

async function copyText(txt){
  try{
    await navigator.clipboard.writeText(txt);
    toast("Copied ✨");
    return true;
  }catch{
    // fallback
    const ta = document.createElement("textarea");
    ta.value = txt;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    toast("Copied ✨");
    return true;
  }
}

function toast(msg){
  const t = document.createElement("div");
  t.className = "toast glass";
  t.textContent = msg;
  Object.assign(t.style,{
    position:"fixed", left:"50%", top:"76px", transform:"translateX(-50%)",
    padding:"10px 14px", borderRadius:"999px", zIndex:10,
    fontSize:"13px", color:"rgba(42,37,64,.95)"
  });
  document.body.appendChild(t);
  setTimeout(()=>{ t.style.opacity="0"; t.style.transition="opacity .35s ease"; }, 900);
  setTimeout(()=>t.remove(), 1400);
}

let softToastTimer = null;
function showToast(msg){
  let el = document.querySelector("#softToast");
  if (!el) {
    el = document.createElement("div");
    el.id = "softToast";
    el.style.position = "fixed";
    el.style.left = "50%";
    el.style.bottom = "22px";
    el.style.transform = "translateX(-50%)";
    el.style.padding = "10px 14px";
    el.style.borderRadius = "999px";
    el.style.background = "rgba(255,255,255,.62)";
    el.style.border = "1px solid rgba(255,255,255,.62)";
    el.style.boxShadow = "0 18px 34px rgba(110,90,140,.14)";
    el.style.backdropFilter = "blur(10px)";
    el.style.fontWeight = "700";
    el.style.fontSize = "13px";
    el.style.zIndex = "99";
    el.style.opacity = "0";
    el.style.transition = "opacity .2s ease, transform .2s ease";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = "1";
  el.style.transform = "translateX(-50%) translateY(-2px)";
  clearTimeout(softToastTimer);
  softToastTimer = setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateX(-50%) translateY(2px)";
  }, 1800);
}

copyLinkBtn.addEventListener("click", async ()=>{
  await copyText(baseURL());
});

/* -------------------------
   Petals / confetti canvas
-------------------------- */
const canvas = $("#petals");
const ctx = canvas.getContext("2d", { alpha:true });
let W=0,H=0, DPR=1;

function resizeCanvas(){
  DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  W = canvas.width = Math.floor(window.innerWidth * DPR);
  H = canvas.height = Math.floor(window.innerHeight * DPR);
  canvas.style.width = window.innerWidth+"px";
  canvas.style.height = window.innerHeight+"px";
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

const petals = [];
function spawnPetalBurst(count=40){
  for(let i=0;i<count;i++){
    petals.push({
      x: (Math.random()*W),
      y: -20*DPR,
      r: (4 + Math.random()*6)*DPR,
      vx: (-0.6 + Math.random()*1.2)*DPR,
      vy: (0.9 + Math.random()*1.6)*DPR,
      a: Math.random()*Math.PI*2,
      va: (-0.04 + Math.random()*0.08),
      life: 240 + Math.floor(Math.random()*160)
    });
  }
}

function tickPetals(){
  ctx.clearRect(0,0,W,H);
  for(let i=petals.length-1;i>=0;i--){
    const p = petals[i];
    p.x += p.vx + Math.sin(p.a)*0.25*DPR;
    p.y += p.vy;
    p.a += p.va;
    p.life -= 1;
    // draw as soft ellipse-ish
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.a);
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life/200));
    ctx.beginPath();
    ctx.ellipse(0,0,p.r*1.2,p.r*0.8,0,0,Math.PI*2);
    ctx.fillStyle = "rgba(255,220,245,.85)";
    ctx.fill();
    ctx.restore();

    if(p.y > H+40*DPR || p.life <= 0) petals.splice(i,1);
  }
  requestAnimationFrame(tickPetals);
}
tickPetals();

// ambient petals
setInterval(()=> spawnPetalBurst(6), 2600);

/* -------------------------
   scene 1 - flower arrangement
-------------------------- */
(() => {

  // ---- DOM
  const flowerGrid = $("#flowerGrid");
  const bouquetCanvas = $("#bouquetCanvas");
  const counter = $("#counter");
  const selectedList = $("#selectedList");
  const poemEl = $("#poem");
  const sealBtn = $("#sealBtn");
  const continueBtn = $("#continue1");

  const sealModal = $("#sealModal");
  const modalBouquetCanvas = $("#modalBouquetCanvas");
  const modalPoem = $("#modalPoem");
  const copyGiftLinkBtn = $("#copyGiftLinkBtn");
  const modalContinueBtn = $("#modalContinueBtn");
  const closeModalBtn = $("#closeModalBtn");
  const copyHint = $("#copyHint");

  const giftOverlay = $("#giftOverlay");
  const giftBouquetCanvas = $("#giftBouquetCanvas");
  const giftMessage = $("#giftMessage");
  const makeOneBackBtn = $("#makeOneBackBtn");

  // ---- Constants
  const MAX = 7;
  const MIN_TO_SEAL = 3;
  const URL_PARAM = "gift";

  // me → him (this bouquet is shown immediately on load)
  const DANA_TO_HIM_BOUQUET = [
    "lavender",
    "rose",
    "tulip",
    "camellia", 
    "sunflower"
  ];

  // ---- Flower data (10) — watercolor inline SVG + lines
  const FLOWERS = [
    {
      id: "rose",
      name: "Rose",
      keywords: ["admiration", "warmth"],
      poeticLines: [
        "I look at you and soften.",
        "You make love feel safe."
      ],
      svg: svgFlower("#ff7fb0", "#ffd1e6", "rose")
    },
    {
      id: "lily",
      name: "Lily",
      keywords: ["devotion", "sincerity"],
      poeticLines: [
        "Quiet devotion, deep and steady.",
        "I stay, gently."
      ],
      svg: svgFlower("#ffffff", "#dfe8ff", "lily")
    },
    {
      id: "peony",
      name: "Peony",
      keywords: ["tenderness", "romance"],
      poeticLines: [
        "Soft love that blooms slowly.",
        "No rush. Just real."
      ],
      svg: svgFlower("#ffb3d1", "#ffe1ee", "peony")
    },
    {
      id: "tulip",
      name: "Tulip",
      keywords: ["choosing you", "closeness"],
      poeticLines: [
        "Out of everyone, I choose you.",
        "Again and again."
      ],
      svg: svgFlower("#ff6d6d", "#ffd0d0", "tulip")
    },
    {
      id: "daisy",
      name: "Daisy",
      keywords: ["gentle joy", "lightness"],
      poeticLines: [
        "You make ordinary days feel light.",
        "You make me smile quietly."
      ],
      svg: svgFlower("#fff7ff", "#fff2b8", "daisy")
    },
    {
      id: "lavender",
      name: "Lavender",
      keywords: ["calm", "comfort"],
      poeticLines: [
        "You quiet the noise in my head.",
        "You feel like peace."
      ],
      svg: svgFlower("#b79bff", "#e6dcff", "lavender")
    },
    {
      id: "babysbreath",
      name: "Baby’s Breath",
      keywords: ["forever", "tenderness"],
      poeticLines: [
        "Something small that lasts.",
        "Softness that stays."
      ],
      svg: svgFlower("#f7fbff", "#eaf2ff", "babys")
    },
    {
      id: "camellia",
      name: "Camellia",
      keywords: ["special", "noticing you"],
      poeticLines: [
        "I notice you in every room.",
        "You feel rare to me."
      ],
      svg: svgFlower("#ff7a9f", "#ffe0ea", "camellia")
    },
    {
      id: "sunflower",
      name: "Sunflower",
      keywords: ["warmth", "loyalty"],
      poeticLines: [
        "I turn toward you without thinking.",
        "You feel like sunlight."
      ],
      svg: svgFlower("#ffcc3d", "#fff0b8", "sunflower")
    },
    {
      id: "sakura",
      name: "Cherry Blossom",
      keywords: ["presence", "gentle moments"],
      poeticLines: [
        "Moments with you feel soft and rare.",
        "I hold them carefully."
      ],
      svg: svgFlower("#ffb7cf", "#fff0f6", "cherry")
    },
  ];

  // ---- State
  const state = {
    // giorgi will build his bouquet for me
    selected: [],
  };

  // ---- Init
  renderLibrary();
  renderAll();
  showReceivedBouquetOnLoad();

  // ---- Render: library cards
  function renderLibrary() {
    if (!flowerGrid) return;

    flowerGrid.innerHTML = FLOWERS.map(f => `
      <article class="flower-card" data-id="${escapeHtml(f.id)}">
        <div class="top">
          <div class="flower-icon" aria-hidden="true">${f.svg}</div>
          <div>
            <p class="flower-name">${escapeHtml(f.name)}</p>
            <div class="flower-keywords">${escapeHtml(f.keywords.join(" • "))}</div>
          </div>
        </div>

        <div class="flower-meaning">
          ${f.poeticLines.map(line => `<p>${escapeHtml(line)}</p>`).join("")}
        </div>

        <div class="card-actions">
          <button class="btn ghost reveal-btn" type="button">Reveal</button>
          <button class="btn primary add-btn" type="button">Add to bouquet</button>
        </div>
      </article>
    `).join("");

    // card interactions
    flowerGrid.addEventListener("click", (e) => {
      const card = e.target.closest(".flower-card");
      if (!card) return;

      const id = card.getAttribute("data-id");
      if (e.target.closest(".reveal-btn")) {
        card.classList.toggle("revealed");
      }

      if (e.target.closest(".add-btn")) {
        addFlower(id);
        // auto-reveal once added (ritual vibe)
        card.classList.add("revealed");
      }
    });
  }

  // ---- Bouquet actions
  function addFlower(id) {
    if (!id) return;
    if (state.selected.length >= MAX) {
      showToast("Your wrap can only hold 7 flowers.");
      return;
    }
    state.selected.push(id);
    renderAll();
  }

  function removeFlowerByIndex(idx) {
    if (idx < 0 || idx >= state.selected.length) return;
    state.selected.splice(idx, 1);
    renderAll();
  }

  // ---- Render all dependent UI
  function renderAll() {
    renderCounter();
    renderBouquetCanvas(bouquetCanvas, state.selected, { interactive: true });
    renderSelectedPanel();
    renderPoem();
    sealBtn.disabled = state.selected.length < MIN_TO_SEAL;
  }

  function renderCounter() {
    if (!counter) return;
    counter.textContent = `${state.selected.length} / ${MAX} flowers`;
  }

  // Bouquet canvas: stickers layered, organic offsets + slight rotations
  function renderBouquetCanvas(target, ids, { interactive }) {
    if (!target) return;

    target.innerHTML = "";
    const baseWidth = target.clientWidth || target.offsetWidth || 0;
    const baseHeight = target.clientHeight || target.offsetHeight || 0;
    const base = Math.min(baseWidth || 1, baseHeight || 1);
    const flowerSize = Math.max(96, Math.round(base * 0.35)); // tuned for bouquet overlap
    const centerSize = Math.round(flowerSize * 1.06);
    const items = ids.map((id, index) => {
      const flower = FLOWERS.find(f => f.id === id);
      if (!flower) return null;

      // deterministic "organic" layout per index + id hash
      const seed = hashString(id + ":" + index);
      const r = rand(seed);

      const total = ids.length;

      let cx = 50;
      let cy = 55;
      let rot = 0;
      let scale = 1;
      let z = 10 + index;

      // If more than one flower, create center + ring layout
      if (total > 1) {
        if (index === 0) {
          // center flower
          cx = 50;
          cy = 55;
          scale = 1.08;
          z = 20; // bring center flower slightly forward
        } else {
          const ringCount = total - 1;
          const angleStep = 360 / ringCount;
          const angle = angleStep * (index - 1);
          const rad = angle * (Math.PI / 180);

          const radius = 12 + ringCount * 1.2;

          cx = 50 + Math.cos(rad) * radius;
          cy = 55 + Math.sin(rad) * (radius * 0.8);

          scale = 0.92 + r() * 0.12;
          z = 10 + index * 2;
        }
      }

      // small organic jitter
      cx += (r() * 3 - 1.5);
      cy += (r() * 3 - 1.5);

      // gentle rotation
      rot = (r() * 12 - 6).toFixed(2);

      return { flower, index, cx, cy, rot, scale, z };
    }).filter(Boolean);

    // Render
    for (const it of items) {
      const el = document.createElement("div");
      el.className = "placed-flower";
      const isCenter = it.index === 0;
      const size = isCenter ? centerSize : flowerSize;
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.left = `${it.cx}%`;
      el.style.top = `${it.cy}%`;
      el.style.zIndex = String(it.z);
      el.style.setProperty("--r", `${it.rot}deg`);
      el.style.setProperty("--scale", it.scale);
      el.style.animation = "bloomIn .45s ease";
      el.dataset.flower = it.flower.name;
      el.dataset.id = it.flower.id;
      el.setAttribute("aria-label", `${it.flower.name} sticker`);

      el.innerHTML = it.flower.svg;

      if (interactive) {
        el.title = "Click to remove";
        el.setAttribute("role", "button");
        el.setAttribute("tabindex", "0");
        el.addEventListener("click", () => removeFlowerByIndex(it.index));
        el.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            removeFlowerByIndex(it.index);
          }
        });
      } else {
        el.style.cursor = "default";
      }

      target.appendChild(el);
    }
  }

  function renderSelectedPanel() {
    if (!selectedList) return;

    if (state.selected.length === 0) {
      selectedList.innerHTML = `<div class="tiny muted">Tap a flower to add it to the wrap.</div>`;
      return;
    }

    const selectedFlowers = state.selected
      .map(id => FLOWERS.find(f => f.id === id))
      .filter(Boolean);

    selectedList.innerHTML = selectedFlowers.map(f => `
      <div class="sel-item">
        <div class="sel-name">${escapeHtml(f.name)}</div>
        <div class="sel-chips">
          ${f.keywords.map(k => `<span class="keyword-chip">${escapeHtml(k)}</span>`).join("")}
        </div>
      </div>
    `).join("");
  }

  function renderPoem() {
    const poem = generatePoemFromSelection(state.selected);
    if (poemEl) poemEl.textContent = poem || "A gentle message will bloom here…";
  }

  // ---- Seal flow
  sealBtn?.addEventListener("click", () => {
    openSealModal();
  });

  closeModalBtn?.addEventListener("click", closeSealModal);
  sealModal?.addEventListener("click", (e) => {
    if (e.target?.dataset?.close === "1") closeSealModal();
  });

  function openSealModal() {
    if (!sealModal) return;

    // quick preview inside the modal so he knows what he's sending
    renderBouquetCanvas(modalBouquetCanvas, state.selected, { interactive: false });
    const poem = generatePoemFromSelection(state.selected);
    if (modalPoem) modalPoem.textContent = poem;
    requestAnimationFrame(() => {
      const bodyEl = sealModal.querySelector(".modal-body");
      if (bodyEl) bodyEl.scrollTop = 0;
    });

    copyHint.textContent = "";
    sealModal.hidden = false;
    document.body.style.overflow = "hidden";
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    stageEl?.scrollTo?.(0, 0);
    const card = sealModal.querySelector(".modal-card");
    const body = sealModal.querySelector(".modal-body");
    if (card) card.scrollTop = 0;
    if (body) body.scrollTop = 0;
  }

  function closeSealModal() {
    if (!sealModal) return;
    sealModal.hidden = true;
    document.body.style.overflow = "";
  }

  copyGiftLinkBtn?.addEventListener("click", async () => {
    const url = buildGiftUrl(state.selected);
    try {
      await navigator.clipboard.writeText(url);
      copyHint.textContent = "Copied. Send it to them like a pressed flower in a book.";
    } catch {
      // fallback
      copyHint.textContent = "Copy this link:";
      prompt("Copy gift link:", url);
    }
  });

  modalContinueBtn?.addEventListener("click", () => {
    // Hook into your SPA flow:
    // - either reveal a next-scene button
    // - or trigger your scene switching function
    closeSealModal();
    if (continueBtn) continueBtn.hidden = false;
    showToast("Bouquet sealed. You can continue when ready.");
  });

  continueBtn?.addEventListener("click", () => {
    unlockNext();
    showScene(2);
    continueBtn.hidden = true;
  });

  // ---- Gift link behavior (overlay)
  function showReceivedBouquetOnLoad() {
    // If someone opened a ?gift= link, show that bouquet.
    // Otherwise, show my pre-made bouquet.
    const ids = decodeBouquetFromUrl();
    const toShow = (ids && ids.length) ? ids : DANA_TO_HIM_BOUQUET;

    if (!giftOverlay) return;

    giftOverlay.hidden = false;
    document.body.style.overflow = "hidden";

    renderBouquetCanvas(giftBouquetCanvas, toShow, { interactive: false });
    if (giftMessage) {
      giftMessage.textContent = generatePoemFromSelection(toShow);
    }
  }

  makeOneBackBtn?.addEventListener("click", () => {
    // close overlay and let them build their own.
    giftOverlay.hidden = true;
    document.body.style.overflow = "";

    // clear the URL param without reloading
    const url = new URL(window.location.href);
    url.searchParams.delete(URL_PARAM);
    history.replaceState({}, "", url.toString());

    // reset state (start empty so he can build it back)
    state.selected = [];
    renderAll();
  });

  // ---- URL encoding/decoding
  function buildGiftUrl(selectedIds) {
    const safeIds = selectedIds.filter(id => FLOWERS.some(f => f.id === id)).slice(0, MAX);
    const payload = { v: 1, flowers: safeIds }; // versioned
    const encoded = base64UrlEncode(JSON.stringify(payload));
    const url = new URL(baseURL());
    url.searchParams.set(URL_PARAM, encoded);
    return url.toString();
  }

  function decodeBouquetFromUrl() {
    const url = new URL(window.location.href);
    const raw = url.searchParams.get(URL_PARAM);
    if (!raw) return null;

    try {
      const json = base64UrlDecode(raw);
      const payload = JSON.parse(json);

      const ids = Array.isArray(payload?.flowers) ? payload.flowers : (Array.isArray(payload?.f) ? payload.f : []);
      const clean = ids
        .filter(id => typeof id === "string")
        .filter(id => FLOWERS.some(f => f.id === id))
        .slice(0, MAX);

      return clean;
    } catch {
      return null;
    }
  }

  // ---- poem generation
  function generatePoemFromSelection(ids) {
    const flowers = ids.map(id => FLOWERS.find(f => f.id === id)).filter(Boolean);
    if (flowers.length === 0) return "";

    if (flowers.length <= 2) {
      const desiredLines = Math.max(1, flowers.length);
      const lines = [];
      flowers.forEach((f, idx) => {
        const base = f.poeticLines[idx % f.poeticLines.length];
        if (base) lines.push(base);
      });
      if (lines.length < desiredLines && flowers[0]?.poeticLines[1]) {
        lines.push(flowers[0].poeticLines[1]);
      }
      return lines.slice(0, desiredLines).map(wrapLine).join("\n");
    }

    const bodyTarget = Math.min(4, Math.max(2, flowers.length - 1));
    const reservoir = [];
    flowers.forEach((f, idx) => {
      if (f.poeticLines[0]) reservoir.push(f.poeticLines[0]);
      if (f.poeticLines[1] && (idx % 2 === 0)) reservoir.push(f.poeticLines[1]);
    });
    const body = [];
    for (const line of reservoir) {
      if (!line) continue;
      body.push(line);
      if (body.length === bodyTarget) break;
    }
    while (body.length < bodyTarget && flowers[body.length % flowers.length]) {
      const fallback = flowers[body.length % flowers.length].poeticLines[1];
      if (fallback) body.push(fallback);
      else break;
    }

    const close = closingLine(ids);
    const lines = [...body].filter(Boolean).slice(0, 4);

    if (close) {
      return [...lines.map(wrapLine), "", wrapLine(close)].join("\n");
    }
    return lines.map(wrapLine).join("\n");
  }

  function wrapLine(line) {
    return line;
  }

  function closingLine(ids) {
    if (ids.includes("babysbreath")) {
      return "I want this softness to stay, almost forever.";
    }
    if (ids.includes("lavender")) {
      return "Everything feels calm and safe with you.";
    }
    if (ids.includes("sunflower")) {
      return "You stay warm beside me, like quiet sunlight.";
    }
    if (ids.includes("tulip")) {
      return "I keep choosing you, softly and surely.";
    }
    return "I hold you gently, staying close.";
  }

  // ---- Helpers: base64url
  function base64UrlEncode(str) {
    const b64 = btoa(unescape(encodeURIComponent(str)));
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function base64UrlDecode(b64url) {
    let b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const str = decodeURIComponent(escape(atob(b64)));
    return str;
  }

  // ---- Helpers: deterministic random
  function hashString(s) {
    // FNV-1a
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function rand(seed) {
    // mulberry32
    let t = seed >>> 0;
    return function() {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---- Helpers: SVG generator (inline watercolor-ish style)
  function svgFlower(primary, light, type) {
    // A single reusable “watercolor sticker” style flower, lightly varied by type
    const petalCount = ({
      rose: 10, peony: 12, daisy: 14, tulip: 6,
      lily: 6, lavender: 8, babys: 9, camellia: 10,
      sunflower: 16, cherry: 8
    })[type] || 10;

    const centerColor = type === "sunflower" ? "#6b4c2a" : (type === "daisy" ? "#ffcc3d" : "#f7d0e2");

    const petalScale = type === "tulip" ? 1.15 : (type === "lavender" ? 0.95 : 1.0);

    return `
<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <radialGradient id="g${type}" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(48 38) rotate(60) scale(90)">
      <stop stop-color="${light}" stop-opacity="0.95"/>
      <stop offset="1" stop-color="${primary}" stop-opacity="0.92"/>
    </radialGradient>

    <filter id="w${type}" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="0.9" result="b"/>
      <feColorMatrix in="b" type="matrix"
        values="1 0 0 0 0
                0 1 0 0 0
                0 0 1 0 0
                0 0 0 0.9 0" />
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <g filter="url(#w${type})" opacity="0.98">
    ${Array.from({length: petalCount}).map((_,i)=>{
      const a = (i * (360 / petalCount));
      return `
      <g transform="translate(60 60) rotate(${a}) scale(${petalScale}) translate(-60 -60)">
        <path d="M60 22
                 C74 22 86 38 86 52
                 C86 66 74 82 60 82
                 C46 82 34 66 34 52
                 C34 38 46 22 60 22Z"
              fill="url(#g${type})" opacity="0.72"/>
      </g>`;
    }).join("")}

    <circle cx="60" cy="60" r="14" fill="${centerColor}" opacity="0.92"/>
    <circle cx="54" cy="54" r="7" fill="white" opacity="0.25"/>
  </g>
</svg>`;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[m]));
  }

})();

/* -------------------------
   Scene 2 — Slot Machine
-------------------------- */
const SLOT_SYMBOLS = ["KISS", "SLEEPOVER", "LONG_HUG", "MOVIE_NIGHT", "LEGO"];
const NON_LEGO_SYMBOLS = SLOT_SYMBOLS.filter(sym => sym !== "LEGO");

const SYMBOL_META = {
  KISS:        { label: "A kiss",            emoji: "💋", line: "Come here. Just one. (Or three.)" },
  SLEEPOVER:   { label: "A sleepover",       emoji: "🛌", line: "You’re staying. I’m not negotiating." },
  LONG_HUG:    { label: "A long hug",        emoji: "🫂", line: "The kind that melts the whole day away." },
  MOVIE_NIGHT: { label: "Movie night (your pick)", emoji: "🎬", line: "You choose the movie. I’ll bring the cuddles." },
  LEGO:        { label: "Lego set",          emoji: "🧱", line: "The brick dream… suspiciously close." }
};

function prettySym(sym){
  const m = SYMBOL_META[sym] || { label: sym, emoji: "✨", line: "" };
  return `${m.emoji} ${m.label}`;
}

function canonicalSymbol(sym){
  if (!sym) return "";
  const raw = String(sym).trim();
  const upper = raw.toUpperCase().replace(/\s+/g, "_");
  if (SLOT_SYMBOLS.includes(upper)) return upper;
  // try loosening underscores (e.g., MOVIE NIGHT -> MOVIE_NIGHT)
  const simplified = upper.replace(/[^A-Z]/g, "");
  const match = SLOT_SYMBOLS.find((key) => key.replace(/[^A-Z]/g, "") === simplified);
  return match || (SLOT_SYMBOLS.includes(raw) ? raw : raw);
}
const REEL_LENGTH = 60;
const REEL_DURATIONS = [1000, 1250, 1550];

const slotEl = $("#slot");
const machineEl = $("#machine");
const spinBtn = $("#spinBtn");
const continue2 = $("#continue2");
const spinsLeftEl = $("#spinsLeft");
const slotHint = $("#slotHint");
const spinResult = $("#spinResult");
const resultTitle = $("#resultTitle");
const resultSub = $("#resultSub");
const holdButtons = [$("#hold0"), $("#hold1"), $("#hold2")];
const reelStrips = [$("#strip0"), $("#strip1"), $("#strip2")];

let spinsLeft = 100;
let currentSymbols = ["MOVIE_NIGHT", "LONG_HUG", "KISS"];
let held = [false, false, false];
let isSpinning = false;
let firstWinAchieved = false;

const reelData = [[], [], []];
const reelOffsets = [0, 0, 0];
let symbolHeight = 120;

const PAIR_LINES = {
  KISS: "Two kisses lined up. Hold it. Be greedy 😈",
  SLEEPOVER: "Two pillows. One more and you’re trapped here.",
  LONG_HUG: "Two hugs landed. One more and I’m not letting go.",
  MOVIE_NIGHT: "Two screens lit up. One more and you pick the movie.",
  LEGO: "Two bricks… don’t get excited 🙃"
};
const NO_HIT_LINE = "Spin again. The sky is watching.";
const LEGO_DOUBLE_LINE = "The brick dream is rigged. Again.";
const NEAR_MISS_LINE = "Spin again, my pockets are empty.";

initSlot();

function initSlot(){
  buildReels();
  requestAnimationFrame(() => {
    // use the reel window height as the authoritative symbol height
    // (prevents mismatch where visuals show one thing but logic evaluates another).
    const win = document.querySelector(".reel-window");
    if (win) {
      const h = win.getBoundingClientRect().height;
      if (h && h > 0) symbolHeight = h;
    } else {
      const sample = reelStrips[0]?.querySelector(".symbol");
      if (sample) symbolHeight = sample.getBoundingClientRect().height || symbolHeight;
    }
    alignAllReels();
  });
  updateSpinsDisplay();
  setHint("Hold a reel to freeze it.");
  spinResult?.classList.add("hidden");
}

function buildReels(){
  reelStrips.forEach((strip, idx) => {
    if (!strip) return;
    const seq = [];
    while (seq.length < REEL_LENGTH) {
      seq.push(...shuffle([...SLOT_SYMBOLS]));
    }
    reelData[idx] = seq.slice(0, REEL_LENGTH);
    strip.innerHTML = reelData[idx]
      .map(sym => {
        const meta = SYMBOL_META[sym] || { label: sym, emoji: "" };
        const text = `${meta.emoji ? meta.emoji + " " : ""}${meta.label || sym}`;
        return `<div class="symbol" data-symbol="${sym}">${text}</div>`;
      })
      .join("");
    strip.style.transform = "translateY(0px)";
  });
}

function alignAllReels(){
  currentSymbols.forEach((sym, idx) => alignReel(idx, sym));
}

function alignReel(idx, symbol){
  const strip = reelStrips[idx];
  const pool = reelData[idx];
  if (!strip || !pool.length) return;
  let target = pool.indexOf(symbol);
  if (target === -1) target = 0;
  reelOffsets[idx] = target;
  strip.style.transition = "none";
  strip.style.transform = `translateY(${-target * symbolHeight}px)`;
}

function updateSpinsDisplay(){
  if (spinsLeftEl) spinsLeftEl.textContent = String(spinsLeft);
}

function setHint(msg){
  if (slotHint) slotHint.textContent = msg;
}

function readLandedSymbols(){
  // prefer reading what is visually centered in each reel window to avoid drift.
  return reelStrips.map((strip, idx) => {
    if (strip) {
      const win = strip.closest(".reel-window");
      const symbols = win ? Array.from(strip.querySelectorAll(".symbol")) : [];
      if (win && symbols.length) {
        const winRect = win.getBoundingClientRect();
        const centerY = winRect.top + winRect.height / 2;
        let closestKey = null;
        let closestDist = Infinity;

        symbols.forEach(el => {
          const rect = el.getBoundingClientRect();
          const mid = rect.top + rect.height / 2;
          const dist = Math.abs(mid - centerY);
          if (dist < closestDist) {
            closestDist = dist;
            closestKey = el.getAttribute("data-symbol");
          }
        });

        if (closestKey) {
          return canonicalSymbol(closestKey);
        }
      }
    }

    const pool = reelData[idx];
    const off = typeof reelOffsets[idx] === "number" ? reelOffsets[idx] : 0;
    if (pool && pool.length) {
      const fromPool = pool[mod(off, pool.length)];
      if (fromPool) return canonicalSymbol(fromPool);
    }
    return canonicalSymbol(currentSymbols[idx]);
  });
}

holdButtons.forEach((btn, idx) => {
  btn?.addEventListener("click", () => {
    if (isSpinning) return;

    const next = !held[idx];

    // prevent holding all 3 
    if (next && held.filter(Boolean).length >= 2) {
      showToast("Hold max 2 reels 😈");
      setHint("Hold up to 2 reels. Let one reel spin for the thrill.");
      return;
    }

    held[idx] = next;
    btn.setAttribute("aria-pressed", held[idx] ? "true" : "false");
    btn.classList.toggle("held", held[idx]);

    if (held.some(Boolean)) {
      setHint("Held reels stay locked. Tap HOLD again to release.");
    } else {
      setHint("Hold a reel to freeze it.");
    }
  });
});

spinBtn?.addEventListener("click", () => {
  if (isSpinning || spinsLeft <= 0) return;
  spinSlot();
});

function spinSlot(){
  isSpinning = true;
  spinBtn.disabled = true;
  machineEl?.classList.remove("shake", "win");

  spinsLeft = Math.max(0, spinsLeft - 1);
  updateSpinsDisplay();

  const targets = computeNextSymbols();
  const unheld = held.map((h, idx) => (!h ? idx : -1)).filter(idx => idx >= 0);

  if (unheld.length === 0) {
    // no reels moved; evaluate the current display state
    setTimeout(() => finishSpin(), 200);
    return;
  }

  let pending = unheld.length;
  unheld.forEach(idx => spinReel(idx, targets[idx], () => {
    if (--pending === 0) finishSpin();
  }));
}

function spinReel(idx, symbol, done){
  const strip = reelStrips[idx];
  const pool = reelData[idx];
  if (!strip || !pool.length) {
    done();
    return;
  }

  const matches = pool
    .map((sym, i) => (sym === symbol ? i : -1))
    .filter(i => i >= 0);
  const targetBase = matches.length ? matches[Math.floor(Math.random() * matches.length)] : 0;
  const loops = 5 + idx;
  const startOffset = reelOffsets[idx];
  const stopIndex = startOffset + loops * pool.length + targetBase;
  const duration = REEL_DURATIONS[idx] || REEL_DURATIONS[REEL_DURATIONS.length - 1];

  strip.classList.add("spinning");
  strip.style.transition = "none";
  strip.style.transform = `translateY(${-startOffset * symbolHeight}px)`;
  strip.offsetHeight; // reflow
  strip.style.transition = `transform ${duration}ms cubic-bezier(.18,.72,.2,1)`;
  requestAnimationFrame(() => {
    strip.style.transform = `translateY(${-stopIndex * symbolHeight}px)`;
  });

  setTimeout(() => {
    strip.classList.remove("spinning");
    strip.style.transition = "none";
    const normalized = mod(stopIndex, pool.length);
    reelOffsets[idx] = normalized;
    strip.style.transform = `translateY(${-normalized * symbolHeight}px)`;
    done();
  }, duration + 80);
}

function computeNextSymbols(){
  const results = [...currentSymbols];
  const unheld = [];
  let heldLego = 0;

  held.forEach((isHeld, idx) => {
    if (!isHeld) {
      unheld.push(idx);
    } else if (results[idx] === "LEGO") {
      heldLego += 1;
    }
  });

  unheld.forEach(idx => {
    results[idx] = canonicalSymbol(weightedSymbolPick());
  });

  if (heldLego >= 2) {
    unheld.forEach(idx => {
      if (results[idx] === "LEGO") results[idx] = pickSymbol(false);
    });
  }

  let legoCount = results.filter(sym => sym === "LEGO").length;
  if (legoCount === 3) {
    const idx = unheld[0] ?? 0;
    results[idx] = pickSymbol(false);
    legoCount = 2;
  }

  if (legoCount < 2 && Math.random() < 0.55 && unheld.length) {
    const candidates = unheld.filter(idx => results[idx] !== "LEGO");
    while (legoCount < 2 && candidates.length) {
      const idx = candidates.shift();
      if (idx === undefined) break;
      results[idx] = "LEGO";
      legoCount += 1;
    }
    legoCount = results.filter(sym => sym === "LEGO").length;
    if (legoCount === 3) {
      const idx = unheld.find(i => results[i] === "LEGO");
      if (idx !== undefined) results[idx] = pickSymbol(false);
    }
  }

  const finalLegoCount = results.filter(sym => sym === "LEGO").length;
  if (finalLegoCount >= 2) {
    const nonLegoIdx = results.findIndex(sym => sym !== "LEGO");
    if (nonLegoIdx !== -1) {
      results[nonLegoIdx] = pickSymbol(false);
    }
  }

  return results;
}

function weightedSymbolPick(){
  const weights = {
    KISS: 3,
    SLEEPOVER: 2,
    LONG_HUG: 2,
    MOVIE_NIGHT: 2,
    LEGO: 3
  };
  const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
  let roll = Math.random() * total;
  for (const sym of SLOT_SYMBOLS) {
    roll -= weights[sym];
    if (roll <= 0) return sym;
  }
  return SLOT_SYMBOLS[0];
}

function pickSymbol(allowLego = true){
  const pool = allowLego ? SLOT_SYMBOLS : NON_LEGO_SYMBOLS;
  return pool[Math.floor(Math.random() * pool.length)];
}

function isWin(symbols){
  return (
    Array.isArray(symbols) &&
    symbols.length === 3 &&
    symbols[0] === symbols[1] &&
    symbols[1] === symbols[2] &&
    symbols[0] !== "LEGO"
  );
}

function summarizeSpin(symbols){
  const counts = symbols.reduce((acc, sym) => {
    acc[sym] = (acc[sym] || 0) + 1;
    return acc;
  }, {});
  const legoCount = counts["LEGO"] || 0;
  const hasPair = Object.values(counts).some(count => count === 2);

  const summary = { title: "Spin again?", sub: "", nearMiss: false, bonus: 0, win: false, sym: null };

  if (isWin(symbols)) {
    const sym = symbols[0];
    summary.win = true;
    summary.sym = sym;
    summary.title = `WIN — ${prettySym(sym)}`;
    summary.sub = SYMBOL_META[sym]?.line || NO_HIT_LINE;

    if (sym === "SLEEPOVER" || sym === "MOVIE_NIGHT") {
      summary.bonus = Math.random() < 0.6 ? 1 : 3;
    }
  } else if (legoCount === 3) {
    summary.nearMiss = true;
    summary.title = "BLOCKED — 🧱🧱🧱";
    summary.sub = NEAR_MISS_LINE;
  } else if (legoCount === 2) {
    summary.nearMiss = true;
    summary.title = "NEAR MISS — 🧱🧱…";
    summary.sub = LEGO_DOUBLE_LINE;
  } else if (hasPair) {
    const pairSym = Object.entries(counts).find(([k, v]) => v === 2)?.[0];
    const pairPretty = pairSym ? prettySym(pairSym) : "Two lined up!";
    summary.title = `PAIR — ${pairPretty}`;
    summary.sub = PAIR_LINES[pairSym] || "Two lined up. Hold that reel and try again 😈";
  } else {
    summary.title = "No hit.";
    summary.sub = NO_HIT_LINE;
  }

  return summary;
}

function finishSpin(){
  const landedRaw = readLandedSymbols();
  const landed = landedRaw.map(canonicalSymbol);
  currentSymbols = [...landed];
  const summary = summarizeSpin(landed);
  const finalWin = summary.win;

  if (summary.bonus > 0) {
    spinsLeft += summary.bonus;
    updateSpinsDisplay();
    showToast(`+${summary.bonus} Free Spin${summary.bonus > 1 ? "s" : ""}`);
  }

  if (finalWin && !firstWinAchieved) {
    firstWinAchieved = true;
    state.spinDone = true;
    unlockNext();
    continue2.disabled = false;
    spawnPetalBurst(50);
  }

  isSpinning = false;
  if (spinsLeft > 0) spinBtn.disabled = false;

  if (spinResult) {
    spinResult.classList.remove("hidden");
    resultTitle.textContent = summary.title;
    if (resultSub) {
      resultSub.textContent = summary.sub || "";
      resultSub.style.display = summary.sub ? "block" : "none";
    }
  }

  if (summary.nearMiss && machineEl) {
    machineEl.classList.add("shake");
    setTimeout(() => machineEl.classList.remove("shake"), 700);
  }

  if (summary.bonus === 0 && summary.win && machineEl) {
    machineEl.classList.add("win");
    setTimeout(() => machineEl.classList.remove("win"), 900);
  }

  if (spinsLeft <= 0 && !state.spinDone && resultSub) {
    const base = summary.sub ? `${summary.sub} ` : "";
    resultSub.textContent = `${base}The reels rest for a breath… hold something and try again soon.`;
    resultSub.style.display = "block";
  }
}

function shuffle(arr){
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function mod(n, m){
  return ((n % m) + m) % m;
}

continue2.addEventListener("click", ()=>{
  if(!state.spinDone) return;
  showScene(3);
});

/* -------------------------
   Scene 3 — Memory Vault
-------------------------- */
(() => {
  const vaultPwd = document.querySelector("#vaultPwd");
  const vaultUnlockBtn = document.querySelector("#vaultUnlockBtn");
  const vaultErr = document.querySelector("#vaultErr");
  const vaultLock = document.querySelector("#vaultLock");
  const vaultLetter = document.querySelector("#vaultLetter");
  const continue3Btn = document.querySelector("#continue3");
  const vaultPrivateContinueRow = document.querySelector("#vaultPrivateContinueRow");
  const continue3PublicButtons = Array.from(document.querySelectorAll("#continue3Public, #continue3PublicAlt"));

  const normalize = (v) => String(v || "").trim().toUpperCase().slice(0, 2);

  continue3PublicButtons.forEach(btn => {
    btn?.addEventListener("click", () => {
      try { unlockNext?.(); } catch {}
      try { showScene?.(4); } catch {}
    });
  });

  if (!vaultPwd || !vaultUnlockBtn || !vaultLock || !vaultLetter || !continue3Btn) return;

  const VAULT_PASSWORD = "BK";
  let unlocked = false;

  function showErr(msg){
    if (vaultErr) vaultErr.textContent = msg || "";
  }

  function openVault(){
    if (unlocked) return;
    unlocked = true;
    vaultLock.classList.add("hidden");
    vaultLetter.classList.remove("hidden");
    continue3Btn.disabled = false;
    continue3Btn.removeAttribute("aria-disabled");
    vaultPrivateContinueRow?.classList.remove("hidden");
    showErr("");
    try { spawnPetalBurst?.(40); } catch {}
    try { showToast?.("Vault unlocked ✨"); } catch {}
  }

  function attemptUnlock(){
    const attempt = normalize(vaultPwd.value);
    vaultPwd.value = attempt;

    if (attempt.length < 2){
      showErr("two letters 🙂");
      vaultPwd.focus();
      return;
    }
    if (attempt === VAULT_PASSWORD){
      openVault();
    } else {
      showErr("nope. think 🍔👑");
      vaultPwd.select();
    }
  }

  vaultUnlockBtn.addEventListener("click", attemptUnlock);
  vaultPwd.addEventListener("keydown", (e) => {
    if (e.key === "Enter") attemptUnlock();
  });
  vaultPwd.addEventListener("input", () => {
    vaultPwd.value = normalize(vaultPwd.value);
    showErr("");
  });

  continue3Btn.addEventListener("click", () => {
    if (!unlocked) return;
    try { unlockNext?.(); } catch {}
    try { showScene?.(4); } catch {}
  });
})();

/* -------------------------
   Scene 4 — Question
-------------------------- */
const noBtn = $("#noBtn");
const yesBtn = $("#yesBtn");
const finalScreen = $("#finalScreen");
const copyFinalBtn = $("#copyFinalBtn");
const restartBtn = $("#restartBtn");

let noEscapes = 0;

function moveNoButton(){
  const card = $(".card");
  const r = card.getBoundingClientRect();
  const pad = 18;
  const x = pad + Math.random() * (r.width - pad*2 - 110);
  const y = pad + Math.random() * (r.height - pad*2 - 44);
  noBtn.style.position = "absolute";
  noBtn.style.left = `${x}px`;
  noBtn.style.top  = `${y}px`;
  noBtn.style.transform = "translateZ(0)";
}

noBtn.addEventListener("pointerenter", ()=>{
  noEscapes++;
  if(noEscapes <= 5){
    moveNoButton();
  }else{
    noBtn.animate([{opacity:1},{opacity:0}],{duration:260,easing:"ease"});
    setTimeout(()=> noBtn.remove(), 240);
  }
});

// mobile: tap makes it jump too
noBtn.addEventListener("pointerdown", (e)=>{
  e.preventDefault();
  noEscapes++;
  if(noEscapes <= 5) moveNoButton();
  else{
    noBtn.animate([{opacity:1},{opacity:0}],{duration:260,easing:"ease"});
    setTimeout(()=> noBtn.remove(), 240);
  }
});

yesBtn.addEventListener("click", ()=>{
  spawnPetalBurst(80);
  finalScreen.classList.remove("hidden");
  yesBtn.disabled = true;
  if(noBtn) noBtn.disabled = true;
});

copyFinalBtn.addEventListener("click", async ()=>{
  const link = baseURL() + "#yes";
  if(navigator.share){
    try{
      await navigator.share({ title:"Happy Valentine’s", text:"Zero euros. 100% feelings.", url: link });
      return;
    }catch{}
  }
  await copyText(link);
});

restartBtn.addEventListener("click", ()=>{
  // reset progress but keep rest of state untouched
  localStorage.removeItem("skyval_progress");
  location.hash = "";
  location.reload();
});

/* -------------------------
   boot
-------------------------- */
function boot(){
  loadProgress();

  // start at max unlocked scene, but never beyond 1 unless user progressed
  showScene(Math.min(state.unlocked, 4));

  // if user has #yes link, jump to scene 4
  if(location.hash === "#yes"){
    state.unlocked = 4;
    showScene(4);
    finalScreen.classList.remove("hidden");
    yesBtn.disabled = true;
  }

}
boot();
