// Price-structure maths for the chart: sessions, ATR, VWAP, swing points, order blocks and
// liquidity levels. Pure functions over candles {t, o, h, l, c, v} (t = epoch ms). No DOM.
(function (root) {
  "use strict";

  const IST_OFFSET_MS = 5.5 * 3600 * 1000;
  const istDay = (t) => new Date(t + IST_OFFSET_MS).toISOString().slice(0, 10);

  // Index ranges [{day, start, end}], one per trading session.
  function sessions(candles) {
    const out = [];
    candles.forEach((k, i) => {
      const day = istDay(k.t);
      const last = out[out.length - 1];
      if (last && last.day === day) last.end = i;
      else out.push({ day, start: i, end: i });
    });
    return out;
  }

  // Wilder's average true range, aligned with the candles.
  function atr(candles, n = 14) {
    const out = [];
    let avg = 0;
    candles.forEach((k, i) => {
      const pc = i ? candles[i - 1].c : k.c;
      const tr = Math.max(k.h - k.l, Math.abs(k.h - pc), Math.abs(k.l - pc));
      avg = i < n ? (avg * i + tr) / (i + 1) : (avg * (n - 1) + tr) / n;
      out.push(avg);
    });
    return out;
  }

  // Volume-weighted average price, reset at the start of each session.
  function vwap(candles) {
    const out = [];
    let pv = 0, vol = 0, day = null;
    for (const k of candles) {
      const d = istDay(k.t);
      if (d !== day) { day = d; pv = 0; vol = 0; }
      pv += ((k.h + k.l + k.c) / 3) * k.v;
      vol += k.v;
      out.push(vol ? pv / vol : k.c);
    }
    return out;
  }

  // Fractal swing points: a high (low) with `w` lower highs (higher lows) on each side.
  // A swing is only known `w` candles later, so each one carries the index it is confirmed at.
  function swings(candles, w = 2) {
    const highs = [], lows = [];
    for (let i = w; i < candles.length - w; i++) {
      let isHigh = true, isLow = true;
      for (let j = 1; j <= w; j++) {
        if (candles[i - j].h >= candles[i].h || candles[i + j].h > candles[i].h) isHigh = false;
        if (candles[i - j].l <= candles[i].l || candles[i + j].l < candles[i].l) isLow = false;
      }
      if (isHigh) highs.push({ i, price: candles[i].h, confirmedAt: i + w });
      if (isLow) lows.push({ i, price: candles[i].l, confirmedAt: i + w });
    }
    return { highs, lows };
  }

  // Order block: the last opposite-colour candle before a displacement leg that breaks
  // structure. Bullish = a green candle closes above the latest confirmed swing high and the
  // leg from the block candle's low to that close covers at least `minLegAtr` ATRs.
  // The zone is the block candle's full range. Status: fresh (untouched), tested (price came
  // back into it), broken (a candle closed through it).
  function orderBlocks(candles, { minLegAtr = 2, lookback = 8, swingWidth = 2 } = {}) {
    const a = atr(candles);
    const { highs, lows } = swings(candles, swingWidth);
    const blocks = [];
    let swingHigh = null, swingLow = null, hi = 0, lo = 0;

    for (let i = 0; i < candles.length; i++) {
      while (hi < highs.length && highs[hi].confirmedAt <= i) swingHigh = highs[hi++];
      while (lo < lows.length && lows[lo].confirmedAt <= i) swingLow = lows[lo++];
      const k = candles[i];

      if (swingHigh && k.c > k.o && k.c > swingHigh.price) {
        const j = lastMatching(candles, i, lookback, (x) => x.c < x.o);
        if (j >= 0 && k.c - candles[j].l >= minLegAtr * a[i]) blocks.push(block("bull", candles, j, i));
        swingHigh = null;
      }
      if (swingLow && k.c < k.o && k.c < swingLow.price) {
        const j = lastMatching(candles, i, lookback, (x) => x.c > x.o);
        if (j >= 0 && candles[j].h - k.c >= minLegAtr * a[i]) blocks.push(block("bear", candles, j, i));
        swingLow = null;
      }
    }

    for (const b of blocks) {
      for (let i = b.confirmedAt + 1; i < candles.length; i++) {
        const k = candles[i];
        if (b.testedAt == null && (b.side === "bull" ? k.l <= b.top : k.h >= b.bottom)) b.testedAt = i;
        if (b.side === "bull" ? k.c < b.bottom : k.c > b.top) { b.brokenAt = i; break; }
      }
      b.status = b.brokenAt != null ? "broken" : b.testedAt != null ? "tested" : "fresh";
    }
    return blocks;
  }

  function lastMatching(candles, i, lookback, test) {
    for (let j = i - 1; j >= Math.max(0, i - lookback); j--) if (test(candles[j])) return j;
    return -1;
  }

  function block(side, candles, j, i) {
    return { side, top: candles[j].h, bottom: candles[j].l, from: j, confirmedAt: i, testedAt: null, brokenAt: null };
  }

  // Resting liquidity, where stop orders tend to cluster: previous-day high/low, the opening
  // range, and equal highs/lows (two swing points within `tolAtr` ATRs, nothing traded beyond
  // them in between). A level is "swept" when price trades through it but closes back, and
  // "taken" once a candle closes beyond it.
  function liquidity(candles, { orBars = 3, tolAtr = 0.3, maxEqual = 2 } = {}) {
    const days = sessions(candles);
    const today = days[days.length - 1];
    const prev = days[days.length - 2];
    const a = atr(candles);
    const levels = [];
    if (!today) return levels;

    if (prev) {
      const r = range(candles, prev.start, prev.end);
      levels.push({ kind: "PDH", side: "high", price: r.h, from: prev.start, watchFrom: today.start });
      levels.push({ kind: "PDL", side: "low", price: r.l, from: prev.start, watchFrom: today.start });
    }
    if (today.end - today.start + 1 >= orBars) {
      const r = range(candles, today.start, today.start + orBars - 1);
      levels.push({ kind: "ORH", side: "high", price: r.h, from: today.start, watchFrom: today.start + orBars });
      levels.push({ kind: "ORL", side: "low", price: r.l, from: today.start, watchFrom: today.start + orBars });
    }

    const { highs, lows } = swings(candles);
    levels.push(...equalLevels(candles, highs, "EQH", "high", a, tolAtr, maxEqual));
    levels.push(...equalLevels(candles, lows, "EQL", "low", a, tolAtr, maxEqual));

    for (const lv of levels) {
      lv.sweptAt = null;
      lv.takenAt = null;
      for (let i = lv.watchFrom; i < candles.length; i++) {
        const k = candles[i];
        if (lv.side === "high" ? k.h <= lv.price : k.l >= lv.price) continue;
        if (lv.side === "high" ? k.c > lv.price : k.c < lv.price) { lv.takenAt = i; break; }
        if (lv.sweptAt == null) lv.sweptAt = i;
      }
      lv.status = lv.takenAt != null ? "taken" : lv.sweptAt != null ? "swept" : "intact";
    }
    return levels;
  }

  function range(candles, s, e) {
    let h = -Infinity, l = Infinity;
    for (let i = s; i <= e; i++) { h = Math.max(h, candles[i].h); l = Math.min(l, candles[i].l); }
    return { h, l };
  }

  // The most recent pairs of swing points that sit within tolerance of each other.
  function equalLevels(candles, points, kind, side, a, tolAtr, max) {
    const out = [];
    for (let j = points.length - 1; j > 0 && out.length < max; j--) {
      const pj = points[j], tol = tolAtr * a[pj.i];
      for (let i = j - 1; i >= 0 && pj.i - points[i].i <= 60; i--) {
        const pi = points[i];
        if (Math.abs(pj.price - pi.price) > tol) continue;
        const price = side === "high" ? Math.max(pi.price, pj.price) : Math.min(pi.price, pj.price);
        const between = range(candles, pi.i + 1, pj.i - 1);
        const clean = side === "high" ? between.h <= price : between.l >= price;
        if (clean && !out.some((l) => Math.abs(l.price - price) <= tol)) {
          out.push({ kind, side, price, from: pi.i, watchFrom: pj.confirmedAt, pair: [pi.i, pj.i] });
        }
        break;
      }
    }
    return out;
  }

  const Levels = { istDay, sessions, atr, vwap, swings, orderBlocks, liquidity };
  root.OBL = Object.assign(root.OBL || {}, { Levels });
  if (typeof module !== "undefined") module.exports = Levels;
})(typeof window !== "undefined" ? window : globalThis);
