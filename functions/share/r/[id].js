import { BOT_AGENT_RE, scrapeFacebookEmbed, buildEmbedHtml } from '../utils.js';

export async function onRequest(context) {
	const { request } = context;
	const pathname = new URL(request.url).pathname;
	const parts = pathname.split('/').filter(Boolean);
	const id = parts[parts.length - 1];
	if (!id) return new Response('Invalid Facebook reel path.', { status: 400 });

	// public FB URL for redirects
	const fbUrl = `https://www.facebook.com/reel/${encodeURIComponent(id)}/`;
	// use canonical share path as the fbShort so it matches cached keys
	const fbShort = `https://www.facebook.com/share/r/${encodeURIComponent(id)}/`;

	const ua = (request.headers.get('user-agent') || '').toLowerCase();
	const isBot = BOT_AGENT_RE.test(ua);
	if (!isBot) return Response.redirect(fbUrl, 302);

	const { og } = await scrapeFacebookEmbed(fbUrl, fbShort, context.env);
	const html = buildEmbedHtml(og, fbShort);
	return new Response(html, { headers: { 'Content-Type': 'text/html' } });
}