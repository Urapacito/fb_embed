import { scrapeFacebookEmbed, buildEmbedHtml, normalizeUrl } from '../share/utils.js';

export async function onRequest(context) {
  const { request } = context;
  const urlObj = new URL(request.url);
  const fbUrl = urlObj.searchParams.get('url');
  if (!fbUrl || !/^https?:\/\/(www\.)?facebook\.com\//.test(fbUrl)) {
    return new Response(JSON.stringify({ error: 'Invalid or missing Facebook URL.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const fbShort = normalizeUrl(fbUrl);
  const { og, error } = await scrapeFacebookEmbed(fbUrl, fbShort, context.env);
  const html = buildEmbedHtml(og, fbShort);

  return new Response(JSON.stringify({
    error: error ? String(error) : null,
    html,
    og,
    originalUrl: fbShort,
  }), { headers: { 'Content-Type': 'application/json' } });
}
