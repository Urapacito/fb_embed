import { escapeHtml, normalizeUrl } from './utils.js';

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const u = url.searchParams.get('u');
  const r = url.searchParams.get('r') || '';
  if (!u) return new Response('Missing video url', { status: 400 });

  const videoUrl = normalizeUrl(decodeURIComponent(u)) || decodeURIComponent(u);
  const referer = decodeURIComponent(r || '');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Facebook Video Player</title>
  <meta property="og:type" content="video.other" />
  <meta property="og:video" content="${escapeHtml(videoUrl)}" />
  <meta property="og:video:secure_url" content="${escapeHtml(videoUrl)}" />
  <meta property="og:video:type" content="video/mp4" />
  <meta property="og:video:width" content="640" />
  <meta property="og:video:height" content="360" />
  <style>body{margin:0;display:flex;align-items:center;justify-content:center;height:100vh;background:#000}video{max-width:100%;height:auto}</style>
</head>
<body>
  <video src="${escapeHtml(videoUrl)}" controls playsinline webkit-playsinline></video>
  <noscript><a href="${escapeHtml(referer || videoUrl)}">Open on Facebook</a></noscript>
</body>
</html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
