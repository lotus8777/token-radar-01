# token-radar-01

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/lotus8777/token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/lotus8777/token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A token launch radar: it reads a frozen DefiLlama snapshot, ranks the 198 pre-token protocols that could plausibly launch a token of their own by an implied value built from TVL, seven-day growth, time with no token and chain breadth, and gives each one a six-step farm plan with costs and times. The dashboard is sortable and filterable, with a detail view per protocol and a separate view of the protocols whose token already trades.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot.json>
```

Then open `out/dashboard/index.html` (served over HTTP, e.g. `node --run` a static server on `out/`). The program needs Node 22.18 or later and the sealed snapshot at `/input/snapshot.json` (or `--input <snapshot.json|directory>`); it writes `board.json`, `data.js`, `dashboard/`, `screenshots/` and `dossier.json` into the output directory.

---

<sub>Entered on [make.fun](https://make.fun/?ref=gvm444ds&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
