// make.fun competition "btc-cent-forecast-01" point forecaster.
// Under mean-absolute-error scoring the best point forecast is the conditional median of the price
// four hours ahead; the house baseline is persistence (the checkpoint's last close unchanged), and the
// recorded pool price drifts slightly back toward its recent mean, so pulling the last price a small
// fraction (0.065) of the gap to its 24-hour mean adds a tiny expected improvement. Keeping that
// fraction small limits the damage when the market trends instead of reverting. If a case file cannot
// be read as expected (bad JSON, a missing or empty markets array, an empty prices array, or a last
// price that is not a finite number), the program still writes a well-formed row with price 1.0 so an
// entry with any invalid case is not disqualified.

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const inputDir = process.env.MAKEFUN_INPUT_DIR ?? "/input";
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

const PRICE_MIN = 0.00001;
const PRICE_MAX = 9999999.99999;
const GRID = 1e5;
const MEAN_WINDOW = 1440;
const MEAN_WEIGHT = 0.065;
const FALLBACK_PRICE = 1.0;

interface CaseMarket {
  prices?: unknown;
}

interface CaseFile {
  markets?: CaseMarket[];
}

function roundToGrid(value: number): number {
  const clamped = Math.min(PRICE_MAX, Math.max(PRICE_MIN, value));
  return Math.round(clamped * GRID) / GRID;
}

function forecastForCase(raw: string): number {
  let parsed: CaseFile;
  try {
    parsed = JSON.parse(raw) as CaseFile;
  } catch {
    return FALLBACK_PRICE;
  }

  const markets = parsed?.markets;
  if (!Array.isArray(markets) || markets.length === 0) {
    return FALLBACK_PRICE;
  }

  const prices = markets[0]?.prices;
  if (!Array.isArray(prices) || prices.length === 0) {
    return FALLBACK_PRICE;
  }

  const last = prices[prices.length - 1];
  if (typeof last !== "number" || !Number.isFinite(last)) {
    return FALLBACK_PRICE;
  }

  let guess = last;
  if (prices.length >= MEAN_WINDOW) {
    let sum = 0;
    let count = 0;
    for (let i = prices.length - MEAN_WINDOW; i < prices.length; i++) {
      const value = prices[i];
      if (typeof value === "number" && Number.isFinite(value)) {
        sum += value;
        count++;
      }
    }
    if (count > 0) {
      const mean = sum / count;
      guess = last + MEAN_WEIGHT * (mean - last);
    }
  }

  return roundToGrid(guess);
}

function main(): void {
  const names = readdirSync(inputDir)
    .filter((name) => name.endsWith(".in"))
    .sort();

  mkdirSync(outputDir, { recursive: true });

  for (const name of names) {
    let price = FALLBACK_PRICE;
    try {
      price = forecastForCase(readFileSync(join(inputDir, name), "utf8"));
    } catch {
      price = FALLBACK_PRICE;
    }

    const caseId = name.slice(0, -".in".length);
    const output = { forecasts: [{ case: caseId, price }] };
    const outName = caseId + ".out";
    writeFileSync(join(outputDir, outName), JSON.stringify(output) + "\n", "utf8");
  }
}

main();