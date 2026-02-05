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
  // keep only origin + pathname (no hash)
  return location.origin + location.pathname.replace(/index\.html$/,'');
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

copyLinkBtn.addEventListener("click", async ()=>{
  await copyText(location.href);
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

// gentle ambient petals
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
  const continueBtn = $("#continueBtn");

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
  const URL_PARAM = "b"; // bouquet data

  // ---- Flower data (10) — all inline SVG
  // Watercolor-ish: soft gradients + blurred highlights via simple SVG filters.
  const FLOWERS = [
    {
      id: "rose",
      name: "Rose",
      keywords: ["admiration", "warmth"],
      meaning: "“I look at you and soften.”",
      svg: svgFlower("#ff7fb0", "#ffd1e6", "rose")
    },
    {
      id: "lily",
      name: "Lily",
      keywords: ["devotion", "sincerity"],
      meaning: "“The kind of devotion that stays quiet but deep.”",
      svg: svgFlower("#ffffff", "#dfe8ff", "lily")
    },
    {
      id: "peony",
      name: "Peony",
      keywords: ["romance", "tenderness"],
      meaning: "“Soft love that blooms slowly.”",
      svg: svgFlower("#ffb3d1", "#ffe1ee", "peony")
    },
    {
      id: "tulip",
      name: "Tulip",
      keywords: ["choosing someone"],
      meaning: "“Out of everyone, I choose you.”",
      svg: svgFlower("#ff6d6d", "#ffd0d0", "tulip")
    },
    {
      id: "daisy",
      name: "Daisy",
      keywords: ["gentle joy"],
      meaning: "“You make ordinary days feel light.”",
      svg: svgFlower("#fff7ff", "#fff2b8", "daisy")
    },
    {
      id: "lavender",
      name: "Lavender",
      keywords: ["calm", "comfort"],
      meaning: "“You quiet the noise in my head.”",
      svg: svgFlower("#b79bff", "#e6dcff", "lavender")
    },
    {
      id: "babys_breath",
      name: "Baby’s breath",
      keywords: ["forever", "purity"],
      meaning: "“Something small that lasts.”",
      svg: svgFlower("#f7fbff", "#eaf2ff", "babys")
    },
    {
      id: "camellia",
      name: "Camellia",
      keywords: ["admiration", "specialness"],
      meaning: "“You are someone I notice in every room.”",
      svg: svgFlower("#ff7a9f", "#ffe0ea", "camellia")
    },
    {
      id: "sunflower",
      name: "Sunflower",
      keywords: ["warmth", "loyalty"],
      meaning: "“I turn toward you without thinking.”",
      svg: svgFlower("#ffcc3d", "#fff0b8", "sunflower")
    },
    {
      id: "cherry_blossom",
      name: "Cherry blossom",
      keywords: ["fleeting beauty", "presence"],
      meaning: "“Moments with you feel soft and rare.”",
      svg: svgFlower("#ffb7cf", "#fff0f6", "cherry")
    },
  ];

  // ---- State
  const state = {
    selected: [], // array of flower ids (max 7)
  };

  // ---- Init
  renderLibrary();
  renderAll();
  handleGiftLinkIfPresent();

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

        <div class="flower-meaning">${escapeHtml(f.meaning)}</div>

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
      softToast("Your wrap can only hold 7 flowers.");
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
    const items = ids.map((id, index) => {
      const flower = FLOWERS.find(f => f.id === id);
      if (!flower) return null;

      // deterministic "organic" layout per index + id hash
      const seed = hashString(id + ":" + index);
      const r = rand(seed);

      // center-ish with gentle spread
      const cx = 50 + (r() * 26 - 13);
      const cy = 52 + (r() * 22 - 11);

      const rot = (r() * 26 - 13).toFixed(2); // degrees
      const scale = (0.92 + r() * 0.20).toFixed(3);

      // z-index increases with index, but shuffle a bit for depth
      const z = 10 + index * 3 + Math.floor(r() * 3);

      return { flower, index, cx, cy, rot, scale, z };
    }).filter(Boolean);

    // Render
    for (const it of items) {
      const el = document.createElement("div");
      el.className = "sticker";
      el.style.left = `${it.cx}%`;
      el.style.top = `${it.cy}%`;
      el.style.zIndex = String(it.z);
      el.style.setProperty("--r", `${it.rot}deg`);
      el.style.transform = `translate(-50%,-50%) scale(${it.scale}) rotate(${it.rot}deg)`;

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
      selectedList.innerHTML = `<div class="tiny muted">Choose flowers from the library.</div>`;
      return;
    }

    const selectedFlowers = state.selected
      .map(id => FLOWERS.find(f => f.id === id))
      .filter(Boolean);

    selectedList.innerHTML = selectedFlowers.map(f => `
      <div class="sel-item">
        <div class="sel-left">
          <div class="sel-name">${escapeHtml(f.name)}</div>
          <div class="sel-keys">${escapeHtml(f.keywords.join(" • "))}</div>
        </div>
      </div>
    `).join("");
  }

  function renderPoem() {
    const poem = generatePoemFromSelection(state.selected);
    if (poemEl) poemEl.textContent = poem || "Your message will appear here…";
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

    // Preview in modal
    renderBouquetCanvas(modalBouquetCanvas, state.selected, { interactive: false });
    const poem = generatePoemFromSelection(state.selected);
    if (modalPoem) modalPoem.textContent = poem;

    copyHint.textContent = "";
    sealModal.hidden = false;
    document.body.style.overflow = "hidden";
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
    softToast("Bouquet sealed. You can continue when ready.");
  });

  continueBtn?.addEventListener("click", () => {
    unlockNext();
    showScene(2);
    continueBtn.hidden = true;
  });

  // ---- Gift link behavior (overlay)
  function handleGiftLinkIfPresent() {
    const ids = decodeBouquetFromUrl();
    if (!ids || ids.length === 0) return;

    // Show overlay
    giftOverlay.hidden = false;
    document.body.style.overflow = "hidden";

    renderBouquetCanvas(giftBouquetCanvas, ids, { interactive: false });
    giftMessage.textContent = generatePoemFromSelection(ids);
  }

  makeOneBackBtn?.addEventListener("click", () => {
    // Close overlay and let them build their own.
    giftOverlay.hidden = true;
    document.body.style.overflow = "";

    // Clear the URL param without reloading
    const url = new URL(window.location.href);
    url.searchParams.delete(URL_PARAM);
    history.replaceState({}, "", url.toString());

    // Reset state (fresh bouquet)
    state.selected = [];
    renderAll();
  });

  // ---- URL encoding/decoding
  function buildGiftUrl(selectedIds) {
    const safeIds = selectedIds.filter(id => FLOWERS.some(f => f.id === id)).slice(0, MAX);
    const payload = { v: 1, f: safeIds }; // versioned
    const encoded = base64UrlEncode(JSON.stringify(payload));
    const url = new URL(window.location.href);
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

      const ids = Array.isArray(payload?.f) ? payload.f : [];
      const clean = ids
        .filter(id => typeof id === "string")
        .filter(id => FLOWERS.some(f => f.id === id))
        .slice(0, MAX);

      return clean;
    } catch {
      return null;
    }
  }

  // ---- Poem generation
  // Gentle, dreamy stitching of meanings. Uses each flower’s meaning line, but blends it.
  function generatePoemFromSelection(ids) {
    const flowers = ids.map(id => FLOWERS.find(f => f.id === id)).filter(Boolean);
    if (flowers.length === 0) return "";

    // For ritual feel: a few lines that weave, plus a closing line
    const lines = [];

    // Convert each flower meaning to a sentence-like line (already poetic)
    for (const f of flowers) {
      // Use meaning as-is, but remove outer quotes
      const clean = f.meaning.replace(/^“|”$/g, "");
      lines.push(clean);
    }

    // Add a soft closing line based on dominant keywords
    const keyCounts = new Map();
    for (const f of flowers) for (const k of f.keywords) keyCounts.set(k, (keyCounts.get(k) || 0) + 1);
    const top = [...keyCounts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,2).map(x=>x[0]);

    const closing =
      top.includes("calm") || top.includes("comfort")
        ? "And in your presence, my heart learns to be quiet."
        : top.includes("warmth") || top.includes("loyalty")
          ? "And somehow, I keep turning toward you."
          : top.includes("romance") || top.includes("tenderness")
            ? "Soft love, blooming slowly—still blooming."
            : "I don’t know how to say it plainly, so I made it in flowers.";

    // Format like your example (3 lines + closing)
    // If many flowers selected, keep it readable: show first 4 lines, then a gentle summary line.
    const maxLines = 4;
    const trimmed = lines.slice(0, maxLines);

    if (lines.length > maxLines) {
      trimmed.push("…and the rest feels like a secret kept in petals.");
    }

    trimmed.push(closing);

    // Make it a paragraph-ish poem
    return trimmed.map(s => `“${s}”`).join("\n");
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

  // tiny dreamy toast (no dependency)
  let toastTimer = null;
  function softToast(msg) {
    let el = $("#softToast");
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
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateX(-50%) translateY(2px)";
    }, 1800);
  }
})();

/* -------------------------
   Scene 2 — Wheel (no Lego)
-------------------------- */
const prizes = [
  "Lego set",     // must never land
  "Sleepover",
  "Movie night",
  "One long hug",
  "A kiss",
];

const wheel = $("#wheel");
const spinBtn = $("#spinBtn");
const continue2 = $("#continue2");
const spinResult = $("#spinResult");
const resultTitle = $("#resultTitle");

function buildWheel(){
  // 5 wedges visually (exclude lego visually? you wanted it listed — we show it but never pick it)
  const wedgeCount = prizes.length;
  const step = 360 / wedgeCount;
  prizes.forEach((p,i)=>{
    const w = document.createElement("div");
    w.className = "wedge";
    w.style.transform = `rotate(${i*step}deg)`;
    // soft variations via opacity; no explicit colors
    w.style.background = `rgba(255,255,255,${0.10 + (i%2)*0.06})`;
    const tag = document.createElement("span");
    tag.textContent = p;
    w.appendChild(tag);
    wheel.appendChild(w);
  });
}
buildWheel();

function pickPrizeNoLego(){
  const pool = prizes.filter(p => p !== "Lego set");
  return pool[Math.floor(Math.random()*pool.length)];
}

spinBtn.addEventListener("click", ()=>{
  spinBtn.disabled = true;
  continue2.disabled = true;
  spinResult.classList.add("hidden");
  const picked = pickPrizeNoLego();

  const wedgeCount = prizes.length;
  const step = 360 / wedgeCount;
  const idx = prizes.indexOf(picked);

  // pointer at top, we rotate so selected wedge aligns under pointer
  const targetDeg = 360*4 + (360 - (idx*step + step/2)); // 4 spins + align
  wheel.style.transform = `rotate(${targetDeg}deg)`;

  setTimeout(()=>{
    state.spinDone = true;
    unlockNext();
    spinResult.classList.remove("hidden");
    resultTitle.textContent = `You won: ${picked}`;
    continue2.disabled = false;
    spawnPetalBurst(24);
  }, 3450);
});

continue2.addEventListener("click", ()=>{
  if(!state.spinDone) return;
  showScene(3);
});

/* -------------------------
   Scene 3 — placeholder
-------------------------- */
$("#continue3").addEventListener("click", ()=>{
  unlockNext();
  showScene(4);
});

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
   Boot
-------------------------- */
function boot(){
  loadProgress();

  // Start at max unlocked scene, but never beyond 1 unless user progressed
  showScene(Math.min(state.unlocked, 4));

  // If user has #yes link, jump to scene 4
  if(location.hash === "#yes"){
    state.unlocked = 4;
    showScene(4);
    finalScreen.classList.remove("hidden");
    yesBtn.disabled = true;
  }

}
boot();
