#!/usr/bin/env node
// Capture FB reel/video page via Playwright and save the first discovered MP4 URL
// into data/video-cache.json keyed by the original page URL.

import fs from 'fs/promises';
import { chromium } from 'playwright';

const url = process.argv[2];
if (!url) {
  console.error('Usage: node scripts/capture-playwright.js <facebook-url>');
  process.exit(1);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const videoHits = new Set();

  page.on('response', async (res) => {
    try {
      const u = res.url();
      const ctype = (res.headers()['content-type'] || '').toLowerCase();
      if (u.match(/\.mp4(\?|$)/i) || ctype.startsWith('video/')) {
        videoHits.add(u);
      }
    } catch (e) {
      // ignore
    }
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(4000);
  } catch (e) {
    console.error('Navigation error', e && e.message ? e.message : e);
  }

  // try a little longer to let the player fetch
  await page.waitForTimeout(3000);

  const vids = Array.from(videoHits);
  let chosen = null;
  if (vids.length > 0) {
    chosen = vids.find(u => /\.mp4/i.test(u)) || vids[0];
  }

  if (chosen) {
    try {
      const u = new URL(chosen);
      u.searchParams.delete('bytestart');
      u.searchParams.delete('byteend');
      const clean = u.toString();
      await fs.mkdir('data', { recursive: true });
      let cache = {};
      try { cache = JSON.parse(await fs.readFile('data/video-cache.json', 'utf8') || '{}'); } catch {}
      cache[url] = clean;
      await fs.writeFile('data/video-cache.json', JSON.stringify(cache, null, 2), 'utf8');
      console.log('Captured:', clean);
    } catch (e) {
      console.error('Saving error', e && e.message ? e.message : e);
    }
  } else {
    console.log('No video requests observed.');
  }

  await browser.close();
})();
