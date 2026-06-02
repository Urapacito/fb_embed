import { BOT_AGENT_RE, scrapeFacebookEmbed, buildEmbedHtml } from '../utils.js';

export async function onRequest(context) {
	const { request } = context;
	const pathname = new URL(request.url).pathname;
	const parts = pathname.split('/').filter(Boolean);
	const id = parts[parts.length - 1];
	if (!id) return new Response('Invalid Facebook video path.', { status: 400 });

	// public FB watch URL for redirect
	const fbUrl = `https://www.facebook.com/watch/?v=${encodeURIComponent(id)}`;
	// canonical share path for cached lookup
	const fbShort = `https://www.facebook.com/share/v/${encodeURIComponent(id)}/`;

	const ua = (request.headers.get('user-agent') || '').toLowerCase();
	const isBot = BOT_AGENT_RE.test(ua);
	if (!isBot) return Response.redirect(fbUrl, 302);

	const { og } = await scrapeFacebookEmbed(fbUrl, fbShort, context.env);
	const html = buildEmbedHtml(og, fbShort);
	return new Response(html, { headers: { 'Content-Type': 'text/html' } });
}
