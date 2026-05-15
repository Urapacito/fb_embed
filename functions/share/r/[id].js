// Cloudflare Pages Function for /share/* routes
export async function onRequest(context) {
	const { request } = context;
	const reqUrl = new URL(request.url);
	const pathname = reqUrl.pathname; // e.g. /share/r/ID/
	const search = reqUrl.search || '';
	const fbUrl = `https://www.facebook.com${pathname}${search}`;

	// Detect bots/crawlers vs real browsers using User-Agent
	const ua = (request.headers.get('user-agent') || '').toLowerCase();
	const botRe = /discord|bot|slack|twitter|facebookexternalhit|facebook|facebot|embed|crawler|spider|preview|vkshare|whatsapp|telegram|linkedin|skype|curl|wget|python|node|cfnetwork|okhttp|libwww|java|go-http/;
	const isBot = botRe.test(ua);

	// If not a bot/crawler, redirect to the original Facebook URL
	if (!isBot) return Response.redirect(fbUrl, 302);

	const fallbackImage = 'https://fb-embed.pages.dev/image-not-found.png';

	let og = { title: null, description: null, image: null, video: null };
	let error = null;
	try {
		const fbRes = await fetch(fbUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
		if (!fbRes.ok) throw new Error(`fetch failed: ${fbRes.status}`);
		const fbHtml = await fbRes.text();

		const ogTag = (name) => {
			const regex = new RegExp(`<meta[^>]+property=["']og:${name}["'][^>]+content=["']([^"']+)["']`, 'i');
			const match = fbHtml.match(regex);
			return match ? match[1] : null;
		};

		og.title = ogTag('title') || ogTag('site_name') || 'Facebook Post';
		og.description = ogTag('description') || '';
		og.image = ogTag('image') || ogTag('image:url') || fallbackImage;
		og.video = ogTag('video') || ogTag('video:secure_url') || ogTag('video:url') || null;

		// Try to extract direct video URL from embedded JSON if og:video is not found
		if (!og.video) {
			const patterns = [
				/"playable_url":"(https:[^\\"]+?\\.mp4)"/,
				/"playable_url_quality_hd":"(https:[^\\"]+?\\.mp4)"/,
				/"hd_src_no_ratelimit":"(https:[^\\"]+?\\.mp4)"/,
				/"hd_src":"(https:[^\\"]+?\\.mp4)"/,
				/"sd_src_no_ratelimit":"(https:[^\\"]+?\\.mp4)"/,
				/"sd_src":"(https:[^\\"]+?\\.mp4)"/,
				/source\s*:\s*\"(https:[^\\"]+?\\.mp4)\"/
			];
			for (const p of patterns) {
				const m = fbHtml.match(p);
				if (m) {
					og.video = m[1].replace(/\\u0025/g, '%').replace(/\\/g, '');
					break;
				}
			}
		}
	} catch (e) {
		error = e;
	}

	if (error || !og.title) {
		og = {
			title: 'Post unavailable',
			description: 'This Facebook post could not be loaded.',
			image: fallbackImage,
			video: null,
		};
	}

	// Build Open Graph meta tags
	const metaTags = [`
		<meta property="og:title" content="${escapeHtml(og.title)}" />
		<meta property="og:description" content="${escapeHtml(og.description)}\nWatch on Facebook: ${fbUrl}" />
		<meta property="og:image" content="${og.image}" />
	`, og.video ? `<meta property="og:video" content="${og.video}" />` : ''].join('\n');

	const htmlOut = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>${escapeHtml(og.title)}</title>
	${metaTags}
</head>
<body>
	<h2>${escapeHtml(og.title)}</h2>
	<p>${escapeHtml(og.description)}</p>
	<img src="${og.image}" alt="Post image" style="max-width:400px;display:block;" />
	${og.video ? `<video src="${og.video}" controls style="max-width:400px;display:block;"></video>` : ''}
	<p><a href="${fbUrl}" target="_blank">Watch on Facebook</a></p>
</body>
</html>`;

	return new Response(htmlOut, { headers: { 'Content-Type': 'text/html' } });
}

function escapeHtml(s) {
	if (!s) return '';
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
