// Board scores for one stock. Input is a raw quote row (the shape both the demo generator and
// the Kotak-backed API return); output adds strength, OI buildup and the liquidity score.
(function (root) {
  "use strict";

  const CHOPPY_STRENGTH = 0.5; // moves under half a normal day's range count as noise

  // What price and open interest did together since yesterday.
  function buildup(chg, oiChg) {
    if (Math.abs(oiChg) < 0.005) return "Flat OI";
    if (chg >= 0) return oiChg > 0 ? "Long buildup" : "Short covering";
    return oiChg > 0 ? "Short buildup" : "Long unwinding";
  }

  // q: {sym, ltp, prevClose, high, low, vwap, volume, avgVolSoFar, oi, prevOi, atr}
  function enrich(q) {
    const chg = q.ltp - q.prevClose;
    const strength = chg / q.atr;
    const oiChg = q.prevOi ? (q.oi - q.prevOi) / q.prevOi : 0;
    const dir = Math.sign(strength);
    const dayRange = q.high - q.low;
    const rangePos = dayRange > 0 ? (q.ltp - q.low) / dayRange : 0.5;
    const volRatio = q.avgVolSoFar ? q.volume / q.avgVolSoFar : 1;
    const aboveVwap = q.ltp >= q.vwap;
    const kind = buildup(chg, oiChg);
    const choppy = Math.abs(strength) < CHOPPY_STRENGTH || (dir > 0 && !aboveVwap) || (dir < 0 && aboveVwap);

    let score = 0;
    if (!choppy) {
      const confirms = kind === (dir > 0 ? "Long buildup" : "Short buildup");
      const covering = kind === (dir > 0 ? "Short covering" : "Long unwinding");
      score = Math.min(Math.abs(strength) / 3.5, 1) * 40
        + (confirms ? 25 : covering ? 10 : 0)
        + (dir > 0 ? rangePos : 1 - rangePos) * 20
        + Math.min(volRatio / 2, 1) * 15;
    }

    return {
      ...q, chg, chgPct: chg / q.prevClose, strength, oiChg, rangePos, volRatio, aboveVwap,
      buildup: kind, choppy, score: Math.round(score),
    };
  }

  const Scores = { CHOPPY_STRENGTH, buildup, enrich };
  root.OBL = Object.assign(root.OBL || {}, { Scores });
  if (typeof module !== "undefined") module.exports = Scores;
})(typeof window !== "undefined" ? window : globalThis);
