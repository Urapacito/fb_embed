// Generic handler for /share/:id — resolves share links and serves OG for bots
export async function onRequest(context) {
	const { request } = context;
	const reqUrl = new URL(request.url);
	const pathname = reqUrl.pathname; // e.g. /share/ID/
	const search = reqUrl.search || '';
	const fbShareUrl = `https://www.facebook.com${pathname}${search}`;

	// Detect bots/crawlers vs real browsers using User-Agent
	const ua = (request.headers.get('user-agent') || '').toLowerCase();
	const botRe = /discord|bot|slack|twitter|facebookexternalhit|facebook|facebot|embed|crawler|spider|preview|vkshare|whatsapp|telegram|linkedin|skype|curl|wget|python|node|cfnetwork|okhttp|libwww|java|go-http/;
	const isBot = botRe.test(ua);

	// Resolve the share link (HEAD will follow redirects)
	let resolvedUrl = fbShareUrl;
	try {
		const headRes = await fetch(fbShareUrl, { method: 'HEAD', redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0' } });
		if (headRes && headRes.url) resolvedUrl = headRes.url;
	} catch (e) {
		// ignore
	}

	// If not a bot, redirect browsers to the resolved Facebook URL
	if (!isBot) return Response.redirect(resolvedUrl, 302);

	const fallbackImage = 'https://fb-embed.pages.dev/image-not-found.png';

	let og = { title: null, description: null, images: [], video: null };
	let error = null;
	try {
		const fbRes = await fetch(resolvedUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
		if (!fbRes.ok) throw new Error(`fetch failed: ${fbRes.status}`);
		const fbHtml = await fbRes.text();

		const ogTag = (name) => {
			const regex = new RegExp(`<meta[^>]+property=["']og:${name}["'][^>]+content=["']([^"']+)["']`, 'i');
			const match = fbHtml.match(regex);
			return match ? match[1] : null;
		};

		og.title = ogTag('title') || ogTag('site_name') || 'Facebook Post';
		og.description = ogTag('description') || '';
		const primaryImage = ogTag('image') || ogTag('image:url') || fallbackImage;
		if (primaryImage) og.images.push(primaryImage);

		// parse script JSON blocks
		const jsonObjects = [];
		const scriptRe = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
		let sm;
		while ((sm = scriptRe.exec(fbHtml)) !== null) {
			const txt = (sm[1] || '').trim();
			if (!txt) continue;
			try {
				if (txt[0] === '{' || txt[0] === '[') { jsonObjects.push(JSON.parse(txt)); continue; }
				const assignMatch = txt.match(/=\s*({[\s\S]*})\s*;?$/m);
				if (assignMatch) { jsonObjects.push(JSON.parse(assignMatch[1])); continue; }
				const jp = txt.match(/JSON\.parse\((?:'|")([\s\S]*)(?:'|")\)/m);
				if (jp) { const candidate = jp[1].replace(/\\n/g, '').replace(/\\'/g, "'"); jsonObjects.push(JSON.parse(candidate)); continue; }
			} catch (e) { }
		}

		function normalize(s) { if (!s) return s; return s.replace(/\\u0025/g, '%').replace(/\\\//g, '/').replace(/\\\\/g, '\\\\').replace(/\\/g, ''); }

		function deepSearchForMP4(node) {
			if (!node) return null;
			if (typeof node === 'string') {
				const cleaned = normalize(node);
				const m = cleaned.match(/https?:\/\/[^\s"']+?\.mp4/i);
				return m ? m[0] : null;
			}
			if (typeof node === 'object') {
				if (Array.isArray(node)) {
					for (const it of node) { const r = deepSearchForMP4(it); if (r) return r; }
				} else {
					for (const k of Object.keys(node)) {
						try { const v = node[k]; if (typeof v === 'string') { const cleaned = normalize(v); const m = cleaned.match(/https?:\/\/[^\s"']+?\.mp4/i); if (m) return m[0]; } else if (typeof v === 'object') { const r = deepSearchForMP4(v); if (r) return r; } } catch (e) { }
					}
				}
			}
			return null;
		}

		function searchByPriority(node, keys) {
			if (!node) return null;
			if (typeof node === 'string') { const cleaned = normalize(node); const m = cleaned.match(/https?:\/\/[^\s"']+?\.mp4/i); return m ? m[0] : null; }
			if (typeof node === 'object') {
				if (Array.isArray(node)) { for (const it of node) { const r = searchByPriority(it, keys); if (r) return r; } }
				else {
					for (const k of Object.keys(node)) {
						try { if (keys.includes(k) && typeof node[k] === 'string') { const cleaned = normalize(node[k]); const m = cleaned.match(/https?:\/\/[^\s"']+?\.mp4/i); if (m) return m[0]; } } catch (e) { }
					}
					for (const k of Object.keys(node)) { try { const r = searchByPriority(node[k], keys); if (r) return r; } catch (e) { } }
				}
			}
			return null;
		}

		// decide type based on resolved path
		let pathLower = '/';
		try { pathLower = new URL(resolvedUrl).pathname.toLowerCase(); } catch(e) { pathLower = pathname.toLowerCase(); }

		let video = null;
		if (/\/reel\b|\/reels?\b/.test(pathLower)) {
			// reels: prefer reel-specific keys
			const reelKeys = ['browser_native_hd_url','browser_native_sd_url','videoDeliveryLegacyFields','short_form_video_context','video_links','video_link','playable_url','playable_url_quality_hd','hd_src','sd_src','source'];
			for (const obj of jsonObjects) { try { const f = searchByPriority(obj, reelKeys); if (f) { video = f; break; } } catch(e){} }
			if (!video) for (const obj of jsonObjects) { try { const f = deepSearchForMP4(obj); if (f) { video = f; break; } } catch(e){} }
		} else if (/\/videos?\b|\/watch\b|\/v\b/.test(pathLower)) {
			// videos/watch: prefer playable/hd keys
			const vidKeys = ['playable_url','playable_url_quality_hd','hd_src_no_ratelimit','hd_src','sd_src_no_ratelimit','sd_src','source'];
			for (const obj of jsonObjects) { try { const f = searchByPriority(obj, vidKeys); if (f) { video = f; break; } } catch(e){} }
			if (!video) for (const obj of jsonObjects) { try { const f = deepSearchForMP4(obj); if (f) { video = f; break; } } catch(e){} }
		} else {
			// generic post: try to find any mp4 first, but posts commonly have images
			for (const obj of jsonObjects) { try { const f = deepSearchForMP4(obj); if (f) { video = f; break; } } catch(e){} }
		}

		if (video) og.video = video.replace(/\\u0025/g, '%').replace(/\\/g, '');

		// collect images if no video or to provide fallback
		if (!og.images || og.images.length === 0) og.images = [];
		const imageSet = new Set(og.images.slice(0,4));
		for (const obj of jsonObjects) {
			try {
				const text = JSON.stringify(obj);
				const matches = text.match(/https?:\/\/[^\s"']+?\.(?:jpe?g|png|gif|webp)/gi);
				if (matches) for (const m of matches) { if (imageSet.size < 4) imageSet.add(m); }
			} catch (e) { }
		}
		og.images = Array.from(imageSet);
		if (og.images.length === 0) og.images.push(primaryImage || fallbackImage);

	} catch (e) {
		error = e;
	}

	if (error || !og.title) {
		og = { title: 'Post unavailable', description: 'This Facebook post could not be loaded.', images: [fallbackImage], video: null };
	}

	// Build Open Graph meta tags
	const metaParts = [
		`<meta property="og:title" content="${escapeHtml(og.title)}" />`,
		`<meta property="og:description" content="${escapeHtml(og.description)}\nWatch on Facebook: ${resolvedUrl}" />`
	];

	for (const img of og.images.slice(0,4)) metaParts.push(`<meta property="og:image" content="${img}" />`);

	if (og.video) {
		metaParts.push(`<meta property="og:video" content="${og.video}" />`);
		metaParts.push(`<meta property="og:video:secure_url" content="${og.video}" />`);
		metaParts.push(`<meta property="og:video:type" content="video/mp4" />`);
		metaParts.push(`<meta name="twitter:card" content="player" />`);
	}

	const metaTags = metaParts.join('\n\t');

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
	${og.images[0] ? `<img src="${og.images[0]}" alt="Post image" style="max-width:400px;display:block;" />` : ''}
	${og.video ? `<video src="${og.video}" controls style="max-width:400px;display:block;"></video>` : ''}
	<p><a href="${resolvedUrl}" target="_blank">Watch on Facebook</a></p>
</body>
</html>`;

	return new Response(htmlOut, { headers: { 'Content-Type': 'text/html' } });
}

function escapeHtml(s) { if (!s) return ''; return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
