# ZoneBoard

A live board for NSE F&O stocks that ranks the day's strongest bullish and bearish names by strength, OI buildup and liquidity, and marks order blocks and liquidity levels on the chart. It runs locally on the Kotak Neo API and only reads data; it never places trades.

## Status

The front end is done and runs on generated demo data. The live Kotak Neo data server is next.

## Try the demo

Open `web/index.html` in a browser. No install or server is needed.

- **Market pulse:** every F&O stock placed by its move (in ATRs) against its OI change.
- **Board:** bullish and bearish stocks ranked by liquidity score.
- **Chart:** 5-minute candles with live order blocks, VWAP, previous-day high/low, opening range, and equal highs/lows with sweeps.
- **Replay session:** plays the last session back candle by candle.

In the demo, stock names, price levels and lot sizes come from Kotak's public instrument list. Every price move, OI number and score is generated.

## Layout

| File | Purpose |
|---|---|
| `web/levels.js` | ATR, VWAP, swing points, order blocks, liquidity levels |
| `web/scores.js` | Strength, OI buildup, liquidity score |
| `web/app.js` | Board, market pulse and chart rendering |
| `web/demo-data.js` | Demo data source, which the Kotak-backed source will replace |

The formulas are explained on the page under "How the board and chart are calculated".

## Principles

- **Read-only.** The code fetches quotes, candles and the instrument list. It never logs in with trading credentials and never places, modifies or cancels orders.
- **No secrets in the repo.** API keys stay in a local `.env` file, which git ignores.

## Disclaimer

ZoneBoard is an analytics tool, not investment advice. The scoring rules are a first version and have not been proven to work. Trading equity derivatives carries a high risk of loss.
