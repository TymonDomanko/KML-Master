/* KML Master shell: top bar, theme, and the working file shared between tools.
   Load it straight after <header class="kit-bar" id="kitBar"></header> so the bar renders before first paint.

   Working file: any KML/KMZ you open in a tool, or download from one, is kept in this browser
   (IndexedDB). The other tools open it automatically when you switch to them, so a file moves
   from Build to Number to Count to Pictures without re-uploading. The last few files are kept
   so you can switch back to an earlier one. Tools mark their KML file input with data-kit-kml. */
(function () {
  "use strict";
  const ROOT = new URL("../", document.currentScript.src);
  const TOOLS = [
    { id: "build", name: "Build", desc: "Outline suburbs and postcodes", accepts: false,
      icon: '<path d="M4 18 7 6l8-2 5 9-7 7z"/><path d="M12 9v6M9 12h6"/>' },
    { id: "number", name: "Number", desc: "Renumber zones in order", accepts: true,
      icon: '<path d="M9 4 7 20M17 4l-2 16M4 9h16M3 15h16"/>' },
    { id: "merge", name: "Merge", desc: "Join zones into one outline", accepts: true,
      icon: '<path d="M3 6h7v6H3zM14 12h7v6h-7z"/><path d="M10 9h4v3M10 9v6h4"/>' },
    { id: "count", name: "Count", desc: "Count letterboxes per zone", accepts: true, persists: true,
      icon: '<path d="M4 10h16v10H4z"/><path d="M4 10l4-6h8l4 6M9 14h6"/>' },
    { id: "pictures", name: "Pictures", desc: "Print a map page per zone", accepts: true,
      icon: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 17l3-4 2 2 2-3"/>' },
  ];
  const tool = document.body.dataset.tool || "home";
  const me = TOOLS.find(t => t.id === tool);
  const $ = (s, el = document) => el.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} },
  };

  /* ---------- bar ---------- */
  const bar = document.getElementById("kitBar");
  bar.innerHTML = `
    <a class="kit-brand" href="${ROOT}" aria-label="KML Master home">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 17.5 6 5l9.5-1.5 5 8.5-6 8.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="15.5" cy="3.5" r="2.6" fill="var(--kit-signal)"/></svg>
      <b>KML Master</b>
    </a>
    <nav class="kit-tabs" aria-label="Tools">
      ${TOOLS.map(t => `<a class="kit-tab" href="${ROOT}${t.id}/" ${t.id === tool ? 'aria-current="page"' : ""} title="${esc(t.desc)}"><svg viewBox="0 0 24 24" aria-hidden="true">${t.icon}</svg>${t.name}</a>`).join("")}
    </nav>
    <span class="kit-spacer"></span>
    <div class="kit-work">
      <button type="button" class="kit-work-btn empty" id="kitWorkBtn" aria-haspopup="dialog" aria-expanded="false">
        <span class="n" id="kitWorkN">–</span><span class="f"><small>Working file</small><span id="kitWorkName">None yet</span></span>
      </button>
      <div class="kit-pop" id="kitPop" role="dialog" aria-label="Working file" hidden></div>
    </div>
    <div class="kit-theme"><button type="button" id="kitTheme"></button></div>`;

  /* ---------- theme ---------- */
  const THEME_ICONS = {
    auto: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    light: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    dark: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  };
  const THEME_NAMES = { auto: "match your device", light: "light", dark: "dark" };
  function themeChoice() { const t = document.documentElement.getAttribute("data-theme"); return t === "light" || t === "dark" ? t : "auto"; }
  function showTheme() {
    const c = themeChoice(), b = $("#kitTheme");
    b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${THEME_ICONS[c]}</svg>`;
    b.title = `Theme: ${THEME_NAMES[c]}. Click to change.`;
    b.setAttribute("aria-label", b.title);
  }
  $("#kitTheme").addEventListener("click", () => {
    const next = { auto: "light", light: "dark", dark: "auto" }[themeChoice()];
    if (next === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", next);
    store.set("kmlm-theme", next === "auto" ? null : next);
    showTheme();
    window.dispatchEvent(new CustomEvent("kit:theme", { detail: next }));
  });
  showTheme();

  /* ---------- toast ---------- */
  let toastTimer;
  function toast(html, ms = 6000) {
    let t = $("#kitToast");
    if (!t) { t = document.createElement("div"); t.id = "kitToast"; t.className = "kit-toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.innerHTML = html; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), ms);
  }

  /* ---------- working file storage ---------- */
  const MAX_RECENT = 8;
  let dbp;
  function db() {
    if (!dbp) dbp = new Promise((res, rej) => {
      const r = indexedDB.open("kml-master", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("files", { keyPath: "id" });
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  async function tx(mode, fn) {
    const d = await db();
    return new Promise((res, rej) => {
      const t = d.transaction("files", mode), s = t.objectStore("files");
      const out = fn(s);
      t.oncomplete = () => res(out && "result" in out ? out.result : out); t.onerror = () => rej(t.error);
    });
  }
  async function listFiles() {
    try { const all = await tx("readonly", s => s.getAll()); return (all || []).sort((a, b) => b.at - a.at); } catch (e) { return []; }
  }
  async function currentFile() {
    const id = store.get("kmlm-current"); if (!id) return null;
    try { return (await tx("readonly", s => s.get(id))) || null; } catch (e) { return null; }
  }
  async function hashOf(buf) {
    try { const h = await crypto.subtle.digest("SHA-1", buf); return Array.from(new Uint8Array(h).slice(0, 10), b => b.toString(16).padStart(2, "0")).join(""); }
    catch (e) { return "f" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  }
  async function kmlText(name, buf) {
    if (!/\.kmz$/i.test(name)) return new TextDecoder().decode(buf);
    if (!window.JSZip) return null;
    const zip = await JSZip.loadAsync(buf);
    const f = Object.values(zip.files).find(x => /\.kml$/i.test(x.name) && !x.dir);
    return f ? f.async("string") : null;
  }
  async function countZones(name, buf) {
    try {
      const text = await kmlText(name, buf); if (text == null) return null;
      const doc = new DOMParser().parseFromString(text, "application/xml");
      if (doc.getElementsByTagName("parsererror").length) return null;
      return Array.from(doc.getElementsByTagNameNS("*", "Placemark")).filter(p => p.getElementsByTagNameNS("*", "Polygon").length).length;
    } catch (e) { return null; }
  }
  /** Keep a file as the working file. from = tool id, how = "opened" | "saved". */
  async function keep(file, from, how) {
    const buf = await file.arrayBuffer();
    const id = await hashOf(buf);
    const rec = { id, name: file.name, size: buf.byteLength, data: new Blob([buf]), zones: await countZones(file.name, buf), from, how, at: Date.now() };
    try {
      await tx("readwrite", s => s.put(rec));
      const all = await listFiles();
      if (all.length > MAX_RECENT) await tx("readwrite", s => all.slice(MAX_RECENT).forEach(r => s.delete(r.id)));
    } catch (e) { /* storage blocked: the shell still works, just without hand-off */ }
    store.set("kmlm-current", id);
    renderWork();
    return rec;
  }
  function loadedHere(id) { if (me) store.set("kmlm-loaded-" + tool, id); }
  function openedHere(id) { if (me) store.set("kmlm-opened-" + tool, id); }

  /* ---------- hand the working file to this tool ---------- */
  let suppress = false;
  const input = () => document.querySelector("input[type=file][data-kit-kml]");
  function openHere(rec, quiet) {
    const inp = input(); if (!inp || !rec) return false;
    const file = new File([rec.data], rec.name, { type: /\.kmz$/i.test(rec.name) ? "application/vnd.google-earth.kmz" : "application/vnd.google-earth.kml+xml" });
    const dt = new DataTransfer(); dt.items.add(file);
    suppress = true;
    try { inp.files = dt.files; inp.dispatchEvent(new Event("change", { bubbles: true })); }
    finally { suppress = false; }
    loadedHere(rec.id); openedHere(rec.id);
    if (!quiet) toast(`<span>Opened <b>${esc(rec.name)}</b>, your working file.</span>`, 3500);
    return true;
  }
  async function autoOpen() {
    if (!me || !me.accepts) return;
    let cur = await currentFile();
    if (!cur) return;
    // A file this tool made itself (e.g. the merged outline) isn't what you'd want to open here
    // again: reopen the last file you opened in this tool instead.
    if (cur.from === tool && cur.how === "saved") {
      const id = store.get("kmlm-opened-" + tool);
      cur = id ? (await listFiles()).find(r => r.id === id) : null;
      if (!cur) return;
    }
    // Tools that remember their own file (Count) only need it when it has changed.
    if (me.persists && store.get("kmlm-loaded-" + tool) === cur.id) return;
    openHere(cur);
  }

  /* files opened inside a tool */
  document.addEventListener("change", e => {
    const t = e.target;
    if (suppress || !t.matches || !t.matches("input[type=file][data-kit-kml]")) return;
    const f = t.files && t.files[0];
    if (f && /\.(kml|kmz)$/i.test(f.name)) keep(f, tool, "opened").then(r => { loadedHere(r.id); openedHere(r.id); });
  }, true);
  window.addEventListener("drop", e => {
    if (!input() || (e.target.closest && e.target.closest("[data-kit-nokml]"))) return;
    const f = e.dataTransfer && e.dataTransfer.files[0];
    if (f && /\.(kml|kmz)$/i.test(f.name)) keep(f, tool, "opened").then(r => { loadedHere(r.id); openedHere(r.id); });
  }, true);

  /* files downloaded from a tool */
  const blobs = new Map();
  const origCreate = URL.createObjectURL.bind(URL), origRevoke = URL.revokeObjectURL.bind(URL);
  URL.createObjectURL = function (obj) { const u = origCreate(obj); if (obj instanceof Blob) blobs.set(u, obj); return u; };
  URL.revokeObjectURL = function (u) { setTimeout(() => blobs.delete(u), 2000); return origRevoke(u); };
  const origClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    const name = this.download, blob = blobs.get(this.href);
    if (name && blob && /\.(kml|kmz)$/i.test(name)) {
      keep(new File([blob], name), tool, "saved").then(rec => {
        loadedHere(rec.id); // this tool made it, so don't reload it here
        const others = TOOLS.filter(t => t.accepts && t.id !== tool);
        toast(`<span>Downloaded <b>${esc(name)}</b>. It's now your working file.</span><span class="go">${others.map(t => `<a href="${ROOT}${t.id}/">Open in ${t.name}</a>`).join("")}</span>`, 9000);
      });
    }
    return origClick.call(this);
  };

  /* ---------- working file button and popover ---------- */
  function ago(t) {
    const s = Math.round((Date.now() - t) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return Math.round(s / 60) + " min ago";
    if (s < 86400) return Math.round(s / 3600) + " h ago";
    return new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  }
  const toolName = id => (TOOLS.find(t => t.id === id) || { name: "Home" }).name;
  const zonesText = n => n == null ? "" : n === 1 ? "1 zone" : n + " zones";
  async function renderWork() {
    const cur = await currentFile();
    const btn = $("#kitWorkBtn");
    btn.classList.toggle("empty", !cur);
    $("#kitWorkN").textContent = cur ? (cur.zones ?? "?") : "–";
    $("#kitWorkName").textContent = cur ? cur.name : "None yet";
    btn.title = cur ? `${cur.name}${cur.zones != null ? ", " + zonesText(cur.zones) : ""}` : "No working file yet";
    if (!$("#kitPop").hidden) renderPop();
  }
  async function renderPop() {
    const pop = $("#kitPop"), cur = await currentFile(), all = await listFiles();
    if (!cur) {
      pop.innerHTML = `<h3>No working file yet</h3><p>Open a KML or KMZ in any tool, or download one from Build, and it's kept here. The other tools open it when you switch to them.</p>`;
      return;
    }
    const canOpen = me && me.accepts;
    pop.innerHTML = `
      <h3>Working file</h3>
      <div class="meta"><b>${esc(cur.name)}</b><br>${zonesText(cur.zones) || "zones unknown"}, ${cur.how === "saved" ? "downloaded from" : "opened in"} ${toolName(cur.from)}, ${ago(cur.at)}</div>
      <div class="row">
        ${canOpen ? `<button type="button" class="btn primary small" data-act="open">Open in ${me.name}</button>` : ""}
        <button type="button" class="btn small" data-act="dl">Download</button>
        <button type="button" class="btn ghost small" data-act="clear">Clear list</button>
      </div>
      ${all.length > 1 ? `<p>Recent files. Pick one to make it the working file${canOpen ? " and open it here" : ""}.</p>
      <ul class="kit-recent">${all.map(r => `<li><button type="button" data-id="${r.id}" class="${r.id === cur.id ? "cur" : ""}"><span class="nm">${esc(r.name)}</span><span class="zn">${zonesText(r.zones)}</span><span class="wh">${r.how === "saved" ? "From" : "Opened in"} ${toolName(r.from)}, ${ago(r.at)}</span></button></li>`).join("")}</ul>` : ""}`;
  }
  function togglePop(open) {
    const pop = $("#kitPop"), btn = $("#kitWorkBtn");
    open = open ?? pop.hidden;
    pop.hidden = !open; btn.setAttribute("aria-expanded", String(open));
    if (open) renderPop();
  }
  $("#kitWorkBtn").addEventListener("click", e => { e.stopPropagation(); togglePop(); });
  document.addEventListener("click", e => { if (!e.target.closest(".kit-work")) togglePop(false); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#kitPop").hidden) { togglePop(false); $("#kitWorkBtn").focus(); } });
  $("#kitPop").addEventListener("click", async e => {
    const b = e.target.closest("button"); if (!b) return;
    const cur = await currentFile();
    if (b.dataset.act === "open") { openHere(cur); togglePop(false); }
    else if (b.dataset.act === "dl" && cur) {
      const a = document.createElement("a"); a.href = origCreate(cur.data); a.download = cur.name;
      document.body.appendChild(a); origClick.call(a); a.remove(); setTimeout(() => origRevoke(a.href), 4000);
    } else if (b.dataset.act === "clear") {
      try { await tx("readwrite", s => s.clear()); } catch (_) {}
      store.set("kmlm-current", null); renderWork(); renderPop();
    } else if (b.dataset.id) {
      const rec = await tx("readonly", s => s.get(b.dataset.id));
      if (!rec) return;
      rec.at = Date.now(); await tx("readwrite", s => s.put(rec));
      store.set("kmlm-current", rec.id); renderWork();
      if (me && me.accepts) { openHere(rec); togglePop(false); }
    }
  });

  renderWork();
  window.addEventListener("storage", e => { if (e.key === "kmlm-current") renderWork(); });
  // after the tool has finished starting up (some tools load their sample once fonts are ready)
  const started = () => (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => setTimeout(autoOpen, 60));
  if (document.readyState === "complete") started();
  else window.addEventListener("load", started);

  window.KMLKit = { TOOLS, ROOT, keep, currentFile, listFiles, toast, openHere };
})();
