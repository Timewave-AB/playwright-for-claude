# playwright-for-claude

Headless, containerised Playwright renderer for scraping JS/SPA pages that plain
HTTP fetchers (no JS execution) can't read. Stateless per call, so it parallelises
and runs unattended on headless servers.

## Why
Tools that fetch raw HTML see an empty SPA shell. This renders the page in real
Chromium and emits the resulting text/HTML, so client-rendered docs, dashboards,
and OpenAPI viewers become readable/greppable.

## Use
```bash
./pw <url> [options]
```
First run builds the image (downloads Chromium, a few minutes); later runs are fast.
Output goes to stdout; redirect or pipe as usual. Force a rebuild with `PW_REBUILD=1 ./pw ...`.

### Options
| flag | meaning |
|---|---|
| `--text` | visible text (`innerText`) — **default** |
| `--html` | full rendered HTML (includes hidden nodes) |
| `--selector <css>` | restrict `--text`/`--html` to the first match |
| `--eval <js>` | run JS in the page, print the (JSON) result |
| `--wait <strategy>` | `load` \| `domcontentloaded` \| `networkidle` (default) \| `commit` |
| `--wait-selector <css>` | wait for a selector before extracting |
| `--expand-details` | open all `<details>` before extracting (good for doc portals) |
| `--timeout <ms>` | nav/selector timeout (default 30000) |
| `--screenshot <file>` | full-page PNG; relative paths land in the **current dir** |
| `--user-agent <ua>` | override User-Agent |

### Examples
```bash
# Read a client-rendered docs page
./pw https://developer.aritma.com/apis/bankservice/ --expand-details > docs.txt

# Grep an OpenAPI viewer for an enum
./pw https://example.com/api --html | grep -i cren

# Extract one region
./pw https://example.com --selector "main" --text

# Pull structured data with custom JS
./pw https://example.com --eval "[...document.querySelectorAll('h2')].map(h=>h.textContent)"

# Screenshot (lands in $PWD)
./pw https://example.com --screenshot shot.png
```

### Parallel / automation
Each invocation is an isolated `--rm` container, so just launch several at once:
```bash
./pw "$URL1" --text > a.txt &
./pw "$URL2" --text > b.txt &
wait
```
No display/X server needed — Chromium runs headless with
`--no-sandbox --disable-dev-shm-usage` (set in `render.js`), suitable for CI and
headless servers. Only Docker + network egress are required.

## Files
- `Dockerfile` — Node + Playwright + Chromium (browser build matched to the npm version).
- `render.js` — the CLI renderer.
- `pw` — wrapper: builds on first use, runs a stateless container, mounts `$PWD` to `/work`.

## Maintenance
Bump Playwright in `package.json`, then `PW_REBUILD=1 ./pw <url>` (or `docker build -t playwright-for-claude .`).
