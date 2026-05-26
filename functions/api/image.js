export async function onRequest(context) {
  const { request } = context;
  const urlObj = new URL(request.url);
  const u = urlObj.searchParams.get('u') || urlObj.searchParams.get('url');
  const ref = urlObj.searchParams.get('r') || urlObj.searchParams.get('ref');

  if (!u) {
    return new Response('Missing image url (u)', { status: 400 });
  }

  let decoded = u;
  try { decoded = decodeURIComponent(u); } catch (e) { decoded = u; }

  let remote;
  try {
    remote = new URL(decoded);
  } catch (e) {
    return new Response('Invalid image url', { status: 400 });
  }

  // Allowlist Facebook CDN and scontent hosts to avoid open proxy abuse.
  const host = remote.hostname || '';
  if (!/(fbcdn\.net|scontent\.|fhan\d+-|cdn\.instagram|cdninstagram)\b/i.test(host)) {
    return new Response('Not allowed', { status: 403 });
  }

  // Fetch remote image with a Facebook-like Referer to avoid hotlink blocks
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': '*/*',
  };
  if (ref) {
    try { headers.Referer = decodeURIComponent(ref); } catch (e) { headers.Referer = ref; }
  }

  try {
    const res = await fetch(remote.toString(), { headers, redirect: 'follow' });
    if (!res.ok) {
      return Response.redirect('https://fb-embed.pages.dev/image-not-found.png', 302);
    }
    const ct = res.headers.get('content-type') || 'application/octet-stream';
    const respHeaders = new Headers();
    respHeaders.set('Content-Type', ct);
    respHeaders.set('Cache-Control', 'public, max-age=86400');
    return new Response(res.body, { headers: respHeaders });
  } catch (e) {
    return Response.redirect('https://fb-embed.pages.dev/image-not-found.png', 302);
  }
}
