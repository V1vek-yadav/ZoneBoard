// Demo market data in the same shape the Kotak-backed API will return, so app.js can switch
// sources without changes. Generated from fixed seeds: the same numbers on every load.
(function (root) {
  "use strict";

  // symbol:previous close (₹):lot size for the 213 NSE F&O stocks, from Kotak's public scrip
  // master (24 Oct 2026). Only the names, price levels and lot sizes are real.
  const UNIVERSE = "360ONE:996.8:500,ABB:6133.5:125,ABCAPITAL:346.5:3100,ADANIENSOL:1214:675,ADANIENT:2487.7:309,ADANIGREEN:1183.8:600,ADANIPORTS:1707:475,ADANIPOWER:181.78:3550,ALKEM:4926:125,AMBER:6023:100,AMBUJACEM:362.45:1200,ANANDRATHI:2232.9:250,ANGELONE:278.85:2500,APLAPOLLO:2029.3:350,APOLLOHOSP:7699.5:125,ASHOKLEY:145.1:5000,ASIANPAINT:2293.3:250,ASTRAL:1356.7:425,ATHERENERG:1384.7:375,AUBANK:932.5:1000,AUROPHARMA:1564.7:550,AXISBANK:1213.5:625,BAJAJ-AUTO:10080:75,BAJAJFINSV:1652.4:300,BAJAJHLDNG:11153:75,BAJFINANCE:923.85:750,BANDHANBNK:149.92:3600,BANKBARODA:230.44:2925,BANKINDIA:131.38:5200,BDL:1018.1:425,BEL:358.75:1425,BHARATFORG:1705.2:500,BHARTIARTL:1883.5:475,BHEL:387.2:2625,BIOCON:322.95:2500,BLUESTARCO:1502.7:325,BOSCHLTD:44255:25,BPCL:280.5:1975,BRITANNIA:4538.6:125,BSE:3227:200,CAMS:651.4:825,CANBK:115.99:6750,CDSL:1187.6:475,CGPOWER:812.55:850,CHOLAFIN:1462:625,CIPLA:1327.5:425,COALINDIA:397:1350,COCHINSHIP:1140.8:400,COFORGE:1894.5:475,COLPAL:1607.2:275,CONCOR:408.5:1250,CROMPTON:194.77:2150,CUMMINSIND:4327.4:200,DABUR:360:1250,DELHIVERY:368.95:2075,DIVISLAB:8903.5:100,DIXON:11194:50,DLF:656.2:950,DMART:3157.8:150,DRREDDY:1230.8:625,EICHERMOT:7002.5:100,ENRIN:2645.4:175,ETERNAL:316.35:2425,FEDERALBNK:340.8:2500,FORCEMOT:16375:25,FORTIS:711.4:775,GAIL:163.49:3550,GLENMARK:2137.6:375,GMRAIRPORT:85.49:6975,GODFRYPHLP:1665.9:275,GODREJCP:846.15:500,GODREJPROP:1492.5:325,GRASIM:2891.7:250,GVT&D:3682.3:125,HAL:4734.2:150,HAVELLS:1028.8:500,HCLTECH:1415.8:400,HDFCAMC:2239.3:300,HDFCBANK:691.65:650,HDFCLIFE:520.8:1100,HEROMOTOCO:5058:150,HINDALCO:868.5:700,HINDPETRO:336.45:2025,HINDUNILVR:1802.5:300,HINDZINC:496.7:1225,HYUNDAI:1858.4:275,ICICIBANK:1389.7:700,ICICIGI:1592.2:325,ICICILIFE:420.45:925,IDEA:11.36:71475,IDFCFIRSTB:72.26:9275,IEX:100.96:4350,INDHOTEL:773.75:1000,INDIANB:836.1:1000,INDIGO:4521.2:150,INDUSINDBK:833.5:700,INDUSTOWER:380.15:1700,INFY:1146.65:400,INOXWIND:58.98:6400,IOC:128.12:4875,IREDA:100.57:4525,IRFC:74.37:5425,ITC:257.35:1725,JINDALSTEL:1014.2:625,JIOFIN:204.61:2350,JSWENERGY:447.2:1075,JSWSTEEL:1184.4:675,JUBLFOOD:403.55:1250,KALYANKJIL:511:1350,KAYNES:3230.9:150,KEI:3720.6:175,KFINTECH:798.2:575,KOTAKBANK:430.15:2000,KPITTECH:532.85:775,LAURUSLABS:1967.6:850,LICHSGFIN:492.35:1000,LICI:381.2:1400,LODHA:958.4:625,LT:3641.6:175,LTF:237.15:2250,LTM:4127.8:150,LUPIN:1921.2:425,M&M:2840.4:200,MAHABANK:75.43:6500,MANAPPURAM:285.6:3000,MANKIND:2214:250,MARICO:763.45:1200,MARUTI:11230:50,MAXHEALTH:816.05:525,MAZDOCK:1857.2:225,MCX:3020.2:225,MFSL:1211:400,MOTHERSON:149.92:6150,MOTILALOFS:926.55:775,MPHASIS:2481.4:275,MUTHOOTFIN:2365.6:275,NAM-INDIA:922.2:625,NATIONALUM:300.6:1875,NAUKRI:1182.8:550,NBCC:67.92:6500,NESTLEIND:1165.4:500,NHPC:69.57:6950,NMDC:66.31:6750,NTPC:296.55:1500,NYKAA:319.15:3125,OBEROIRLTY:1583.6:350,OFSS:9662:100,OIL:447.65:1400,ONGC:225.76:2250,PAGEIND:33860:20,PATANJALI:349.25:1075,PAYTM:1608:725,PERSISTENT:5709:125,PETRONET:286.55:1900,PFC:315.65:1300,PGEL:468.65:950,PHOENIXLTD:1863.3:350,PIDILITIND:1479:500,PIIND:2046.7:175,PNB:119.47:8000,PNBHOUSING:1094.1:650,POLICYBZR:1017.1:350,POLYCAB:7432:125,POWERGRID:246.35:1900,POWERINDIA:26245:25,PREMIERENE:853.6:650,PRESTIGE:1393.5:450,RADICO:4157.2:150,RBLBANK:346.25:3175,RECLTD:293.4:1575,RELIANCE:1187:500,RVNL:182.24:1925,SAGILITY:43.93:12000,SAIL:163.08:4700,SBICARD:546.15:800,SBILIFE:1627.1:375,SBIN:956.8:750,SHREECEM:22865:25,SHRIRAMFIN:862.7:825,SIEMENS:3243.2:175,SOLARINDS:18368:50,SONACOMS:756.35:1225,SRF:2311.6:200,SUNPHARMA:1745.4:350,SUPREMEIND:3382.4:175,SUZLON:37.42:12700,SWIGGY:177.25:1825,TATACONSUM:954.1:550,TATAELXSI:3721.6:125,TATAPOWER:344.9:1450,TATASTEEL:166.91:2750,TCS:2530.2:225,TECHM:1783.7:600,TIINDIA:2073.5:200,TITAN:4268.3:175,TMPV:263.5:1600,TORNTPHARM:4493.4:125,TRENT:2722.7:225,TVSMOTOR:3960.6:175,UJJIVANSFB:57.93:8000,ULTRACEMCO:10950:50,UNIONBANK:178.33:4425,UNITDSPR:1249.7:400,UNOMINDA:1054.6:550,UPL:507.55:1355,VBL:392.1:1275,VEDL:224.55:1150,VMM:86.38:4850,VOLTAS:948.8:375,WAAREEENER:2352.6:175,WIPRO:190.16:3000,YESBANK:15.73:31100,ZYDUSLIFE:1128.3:900";

  const SESSIONS = ["2026-10-21", "2026-10-22", "2026-10-23"];
  const BARS = 75;                    // 09:15–15:25 IST in 5-minute candles
  const BAR_MS = 5 * 60 * 1000;
  const REPLAY_FROM = 9;              // replay starts with the first 45 minutes done
  const BANKS = ["HDFCBANK", "ICICIBANK", "SBIN", "AXISBANK", "KOTAKBANK", "INDUSINDBK", "BANKBARODA", "PNB", "AUBANK", "FEDERALBNK", "IDFCFIRSTB", "CANBK"];

  function mulberry32(seed) {
    return function () {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  const gauss = (r) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
  const toTick = (p) => Math.round(p * 20) / 20;
  const sessionOpen = (day) => { const [y, m, d] = day.split("-").map(Number); return Date.UTC(y, m - 1, d, 3, 45); };

  // Three sessions of 5-minute candles. The last session gets the stock's "today" character:
  // a trend up, a trend down, or chop. Trend days carry occasional impulse candles, which is
  // what leaves order blocks behind.
  function makeStock(sym, refPrice, lot) {
    const r = mulberry32(hash(sym));
    const atr = refPrice * (0.012 + r() * 0.016);
    const u = r();
    const todayBias = u < 0.24 ? 0.6 + r() * 1.3 : u < 0.46 ? -(0.6 + r() * 1.3) : (r() - 0.5) * 0.9;
    const baseVol = lot * (30 + r() * 220);
    const sigma = (atr / Math.sqrt(BARS)) * 0.85;
    const candles = [];
    let price = refPrice * (1 + (r() - 0.5) * 0.04);

    SESSIONS.forEach((day, d) => {
      const bias = d === SESSIONS.length - 1 ? todayBias : (r() - 0.5) * 1.6;
      const t0 = sessionOpen(day);
      let o = toTick(price + gauss(r) * atr * 0.12 + bias * atr * 0.08);
      const dayOpen = o;
      for (let b = 0; b < BARS; b++) {
        let move = (bias * atr / BARS) * 1.8 * Math.exp(-b / 30) + gauss(r) * sigma;
        if (Math.abs(bias) < 0.5) move -= 0.04 * (o - dayOpen);
        if (r() < 0.025) move += Math.sign(bias || gauss(r)) * (1.6 + r() * 1.6) * sigma;
        const c = toTick(Math.max(o + move, 0.05));
        const h = toTick(Math.max(o, c) + Math.abs(gauss(r)) * sigma * 0.45);
        const l = toTick(Math.max(Math.min(o, c) - Math.abs(gauss(r)) * sigma * 0.45, 0.05));
        const profile = 0.75 + 1.1 * Math.exp(-b / 8) + 0.5 * Math.exp((b - BARS) / 10);
        const v = Math.round(baseVol * profile * (1 + (Math.abs(move) / sigma) * 0.35) * (0.7 + r() * 0.6));
        candles.push({ t: t0 + b * BAR_MS, o, h, l, c, v });
        o = c;
      }
      price = o;
    });

    const prevOi = Math.round(lot * (20000 + r() * 180000));
    const oiChg = Math.abs(todayBias) >= 0.6
      ? (r() < 0.7 ? 0.02 + r() * 0.1 : -(0.02 + r() * 0.06))
      : (r() - 0.5) * 0.06;
    return { sym, lot, atr, candles, prevOi, oiChg };
  }

  // A quote row as of `upto` candles into the last session.
  function quoteAt(s, upto) {
    const today = (SESSIONS.length - 1) * BARS;
    let high = -Infinity, low = Infinity, pv = 0, volume = 0;
    for (let i = today; i < today + upto; i++) {
      const k = s.candles[i];
      high = Math.max(high, k.h);
      low = Math.min(low, k.l);
      pv += ((k.h + k.l + k.c) / 3) * k.v;
      volume += k.v;
    }
    let pastVol = 0;
    for (let d = 0; d < SESSIONS.length - 1; d++) {
      for (let i = d * BARS; i < d * BARS + upto; i++) pastVol += s.candles[i].v;
    }
    const last = s.candles[today + upto - 1];
    return {
      sym: s.sym, lot: s.lot, atr: s.atr,
      ltp: last.c, prevClose: s.candles[today - 1].c, open: s.candles[today].o, high, low,
      vwap: pv / volume, volume, avgVolSoFar: pastVol / (SESSIONS.length - 1),
      oi: Math.round(s.prevOi * (1 + s.oiChg * Math.pow(upto / BARS, 0.7))), prevOi: s.prevOi,
      time: last.t + BAR_MS,
    };
  }

  function indexQuote(name, base, rows, beta) {
    const avg = rows.reduce((sum, q) => sum + (q.ltp - q.prevClose) / q.prevClose, 0) / rows.length;
    const chgPct = avg * beta;
    return { name, ltp: base * (1 + chgPct), chgPct };
  }

  const stocks = UNIVERSE.split(",").map((entry) => {
    const [sym, price, lot] = entry.split(":");
    return makeStock(sym, Number(price), Number(lot));
  });
  const bySym = new Map(stocks.map((s) => [s.sym, s]));
  let upto = BARS;
  let replaying = false;

  const lastSessionLabel = new Date(sessionOpen(SESSIONS[SESSIONS.length - 1]))
    .toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

  const DemoSource = {
    kind: "demo",
    barsPerDay: BARS,

    async board() {
      const rows = stocks.map((s) => quoteAt(s, upto));
      const asOf = rows[0].time;
      const clock = new Date(asOf).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });
      const market = replaying
        ? { state: "live", label: `Demo replay · ${clock} IST` }
        : { state: "closed", label: `Market closed · ${lastSessionLabel} close` };
      const banks = rows.filter((q) => BANKS.includes(q.sym));
      return {
        asOf,
        market,
        indices: [indexQuote("NIFTY 50", 25000, rows, 0.7), indexQuote("BANK NIFTY", 56000, banks, 0.9)],
        stocks: rows,
      };
    },

    async chart(sym) {
      const s = bySym.get(sym);
      const end = (SESSIONS.length - 1) * BARS + upto;
      return { sym, lot: s.lot, atr: s.atr, candles: s.candles.slice(0, end) };
    },

    // Replays the last session candle by candle so the board behaves like market hours.
    replay: {
      start() { upto = REPLAY_FROM; replaying = true; },
      step() { upto = Math.min(upto + 1, BARS); return upto < BARS; },
      stop() { upto = BARS; replaying = false; },
    },
  };

  root.OBL = Object.assign(root.OBL || {}, { DemoSource });
  if (typeof module !== "undefined") module.exports = DemoSource;
})(typeof window !== "undefined" ? window : globalThis);
