export const BOT_AGENT_RE = /discord|bot|slack|twitter|facebookexternalhit|facebook|facebot|embed|crawler|spider|preview|vkshare|whatsapp|telegram|linkedin|skype|curl|wget|python|node|cfnetwork|okhttp|libwww|java|go-http/i;

export function getFacebookTargetUrls(requestUrl, prefix = '/share') {
  const reqUrl = new URL(requestUrl);
  const pathname = reqUrl.pathname;
  const search = reqUrl.search || '';
  if (!pathname.startsWith(prefix) || pathname === prefix) {
    return { fbUrl: null, fbShort: null };
  }
  const targetPath = pathname.slice(prefix.length) || '/';
  const normalizedPath = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
  const fbUrl = `https://www.facebook.com${normalizedPath}${search}`;
  const fbShort = `https://www.facebook.com${normalizedPath}`;
  return { fbUrl, fbShort };
}

export function normalizeUrl(value) {
  if (!value || typeof value !== 'string') return null;
  return value
    .replace(/\\u0025/g, '%')
    .replace(/\\\//g, '/')
    .replace(/\\\\/g, '\\\\')
    .replace(/\\/g, '')
    .trim();
}

export function escapeHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildEmbedHtml(og, fbShort, origin = null) {
  function shouldProxyImage(u) {
    if (!u) return false;
    try {
      const h = new URL(u).hostname || '';
      return /fbcdn\.net|scontent\.|fhan18-|video\.fhan18-/i.test(h) || /fbcdn\.net|scontent\./i.test(h);
    } catch (e) {
      return false;
    }
  }

  function proxied(u) {
    if (!u) return u;
    function unescapeHtmlEntities(s) {
      return String(s)
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
    }

    if (shouldProxyImage(u)) {
      const cleaned = unescapeHtmlEntities(u);
      return `/api/image?u=${encodeURIComponent(cleaned)}&r=${encodeURIComponent(fbShort)}`;
    }
    return u;
  }

  function decodeHtmlEntitiesLocal(s) {
    if (!s) return '';
    try {
      return String(s)
        .replace(/&amp;/g, '&')
        .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
        .replace(/&#([0-9]+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
    } catch (e) {
      return String(s);
    }
  }

  const titleDecoded = decodeHtmlEntitiesLocal(og.title || '');
  const descDecoded = decodeHtmlEntitiesLocal(og.description || '');

  const metaParts = [
    `<meta property="og:title" content="${escapeHtml(titleDecoded)}" />`,
    `<meta property="og:description" content="${escapeHtml(descDecoded)}\nWatch on Facebook: ${escapeHtml(fbShort)}" />`,
    `<meta property="og:url" content="${escapeHtml(fbShort)}" />`,
  ];

  for (const img of (og.images || []).slice(0, 4)) {
    const out = proxied(img);
    metaParts.push(`<meta property="og:image" content="${escapeHtml(out)}" />`);
  }

  if (og.video) {
    // player URL on our domain (absolute when origin provided)
    try {
      const playerPath = `/share/player?u=${encodeURIComponent(og.video)}&r=${encodeURIComponent(fbShort)}`;
      const playerUrl = origin ? `${String(origin).replace(/\/$/, '')}${playerPath}` : playerPath;
      metaParts.push(`<meta property="og:video" content="${escapeHtml(playerUrl)}" />`);
      metaParts.push(`<meta property="og:video:secure_url" content="${escapeHtml(playerUrl)}" />`);
      metaParts.push(`<meta property="og:video:type" content="text/html" />`);
      metaParts.push(`<meta property="og:video:width" content="640" />`);
      metaParts.push(`<meta property="og:video:height" content="360" />`);
      metaParts.push(`<meta name="twitter:card" content="player" />`);
      metaParts.push(`<meta name="twitter:player" content="${escapeHtml(playerUrl)}" />`);
      metaParts.push(`<meta name="twitter:player:width" content="640" />`);
      metaParts.push(`<meta name="twitter:player:height" content="360" />`);
      // Additionally expose a proxied direct MP4 URL (same origin) so crawlers like Discord can fetch the video
      if (origin) {
        const proxiedMp4 = `${String(origin).replace(/\/$/, '')}/api/video?u=${encodeURIComponent(og.video)}&r=${encodeURIComponent(fbShort)}`;
        metaParts.push(`<meta property="og:video" content="${escapeHtml(proxiedMp4)}" />`);
        metaParts.push(`<meta property="og:video:secure_url" content="${escapeHtml(proxiedMp4)}" />`);
        metaParts.push(`<meta property="og:video:type" content="video/mp4" />`);
      }
    } catch (e) {
      // ignore
    }

    // raw mp4 fallback (use original URL when origin/proxy not available)
    if (!origin) {
      metaParts.push(`<meta property="og:video" content="${escapeHtml(og.video)}" />`);
      metaParts.push(`<meta property="og:video:secure_url" content="${escapeHtml(og.video)}" />`);
      metaParts.push(`<meta property="og:video:type" content="video/mp4" />`);
    }
  }

  const firstImg = og.images && og.images[0] ? proxied(og.images[0]) : '';

  // Extract simple view and reaction counts from the title for display
  function extractCountsFromTitle(title) {
    if (!title) return {};
    const out = {};
    try {
      const viewRe = /([0-9,.KM]+)\s*(?:l(?:ư|u)ợt)?\s*xem/i;
      const heartRe = /([0-9,.KM]+)\s*c(?:ả|a)m\s*x(?:ú|u)c/i;
      const v = title.match(viewRe);
      const h = title.match(heartRe);
      if (v) out.view = v[1];
      if (h) out.heart = h[1];
    } catch (e) {
      // ignore
    }
    return out;
  }

  const counts = extractCountsFromTitle(titleDecoded);
  const statsHtml = (counts.view || counts.heart) ? `
    <div class="post-stats" style="display:flex;gap:12px;align-items:center;margin:8px 0;color:#666">
      ${counts.view ? `<span class="stat-view" style="display:flex;align-items:center;gap:6px"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7zm0 12a5 5 0 100-10 5 5 0 000 10z" fill="#444"/><circle cx="12" cy="12" r="2.5" fill="#444"/></svg><strong style="font-weight:600;color:#222">${escapeHtml(counts.view)}</strong><span style="font-size:0.9em">lượt xem</span></span>` : ''}
      ${counts.heart ? `<span class="stat-heart" style="display:flex;align-items:center;gap:6px"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.1 21.35l-1.1-1.02C5.14 15.24 2 12.39 2 8.5 2 6 3.99 4 6.5 4c1.74 0 3.41.81 4.5 2.09C12.09 4.81 13.76 4 15.5 4 18.01 4 20 6 20 8.5c0 3.89-3.14 6.74-8.9 11.83l-1.0 0.02z" fill="#c62828"/></svg><strong style="font-weight:600;color:#222">${escapeHtml(counts.heart)}</strong><span style="font-size:0.9em">cảm xúc</span></span>` : ''}
    </div>
  ` : '';

  const htmlOut = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(titleDecoded)}</title>
  ${metaParts.join('\n  ')}
  <style>body{font-family:Arial,Helvetica,sans-serif} .images{display:flex;flex-wrap:wrap;gap:8px} .fb-open{display:inline-block;margin:8px 0;padding:6px 10px;background:#1877f2;color:#fff;border-radius:6px;text-decoration:none}</style>
</head>
<body>
  <h2>${escapeHtml(titleDecoded)}</h2>
  <p><a class="fb-open" href="${escapeHtml(fbShort)}" target="_blank" rel="noopener noreferrer">Open on Facebook</a></p>
  ${statsHtml}
  <p>${escapeHtml(descDecoded)}</p>
  ${firstImg ? `<img src="${escapeHtml(firstImg)}" alt="Post image" style="max-width:400px;display:block;" />` : ''}
  ${og.video ? `<video src="${escapeHtml(origin ? `${String(origin).replace(/\/$/, '')}/api/video?u=${encodeURIComponent(og.video)}&r=${encodeURIComponent(fbShort)}` : og.video)}" controls style="max-width:400px;display:block;"></video>` : ''}
  <p><a href="${escapeHtml(fbShort)}" target="_blank" rel="noopener noreferrer">Watch on Facebook</a></p>
</body>
</html>`;

  return htmlOut;
}

export function extractOgTags(html) {
  const meta = {};
  const regex = /<meta[^>]+(?:property|name)=["']og:([^"']+)["'][^>]+content=["']([^"']+)["']/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    meta[match[1]] = meta[match[1]] || match[2];
  }
  return meta;
}

export function extractJsonObjects(html) {
  const jsonObjects = [];
  const scriptRe = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let sm;
  while ((sm = scriptRe.exec(html)) !== null) {
    const txt = (sm[1] || '').trim();
    if (!txt) continue;
    try {
      if (txt[0] === '{' || txt[0] === '[') {
        jsonObjects.push(JSON.parse(txt));
        continue;
      }
      const assignMatch = txt.match(/=\s*({[\s\S]*})\s*;?$/m);
      if (assignMatch) {
        jsonObjects.push(JSON.parse(assignMatch[1]));
        continue;
      }
      const jp = txt.match(/JSON\.parse\((?:'|")([\s\S]*?)(?:'|")\)/m);
      if (jp) {
        const candidate = jp[1].replace(/\\n/g, '').replace(/\\'/g, "'");
        jsonObjects.push(JSON.parse(candidate));
        continue;
      }
    } catch (e) {
      // Ignore invalid JSON blocks
    }
  }
  return jsonObjects;
}

function decodeBase64ToUtf8(b64) {
  try {
    if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function') {
      return Buffer.from(b64, 'base64').toString('utf8');
    }
    if (typeof globalThis.atob === 'function') {
      const bin = globalThis.atob(b64);
      let esc = '';
      for (let i = 0; i < bin.length; i++) {
        const code = bin.charCodeAt(i).toString(16).padStart(2, '0');
        esc += '%' + code;
      }
      return decodeURIComponent(esc);
    }
  } catch (e) {
    return null;
  }
  return null;
}

// Local video cache (optional). Only used when running in Node (development),
// reads data/video-cache.json if present to supply pre-captured MP4 URLs.
let VIDEO_CACHE = null;
async function loadVideoCache() {
  if (VIDEO_CACHE !== null) return;
  VIDEO_CACHE = {};
  try {
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      const fs = await import('fs');
      try {
        const txt = await fs.promises.readFile('data/video-cache.json', 'utf8');
        VIDEO_CACHE = JSON.parse(txt || '{}');
      } catch (e) {
        VIDEO_CACHE = {};
      }
    }
  } catch (e) {
    VIDEO_CACHE = {};
  }
}

export async function getCachedVideo(fbShort) {
  await loadVideoCache();
  return (VIDEO_CACHE && VIDEO_CACHE[fbShort]) ? VIDEO_CACHE[fbShort] : null;
}

// Return all cached videos whose cache key path matches the provided fbShort path.
export async function getAllCachedVideosForPath(fbShort) {
  await loadVideoCache();
  const out = new Set();
  try {
    const path = new URL(fbShort).pathname.replace(/\/$/, '');
    for (const k of Object.keys(VIDEO_CACHE || {})) {
      try {
        const kp = new URL(k);
        const kpPath = kp.pathname.replace(/\/$/, '');
        if (kpPath.includes(path) || path.includes(kpPath)) out.add(VIDEO_CACHE[k]);
      } catch (e) {
        if (typeof k === 'string' && k.includes(path)) out.add(VIDEO_CACHE[k]);
      }
    }
  } catch (e) {
    // ignore malformed fbShort
  }
  return Array.from(out);
}

async function probeVideoUrl(candidate, referrer = 'https://www.facebook.com') {
  if (!candidate) return null;
  const baseHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Referer': referrer,
    'Accept': '*/*',
  };

  async function headCheck(u) {
    try {
      const res = await fetch(u, { method: 'HEAD', headers: baseHeaders, redirect: 'follow' });
      if (!res) return null;
      const ct = (res.headers.get && res.headers.get('content-type')) || '';
      if (!ct || !/video/i.test(ct)) return null;
      let len = null;
      const cl = res.headers.get && (res.headers.get('content-length') || res.headers.get('Content-Length'));
      if (cl) len = parseInt(cl, 10);
      const cr = res.headers.get && res.headers.get('content-range');
      if ((!len || isNaN(len)) && cr) {
        const m = String(cr).match(/\/(\d+)$/);
        if (m) len = parseInt(m[1], 10);
      }
      return { url: u, contentType: ct, length: len };
    } catch (e) {
      return null;
    }
  }

  async function rangeCheck(u) {
    try {
      const r = await fetch(u, { method: 'GET', headers: { ...baseHeaders, Range: 'bytes=0-1' }, redirect: 'follow' });
      if (!r) return null;
      const ok = r.status === 206 || (r.ok && r.status === 200);
      if (!ok) return null;
      const ct = (r.headers.get && r.headers.get('content-type')) || '';
      if (!ct || !/video/i.test(ct)) return null;
      let len = null;
      const cr = r.headers.get && r.headers.get('content-range');
      if (cr) {
        const m = String(cr).match(/\/(\d+)$/);
        if (m) len = parseInt(m[1], 10);
      }
      const cl = r.headers.get && (r.headers.get('content-length') || r.headers.get('Content-Length'));
      if ((!len || isNaN(len)) && cl) len = parseInt(cl, 10);
      return { url: u, contentType: ct, length: len };
    } catch (e) {
      return null;
    }
  }

  // prefer HEAD, fallback to ranged GET
  let info = await headCheck(candidate);
  if (!info) info = await rangeCheck(candidate);
  return info;
}

export async function findVideoUrl(html, jsonObjects = [], referrer = 'https://www.facebook.com') {
  const patterns = [
    /"playable_url":"(https:[^"']+?\.mp4)"/i,
    /"playable_url_quality_hd":"(https:[^"']+?\.mp4)"/i,
    /"hd_src_no_ratelimit":"(https:[^"']+?\.mp4)"/i,
    /"hd_src":"(https:[^"']+?\.mp4)"/i,
    /"sd_src_no_ratelimit":"(https:[^"']+?\.mp4)"/i,
    /"sd_src":"(https:[^"']+?\.mp4)"/i,
    /https?:\/\/[^\s"']+?\.mp4/gi,
  ];

  const baseHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Referer': referrer,
    'Accept': '*/*',
  };

  async function validateCandidate(raw) {
    if (!raw) return null;
    const cleanedRaw = normalizeUrl(raw);
    if (!cleanedRaw) return null;
    let u;
    try {
      u = new URL(cleanedRaw);
    } catch (e) {
      return null;
    }

    // remove bytestart/byteend range query params
    if (u.searchParams.has('bytestart') || u.searchParams.has('byteend')) {
      u.searchParams.delete('bytestart');
      u.searchParams.delete('byteend');
    }

    // decode efg if present and skip audio-only tracks
    if (u.searchParams.has('efg')) {
      try {
        const enc = decodeURIComponent(u.searchParams.get('efg') || '');
        const json = decodeBase64ToUtf8(enc);
        if (json) {
          const parsed = JSON.parse(json);
          if (parsed && parsed.vencode_tag && /audio/i.test(parsed.vencode_tag)) {
            return null; // skip audio-only tracks
          }
        }
      } catch (e) {
        // ignore parse errors
      }
    }

    const cleaned = u.toString();

    // Try HEAD first to verify content-type (with Referer)
    try {
      const res = await fetch(cleaned, { method: 'HEAD', headers: baseHeaders, redirect: 'follow' });
      if (res && (res.ok || res.status === 200)) {
        const ct = (res.headers.get && res.headers.get('content-type')) || '';
        if (ct && ct.toLowerCase().startsWith('video/')) return cleaned;
      }
    } catch (e) {
      // fall through to ranged GET
    }

    // Fallback: try a small ranged GET (with Referer)
    try {
      const r = await fetch(cleaned, { method: 'GET', headers: { ...baseHeaders, Range: 'bytes=0-1' }, redirect: 'follow' });
      if (r && (r.ok || r.status === 206)) {
        const ct = (r.headers.get && r.headers.get('content-type')) || '';
        if (ct && ct.toLowerCase().startsWith('video/')) return cleaned;
      }
    } catch (e) {
      // ignore
    }

    return null;
  }

  // quick HTML/JS regex search
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      const candidate = normalizeUrl(match[1] || match[0]);
      const ok = await validateCandidate(candidate);
      if (ok) return ok;
    }
  }

  const priorityKeys = [
    'browser_native_hd_url',
    'browser_native_sd_url',
    'playable_url',
    'playable_url_quality_hd',
    'hd_src_no_ratelimit',
    'hd_src',
    'sd_src_no_ratelimit',
    'sd_src',
    'source',
  ];

  function searchObject(node) {
    if (!node) return null;
    if (typeof node === 'string') {
      const cleaned = normalizeUrl(node);
      const m = cleaned && cleaned.match(/https?:\/\/[^\s"']+?\.mp4/i);
      return m ? m[0] : null;
    }
    if (Array.isArray(node)) {
      for (const item of node) {
        const found = searchObject(item);
        if (found) return found;
      }
      return null;
    }
    if (typeof node === 'object') {
      for (const key of Object.keys(node)) {
        try {
          if (priorityKeys.includes(key) && typeof node[key] === 'string') {
            const cleaned = normalizeUrl(node[key]);
            const m = cleaned && cleaned.match(/https?:\/\/[^\s"']+?\.mp4/i);
            if (m) return m[0];
          }
        } catch (e) {
          // ignore
        }
      }
      for (const key of Object.keys(node)) {
        try {
          const found = searchObject(node[key]);
          if (found) return found;
        } catch (e) {
          // ignore
        }
      }
    }
    return null;
  }

  for (const obj of jsonObjects) {
    const found = searchObject(obj);
    if (found) {
      const ok = await validateCandidate(found);
      if (ok) return ok;
    }
  }

  return null;
}

export function extractRawImageUrls(html) {
  if (!html || typeof html !== 'string') return [];
  const set = new Set();
  const imgRe = /<img[^>]+src=["']([^"']+)["']/gi;
  let m;
  while ((m = imgRe.exec(html)) !== null) {
    const u = normalizeUrl(m[1]);
    if (u) set.add(u);
  }
  const dataSrcRe = /<img[^>]+data-src=["']([^"']+)["']/gi;
  while ((m = dataSrcRe.exec(html)) !== null) {
    const u = normalizeUrl(m[1]);
    if (u) set.add(u);
  }
  const srcsetRe = /<img[^>]+srcset=["']([^"']+)["']/gi;
  while ((m = srcsetRe.exec(html)) !== null) {
    const parts = m[1].split(',').map(s => s.trim().split(' ')[0]);
    for (const p of parts) {
      const u = normalizeUrl(p);
      if (u) set.add(u);
    }
  }
  return Array.from(set);
}

export function collectPostImages(jsonObjects = [], primaryImage) {
  const denyImgRe = /\/rsrc\.php|emoji|sprite_|favicon\.ico|platform-lookaside|emoji\.php|icons?\//i;
  const preferImgRe = /scontent\.|fbcdn\.net|video\.|thumbnail|thumb/i;
  const imagesSet = new Set(primaryImage ? [primaryImage] : []);
  let attachmentsDetected = false;

  function collect(node, keyPath = '') {
    if (!node) return;
    if (typeof node === 'string') {
      const value = normalizeUrl(node);
      if (value && /\.(jpe?g|png|gif|webp)(?:\?|$)/i.test(value)) {
        if (denyImgRe.test(value)) return;
        if (preferImgRe.test(value) || imagesSet.size === 0) imagesSet.add(value);
      }
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) collect(item, keyPath);
      return;
    }
    if (typeof node === 'object') {
      for (const key of Object.keys(node)) {
        const value = node[key];
        const path = keyPath ? `${keyPath}.${key}` : key;
        const lowerKey = path.toLowerCase();
        if (/attach|media|image|thumb|display|photo|thumbnail|picture|gallery|images?/.test(lowerKey)) {
          if (/attach|attachment|attachments/.test(key.toLowerCase())) {
            attachmentsDetected = true;
          }
          collect(value, lowerKey);
          continue;
        }
        if (typeof value === 'string' && /\.(jpe?g|png|gif|webp)(?:\?|$)/i.test(value)) {
          const normalized = normalizeUrl(value);
          if (normalized && !denyImgRe.test(normalized)) {
            if (preferImgRe.test(normalized) || imagesSet.size === 0) imagesSet.add(normalized);
          }
        }
      }
    }
  }

  for (const obj of jsonObjects) {
    collect(obj);
  }

  let result = Array.from(imagesSet);
  result.sort((a, b) => (preferImgRe.test(a) ? 0 : 1) - (preferImgRe.test(b) ? 0 : 1));
  if (!attachmentsDetected) result = result.slice(0, 1);
  return result;
}

export async function fetchFacebookHtml(url, userAgent = 'Mozilla/5.0') {
  const res = await fetch(url, { headers: { 'User-Agent': userAgent }, redirect: 'follow' });
  if (!res.ok) throw new Error(`Facebook fetch failed: ${res.status}`);
  return await res.text();
}

export async function resolveFacebookUrl(url, userAgent = 'Mozilla/5.0') {
  try {
    const res = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': userAgent }, redirect: 'follow' });
    return res && res.url ? res.url : url;
  } catch {
    return url;
  }
}

export async function scrapeFacebookEmbed(fbUrl, fbShort, env = {}) {
  const fallbackImage = 'https://fb-embed.pages.dev/image-not-found.png';
  const og = { title: null, description: null, images: [], video: null };
  let html = null;
  let error = null;

  try {
    const resolvedUrl = await resolveFacebookUrl(fbUrl);
    html = await fetchFacebookHtml(resolvedUrl);
    const meta = extractOgTags(html);
    og.title = meta.title || meta.site_name || 'Facebook Post';
    og.description = meta.description || '';
    const primaryImage = meta.image || meta['image:url'] || fallbackImage;
    og.images = [primaryImage];
    og.video = normalizeUrl(meta.video || meta['video'] || meta['video:url'] || meta['video:secure_url'] || meta['video:video']);

    // Prefer cached captures (if present) and probe them to pick the best available video.
    try {
      const cachedCandidates = [];
      const cachedExact = await getCachedVideo(fbShort);
      if (cachedExact) cachedCandidates.push(cachedExact);
      const more = await getAllCachedVideosForPath(fbShort);
      for (const c of more) if (c && !cachedCandidates.includes(c)) cachedCandidates.push(c);
      if (cachedCandidates.length > 0) {
        const probes = [];
        for (const cand of cachedCandidates) {
          try {
            const p = await probeVideoUrl(cand, resolvedUrl);
            if (p && p.contentType && /video/i.test(p.contentType)) probes.push(p);
          } catch (e) {
            // ignore probe errors
          }
        }
        if (probes.length > 0) {
          probes.sort((a, b) => (b.length || 0) - (a.length || 0));
          og.video = probes[0].url;
        }
      }
    } catch (e) {
      // ignore cache probing errors
    }

    const jsonObjects = extractJsonObjects(html);
    if (!og.video) {
      og.video = await findVideoUrl(html, jsonObjects, resolvedUrl);
    }

    const images = collectPostImages(jsonObjects, primaryImage);
    const rawImages = extractRawImageUrls(html);
    for (const img of rawImages) {
      if (!images.includes(img)) images.push(img);
    }
    og.images = images.length > 0 ? images : [primaryImage];

    if (!og.video) {
      const mobileUrls = [
        resolvedUrl.replace('https://www.facebook.com', 'https://m.facebook.com'),
        resolvedUrl.replace('https://www.facebook.com', 'https://mbasic.facebook.com'),
      ];
      for (const mobileUrl of mobileUrls) {
        try {
          const mobileHtml = await fetchFacebookHtml(mobileUrl, 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)');
          const video = await findVideoUrl(mobileHtml, extractJsonObjects(mobileHtml), mobileUrl);
          if (video) { og.video = video; break; }
          const redirectMatch = mobileHtml.match(/video_redirect\/\?src=([^"'&>]+)/i);
          if (redirectMatch && redirectMatch[1]) {
            og.video = normalizeUrl(decodeURIComponent(redirectMatch[1]));
            if (og.video) break;
          }
        } catch (e) {
          // ignore mobile fetch failures
        }
      }
    }

    if (!og.video && env && env.FB_ACCESS_TOKEN) {
      const token = env.FB_ACCESS_TOKEN;
      let videoId = null;
      const m1 = html.match(/\/videos\/(\d+)/);
      if (m1) videoId = m1[1];
      if (!videoId) {
        const m2 = html.match(/"video_id"\s*:\s*"?(\d+)"?/i) || html.match(/"videoId"\s*:\s*"?(\d+)"?/i);
        if (m2) videoId = m2[1];
      }
      if (videoId) {
        try {
          const gRes = await fetch(`https://graph.facebook.com/v17.0/${videoId}?fields=source&access_token=${token}`);
          if (gRes.ok) {
            const data = await gRes.json();
            if (data && data.source) og.video = normalizeUrl(data.source);
          }
        } catch (e) {
          // ignore graph API failure
        }
      }

      if (!og.video) {
        try {
          const graphUrl = new URL('https://graph.facebook.com/v17.0/');
          graphUrl.searchParams.set('id', fbUrl);
          graphUrl.searchParams.set('fields', 'og_object{title,description,images,video,locale,url}');
          graphUrl.searchParams.set('access_token', token);
          const gRes = await fetch(graphUrl.toString(), { headers: { 'User-Agent': 'Mozilla/5.0' } });
          if (gRes.ok) {
            const data = await gRes.json();
            if (data && data.og_object) {
              const ogObject = data.og_object;
              if (!og.title && ogObject.title) og.title = String(ogObject.title);
              if (!og.description && ogObject.description) og.description = String(ogObject.description);
              if (!og.images || og.images.length === 0) {
                og.images = collectPostImages([ogObject], og.images[0]);
              }
              if (!og.video) {
                const graphVideo = await findVideoUrl(JSON.stringify(ogObject), [ogObject], fbUrl);
                if (graphVideo) og.video = graphVideo;
              }
            }
          }
        } catch (e) {
          // ignore graph API failure
        }
      }
    }
  } catch (e) {
    error = e;
  }

  if (error || !og.title) {
    return {
      og: {
        title: 'Post unavailable',
        description: 'This Facebook post could not be loaded.',
        images: [fallbackImage],
        video: null,
      },
      error,
    };
  }

  return { og, error };
}
