/* Placeholder content for both sides + scheme toggle. Each prototype owns
   only its transition; everything else comes from here. */

const SIDE_A = `
  <div class="col">
    <nav class="nav">
      <span class="name">sean fang</span>
      <span>
        <a>about</a><a>work</a><a data-go="b">photos</a><a>contact</a>
      </span>
    </nav>
    <h1>I build machine learning models and the systems that run them at scale.</h1>
    <section>
      <p class="label">about</p>
      <p class="muted">Placeholder paragraph. Same column, same type, same grid as the live site. Nothing here is real copy, it only exists so the transition has something to move.</p>
      <p class="muted">Second placeholder paragraph so the page scrolls a little.</p>
    </section>
    <section>
      <p class="label">work</p>
      <div class="row"><div>Google<div class="sub">Vision models for YouTube</div></div><span class="mono">2026</span></div>
      <div class="row"><div>Anthropic<div class="sub">Claude Campus Ambassador</div></div><span class="mono">2025–26</span></div>
      <div class="row"><div>UPenn PRONTO Lab<div class="sub">Computer vision research</div></div><span class="mono">2025</span></div>
      <div class="row"><div>Nanoneuro Systems<div class="sub">Founding engineer</div></div><span class="mono">2023–25</span></div>
    </section>
    <footer>
      <span class="readout">&gt; tag: here to do cool things. <span class="conf">[0.98]</span></span>
      <a data-go="b">turn over →</a>
    </footer>
  </div>`;

const FRAMES = [
  ["001", "35mm · f/2"], ["002", "50mm · f/1.8"], ["003", "24mm · f/8"],
  ["004", "85mm · f/2"], ["005", "35mm · f/4"], ["006", "drone · f/2.8"],
];

const SIDE_B = `
  <div class="col">
    <nav class="nav">
      <span class="name">sean fang</span>
      <span>
        <a data-go="a">← a side</a><a>photos</a><a>contact</a>
      </span>
    </nav>
    <h1>The rest of the time I do the looking myself.</h1>
    <section>
      <p class="label">contact sheet · roll 01</p>
      <div class="sheet">
        ${FRAMES.map(([n, m]) => `<div class="frame"><span>${n} · ${m}</span></div>`).join("")}
      </div>
      <div class="caption">
        <div class="human">Philadelphia, late. The streetlight was doing most of the work.</div>
        <div class="readout model">&gt; caption: a wet street at night, one figure, warm light. <span class="conf">[0.91]</span></div>
      </div>
    </section>
    <section>
      <p class="label">roll 02</p>
      <div class="sheet">
        ${FRAMES.map(([n, m]) => `<div class="frame"><span>0${+n[2] + 6} · ${m}</span></div>`).join("")}
      </div>
    </section>
    <footer>
      <span class="readout">&gt; exposure: 1/125 · iso 800</span>
      <a data-go="a">turn back ↑</a>
    </footer>
  </div>`;

function mountSides(aEl, bEl) {
  if (aEl) aEl.innerHTML = SIDE_A;
  if (bEl) bEl.innerHTML = SIDE_B;
}

/* Calls handler(side, event) on any [data-go] click. */
function onGo(handler) {
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-go]");
    if (!t) return;
    e.preventDefault();
    handler(t.dataset.go, e);
  });
}

function mountSchemeToggle() {
  const el = document.createElement("div");
  el.className = "scheme";
  const modes = ["system", "light", "dark"];
  let current = localStorage.getItem("proto-scheme") || "system";
  const apply = () => {
    if (current === "system") delete document.documentElement.dataset.scheme;
    else document.documentElement.dataset.scheme = current;
    el.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", b.textContent === current));
  };
  modes.forEach((m) => {
    const b = document.createElement("button");
    b.textContent = m;
    b.onclick = () => { current = m; localStorage.setItem("proto-scheme", m); apply(); };
    el.appendChild(b);
  });
  document.body.appendChild(el);
  apply();
}

function mountHint(text) {
  const el = document.createElement("div");
  el.className = "hint";
  el.textContent = text;
  document.body.appendChild(el);
}

const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
