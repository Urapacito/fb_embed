import { BOT_AGENT_RE, scrapeFacebookEmbed, buildEmbedHtml } from '../utils.js';

export async function onRequest(context) {
	const { request } = context;
	const pathname = new URL(request.url).pathname;
	const parts = pathname.split('/').filter(Boolean);
	const id = parts[parts.length - 1];
	if (!id) return new Response('Invalid Facebook reel path.', { status: 400 });

	// Prefer the public "share" endpoint which tends to include OG metadata
	const fbShareUrl = `https://facebook.com/share/r/${encodeURIComponent(id)}/`;
	const fbReelUrl = `https://www.facebook.com/reel/${encodeURIComponent(id)}/`;
	const fbUrl = fbShareUrl; // prefer share URL for scraping
	const fbShort = fbShareUrl;

	const ua = (request.headers.get('user-agent') || '').toLowerCase();
	const isBot = BOT_AGENT_RE.test(ua);
	if (!isBot) return Response.redirect(fbUrl, 302);

	const { og } = await scrapeFacebookEmbed(fbUrl, fbShort, context.env);
	const origin = new URL(request.url).origin;
	const html = buildEmbedHtml(og, fbShort, origin);
	return new Response(html, { headers: { 'Content-Type': 'text/html' } });
}
