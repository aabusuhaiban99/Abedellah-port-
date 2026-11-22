/* Everything in the Theater that is HTML: captions, index, list view, detail pages, routing, keys. */
export function initUI(cb) {
  const { SCREENS, CATEGORIES, CASES, PIPELINE } = window.PORTFOLIO;
  const N = SCREENS.length;
  const $ = s => document.querySelector(s);
  const pad = n => String(n).padStart(2, "0");
  const col = s => CATEGORIES[s.cat].color;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const byId = Object.fromEntries(SCREENS.map((s, i) => [s.id, i]));
  const body = document.body;
  let mode = "intro", capIndex = null, capKey = "", current = -1;

  $("#count").textContent = N + " screens";

  /* ---- intro copy ---- */
  const card = $("#titlecard"), copy = $("#introcopy"), loading = $("#loading");
  function introCopy(t) {
    const k = x => Math.min(1, Math.max(0, x));
    card.style.opacity = k((t - 0.1) / 0.5) * (1 - k((t - 1.7) / 0.5));
    card.style.letterSpacing = (0.5 + t * 0.12) + "em";
    const c = k((t - 2.1) / 0.6) * (1 - k((t - 4.4) / 0.6));
    copy.style.opacity = c; copy.style.transform = `translateY(${(1 - c) * 14}px)`;
    loading.hidden = true;
  }
  function enterRoom(instant) {
    mode = "room"; body.classList.add("in-room");
    card.style.opacity = 0; copy.style.opacity = 0; loading.hidden = true;
    if (instant) body.classList.add("instant");
    setTimeout(() => body.classList.remove("instant"), 50);
    caption(null, "room", null);
  }
  $("#skip").onclick = () => cb.onSkip();

  /* ---- fps ---- */
  const fpsEl = $("#fps");
  function fps(v) { fpsEl.textContent = "FPS " + Math.round(v); }

  /* ---- caption ---- */
  const cap = { box: $("#caption"), count: $("#capCount"), cat: $("#capCat"), title: $("#capTitle"), text: $("#capText"),
    step: $("#capStep"), tab: $("#capTab"), back: $("#capBack"), home: $("#capHome") };
  let catFilter = null;
  function caption(i, m, cat) {
    catFilter = cat ?? catFilter;
    const key = i + "|" + m + "|" + catFilter;
    if (key === capKey) return; capKey = key;
    capIndex = i; if (m) mode = m;
    if (i == null) {
      const k = catFilter;
      cap.box.style.setProperty("--c", k ? CATEGORIES[k].color : "var(--gold)");
      cap.count.textContent = k ? `${SCREENS.filter(s => s.cat === k).length} screens` : `${N} screens`;
      cap.cat.textContent = k ? "Category" : "Consulting toolbox";
      swap(k ? CATEGORIES[k].name : "The Theater");
      cap.text.textContent = k ? "Turn the room to browse them. Click a screen to bring it forward."
        : "Every framework, business model and system I bring to a case, one screen each. Turn the room, then click a screen.";
      cap.step.hidden = cap.tab.hidden = cap.back.hidden = true; cap.home.hidden = false;
      return;
    }
    const s = SCREENS[i];
    cap.box.style.setProperty("--c", col(s));
    cap.count.textContent = `${pad(i + 1)} / ${N}`;
    cap.cat.textContent = CATEGORIES[s.cat].name;
    swap(s.title);
    cap.text.textContent = s.purpose;
    const f = mode === "focus";
    cap.step.hidden = !f; cap.tab.hidden = !f; cap.back.hidden = !f; cap.home.hidden = f;
    cap.tab.href = `theater.html#${s.id}`;
    if (f) current = i;
  }
  function swap(t) { cap.title.textContent = t; cap.title.classList.remove("swap"); void cap.title.offsetWidth; cap.title.classList.add("swap"); }
  cap.step.onclick = () => openDetail(current);
  cap.back.onclick = () => cb.onCloseFocus();

  /* ---- category index ---- */
  const indexEl = $("#index");
  const cats = [...new Set(SCREENS.map(s => s.cat))];
  const mk = (label, n, color, k) => {
    const b = document.createElement("button");
    b.innerHTML = `<i style="--c:${color}"></i>${label}<span>${n}</span>`;
    b.dataset.cat = k || ""; b.onclick = () => setCat(k || null); return b;
  };
  indexEl.append(mk("All screens", N, "var(--gold)", ""));
  cats.forEach(k => indexEl.append(mk(CATEGORIES[k].name, SCREENS.filter(s => s.cat === k).length, CATEGORIES[k].color, k)));
  function setCat(k) {
    catFilter = k;
    [...indexEl.children].forEach(b => b.classList.toggle("on", (b.dataset.cat || null) === k));
    capKey = ""; caption(null, "room", k); cb.onCategory(k);
  }
  indexEl.firstChild.classList.add("on");

  /* ---- accessible list of screens (keyboard and screen readers) ---- */
  const sr = $("#srlist");
  SCREENS.forEach((s, i) => {
    const b = document.createElement("button");
    b.textContent = `${s.title}, ${CATEGORIES[s.cat].name}`;
    b.onfocus = () => cb.onFaceIndex(i);
    b.onclick = () => cb.onOpenFocus(i);
    sr.append(b);
  });

  /* ---- detail pages ---- */
  const detail = $("#detail");
  const caseRows = list => list.map(c => {
    const pub = !!c.url;
    return `<a class="d-case${pub ? "" : " soon"}" href="${pub ? esc(c.url) : "#cases"}"><b>Week ${pad(c.week)}</b>
      <span>${esc(c.title)}<small>${pub ? esc(c.summary) : esc(c.status || "Planned") + ". " + esc(c.summary)}</small></span></a>`;
  }).join("");
  function casesFor(id) {
    const pub = CASES.filter(c => (c.tools || []).includes(id));
    const plan = PIPELINE.filter(c => (c.tools || []).includes(id));
    if (!pub.length && !plan.length) return `<p class="muted">No case uses this screen yet.</p>`;
    return `<div class="d-cases">${caseRows(pub)}${caseRows(plan)}</div>`;
  }
  function viz(s, i) {
    return `<div class="scr" style="--c:${col(s)}"><div class="scr-bar"><span>${CATEGORIES[s.cat].name}</span><span>${pad(i + 1)} / ${N}</span></div>
      <div class="scr-viz">${window.VIZ(s.viz, col(s))}</div></div>`;
  }
  function openDetail(i) {
    if (i == null || i < 0) return;
    const s = SCREENS[i];
    if (decodeURIComponent(location.hash.slice(1)) !== s.id) { location.hash = s.id; return; }
    renderDetail(i);
  }
  function renderDetail(i) {
    const s = SCREENS[i], prev = SCREENS[(i - 1 + N) % N], next = SCREENS[(i + 1) % N];
    let blocks = `
      <div class="d-block"><h2>The question it answers</h2><p>${esc(s.q)}</p></div>
      <div class="d-block"><h2>How it works</h2><ol>${s.how.map(h => `<li><span>${esc(h)}</span></li>`).join("")}</ol></div>
      <div class="d-block"><h2>Where it fits in a systems project</h2><p>${esc(s.fit)}</p></div>`;
    if (s.template) blocks += `<div class="d-block wide"><div><h2>How I present it</h2><ol>${s.template.map(h => `<li><span>${esc(h)}</span></li>`).join("")}</ol></div><div><h2>Why answer first</h2><p>Executives read the first page. The answer goes there, and everything after it is the evidence.</p></div></div>`;
    if (s.special === "cases") blocks += `<div class="d-block wide"><div><h2>Published</h2>${CASES.length ? `<div class="d-cases">${caseRows(CASES)}</div>` : `<p class="muted">The first case is in production.</p>`}</div><div><h2>Coming up</h2><div class="d-cases">${caseRows(PIPELINE)}</div></div></div>`;
    else if (s.special === "contact") blocks += `<div class="d-block wide"><div><h2>Write the brief</h2><p>Pick the role and the next step, and the email writes itself.</p><a class="d-cta" href="index.html#contact">Open the contact section</a></div><div><h2>Status</h2><p>Available immediately. Based in Amman, Jordan, and open to relocation.</p></div></div>`;
    else {
      const model = s.cat === "model";
      blocks += `<div class="d-block wide"><div><h2>${model ? "How the money is made" : "Core purpose"}</h2><p>${esc(s.purpose)}</p></div><div><h2>${model ? "Who runs on it" : "What it does"}</h2><p>${esc(s.use)}</p></div></div>`;
      if (s.example) blocks += `<div class="d-block wide quote"><div><h2>In the real world</h2><p class="big">${esc(s.example)}</p></div></div>`;
      blocks += `<div class="d-block wide"><div><h2>Cases that use it</h2>${casesFor(s.id)}</div></div>`;
    }
    detail.style.setProperty("--c", col(s));
    detail.innerHTML = `
      <div class="ov-top"><a class="brand" href="index.html">Abedellah Abusuhaiban <small>The Theater</small></a>
        <div class="tr"><button class="pill" data-act="list">List view</button><button class="pill" data-act="close">Back to the room</button></div></div>
      <div class="ov-wrap">
        <div class="d-head">
          <div><div class="cap-count">${pad(i + 1)} / ${N}</div><div class="d-cat">${CATEGORIES[s.cat].name}</div>
            <h1 id="dTitle" tabindex="-1">${esc(s.title)}</h1><p class="d-lede">${esc(s.purpose)}</p></div>
          <div class="d-viz">${viz(s, i)}</div>
        </div>
        <div class="d-grid">${blocks}</div>
        <nav class="d-nav" aria-label="Other screens">
          <a href="#${prev.id}"><small>Previous screen</small><span>${esc(prev.title)}</span></a>
          <a href="#${next.id}"><small>Next screen</small><span>${esc(next.title)}</span></a>
        </nav>
      </div>`;
    const was = detail.hidden; detail.hidden = false; $("#list").hidden = true;
    if (was) { detail.classList.remove("open"); void detail.offsetWidth; detail.classList.add("open"); }
    detail.scrollTop = 0;
    const sc = detail.querySelector(".d-viz .scr"); window.VIZ.prime(sc); sc.classList.add("play");
    detail.querySelector("h1").focus({ preventScroll: true });
    document.title = `${s.title} | The Theater`;
    current = i; cb.onDetail(true);
  }
  function clearHash() { history.replaceState(null, "", location.pathname + location.search); }
  function closeDetail() { detail.hidden = true; clearHash(); document.title = "The Theater | Abedellah Abusuhaiban"; cb.onDetail(false); }
  detail.addEventListener("click", e => {
    const a = e.target.closest("[data-act]"); if (!a) return;
    if (a.dataset.act === "close") closeDetail();
    if (a.dataset.act === "list") location.hash = "list";
  });

  /* ---- list view ---- */
  const list = $("#list");
  function openList() {
    if (!list.dataset.built) {
      list.innerHTML = `<div class="ov-top"><a class="brand" href="index.html">Abedellah Abusuhaiban <small>The Theater</small></a>
        <div class="tr"><button class="pill" data-act="close">Back to the room</button></div></div>
        <div class="ov-wrap"><div class="l-head"><h1 id="lTitle" tabindex="-1">All ${N} screens</h1>
        <p>The same screens as the room, laid flat. Pick one to step inside.</p></div>` +
        cats.map(k => `<section class="l-sec" style="--c:${CATEGORIES[k].color}"><h2>${CATEGORIES[k].name}</h2><div class="l-grid">` +
          SCREENS.map((s, i) => s.cat === k ? `<button data-id="${s.id}"><span class="l-viz">${window.VIZ(s.viz, col(s))}</span><span class="l-t">${esc(s.title)}</span></button>` : "").join("") +
          `</div></section>`).join("") + `</div>`;
      list.dataset.built = "1";
    }
    detail.hidden = true;
    const was = list.hidden; list.hidden = false;
    if (was) { list.classList.remove("open"); void list.offsetWidth; list.classList.add("open"); }
    list.querySelector("h1").focus({ preventScroll: true });
    cb.onDetail(true);
  }
  function closeList() { list.hidden = true; clearHash(); cb.onDetail(false); }
  list.addEventListener("click", e => {
    const b = e.target.closest("[data-id]"); if (b) { location.hash = b.dataset.id; return; }
    if (e.target.closest("[data-act=close]")) closeList();
  });
  $("#listBtn").onclick = () => { location.hash = "list"; };

  function route() {
    const h = decodeURIComponent(location.hash.slice(1));
    if (h === "list") return openList();
    if (h in byId) return renderDetail(byId[h]);
    if (!detail.hidden) { detail.hidden = true; cb.onDetail(false); }
    if (!list.hidden) { list.hidden = true; cb.onDetail(false); }
  }
  addEventListener("hashchange", route);
  const startInRoom = !!location.hash && location.hash !== "#";
  if (startInRoom) setTimeout(route, 0);

  /* ---- keys ---- */
  addEventListener("keydown", e => {
    if (e.key === "Escape") {
      if (!detail.hidden) closeDetail(); else if (!list.hidden) closeList();
      else if (mode === "focus") cb.onCloseFocus(); else if (mode === "intro") cb.onSkip();
      return;
    }
    if (mode === "intro" && (e.key === " " || e.key === "Enter")) { cb.onSkip(); return; }
    if (!detail.hidden || !list.hidden) return;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      const d = e.key === "ArrowLeft" ? -1 : 1;
      if (mode === "focus" && current >= 0) cb.onOpenFocus((current + d + N) % N); else cb.onRotate(d);
    }
    if (e.key === "Enter" && mode === "focus" && current >= 0 && document.activeElement === document.body) openDetail(current);
  });

  function noWebGL() {
    body.classList.add("in-room", "no-gl");
    $("#nogl").hidden = false;
    location.hash = "list";
  }

  return { caption, openDetail, introCopy, enterRoom, fps, noWebGL, startInRoom };
}
