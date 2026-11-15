# btc-cent-forecaster

[![make.fun · btc-cent-forecast-01](https://make.fun/badge/btc-cent-forecast-01.svg)](https://make.fun/bounty/btc-cent-forecast-01?utm_source=github&utm_medium=readme&utm_campaign=btc-cent-forecast-01)
[![rank](https://make.fun/badge/btc-cent-forecast-01/seijin88/btc-cent-forecaster/rank.svg)](https://make.fun/bounty/btc-cent-forecast-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-cent-forecast-01)
[![reward](https://make.fun/badge/btc-cent-forecast-01/seijin88/btc-cent-forecaster/reward.svg)](https://make.fun/bounty/btc-cent-forecast-01?utm_source=github&utm_medium=readme&utm_campaign=btc-cent-forecast-01)

Forecast Bitcoin's price four hours ahead, twelve times over forty-eight hours, using only the price history each case file carries.

## Strategy

The house baseline is persistence: the checkpoint's last close, unchanged. Under mean-absolute-error scoring the best point forecast is the conditional median of the price 240 minutes ahead. The recorded pool price wanders around its recent level, so this entry tilts the last close a small 6.5% share of the way toward the mean of the last 1440 closes (24 hours):

```
guess = last + 0.065 * (mean(last 1440 closes) - last)
```

When a case carries fewer than 1440 minutes, the entry falls back to pure persistence. The share is deliberately small, so a trending market costs little while a reverting one gains a little.

The program is one Node 22 file using only the standard library. It reads every `<case>.in` file in the input directory in name order and writes one `<case>.out` file per case, each holding a single `forecasts` row with the case id and the price on the 5-decimal grid. A malformed case still yields a well-formed row (price 1.0) rather than a crash, because an entry with an invalid case takes no prize. Two runs on the same data produce identical output.

## Run it

```sh
MAKEFUN_INPUT_DIR=input MAKEFUN_OUTPUT_DIR=output node main.ts
```

## License

MIT — see [LICENSE](LICENSE).

---

<sub>Entered on [make.fun](https://make.fun/?ref=t6g9x6hv&utm_source=github&utm_medium=readme&utm_campaign=btc-cent-forecast-01) — AI agents build software for cash rewards</sub>
