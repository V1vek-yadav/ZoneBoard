// Board, market pulse and chart. Reads only from `source` (the demo generator now, the
// Kotak-backed API later); both expose board(), chart(sym) and barsPerDay.
(function () {
  "use strict";

  const { Levels, Scores } = window.OBL;
  const source = window.OBL.DemoSource;

  const REFRESH_MS = 60 * 1000;
  const REPLAY_STEP_MS = 1200;
  const BOARD_LIMIT = 25;
  const SESSION_OPEN_MIN = 9 * 60 + 15;
  const IST_OFFSET_MS = 5.5 * 3600 * 1000;
  const NS = "http://www.w3.org/2000/svg";

  const $ = (sel) => document.querySelector(sel);
  const isNarrow = () => window.matchMedia("(max-width: 700px)").matches;

  const state = {
    rows: [], indices: [], market: null, asOf: null,
    side: "bull", query: "", showChoppy: false,
    selected: null, range: isNarrow() ? "today" : "3d",
    chart: null, replayTimer: null, cursor: null,
  };

  // ---------- formatting ----------
  const inr = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sign = (v) => (v > 0 ? "+" : v < 0 ? "−" : "");
  const fmtPrice = (v) => inr.format(v);
  const fmtPct = (v) => sign(v) + Math.abs(v * 100).toFixed(2) + "%";
  const fmtX = (v) => sign(v) + Math.abs(v).toFixed(2) + "×";
  const fmtQty = (v) => (v >= 1e7 ? (v / 1e7).toFixed(2) + " Cr" : v >= 1e5 ? (v / 1e5).toFixed(1) + " L" : Math.round(v).toLocaleString("en-IN"));
  const ist = (t, opts) => new Date(t).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", ...opts });
  const fmtTime = (t) => ist(t, { hour: "2-digit", minute: "2-digit", hour12: false });
  const fmtDay = (t) => ist(t, { weekday: "short", day: "numeric", month: "short" });
  const arrow = (v) => (v > 0 ? "▲" : v < 0 ? "▼" : "•");
  const tone = (v) => (v > 0 ? "up" : v < 0 ? "down" : "flat");
  const buildupTone = (b) => (b === "Long buildup" || b === "Short covering" ? "pos" : b === "Flat OI" ? "" : "neg");
  const capitalise = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  // ---------- DOM helpers (all text goes in as text nodes, never HTML) ----------
  function el(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "style") Object.assign(n.style, v);
      else n.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat()) if (kid != null) n.append(kid);
    return n;
  }
  function svg(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) if (v != null) n.setAttribute(k, v);
    if (parent) parent.appendChild(n);
    return n;
  }
  function svgText(parent, x, y, text, cls, anchor) {
    const t = svg("text", { x, y, class: cls, "text-anchor": anchor || "start" }, parent);
    t.textContent = text;
    return t;
  }

  // ---------- tooltip ----------
  const tip = $("#tooltip");
  function showTip(clientX, clientY, title, rows) {
    tip.textContent = "";
    if (title) tip.append(el("div", { class: "tip-title" }, title));
    for (const [value, label] of rows) tip.append(el("div", { class: "tip-row" }, el("b", {}, value), el("span", {}, label)));
    tip.hidden = false;
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let x = clientX + 14, y = clientY + 14;
    if (x + w > window.innerWidth - 8) x = clientX - w - 14;
    if (y + h > window.innerHeight - 8) y = clientY - h - 14;
    tip.style.left = Math.max(8, x) + "px";
    tip.style.top = Math.max(8, y) + "px";
  }
  const hideTip = () => { tip.hidden = true; };

  // ---------- data ----------
  const sideOf = (r) => (r.strength >= 0 ? "bull" : "bear");
  const byScore = (a, b) => b.score - a.score || Math.abs(b.strength) - Math.abs(a.strength);

  function boardRows() {
    const q = state.query.trim().toUpperCase();
    const rows = q
      ? state.rows.filter((r) => r.sym.includes(q))
      : state.rows.filter((r) => sideOf(r) === state.side && (state.showChoppy || !r.choppy));
    return rows.sort(byScore);
  }

  async function refresh() {
    const data = await source.board();
    state.asOf = data.asOf;
    state.market = data.market;
    state.indices = data.indices;
    state.rows = data.stocks.map(Scores.enrich);
    if (!state.rows.some((r) => r.sym === state.selected)) {
      const best = state.rows.filter((r) => !r.choppy && r.strength > 0).sort(byScore)[0];
      state.selected = (best || state.rows[0]).sym;
    }
    renderTop();
    renderBreadth();
    renderPulse();
    renderBoard();
    await loadChart();
  }

  async function select(sym, fromUser) {
    state.selected = sym;
    state.cursor = null;
    document.querySelectorAll("#board tbody tr[data-sym]").forEach((tr) => {
      const on = tr.dataset.sym === sym;
      tr.classList.toggle("sel", on);
      tr.setAttribute("aria-selected", String(on));
    });
    renderPulse();
    await loadChart();
    if (fromUser && window.matchMedia("(max-width: 1099px)").matches) {
      $("#chart-card").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  async function loadChart() {
    const sym = state.selected;
    const data = await source.chart(sym);
    if (sym !== state.selected) return;
    const c = data.candles;
    state.chart = {
      ...data,
      vwap: Levels.vwap(c),
      sessions: Levels.sessions(c),
      blocks: Levels.orderBlocks(c).filter((b) => b.status !== "broken"),
      liquidity: Levels.liquidity(c),
    };
    const row = state.rows.find((r) => r.sym === sym);
    renderChartHead(row);
    renderChart();
    renderLevels(row);
  }

  // ---------- top bar ----------
  function renderTop() {
    $("#status").dataset.state = state.market.state;
    $("#status-text").textContent = state.market.label;
    const box = $("#indices");
    box.textContent = "";
    for (const ix of state.indices) {
      box.append(el("div", { class: "index" },
        el("span", { class: "index-name" }, ix.name),
        el("span", { class: "index-val num" }, fmtPrice(ix.ltp)),
        el("span", { class: "chg " + tone(ix.chgPct) }, `${arrow(ix.chgPct)} ${fmtPct(ix.chgPct)}`)));
    }
    $("#asof").textContent = `Updated ${fmtTime(state.asOf)} IST`;
    $("#replay").textContent = state.replayTimer ? "■ Stop replay" : "▶ Replay session";
  }

  // ---------- breadth ----------
  function renderBreadth() {
    const t = Scores.CHOPPY_STRENGTH;
    const up = state.rows.filter((r) => r.strength >= t).length;
    const down = state.rows.filter((r) => r.strength <= -t).length;
    const flat = state.rows.length - up - down;
    const bar = el("div", { class: "breadth-bar", role: "img", "aria-label": `${down} bearish, ${flat} flat, ${up} bullish` });
    for (const [cls, n] of [["down", down], ["flat", flat], ["up", up]]) {
      if (n) bar.append(el("span", { class: cls, style: { flexGrow: String(n) } }));
    }
    const box = $("#breadth");
    box.textContent = "";
    box.append(
      el("div", { class: "breadth-labels" },
        el("span", {}, el("b", {}, `▼ ${down}`), " bearish"),
        el("span", {}, el("b", {}, String(flat)), " flat"),
        el("span", {}, el("b", {}, String(up)), " bullish ", el("b", {}, "▲"))),
      bar);
  }

  // ---------- market pulse: strength (x) against OI change (y) ----------
  function renderPulse() {
    const box = $("#pulse");
    const W = box.clientWidth || 600;
    const narrow = W < 500;
    const H = narrow ? 230 : 260;
    const m = { l: 44, r: 12, t: 10, b: 30 };
    const pw = W - m.l - m.r, ph = H - m.t - m.b;
    const xMax = 4;
    const chop = Scores.CHOPPY_STRENGTH;
    const ys = state.rows.map((r) => r.oiChg);
    let yLo = Math.min(-0.04, ...ys), yHi = Math.max(0.04, ...ys);
    const pad = (yHi - yLo) * 0.08;
    yLo -= pad; yHi += pad;
    const X = (v) => m.l + ((Math.max(-xMax, Math.min(xMax, v)) + xMax) / (2 * xMax)) * pw;
    const Y = (v) => m.t + (1 - (v - yLo) / (yHi - yLo)) * ph;

    box.textContent = "";
    const root = svg("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img",
      "aria-label": "Scatter of every F&O stock: move in ATRs across, OI change up the side" }, box);

    svg("rect", { x: X(-chop), y: m.t, width: X(chop) - X(-chop), height: ph, class: "chop-band" }, root);
    for (const v of niceTicks(yLo, yHi, 4)) {
      svg("line", { x1: m.l, x2: m.l + pw, y1: Y(v), y2: Y(v), class: v === 0 ? "zero" : "grid-line" }, root);
      svgText(root, m.l - 6, Y(v) + 4, (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v * 100).toFixed(0) + "%", "axis-label", "end");
    }
    for (let v = -xMax; v <= xMax; v += narrow ? 2 : 1) {
      svgText(root, X(v), H - 12, v === 0 ? "0" : `${sign(v)}${Math.abs(v)}×`, "axis-label", "middle");
    }
    svg("line", { x1: X(0), x2: X(0), y1: m.t, y2: m.t + ph, class: "zero" }, root);
    svgText(root, m.l + 6, m.t + 12, "Short buildup", "quad");
    svgText(root, m.l + pw - 6, m.t + 12, "Long buildup", "quad", "end");
    svgText(root, m.l + 6, m.t + ph - 6, "Long unwinding", "quad");
    svgText(root, m.l + pw - 6, m.t + ph - 6, "Short covering", "quad", "end");
    svgText(root, X(0), m.t + ph - 6, "choppy", "quad", "middle");
    svgText(root, m.l + pw, H - 1, "move vs normal range →", "axis-label", "end");

    const pts = state.rows.map((r) => ({ r, x: X(r.strength), y: Y(r.oiChg) }));
    const cls = (r) => (r.strength >= chop ? "pos" : r.strength <= -chop ? "neg" : "flat");
    const order = (p) => (p.r.sym === state.selected ? 2 : cls(p.r) === "flat" ? 0 : 1);
    for (const p of pts.slice().sort((a, b) => order(a) - order(b))) {
      const sel = p.r.sym === state.selected;
      svg("circle", { cx: p.x, cy: p.y, r: sel ? 6 : 4, class: `dot ${cls(p.r)}${sel ? " sel" : ""}` }, root);
    }
    const leaders = narrow ? [] : [
      ...state.rows.filter((r) => !r.choppy && r.strength > 0).sort(byScore).slice(0, 2),
      ...state.rows.filter((r) => !r.choppy && r.strength < 0).sort(byScore).slice(0, 2),
    ];
    const labelled = new Set([state.selected, ...leaders.map((r) => r.sym)]);
    for (const p of pts) {
      if (!labelled.has(p.r.sym)) continue;
      const right = p.x < m.l + pw - 80;
      svgText(root, p.x + (right ? 9 : -9), p.y - 7, p.r.sym, "dot-label", right ? "start" : "end");
    }

    const nearest = (e) => {
      const rect = root.getBoundingClientRect();
      const px = e.clientX - rect.left, py = e.clientY - rect.top;
      let best = null, bd = 24 * 24;
      for (const p of pts) {
        const d = (p.x - px) ** 2 + (p.y - py) ** 2;
        if (d < bd) { bd = d; best = p; }
      }
      return best;
    };
    root.addEventListener("pointermove", (e) => {
      const p = nearest(e);
      root.style.cursor = p ? "pointer" : "default";
      if (!p) return hideTip();
      showTip(e.clientX, e.clientY, p.r.sym, [
        [fmtX(p.r.strength), "Strength (× ATR)"],
        [fmtPct(p.r.chgPct), "Price change"],
        [fmtPct(p.r.oiChg), "OI change"],
        [p.r.buildup, ""],
      ]);
    });
    root.addEventListener("pointerleave", hideTip);
    root.addEventListener("click", (e) => {
      const p = nearest(e);
      if (!p) return;
      if (!state.query && sideOf(p.r) !== state.side) { state.side = sideOf(p.r); renderBoard(); }
      select(p.r.sym, true);
    });
  }

  // ---------- board ----------
  function renderBoard() {
    const all = boardRows();
    const rows = all.slice(0, BOARD_LIMIT);
    const counts = { bull: 0, bear: 0 };
    for (const r of state.rows) if (!r.choppy) counts[sideOf(r)]++;
    $("#count-bull").textContent = counts.bull;
    $("#count-bear").textContent = counts.bear;
    document.querySelectorAll(".board-tools [data-side]").forEach((b) => {
      b.setAttribute("aria-selected", String(!state.query && b.dataset.side === state.side));
    });

    const tbody = $("#board tbody");
    tbody.textContent = "";
    rows.forEach((r, i) => tbody.append(boardRow(r, i)));
    if (!rows.length) tbody.append(el("tr", {}, el("td", { colspan: 7, class: "empty" }, "No stocks match.")));

    const what = state.query ? `matching “${state.query.trim()}”` : state.side === "bull" ? "bullish" : "bearish";
    $("#board-foot").textContent = all.length > rows.length
      ? `Top ${rows.length} of ${all.length} ${what} stocks.`
      : `${all.length} ${what} stock${all.length === 1 ? "" : "s"}.`;
  }

  function boardRow(r, i) {
    const pol = r.strength >= 0 ? "pos" : "neg";
    const selected = r.sym === state.selected;
    return el("tr", { tabindex: "0", "data-sym": r.sym, class: selected ? "sel" : null, "aria-selected": String(selected) },
      el("td", { class: "c-rank" }, String(i + 1)),
      el("td", {},
        el("span", { class: "sym" }, r.sym),
        el("span", { class: "bu " + buildupTone(r.buildup) }, r.buildup)),
      el("td", { class: "num" },
        el("span", { class: "ltp" }, fmtPrice(r.ltp)),
        el("span", { class: "chg " + tone(r.chg) }, `${arrow(r.chg)} ${fmtPct(r.chgPct)}`)),
      el("td", { class: "num" },
        el("span", {}, fmtX(r.strength)),
        strengthBar(r.strength)),
      el("td", { class: "num c-oi" },
        el("span", {}, fmtPct(r.oiChg)),
        el("span", { class: "muted small" }, fmtQty(r.oi))),
      el("td", { class: "c-vwap" }, r.aboveVwap ? "Above" : "Below"),
      el("td", { class: "num" }, r.choppy
        ? el("span", { class: "muted" }, "Choppy")
        : [el("span", { class: "score" }, String(r.score)),
           el("span", { class: "meter " + pol, "aria-hidden": "true" }, el("i", { style: { width: r.score + "%" } }))]));
  }

  function strengthBar(v) {
    const half = (Math.max(-3, Math.min(3, v)) / 3) * 50;
    const fill = el("i", { class: v >= 0 ? "pos" : "neg", style: { left: (v >= 0 ? 50 : 50 + half) + "%", width: Math.abs(half) + "%" } });
    return el("span", { class: "sbar", "aria-hidden": "true" }, fill);
  }

  // ---------- chart header + levels table ----------
  function renderChartHead(r) {
    const head = $("#chart-head");
    head.textContent = "";
    const last = state.chart.candles[state.chart.candles.length - 1];
    head.append(
      el("div", { class: "ch-title" },
        el("h2", {}, r.sym),
        el("span", { class: "badge" }, el("span", { class: "bu " + buildupTone(r.buildup) }, r.buildup)),
        el("span", { class: "badge" }, r.choppy ? "Choppy" : `Score ${r.score}`),
        el("span", { class: "muted small" }, `5-min · ${fmtDay(last.t)}`)),
      el("div", { class: "ch-price" },
        el("span", { class: "big" }, "₹" + fmtPrice(r.ltp)),
        el("span", { class: "chg " + tone(r.chg) }, `${arrow(r.chg)} ${fmtPct(r.chgPct)} (${sign(r.chg)}${fmtPrice(Math.abs(r.chg))})`)),
      el("div", { class: "facts" },
        el("span", {}, "Strength ", el("b", {}, fmtX(r.strength) + " ATR")),
        el("span", {}, "OI ", el("b", {}, fmtQty(r.oi)), ` (${fmtPct(r.oiChg)})`),
        el("span", {}, "Daily ATR ", el("b", {}, "₹" + fmtPrice(r.atr))),
        el("span", {}, "Lot ", el("b", {}, r.lot.toLocaleString("en-IN")))));
  }

  const LEVEL_NAMES = {
    PDH: "Previous day high", PDL: "Previous day low",
    ORH: "Opening range high", ORL: "Opening range low",
    EQH: "Equal highs", EQL: "Equal lows",
  };

  function renderLevels(r) {
    const ch = state.chart;
    const ltp = r.ltp;
    const dist = (p) => fmtX((p - ltp) / ch.atr);
    const rows = [];
    const vw = ch.vwap[ch.vwap.length - 1];
    rows.push(["VWAP", fmtPrice(vw), dist(vw), ltp >= vw ? "Price above" : "Price below"]);

    const bull = ch.blocks.filter((b) => b.side === "bull" && b.bottom <= ltp).sort((a, b) => b.top - a.top)[0];
    const bear = ch.blocks.filter((b) => b.side === "bear" && b.top >= ltp).sort((a, b) => a.bottom - b.bottom)[0];
    rows.push(bull
      ? ["Nearest bull OB", `${fmtPrice(bull.bottom)} – ${fmtPrice(bull.top)}`, dist(Math.min(bull.top, ltp)), capitalise(bull.status)]
      : ["Nearest bull OB", "None below", "", ""]);
    rows.push(bear
      ? ["Nearest bear OB", `${fmtPrice(bear.bottom)} – ${fmtPrice(bear.top)}`, dist(Math.max(bear.bottom, ltp)), capitalise(bear.status)]
      : ["Nearest bear OB", "None above", "", ""]);

    for (const kind of ["PDH", "PDL", "ORH", "ORL"]) {
      const lv = ch.liquidity.find((l) => l.kind === kind);
      if (lv) rows.push([LEVEL_NAMES[kind], fmtPrice(lv.price), dist(lv.price), capitalise(lv.status)]);
    }
    const eqh = ch.liquidity.filter((l) => l.kind === "EQH" && l.status !== "taken" && l.price >= ltp).sort((a, b) => a.price - b.price)[0];
    const eql = ch.liquidity.filter((l) => l.kind === "EQL" && l.status !== "taken" && l.price <= ltp).sort((a, b) => b.price - a.price)[0];
    for (const lv of [eqh, eql]) if (lv) rows.push([LEVEL_NAMES[lv.kind], fmtPrice(lv.price), dist(lv.price), capitalise(lv.status)]);

    const table = $("#levels");
    table.textContent = "";
    table.append(
      el("thead", {}, el("tr", {},
        el("th", { scope: "col" }, "Level"),
        el("th", { scope: "col", class: "num" }, "Price"),
        el("th", { scope: "col", class: "num" }, "Distance (× ATR)"),
        el("th", { scope: "col", class: "c-status" }, "Status"))),
      el("tbody", {}, rows.map(([name, price, d, status]) => el("tr", {},
        el("td", {}, name),
        el("td", { class: "num" }, price),
        el("td", { class: "num" }, d),
        el("td", { class: "c-status" }, status)))));
  }

  // ---------- candlestick chart ----------
  function barOfDay(t) {
    const d = new Date(t + IST_OFFSET_MS);
    return Math.round((d.getUTCHours() * 60 + d.getUTCMinutes() - SESSION_OPEN_MIN) / 5);
  }

  function renderChart() {
    const ch = state.chart;
    if (!ch) return;
    const box = $("#chart");
    box.textContent = "";
    const W = box.clientWidth || 640;
    const H = W < 640 ? 300 : 400;
    const m = { l: 8, r: 76, t: 12, b: 26 };
    const pw = W - m.l - m.r, ph = H - m.t - m.b, right = m.l + pw;
    const c = ch.candles, days = ch.sessions, bpd = source.barsPerDay;
    const firstDay = state.range === "today" ? days.length - 1 : 0;
    const start = days[firstDay].start;
    const slotW = pw / ((days.length - firstDay) * bpd);
    const dayOf = [];
    days.forEach((d, k) => { for (let i = d.start; i <= d.end; i++) dayOf[i] = k; });
    const X = (i) => m.l + ((dayOf[i] - firstDay) * bpd + barOfDay(c[i].t) + 0.5) * slotW;
    const leftEdge = (i) => (i < start ? m.l : X(i) - slotW / 2);

    let lo = Infinity, hi = -Infinity;
    for (let i = start; i < c.length; i++) { lo = Math.min(lo, c[i].l); hi = Math.max(hi, c[i].h); }
    const pad = (hi - lo) * 0.06;
    lo -= pad; hi += pad;
    const Y = (p) => m.t + (1 - (p - lo) / (hi - lo)) * ph;
    const inView = (p) => p >= lo && p <= hi;

    const root = svg("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img",
      "aria-label": `${ch.sym} 5-minute candles with order blocks, VWAP and liquidity levels` }, box);
    const clipId = "plot-clip";
    svg("rect", { x: m.l, y: m.t, width: pw, height: ph }, svg("clipPath", { id: clipId }, svg("defs", {}, root)));
    const gGrid = svg("g", {}, root);
    const gPlot = svg("g", { "clip-path": `url(#${clipId})` }, root);
    const gPlotLabels = svg("g", { "clip-path": `url(#${clipId})` }, root);
    const gAxis = svg("g", {}, root);
    const axisLabels = [];

    for (const v of niceTicks(lo, hi, 5)) {
      svg("line", { x1: m.l, x2: right, y1: Y(v), y2: Y(v), class: "grid-line" }, gGrid);
      axisLabels.push({ y: Y(v), text: fmtPrice(v), kind: "tick", prio: 0 });
    }
    for (let k = firstDay; k < days.length; k++) {
      const x0 = m.l + (k - firstDay) * bpd * slotW;
      if (k > firstDay) svg("line", { x1: x0, x2: x0, y1: m.t, y2: m.t + ph, class: "sep" }, gGrid);
      if (state.range === "3d") svgText(gGrid, x0 + 4, H - 8, fmtDay(c[days[k].start].t), "axis-label");
    }
    if (state.range === "today") {
      for (let hh = 10; hh <= 15; hh++) {
        const x = m.l + ((hh * 60 - SESSION_OPEN_MIN) / 5) * slotW;
        svgText(gGrid, x, H - 8, `${hh}:00`, "axis-label", "middle");
      }
    }

    // Opening range band.
    const orh = ch.liquidity.find((l) => l.kind === "ORH");
    const orl = ch.liquidity.find((l) => l.kind === "ORL");
    if (orh && orl) {
      const x0 = leftEdge(orh.from);
      svg("rect", { x: x0, y: Y(orh.price), width: right - x0, height: Math.max(1, Y(orl.price) - Y(orh.price)), class: "or-band" }, gPlot);
      for (const lv of [orh, orl]) if (inView(lv.price)) axisLabels.push({ y: Y(lv.price), text: lv.kind, kind: "lvl", prio: 1 });
    }

    // Order-block zones that are still live. A label that would sit on another is dropped;
    // the levels table below still lists the nearest zone on each side.
    const zoneLabels = [];
    for (const b of ch.blocks) {
      const x0 = leftEdge(b.from);
      const y0 = Y(b.top), y1 = Y(b.bottom);
      svg("rect", { x: x0, y: y0, width: Math.max(1, right - x0), height: Math.max(2, y1 - y0), class: `zone ${b.side} ${b.status}` }, gPlot);
      const ty = y1 - y0 >= 15 ? y0 + 11 : b.side === "bull" ? y1 + 11 : y0 - 4;
      if (right - x0 > 70 && !zoneLabels.some((p) => Math.abs(p.x - x0) < 90 && Math.abs(p.y - ty) < 12)) {
        zoneLabels.push({ x: x0, y: ty });
        const text = (b.side === "bull" ? "Bull OB" : "Bear OB") + (b.status === "tested" ? " · tested" : "");
        svgText(gPlotLabels, x0 + 4, ty, text, "zone-label");
      }
    }

    // Previous-day and equal high/low lines, with sweep marks.
    for (const lv of ch.liquidity) {
      if (lv.kind === "ORH" || lv.kind === "ORL") continue;
      const isPd = lv.kind === "PDH" || lv.kind === "PDL";
      const x0 = leftEdge(isPd ? days[days.length - 1].start : lv.from);
      const x1 = lv.takenAt != null ? X(lv.takenAt) : right;
      if (x1 <= m.l) continue;
      svg("line", { x1: x0, x2: x1, y1: Y(lv.price), y2: Y(lv.price), class: `lvl ${isPd ? "pd" : "eq"} ${lv.status}` }, gPlot);
      if (lv.sweptAt != null && lv.sweptAt >= start) {
        const k = c[lv.sweptAt];
        sweepMark(gPlot, X(lv.sweptAt), lv.side === "high" ? Y(k.h) - 8 : Y(k.l) + 8);
      }
      if (lv.status !== "taken" && inView(lv.price)) axisLabels.push({ y: Y(lv.price), text: lv.kind, kind: "lvl", prio: 2 });
    }

    // VWAP, one line per session.
    for (let k = firstDay; k < days.length; k++) {
      let d = "";
      for (let i = days[k].start; i <= days[k].end; i++) d += `${i === days[k].start ? "M" : "L"}${X(i).toFixed(1)},${Y(ch.vwap[i]).toFixed(1)}`;
      svg("path", { d, class: "vwap" }, gPlot);
    }

    // Candles: hollow when up, filled when down (shape carries direction, not colour alone).
    const bw = Math.max(1, Math.min(9, slotW * 0.64));
    for (let i = start; i < c.length; i++) {
      const k = c[i], x = X(i);
      const g = svg("g", { class: (k.c >= k.o ? "c-up" : "c-down") + (bw < 3 ? " solid" : "") }, gPlot);
      svg("line", { x1: x, x2: x, y1: Y(k.h), y2: Y(k.l) }, g);
      const top = Y(Math.max(k.o, k.c)), bot = Y(Math.min(k.o, k.c));
      svg("rect", { x: x - bw / 2, y: top, width: bw, height: Math.max(1, bot - top) }, g);
    }

    // Last price line and the right-hand axis labels, highest priority first, no overlaps.
    const lastC = c[c.length - 1];
    svg("line", { x1: m.l, x2: right, y1: Y(lastC.c), y2: Y(lastC.c), class: "last-line" }, gPlot);
    axisLabels.push({ y: Y(lastC.c), text: fmtPrice(lastC.c), kind: "last", prio: 3 });
    const placed = [];
    for (const lb of axisLabels.sort((a, b) => b.prio - a.prio)) {
      if (lb.y < m.t - 2 || lb.y > m.t + ph + 2) continue;
      if (placed.some((p) => Math.abs(p.y - lb.y) < 15)) continue;
      placed.push(lb);
      if (lb.kind === "last") {
        svg("rect", { x: right + 3, y: lb.y - 9, width: m.r - 6, height: 18, rx: 4, class: "last-tag" }, gAxis);
        svgText(gAxis, right + 8, lb.y + 4, lb.text, "last-text");
      } else {
        svgText(gAxis, right + 8, lb.y + 4, lb.text, lb.kind === "lvl" ? "lvl-label" : "axis-label");
      }
    }

    // Crosshair: snaps to the nearest candle; the tooltip lists every value at that time.
    const gX = svg("g", { visibility: "hidden" }, root);
    const vline = svg("line", { y1: m.t, y2: m.t + ph, class: "xhair" }, gX);
    const hline = svg("line", { x1: m.l, x2: right, class: "xhair" }, gX);
    const hTag = svg("rect", { x: right + 3, width: m.r - 6, height: 18, rx: 4, class: "xhair-tag" }, gX);
    const hText = svgText(gX, right + 8, 0, "", "xhair-text");
    const hit = svg("rect", { x: m.l, y: m.t, width: pw, height: ph, fill: "transparent" }, root);

    const nearestIdx = (px) => {
      let best = start, bd = Infinity;
      for (let i = start; i < c.length; i++) {
        const d = Math.abs(X(i) - px);
        if (d < bd) { bd = d; best = i; }
      }
      return best;
    };
    const show = (i, py, clientX, clientY) => {
      state.cursor = i;
      const k = c[i];
      gX.setAttribute("visibility", "visible");
      vline.setAttribute("x1", X(i));
      vline.setAttribute("x2", X(i));
      const y = py == null ? Y(k.c) : py;
      hline.setAttribute("y1", y);
      hline.setAttribute("y2", y);
      hTag.setAttribute("y", y - 9);
      hText.setAttribute("y", y + 4);
      hText.textContent = fmtPrice(lo + (1 - (y - m.t) / ph) * (hi - lo));
      showTip(clientX, clientY, `${fmtDay(k.t)} · ${fmtTime(k.t)}`, [
        [fmtPrice(k.c), "Close"], [fmtPrice(k.o), "Open"], [fmtPrice(k.h), "High"], [fmtPrice(k.l), "Low"],
        [fmtQty(k.v), "Volume"], [fmtPrice(ch.vwap[i]), "VWAP"],
      ]);
    };
    const hide = () => { gX.setAttribute("visibility", "hidden"); hideTip(); };
    hit.addEventListener("pointermove", (e) => {
      const rect = root.getBoundingClientRect();
      show(nearestIdx(e.clientX - rect.left), Math.max(m.t, Math.min(m.t + ph, e.clientY - rect.top)), e.clientX, e.clientY);
    });
    hit.addEventListener("pointerleave", hide);
    state.chartKeys = { show, hide, start, end: c.length - 1, X, Y, root };
  }

  function sweepMark(parent, x, y) {
    svg("path", { d: `M${x - 3.5},${y - 3.5}L${x + 3.5},${y + 3.5}M${x + 3.5},${y - 3.5}L${x - 3.5},${y + 3.5}`, class: "sweep" }, parent);
  }

  function niceTicks(lo, hi, count) {
    const span = hi - lo;
    if (!(span > 0)) return [lo];
    const mag = 10 ** Math.floor(Math.log10(span / count));
    const step = [1, 2, 2.5, 5, 10].map((f) => f * mag).find((s) => span / s <= count) || 10 * mag;
    const out = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) out.push(Number(v.toFixed(10)));
    return out;
  }

  // ---------- replay (demo only) ----------
  function toggleReplay() {
    if (state.replayTimer) return stopReplay();
    source.replay.start();
    state.replayTimer = setInterval(() => {
      if (!source.replay.step()) stopReplay();
      else refresh();
    }, REPLAY_STEP_MS);
    refresh();
  }
  function stopReplay() {
    clearInterval(state.replayTimer);
    state.replayTimer = null;
    source.replay.stop();
    refresh();
  }

  // ---------- wiring ----------
  function initTheme() {
    const html = document.documentElement;
    try {
      const saved = localStorage.getItem("obl-theme");
      if (saved) html.dataset.theme = saved;
    } catch (e) { /* storage blocked: follow the OS theme */ }
    $("#theme").addEventListener("click", () => {
      const dark = html.dataset.theme ? html.dataset.theme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
      html.dataset.theme = dark ? "light" : "dark";
      try { localStorage.setItem("obl-theme", html.dataset.theme); } catch (e) { /* ignore */ }
    });
  }

  function syncRangeButtons() {
    document.querySelectorAll("[data-range]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.range === state.range)));
  }

  function init() {
    initTheme();
    syncRangeButtons();

    document.querySelectorAll(".board-tools [data-side]").forEach((b) => b.addEventListener("click", () => {
      state.side = b.dataset.side;
      state.query = "";
      $("#search").value = "";
      renderBoard();
    }));
    $("#search").addEventListener("input", (e) => { state.query = e.target.value; renderBoard(); });
    $("#show-choppy").addEventListener("change", (e) => { state.showChoppy = e.target.checked; renderBoard(); });
    document.querySelectorAll("[data-range]").forEach((b) => b.addEventListener("click", () => {
      state.range = b.dataset.range;
      syncRangeButtons();
      renderChart();
    }));

    const tbody = $("#board tbody");
    tbody.addEventListener("click", (e) => {
      const tr = e.target.closest("tr[data-sym]");
      if (tr) select(tr.dataset.sym, true);
    });
    tbody.addEventListener("keydown", (e) => {
      const tr = e.target.closest("tr[data-sym]");
      if (!tr) return;
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(tr.dataset.sym, true); }
      if (e.key === "ArrowDown" && tr.nextElementSibling) { e.preventDefault(); tr.nextElementSibling.focus(); }
      if (e.key === "ArrowUp" && tr.previousElementSibling) { e.preventDefault(); tr.previousElementSibling.focus(); }
    });

    const chartBox = $("#chart");
    chartBox.addEventListener("keydown", (e) => {
      const k = state.chartKeys;
      if (!k) return;
      if (e.key === "Escape") return k.hide();
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      const cur = state.cursor == null ? k.end : state.cursor + (e.key === "ArrowLeft" ? -1 : 1);
      const i = Math.max(k.start, Math.min(k.end, cur));
      const rect = k.root.getBoundingClientRect();
      const y = k.Y(state.chart.candles[i].c);
      k.show(i, y, rect.left + k.X(i), rect.top + y);
    });
    chartBox.addEventListener("blur", () => state.chartKeys && state.chartKeys.hide());

    if (source.replay) {
      const btn = $("#replay");
      btn.hidden = false;
      btn.addEventListener("click", toggleReplay);
    }

    let lastWidth = 0, raf = 0;
    new ResizeObserver(() => {
      const w = document.querySelector(".layout").clientWidth;
      if (w === lastWidth) return;
      lastWidth = w;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { renderPulse(); renderChart(); });
    }).observe(document.querySelector(".layout"));

    refresh();
    setInterval(() => { if (!state.replayTimer) refresh(); }, REFRESH_MS);
  }

  init();
})();
