export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const params = url.searchParams;
  const u = params.get('u');
  const r = params.get('r') || 'https://www.facebook.com/';

  if (!u) return new Response('Missing "u" parameter', { status: 400 });

  let videoUrl;
  try {
    // decode and ensure it's a valid URL
    videoUrl = decodeURIComponent(u);
    videoUrl = new URL(videoUrl).toString();
  } catch (e) {
    return new Response('Invalid "u" parameter', { status: 400 });
  }

  // Basic hostname whitelist to avoid open proxy abuse
  const host = new URL(videoUrl).hostname || '';
  const ALLOWED_HOST_RE = /fbcdn\.net|fbsbx\.com|scontent\.|fbcdn\.com|fna\.fbcdn\.net|video\.|fhan\d*-|cdninstagram\.com/i;
  if (!ALLOWED_HOST_RE.test(host)) {
    return new Response('Host not allowed', { status: 403 });
  }

  // Build upstream fetch headers; forward Range if provided
  const incoming = request.headers;
  const upstreamHeaders = new Headers();
  const range = incoming.get('range');
  if (range) upstreamHeaders.set('Range', range);
  upstreamHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  upstreamHeaders.set('Accept', '*/*');
  upstreamHeaders.set('Referer', decodeURIComponent(r));

  let upstream;
  try {
    upstream = await fetch(videoUrl, { method: request.method, headers: upstreamHeaders, redirect: 'follow' });
  } catch (e) {
    return new Response('Upstream fetch failed', { status: 502 });
  }

  // Forward useful headers back to the client
  const respHeaders = new Headers();
  const copyList = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'cache-control', 'etag', 'last-modified', 'expires'];
  for (const h of copyList) {
    const v = upstream.headers.get(h);
    if (v) respHeaders.set(h, v);
  }
  respHeaders.set('Access-Control-Allow-Origin', '*');
  respHeaders.set('Access-Control-Expose-Headers', 'Content-Range,Accept-Ranges,Content-Encoding,Content-Length');
  respHeaders.set('Vary', 'Origin,Accept-Encoding,Range');

  if (request.method === 'HEAD') {
    return new Response(null, { status: upstream.status, headers: respHeaders });
  }

  return new Response(upstream.body, { status: upstream.status, headers: respHeaders });
}
