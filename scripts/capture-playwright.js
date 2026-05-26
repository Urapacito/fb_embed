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
  const imageHits = new Set();

  page.on('response', async (res) => {
    try {
      const u = res.url();
      const ctype = (res.headers()['content-type'] || '').toLowerCase();
      if (u.match(/\.mp4(\?|$)/i) || ctype.startsWith('video/')) {
        videoHits.add(u);
      }
      if (u.match(/\.(jpe?g|png|gif|webp|avif)(\?|$)/i) || ctype.startsWith('image/')) {
        imageHits.add(u);
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

  // scroll a bit to trigger lazy-load images
  try {
    await page.evaluate(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'auto' });
    });
    await page.waitForTimeout(1000);
  } catch (e) {}

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

  // capture DOM-discovered images and merge with observed image responses
  let domImages = [];
  try {
    domImages = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img')).map(i => i.src || i.getAttribute('data-src') || '');
      const srcsets = Array.from(document.querySelectorAll('img[srcset]')).flatMap(i => (i.getAttribute('srcset') || '').split(',').map(s => s.trim().split(' ')[0]));
      return imgs.concat(srcsets).filter(Boolean);
    });
  } catch (e) {
    domImages = [];
  }

  const images = Array.from(new Set([...Array.from(imageHits), ...domImages]));
  if (images.length > 0) {
    try {
      await fs.mkdir('data', { recursive: true });
      let cache = {};
      try { cache = JSON.parse(await fs.readFile('data/image-cache.json', 'utf8') || '{}'); } catch {}
      // clean image URLs (remove bytestart/byteend and unescape)
      const cleaned = images.map(u => {
        try {
          const urlObj = new URL(u);
          urlObj.searchParams.delete('bytestart');
          urlObj.searchParams.delete('byteend');
          const s = urlObj.toString().replace(/&amp;/g, '&');
          return s;
        } catch (e) {
          return u;
        }
      });
      cache[url] = cleaned;
      await fs.writeFile('data/image-cache.json', JSON.stringify(cache, null, 2), 'utf8');
      console.log('Captured images:', cleaned.length);
    } catch (e) {
      console.error('Saving image cache error', e && e.message ? e.message : e);
    }
  } else {
    console.log('No images observed.');
  }

  await browser.close();
})();
