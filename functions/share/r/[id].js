// Cloudflare Pages Function for /share/* routes
export async function onRequest(context) {
	const { request } = context;
	const reqUrl = new URL(request.url);
	const pathname = reqUrl.pathname; // e.g. /share/r/ID/
	const search = reqUrl.search || '';
	const fbUrl = `https://www.facebook.com${pathname}${search}`;
	const fbShort = `https://www.facebook.com${pathname}`;

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

		// Parse scripts early to collect images from JSON blobs
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

		const denyImgRe = /\/rsrc\.php|emoji|sprite_|favicon\.ico|platform-lookaside|emoji\.php|icons?\//i;
		const preferImgRe = /scontent\.|fbcdn\.net|video\.|thumbnail|thumb/i;
		const imagesSet = new Set(og.image ? [og.image] : []);
		let attachmentsDetected = false;

		function collectImages(node, keyPath = '') {
			if (!node) return;
			if (typeof node === 'string') {
				const s = normalize(node);
				if (/\.(jpe?g|png|gif|webp)(?:\?|$)/i.test(s)) {
					if (denyImgRe.test(s)) return;
					if (preferImgRe.test(s) || imagesSet.size === 0) imagesSet.add(s);
				}
				return;
			}
			if (typeof node === 'object') {
				if (Array.isArray(node)) { for (const it of node) collectImages(it, keyPath); return; }
				for (const k of Object.keys(node)) {
					const v = node[k];
					const kp = (keyPath ? (keyPath + '.' + k) : k).toLowerCase();
					if (/attach|media|image|thumb|display|photo|thumbnail|picture|gallery|images?/.test(kp)) {
						if (/attach|attachment|attachments/.test(k.toLowerCase())) attachmentsDetected = true;
						collectImages(v, kp);
						continue;
					}
					if (typeof v === 'string' && /\.(jpe?g|png|gif|webp)(?:\?|$)/i.test(v)) {
						const vn = normalize(v);
						if (!denyImgRe.test(vn)) { if (preferImgRe.test(vn) || imagesSet.size === 0) imagesSet.add(vn); }
					}
				}
			}
		}

		for (const obj of jsonObjects) { try { collectImages(obj); } catch (e) { } }
		let imagesArr = Array.from(imagesSet);
		imagesArr.sort((a,b) => (preferImgRe.test(a)?0:1) - (preferImgRe.test(b)?0:1));
		if (!attachmentsDetected) imagesArr = imagesArr.slice(0,1); else imagesArr = imagesArr.slice(0,4);
		if (imagesArr.length === 0) imagesArr.push(og.image || fallbackImage);
		og.images = imagesArr;

		// Try to extract direct video URL from embedded JSON if og:video is not found
		if (!og.video) {
			// quick regex search first (common patterns)
			const patterns = [
				/"playable_url":"(https:[^\"]+?\.mp4)"/,
				/"playable_url_quality_hd":"(https:[^\"]+?\.mp4)"/,
				/"hd_src_no_ratelimit":"(https:[^\"]+?\.mp4)"/,
				/"hd_src":"(https:[^\"]+?\.mp4)"/,
				/"sd_src_no_ratelimit":"(https:[^\"]+?\.mp4)"/,
				/"sd_src":"(https:[^\"]+?\.mp4)"/,
				/https?:\/\/[^\s"']+?\.mp4/gi
			];
			for (const p of patterns) {
				const m = fbHtml.match(p);
				if (m) {
					og.video = m[1] ? m[1].replace(/\\u0025/g, '%').replace(/\\/g, '') : m[0].replace(/\\u0025/g, '%').replace(/\\/g, '');
					break;
				}
			}

			// If still no video, parse JSON blocks embedded in scripts and deep-search for MP4 URLs
			if (!og.video) {
				const jsonObjects = [];
				const scriptRe = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
				let sm;
				while ((sm = scriptRe.exec(fbHtml)) !== null) {
					const txt = (sm[1] || '').trim();
					if (!txt) continue;
					try {
						if (txt[0] === '{' || txt[0] === '[') {
							jsonObjects.push(JSON.parse(txt));
							continue;
						}
						// look for assignment like: window._sharedData = { ... };
						const assignMatch = txt.match(/=\s*({[\s\S]*})\s*;?$/m);
						if (assignMatch) {
							jsonObjects.push(JSON.parse(assignMatch[1]));
							continue;
						}
						// JSON.parse("...") patterns
						const jp = txt.match(/JSON\.parse\((?:'|")([\s\S]*)(?:'|")\)/m);
						if (jp) {
							const candidate = jp[1].replace(/\\n/g, '').replace(/\\'/g, "'");
							jsonObjects.push(JSON.parse(candidate));
							continue;
						}
					} catch (e) {
						// ignore parse errors
					}
				}

					// Prioritize reel-specific keys first when searching JSON blobs
					const reelPriorityKeys = [
						'browser_native_hd_url', 'browser_native_sd_url', 'browser_native_sd_url',
						'videoDeliveryLegacyFields', 'short_form_video_context', 'video_links', 'video_link',
						'playable_url', 'playable_url_quality_hd', 'hd_src', 'sd_src', 'source'
					];

				function normalize(s) {
					if (!s) return s;
					return s.replace(/\\u0025/g, '%').replace(/\\\//g, '/').replace(/\\\\/g, '\\\\').replace(/\\/g, '');
				}

				function searchByPriority(node, keys) {
					if (!node) return null;
					if (typeof node === 'string') {
						const cleaned = normalize(node);
						const m = cleaned.match(/https?:\/\/[^\s\"']+?\.mp4/i);
						return m ? m[0] : null;
					}
					if (typeof node === 'object') {
						if (Array.isArray(node)) {
							for (const it of node) {
								const r = searchByPriority(it, keys);
								if (r) return r;
							}
						} else {
							// check direct keys first
							for (const k of Object.keys(node)) {
								try {
									if (keys.includes(k) && typeof node[k] === 'string') {
										const cleaned = normalize(node[k]);
										const m = cleaned.match(/https?:\/\/[^\s\"']+?\.mp4/i);
										if (m) return m[0];
									}
								} catch (e) { }
							}
							// then recurse
							for (const k of Object.keys(node)) {
								try {
									const r = searchByPriority(node[k], keys);
									if (r) return r;
								} catch (e) { }
							}
						}
					}
					return null;
				}

				function deepSearch(node) {
					if (!node) return null;
					if (typeof node === 'string') {
						const cleaned = normalize(node);
						const m = cleaned.match(/https?:\/\/[^\s"']+?\.mp4/i);
						return m ? m[0] : null;
					}
					if (typeof node === 'object') {
						if (Array.isArray(node)) {
							for (const it of node) {
								const r = deepSearch(it);
								if (r) return r;
							}
						} else {
							for (const k of Object.keys(node)) {
								try {
									const v = node[k];
									if (typeof v === 'string') {
										const cleaned = normalize(v);
										const m = cleaned.match(/https?:\/\/[^\s"']+?\.mp4/i);
										if (m) return m[0];
									} else if (typeof v === 'object') {
										const r = deepSearch(v);
										if (r) return r;
									}
								} catch (e) {
									// ignore
								}
							}
						}
					}
					return null;
				}

				for (const obj of jsonObjects) {
					try {
						const found = deepSearch(obj);
						if (found) {
							og.video = found;
							break;
						}
					} catch (e) {
						// ignore
					}
				}

				// final fallback: try mobile page (some posts expose different JSON there)
				if (!og.video) {
					try {
						const mobileUrl = fbUrl.replace('https://www.facebook.com', 'https://m.facebook.com');
						const mRes = await fetch(mobileUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_5 like Mac OS X)' } });
						if (mRes.ok) {
							const mHtml = await mRes.text();
							// repeat regex + json search on mobile HTML
							for (const p of patterns) {
								const mm = mHtml.match(p);
								if (mm) {
									og.video = mm[1] ? mm[1].replace(/\\u0025/g, '%').replace(/\\/g, '') : mm[0].replace(/\\u0025/g, '%').replace(/\\/g, '');
									break;
								}
							}
							if (!og.video) {
								let mJsons = [];
								let s;
								while ((s = scriptRe.exec(mHtml)) !== null) {
									const t = (s[1] || '').trim();
									if (!t) continue;
									try { if (t[0] === '{' || t[0] === '[') mJsons.push(JSON.parse(t)); } catch(e){}
								}
								for (const o of mJsons) {
									const f = deepSearch(o);
									if (f) { og.video = f; break; }
								}
							}
						}
					} catch (e) {
						// ignore
					}
				}
			}
		}

		// Last attempt: use Facebook Graph API if an access token is available
		if (!og.video && context && context.env && context.env.FB_ACCESS_TOKEN) {
			try {
				const token = context.env.FB_ACCESS_TOKEN;
				let videoId = null;
				const m1 = fbHtml.match(/\/videos\/(\d+)/);
				if (m1) videoId = m1[1];
				if (!videoId) {
					const m2 = fbHtml.match(/"video_id"\s*:\s*"?(\d+)"?/i) || fbHtml.match(/"videoId"\s*:\s*"?(\d+)"?/i);
					if (m2) videoId = m2[1];
				}
				if (videoId) {
					try {
						const gRes = await fetch(`https://graph.facebook.com/v17.0/${videoId}?fields=source&access_token=${token}`);
						if (gRes.ok) {
							const j = await gRes.json();
							if (j && j.source) og.video = j.source;
						}
					} catch (e) { /* ignore */ }
				}
			} catch (e) { /* ignore */ }
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

	// Build Open Graph meta tags (include richer video tags when available)
	const metaParts = [
		`<meta property="og:title" content="${escapeHtml(og.title)}" />`,
		`<meta property="og:description" content="${escapeHtml(og.description)}\nWatch on Facebook: ${fbShort}" />`,
		`<meta property="og:url" content="${fbShort}" />`
	];

	for (const img of (og.images || []).slice(0,4)) metaParts.push(`<meta property="og:image" content="${img}" />`);

	if (og.video) {
		metaParts.push(`<meta property="og:video" content="${og.video}" />`);
		metaParts.push(`<meta property="og:video:secure_url" content="${og.video}" />`);
		metaParts.push(`<meta property="og:video:type" content="video/mp4" />`);
		// Helpful twitter card hints
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
	${og.images && og.images[0] ? `<img src="${og.images[0]}" alt="Post image" style="max-width:400px;display:block;" />` : ''}
	${og.video ? `<video src="${og.video}" controls style="max-width:400px;display:block;"></video>` : ''}
	<p><a href="${fbShort}" target="_blank">Watch on Facebook</a></p>
</body>
</html>`;

	return new Response(htmlOut, { headers: { 'Content-Type': 'text/html' } });
}

function escapeHtml(s) {
	if (!s) return '';
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
