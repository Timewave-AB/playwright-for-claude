#!/usr/bin/env node
'use strict';

// Render a JS/SPA page headlessly and emit its content. See README.md.
const { chromium } = require('playwright');

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        args[key] = true;
      } else {
        args[key] = next;
        i++;
      }
    } else {
      args._.push(a);
    }
  }
  return args;
}

const USAGE = `Usage: render <url> [options]
  --text                 Output visible text (innerText). Default.
  --html                 Output rendered HTML (full DOM, incl. hidden nodes).
  --selector <css>       Restrict --text/--html to the first matching element.
  --eval <js>            Evaluate JS in the page; print the (JSON) result.
  --wait <strategy>      load | domcontentloaded | networkidle (default) | commit
  --wait-selector <css>  Wait for this selector before extracting.
  --expand-details       Open all <details> elements before extracting.
  --timeout <ms>         Navigation/selector timeout (default 30000).
  --screenshot <file>    Save a full-page PNG (relative paths land in the mounted dir).
  --user-agent <ua>      Override the User-Agent.`;

(async () => {
  const args = parseArgs(process.argv.slice(2));
  const url = typeof args.url === 'string' ? args.url : args._[0];
  if (!url) {
    console.error(USAGE);
    process.exit(2);
  }

  const timeout = parseInt(args.timeout, 10) || 30000;
  const waitUntil = ['load', 'domcontentloaded', 'networkidle', 'commit'].includes(args.wait)
    ? args.wait
    : 'networkidle';

  // --no-sandbox / --disable-dev-shm-usage are required to run Chromium as root in a container.
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  let exitCode = 0;
  try {
    const context = await browser.newContext(
      typeof args['user-agent'] === 'string' ? { userAgent: args['user-agent'] } : {}
    );
    const page = await context.newPage();
    await page.goto(url, { waitUntil, timeout });

    if (typeof args['wait-selector'] === 'string') {
      await page.waitForSelector(args['wait-selector'], { timeout });
    }
    if (args['expand-details']) {
      await page.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)));
      await page.waitForTimeout(200);
    }
    if (typeof args.screenshot === 'string') {
      await page.screenshot({ path: args.screenshot, fullPage: true });
    }

    if (typeof args.eval === 'string') {
      const result = await page.evaluate(args.eval);
      process.stdout.write((typeof result === 'string' ? result : JSON.stringify(result, null, 2)) + '\n');
    } else if (args.html) {
      const html = typeof args.selector === 'string'
        ? await page.$eval(args.selector, (el) => el.outerHTML).catch(() => '')
        : await page.content();
      process.stdout.write(html + '\n');
    } else if (!args.screenshot || typeof args.selector === 'string' || args.text) {
      const selector = typeof args.selector === 'string' ? args.selector : 'body';
      const text = await page.$eval(selector, (el) => el.innerText).catch(() => '');
      process.stdout.write(text + '\n');
    }
  } catch (err) {
    console.error('render error:', err && err.message ? err.message : String(err));
    exitCode = 1;
  } finally {
    await browser.close();
  }
  process.exit(exitCode);
})();
