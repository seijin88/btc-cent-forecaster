// btc-cent-forecast-01 — make.fun BTC cent forecast competition.
//
// The house baseline guesses persistence: the checkpoint's last close, unchanged. The target is
// scored by mean absolute error, so the best single number is an estimate of the conditional median
// of the price 240 minutes ahead, and persistence is the starting point for it. The recorded pool
// price drifts slightly back toward its recent mean, so the forecast adds a small 6.5% share of the
// gap between the last close and the mean of the last 1440 closes (24 hours), which nudges the guess
// toward the centre of the local distribution; the share is kept small so a trending market, where
// reversion fails, costs little.
//
// Any case that cannot be read as expected is forecast at 1.0 rather than skipped or malformed,
// because a single invalid entry forfeits the whole prize.

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const INPUT_DIR = process.env.MAKEFUN_INPUT_DIR || '/input';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR || '/output';

const LOOKBACK_MINUTES = 1440;   // 24 hours of one-minute closes
const REVERSION_WEIGHT = 0.065;  // share of the 24-hour gap added to the last close
const MIN_PRICE = 0.00001;       // the price grid the answer lives on
const MAX_PRICE = 9999999.99999;
const FALLBACK_PRICE = 1.0;      // written for any case that cannot be read

// Put a number on the price grid: clamp to the allowed range, then round to five decimals.
function toPrice(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return FALLBACK_PRICE;
  const clamped = Math.min(MAX_PRICE, Math.max(MIN_PRICE, value));
  const rounded = Number(clamped.toFixed(5));
  return Number.isFinite(rounded) ? rounded : FALLBACK_PRICE;
}

// One finished forecast row for one case: read <caseId>.in, parse it, apply every guard, and fall
// back to the price 1.0 whenever the case cannot be read as expected.
function buildRow(caseId) {
  const fallback = { case: caseId, price: FALLBACK_PRICE };

  let text;
  try {
    text = fs.readFileSync(path.join(INPUT_DIR, caseId + '.in'), 'utf8');
  } catch {
    return fallback;
  }

  let doc;
  try {
    doc = JSON.parse(text);
  } catch {
    return fallback;
  }

  const markets = doc && Array.isArray(doc.markets) ? doc.markets : null;
  if (!markets || markets.length === 0) return fallback;

  const market = markets[0];
  const prices = market && Array.isArray(market.prices) ? market.prices : null;
  if (!prices || prices.length === 0) return fallback;

  const last = prices[prices.length - 1];
  if (typeof last !== 'number' || !Number.isFinite(last)) return fallback;

  let guess = last;
  if (prices.length >= LOOKBACK_MINUTES) {
    let sum = 0;
    let complete = true;
    for (let i = prices.length - LOOKBACK_MINUTES; i < prices.length; i += 1) {
      const price = prices[i];
      if (typeof price !== 'number' || !Number.isFinite(price)) {
        complete = false;
        break;
      }
      sum += price;
    }
    if (complete) {
      const mean = sum / LOOKBACK_MINUTES;
      guess = last + REVERSION_WEIGHT * (mean - last);
    }
  }

  return { case: caseId, price: toPrice(guess) };
}

function main() {
  const files = fs
    .readdirSync(INPUT_DIR)
    .filter((name) => name.endsWith('.in'))
    .sort();

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const file of files) {
    const caseId = file.slice(0, -'.in'.length);
    const row = buildRow(caseId);
    const target = path.join(OUTPUT_DIR, caseId + '.out');
    fs.writeFileSync(target, JSON.stringify({ forecasts: [row] }) + '\n', 'utf8');
  }
}

main();