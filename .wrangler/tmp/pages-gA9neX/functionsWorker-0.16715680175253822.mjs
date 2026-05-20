var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../.wrangler/tmp/bundle-MdT9Q3/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// share/r/[id].js
async function onRequest(context) {
  const { request } = context;
  const reqUrl = new URL(request.url);
  const pathname = reqUrl.pathname;
  const search = reqUrl.search || "";
  const fbUrl = `https://www.facebook.com${pathname}${search}`;
  const ua = (request.headers.get("user-agent") || "").toLowerCase();
  const botRe = /discord|bot|slack|twitter|facebookexternalhit|facebook|facebot|embed|crawler|spider|preview|vkshare|whatsapp|telegram|linkedin|skype|curl|wget|python|node|cfnetwork|okhttp|libwww|java|go-http/;
  const isBot = botRe.test(ua);
  if (!isBot) return Response.redirect(fbUrl, 302);
  const fallbackImage = "https://fb-embed.pages.dev/image-not-found.png";
  let og = { title: null, description: null, image: null, video: null };
  let error = null;
  try {
    const fbRes = await fetch(fbUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!fbRes.ok) throw new Error(`fetch failed: ${fbRes.status}`);
    const fbHtml = await fbRes.text();
    const ogTag = /* @__PURE__ */ __name((name) => {
      const regex = new RegExp(`<meta[^>]+property=["']og:${name}["'][^>]+content=["']([^"']+)["']`, "i");
      const match2 = fbHtml.match(regex);
      return match2 ? match2[1] : null;
    }, "ogTag");
    og.title = ogTag("title") || ogTag("site_name") || "Facebook Post";
    og.description = ogTag("description") || "";
    og.image = ogTag("image") || ogTag("image:url") || fallbackImage;
    og.video = ogTag("video") || ogTag("video:secure_url") || ogTag("video:url") || null;
    if (!og.video) {
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
          og.video = m[1] ? m[1].replace(/\\u0025/g, "%").replace(/\\/g, "") : m[0].replace(/\\u0025/g, "%").replace(/\\/g, "");
          break;
        }
      }
      if (!og.video) {
        let normalize = function(s) {
          if (!s) return s;
          return s.replace(/\\u0025/g, "%").replace(/\\\//g, "/").replace(/\\\\/g, "\\\\").replace(/\\/g, "");
        }, searchByPriority = function(node, keys) {
          if (!node) return null;
          if (typeof node === "string") {
            const cleaned = normalize(node);
            const m = cleaned.match(/https?:\/\/[^\s\"']+?\.mp4/i);
            return m ? m[0] : null;
          }
          if (typeof node === "object") {
            if (Array.isArray(node)) {
              for (const it of node) {
                const r = searchByPriority(it, keys);
                if (r) return r;
              }
            } else {
              for (const k of Object.keys(node)) {
                try {
                  if (keys.includes(k) && typeof node[k] === "string") {
                    const cleaned = normalize(node[k]);
                    const m = cleaned.match(/https?:\/\/[^\s\"']+?\.mp4/i);
                    if (m) return m[0];
                  }
                } catch (e) {
                }
              }
              for (const k of Object.keys(node)) {
                try {
                  const r = searchByPriority(node[k], keys);
                  if (r) return r;
                } catch (e) {
                }
              }
            }
          }
          return null;
        }, deepSearch = function(node) {
          if (!node) return null;
          if (typeof node === "string") {
            const cleaned = normalize(node);
            const m = cleaned.match(/https?:\/\/[^\s"']+?\.mp4/i);
            return m ? m[0] : null;
          }
          if (typeof node === "object") {
            if (Array.isArray(node)) {
              for (const it of node) {
                const r = deepSearch(it);
                if (r) return r;
              }
            } else {
              for (const k of Object.keys(node)) {
                try {
                  const v = node[k];
                  if (typeof v === "string") {
                    const cleaned = normalize(v);
                    const m = cleaned.match(/https?:\/\/[^\s"']+?\.mp4/i);
                    if (m) return m[0];
                  } else if (typeof v === "object") {
                    const r = deepSearch(v);
                    if (r) return r;
                  }
                } catch (e) {
                }
              }
            }
          }
          return null;
        };
        __name(normalize, "normalize");
        __name(searchByPriority, "searchByPriority");
        __name(deepSearch, "deepSearch");
        const jsonObjects = [];
        const scriptRe = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
        let sm;
        while ((sm = scriptRe.exec(fbHtml)) !== null) {
          const txt = (sm[1] || "").trim();
          if (!txt) continue;
          try {
            if (txt[0] === "{" || txt[0] === "[") {
              jsonObjects.push(JSON.parse(txt));
              continue;
            }
            const assignMatch = txt.match(/=\s*({[\s\S]*})\s*;?$/m);
            if (assignMatch) {
              jsonObjects.push(JSON.parse(assignMatch[1]));
              continue;
            }
            const jp = txt.match(/JSON\.parse\((?:'|")([\s\S]*)(?:'|")\)/m);
            if (jp) {
              const candidate = jp[1].replace(/\\n/g, "").replace(/\\'/g, "'");
              jsonObjects.push(JSON.parse(candidate));
              continue;
            }
          } catch (e) {
          }
        }
        const reelPriorityKeys = [
          "browser_native_hd_url",
          "browser_native_sd_url",
          "browser_native_sd_url",
          "videoDeliveryLegacyFields",
          "short_form_video_context",
          "video_links",
          "video_link",
          "playable_url",
          "playable_url_quality_hd",
          "hd_src",
          "sd_src",
          "source"
        ];
        for (const obj of jsonObjects) {
          try {
            const found = deepSearch(obj);
            if (found) {
              og.video = found;
              break;
            }
          } catch (e) {
          }
        }
        if (!og.video) {
          try {
            const mobileUrl = fbUrl.replace("https://www.facebook.com", "https://m.facebook.com");
            const mRes = await fetch(mobileUrl, { headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 13_5 like Mac OS X)" } });
            if (mRes.ok) {
              const mHtml = await mRes.text();
              for (const p of patterns) {
                const mm = mHtml.match(p);
                if (mm) {
                  og.video = mm[1] ? mm[1].replace(/\\u0025/g, "%").replace(/\\/g, "") : mm[0].replace(/\\u0025/g, "%").replace(/\\/g, "");
                  break;
                }
              }
              if (!og.video) {
                let mJsons = [];
                let s;
                while ((s = scriptRe.exec(mHtml)) !== null) {
                  const t = (s[1] || "").trim();
                  if (!t) continue;
                  try {
                    if (t[0] === "{" || t[0] === "[") mJsons.push(JSON.parse(t));
                  } catch (e) {
                  }
                }
                for (const o of mJsons) {
                  const f = deepSearch(o);
                  if (f) {
                    og.video = f;
                    break;
                  }
                }
              }
            }
          } catch (e) {
          }
        }
      }
    }
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
          } catch (e) {
          }
        }
      } catch (e) {
      }
    }
  } catch (e) {
    error = e;
  }
  if (error || !og.title) {
    og = {
      title: "Post unavailable",
      description: "This Facebook post could not be loaded.",
      image: fallbackImage,
      video: null
    };
  }
  const metaParts = [
    `<meta property="og:title" content="${escapeHtml(og.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(og.description)}
Watch on Facebook: ${fbUrl}" />`,
    `<meta property="og:image" content="${og.image}" />`
  ];
  if (og.video) {
    metaParts.push(`<meta property="og:video" content="${og.video}" />`);
    metaParts.push(`<meta property="og:video:secure_url" content="${og.video}" />`);
    metaParts.push(`<meta property="og:video:type" content="video/mp4" />`);
    metaParts.push(`<meta name="twitter:card" content="player" />`);
  }
  const metaTags = metaParts.join("\n	");
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
	${og.video ? `<video src="${og.video}" controls style="max-width:400px;display:block;"></video>` : ""}
	<p><a href="${fbUrl}" target="_blank">Watch on Facebook</a></p>
</body>
</html>`;
  return new Response(htmlOut, { headers: { "Content-Type": "text/html" } });
}
__name(onRequest, "onRequest");
function escapeHtml(s) {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
__name(escapeHtml, "escapeHtml");

// share/v/[id].js
async function onRequest2(context) {
  const { request } = context;
  const reqUrl = new URL(request.url);
  const pathname = reqUrl.pathname;
  const search = reqUrl.search || "";
  const fbUrl = `https://www.facebook.com${pathname}${search}`;
  const ua = (request.headers.get("user-agent") || "").toLowerCase();
  const botRe = /discord|bot|slack|twitter|facebookexternalhit|facebook|facebot|embed|crawler|spider|preview|vkshare|whatsapp|telegram|linkedin|skype|curl|wget|python|node|cfnetwork|okhttp|libwww|java|go-http/;
  const isBot = botRe.test(ua);
  if (!isBot) return Response.redirect(fbUrl, 302);
  const fallbackImage = "https://fb-embed.pages.dev/image-not-found.png";
  let og = { title: null, description: null, image: null, video: null };
  let error = null;
  try {
    const fbRes = await fetch(fbUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!fbRes.ok) throw new Error(`fetch failed: ${fbRes.status}`);
    const fbHtml = await fbRes.text();
    const ogTag = /* @__PURE__ */ __name((name) => {
      const regex = new RegExp(`<meta[^>]+property=["']og:${name}["'][^>]+content=["']([^"']+)["']`, "i");
      const match2 = fbHtml.match(regex);
      return match2 ? match2[1] : null;
    }, "ogTag");
    og.title = ogTag("title") || ogTag("site_name") || "Facebook Post";
    og.description = ogTag("description") || "";
    og.image = ogTag("image") || ogTag("image:url") || fallbackImage;
    og.video = ogTag("video") || ogTag("video:secure_url") || ogTag("video:url") || null;
    if (!og.video) {
      const patterns = [
        /"playable_url":"(https:[^\\"]+?\.mp4)"/,
        /"playable_url_quality_hd":"(https:[^\\"]+?\.mp4)"/,
        /"hd_src_no_ratelimit":"(https:[^\\"]+?\.mp4)"/,
        /"hd_src":"(https:[^\\"]+?\.mp4)"/,
        /"sd_src_no_ratelimit":"(https:[^\\"]+?\.mp4)"/,
        /"sd_src":"(https:[^\\"]+?\.mp4)"/,
        /https?:\/\/[^\s"']+?\.mp4/gi
      ];
      for (const p of patterns) {
        const m = fbHtml.match(p);
        if (m) {
          og.video = m[1] ? m[1].replace(/\\u0025/g, "%").replace(/\\/g, "") : m[0].replace(/\\u0025/g, "%").replace(/\\/g, "");
          break;
        }
      }
      if (!og.video) {
        let normalize = function(s) {
          if (!s) return s;
          return s.replace(/\\u0025/g, "%").replace(/\\\//g, "/").replace(/\\\\/g, "\\\\").replace(/\\/g, "");
        }, searchByPriority = function(node, keys) {
          if (!node) return null;
          if (typeof node === "string") {
            const cleaned = normalize(node);
            const m = cleaned.match(/https?:\/\/[^\s\"']+?\.mp4/i);
            return m ? m[0] : null;
          }
          if (typeof node === "object") {
            if (Array.isArray(node)) {
              for (const it of node) {
                const r = searchByPriority(it, keys);
                if (r) return r;
              }
            } else {
              for (const k of Object.keys(node)) {
                try {
                  if (keys.includes(k) && typeof node[k] === "string") {
                    const cleaned = normalize(node[k]);
                    const m = cleaned.match(/https?:\/\/[^\s\"']+?\.mp4/i);
                    if (m) return m[0];
                  }
                } catch (e) {
                }
              }
              for (const k of Object.keys(node)) {
                try {
                  const r = searchByPriority(node[k], keys);
                  if (r) return r;
                } catch (e) {
                }
              }
            }
          }
          return null;
        }, deepSearch = function(node) {
          if (!node) return null;
          if (typeof node === "string") {
            const cleaned = normalize(node);
            const m = cleaned.match(/https?:\/\/[^\s"']+?\.mp4/i);
            return m ? m[0] : null;
          }
          if (typeof node === "object") {
            if (Array.isArray(node)) {
              for (const it of node) {
                const r = deepSearch(it);
                if (r) return r;
              }
            } else {
              for (const k of Object.keys(node)) {
                try {
                  const v = node[k];
                  if (typeof v === "string") {
                    const cleaned = normalize(v);
                    const m = cleaned.match(/https?:\/\/[^\s"']+?\.mp4/i);
                    if (m) return m[0];
                  } else if (typeof v === "object") {
                    const r = deepSearch(v);
                    if (r) return r;
                  }
                } catch (e) {
                }
              }
            }
          }
          return null;
        };
        __name(normalize, "normalize");
        __name(searchByPriority, "searchByPriority");
        __name(deepSearch, "deepSearch");
        const jsonObjects = [];
        const scriptRe = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
        let sm;
        while ((sm = scriptRe.exec(fbHtml)) !== null) {
          const txt = (sm[1] || "").trim();
          if (!txt) continue;
          try {
            if (txt[0] === "{" || txt[0] === "[") {
              jsonObjects.push(JSON.parse(txt));
              continue;
            }
            const assignMatch = txt.match(/=\s*({[\s\S]*})\s*;?$/m);
            if (assignMatch) {
              jsonObjects.push(JSON.parse(assignMatch[1]));
              continue;
            }
            const jp = txt.match(/JSON\.parse\((?:'|")([\s\S]*)(?:'|")\)/m);
            if (jp) {
              const candidate = jp[1].replace(/\\n/g, "").replace(/\\'/g, "'");
              jsonObjects.push(JSON.parse(candidate));
              continue;
            }
          } catch (e) {
          }
        }
        const videoPriorityKeys = [
          "playable_url",
          "playable_url_quality_hd",
          "hd_src_no_ratelimit",
          "hd_src",
          "sd_src_no_ratelimit",
          "sd_src",
          "source",
          "browser_native_hd_url",
          "browser_native_sd_url"
        ];
        for (const obj of jsonObjects) {
          try {
            const found = deepSearch(obj);
            if (found) {
              og.video = found;
              break;
            }
          } catch (e) {
          }
        }
        if (!og.video) {
          try {
            const mobileUrl = fbUrl.replace("https://www.facebook.com", "https://m.facebook.com");
            const mRes = await fetch(mobileUrl, { headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 13_5 like Mac OS X)" } });
            if (mRes.ok) {
              const mHtml = await mRes.text();
              for (const p of patterns) {
                const mm = mHtml.match(p);
                if (mm) {
                  og.video = mm[1] ? mm[1].replace(/\\u0025/g, "%").replace(/\\/g, "") : mm[0].replace(/\\u0025/g, "%").replace(/\\/g, "");
                  break;
                }
              }
              if (!og.video) {
                let mJsons = [];
                let s;
                while ((s = scriptRe.exec(mHtml)) !== null) {
                  const t = (s[1] || "").trim();
                  if (!t) continue;
                  try {
                    if (t[0] === "{" || t[0] === "[") mJsons.push(JSON.parse(t));
                  } catch (e) {
                  }
                }
                for (const o of mJsons) {
                  const f = deepSearch(o);
                  if (f) {
                    og.video = f;
                    break;
                  }
                }
              }
            }
          } catch (e) {
          }
        }
      }
    }
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
          } catch (e) {
          }
        }
      } catch (e) {
      }
    }
  } catch (e) {
    error = e;
  }
  if (error || !og.title) {
    og = {
      title: "Post unavailable",
      description: "This Facebook post could not be loaded.",
      image: fallbackImage,
      video: null
    };
  }
  function escapeHtml3(s) {
    if (!s) return "";
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  __name(escapeHtml3, "escapeHtml");
  const metaParts = [
    `<meta property="og:title" content="${escapeHtml3(og.title)}" />`,
    `<meta property="og:description" content="${escapeHtml3(og.description)}
Watch on Facebook: ${fbUrl}" />`,
    `<meta property="og:image" content="${og.image}" />`
  ];
  if (og.video) {
    metaParts.push(`<meta property="og:video" content="${og.video}" />`);
    metaParts.push(`<meta property="og:video:secure_url" content="${og.video}" />`);
    metaParts.push(`<meta property="og:video:type" content="video/mp4" />`);
    metaParts.push(`<meta name="twitter:card" content="player" />`);
  }
  const metaTags = metaParts.join("\n	");
  const htmlOut = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>${escapeHtml3(og.title)}</title>
	${metaTags}
</head>
<body>
	<h2>${escapeHtml3(og.title)}</h2>
	<p>${escapeHtml3(og.description)}</p>
	<img src="${og.image}" alt="Post image" style="max-width:400px;display:block;" />
	${og.video ? `<video src="${og.video}" controls style="max-width:400px;display:block;"></video>` : ""}
	<p><a href="${fbUrl}" target="_blank">Watch on Facebook</a></p>
</body>
</html>`;
  return new Response(htmlOut, { headers: { "Content-Type": "text/html" } });
}
__name(onRequest2, "onRequest");

// api/embed.js
async function onRequest3(context) {
  const { request } = context;
  const urlObj = new URL(request.url);
  const fbUrl = urlObj.searchParams.get("url");
  if (!fbUrl || !/^https?:\/\/(www\.)?facebook\.com\//.test(fbUrl)) {
    return new Response(JSON.stringify({ error: "Invalid or missing Facebook URL." }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  try {
    const fbRes = await fetch(fbUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    const html = await fbRes.text();
    return new Response(JSON.stringify({
      html: `<div style='border:1px solid #ccc;padding:1em;border-radius:8px;'>
  <strong>Facebook Post Preview</strong><br>
  <em>Parsing not implemented yet.</em>
  <br>URL: <a href='${fbUrl}' target='_blank'>${fbUrl}</a>
</div>`
    }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to fetch or parse Facebook content." }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
__name(onRequest3, "onRequest");

// share/[id].js
async function onRequest4(context) {
  const { request } = context;
  const reqUrl = new URL(request.url);
  const pathname = reqUrl.pathname;
  const search = reqUrl.search || "";
  const fbShareUrl = `https://www.facebook.com${pathname}${search}`;
  const ua = (request.headers.get("user-agent") || "").toLowerCase();
  const botRe = /discord|bot|slack|twitter|facebookexternalhit|facebook|facebot|embed|crawler|spider|preview|vkshare|whatsapp|telegram|linkedin|skype|curl|wget|python|node|cfnetwork|okhttp|libwww|java|go-http/;
  const isBot = botRe.test(ua);
  let resolvedUrl = fbShareUrl;
  try {
    const headRes = await fetch(fbShareUrl, { method: "HEAD", redirect: "follow", headers: { "User-Agent": "Mozilla/5.0" } });
    if (headRes && headRes.url) resolvedUrl = headRes.url;
  } catch (e) {
  }
  if (!isBot) return Response.redirect(resolvedUrl, 302);
  const fallbackImage = "https://fb-embed.pages.dev/image-not-found.png";
  let og = { title: null, description: null, images: [], video: null };
  let error = null;
  try {
    let normalize = function(s) {
      if (!s) return s;
      return s.replace(/\\u0025/g, "%").replace(/\\\//g, "/").replace(/\\\\/g, "\\\\").replace(/\\/g, "");
    }, deepSearchForMP4 = function(node) {
      if (!node) return null;
      if (typeof node === "string") {
        const cleaned = normalize(node);
        const m = cleaned.match(/https?:\/\/[^\s"']+?\.mp4/i);
        return m ? m[0] : null;
      }
      if (typeof node === "object") {
        if (Array.isArray(node)) {
          for (const it of node) {
            const r = deepSearchForMP4(it);
            if (r) return r;
          }
        } else {
          for (const k of Object.keys(node)) {
            try {
              const v = node[k];
              if (typeof v === "string") {
                const cleaned = normalize(v);
                const m = cleaned.match(/https?:\/\/[^\s"']+?\.mp4/i);
                if (m) return m[0];
              } else if (typeof v === "object") {
                const r = deepSearchForMP4(v);
                if (r) return r;
              }
            } catch (e) {
            }
          }
        }
      }
      return null;
    }, searchByPriority = function(node, keys) {
      if (!node) return null;
      if (typeof node === "string") {
        const cleaned = normalize(node);
        const m = cleaned.match(/https?:\/\/[^\s"']+?\.mp4/i);
        return m ? m[0] : null;
      }
      if (typeof node === "object") {
        if (Array.isArray(node)) {
          for (const it of node) {
            const r = searchByPriority(it, keys);
            if (r) return r;
          }
        } else {
          for (const k of Object.keys(node)) {
            try {
              if (keys.includes(k) && typeof node[k] === "string") {
                const cleaned = normalize(node[k]);
                const m = cleaned.match(/https?:\/\/[^\s"']+?\.mp4/i);
                if (m) return m[0];
              }
            } catch (e) {
            }
          }
          for (const k of Object.keys(node)) {
            try {
              const r = searchByPriority(node[k], keys);
              if (r) return r;
            } catch (e) {
            }
          }
        }
      }
      return null;
    }, collectImages = function(node, keyPath = "") {
      if (!node) return;
      if (typeof node === "string") {
        const s = normalize(node);
        if (/\.(jpe?g|png|gif|webp)(?:\?|$)/i.test(s)) {
          if (denyImgRe.test(s)) return;
          if (preferImgRe.test(s) || imagesSet.size === 0) imagesSet.add(s);
        }
        return;
      }
      if (typeof node === "object") {
        if (Array.isArray(node)) {
          for (const it of node) collectImages(it, keyPath);
          return;
        }
        for (const k of Object.keys(node)) {
          const v = node[k];
          const kp = (keyPath ? keyPath + "." + k : k).toLowerCase();
          if (/attach|media|image|thumb|display|photo|thumbnail|picture|gallery|images?/.test(kp)) {
            if (/attach|attachment|attachments/.test(k.toLowerCase())) attachmentsDetected = true;
            collectImages(v, kp);
            continue;
          }
          if (typeof v === "string" && /\.(jpe?g|png|gif|webp)(?:\?|$)/i.test(v)) {
            const vn = normalize(v);
            if (!denyImgRe.test(vn)) {
              if (preferImgRe.test(vn) || imagesSet.size === 0) imagesSet.add(vn);
            }
          }
        }
      }
    };
    __name(normalize, "normalize");
    __name(deepSearchForMP4, "deepSearchForMP4");
    __name(searchByPriority, "searchByPriority");
    __name(collectImages, "collectImages");
    const fbRes = await fetch(resolvedUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!fbRes.ok) throw new Error(`fetch failed: ${fbRes.status}`);
    const fbHtml = await fbRes.text();
    const ogTag = /* @__PURE__ */ __name((name) => {
      const regex = new RegExp(`<meta[^>]+property=["']og:${name}["'][^>]+content=["']([^"']+)["']`, "i");
      const match2 = fbHtml.match(regex);
      return match2 ? match2[1] : null;
    }, "ogTag");
    og.title = ogTag("title") || ogTag("site_name") || "Facebook Post";
    og.description = ogTag("description") || "";
    const primaryImage = ogTag("image") || ogTag("image:url") || fallbackImage;
    if (primaryImage) og.images.push(primaryImage);
    const ogVideoMeta = ogTag("video") || ogTag("video:url") || ogTag("video:secure_url") || ogTag("video:video");
    if (ogVideoMeta) {
      og.video = normalize(ogVideoMeta).replace(/\\u0025/g, "%").replace(/\\/g, "");
    }
    if (!og.video) {
      const rawMp4 = (fbHtml.match(/https?:\/\/[^\s"']+?\.mp4/gi) || [])[0];
      if (rawMp4) {
        og.video = normalize(rawMp4);
      } else {
        const playMatch = fbHtml.match(/playable_url[^:]*:\s*["']([^"']+?\.mp4[^"']*)/i);
        if (playMatch && playMatch[1]) og.video = normalize(playMatch[1]);
        const srcMatch = fbHtml.match(/"src"\s*:\s*"([^"]+?\.mp4[^"]*)/i);
        if (!og.video && srcMatch && srcMatch[1]) og.video = normalize(srcMatch[1]);
        const escapedPlay = fbHtml.match(/playable_url\\\":\\\"([^\\\"]+?\.mp4[^\\\"]*)/i);
        if (!og.video && escapedPlay && escapedPlay[1]) og.video = normalize(escapedPlay[1].replace(/\\\\/g, "\\"));
      }
    }
    const jsonObjects = [];
    const scriptRe = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
    let sm;
    while ((sm = scriptRe.exec(fbHtml)) !== null) {
      const txt = (sm[1] || "").trim();
      if (!txt) continue;
      try {
        if (txt[0] === "{" || txt[0] === "[") {
          jsonObjects.push(JSON.parse(txt));
          continue;
        }
        const assignMatch = txt.match(/=\s*({[\s\S]*})\s*;?$/m);
        if (assignMatch) {
          jsonObjects.push(JSON.parse(assignMatch[1]));
          continue;
        }
        const jp = txt.match(/JSON\.parse\((?:'|")([\s\S]*)(?:'|")\)/m);
        if (jp) {
          const candidate = jp[1].replace(/\\n/g, "").replace(/\\'/g, "'");
          jsonObjects.push(JSON.parse(candidate));
          continue;
        }
      } catch (e) {
      }
    }
    let pathLower = "/";
    try {
      pathLower = new URL(resolvedUrl).pathname.toLowerCase();
    } catch (e) {
      pathLower = pathname.toLowerCase();
    }
    let video = null;
    if (/\/reel\b|\/reels?\b/.test(pathLower)) {
      const reelKeys = ["browser_native_hd_url", "browser_native_sd_url", "videoDeliveryLegacyFields", "short_form_video_context", "video_links", "video_link", "playable_url", "playable_url_quality_hd", "hd_src", "sd_src", "source"];
      for (const obj of jsonObjects) {
        try {
          const f = searchByPriority(obj, reelKeys);
          if (f) {
            video = f;
            break;
          }
        } catch (e) {
        }
      }
      if (!video) for (const obj of jsonObjects) {
        try {
          const f = deepSearchForMP4(obj);
          if (f) {
            video = f;
            break;
          }
        } catch (e) {
        }
      }
    } else if (/\/videos?\b|\/watch\b|\/v\b/.test(pathLower)) {
      const vidKeys = ["playable_url", "playable_url_quality_hd", "hd_src_no_ratelimit", "hd_src", "sd_src_no_ratelimit", "sd_src", "source"];
      for (const obj of jsonObjects) {
        try {
          const f = searchByPriority(obj, vidKeys);
          if (f) {
            video = f;
            break;
          }
        } catch (e) {
        }
      }
      if (!video) for (const obj of jsonObjects) {
        try {
          const f = deepSearchForMP4(obj);
          if (f) {
            video = f;
            break;
          }
        } catch (e) {
        }
      }
    } else {
      for (const obj of jsonObjects) {
        try {
          const f = deepSearchForMP4(obj);
          if (f) {
            video = f;
            break;
          }
        } catch (e) {
        }
      }
    }
    if (video) og.video = video.replace(/\\u0025/g, "%").replace(/\\/g, "");
    if (!og.images || og.images.length === 0) og.images = [];
    const imagesSet = new Set(og.images.slice(0, 4));
    let attachmentsDetected = false;
    const denyImgRe = /\/rsrc\.php|emoji|sprite_|favicon\.ico|platform-lookaside|emoji\.php|icons?\//i;
    const preferImgRe = /scontent\.|fbcdn\.net|video\.|thumbnail|thumb/i;
    for (const obj of jsonObjects) {
      try {
        collectImages(obj);
      } catch (e) {
      }
    }
    let imagesArr = Array.from(imagesSet);
    imagesArr.sort((a, b) => {
      const pa = preferImgRe.test(a) ? 0 : 1;
      const pb = preferImgRe.test(b) ? 0 : 1;
      return pa - pb;
    });
    if (!attachmentsDetected) imagesArr = imagesArr.slice(0, 1);
    else imagesArr = imagesArr.slice(0, 4);
    if (imagesArr.length === 0) imagesArr.push(primaryImage || fallbackImage);
    og.images = imagesArr;
    if (!og.video) {
      try {
        const mobileUrl = resolvedUrl.replace("www.facebook.com", "m.facebook.com");
        const mRes = await fetch(mobileUrl, { headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)" } });
        if (mRes && mRes.ok) {
          const mHtml = await mRes.text();
          const rawMp4 = (mHtml.match(/https?:\/\/[^\s"']+?\.mp4/gi) || [])[0];
          if (rawMp4) og.video = normalize(rawMp4);
          else {
            const redirectMatch = mHtml.match(/video_redirect\/?\?src=([^"'&>]+)/i) || mHtml.match(/video_redirect\/\?src=([^"'&>]+)/i);
            if (redirectMatch && redirectMatch[1]) {
              try {
                const decoded = decodeURIComponent(redirectMatch[1]);
                og.video = normalize(decoded);
              } catch (e) {
                og.video = normalize(redirectMatch[1]);
              }
            }
          }
        }
      } catch (e) {
      }
      if (!og.video) {
        try {
          const mbasicUrl = resolvedUrl.replace("www.facebook.com", "mbasic.facebook.com");
          const bRes = await fetch(mbasicUrl, { headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)" } });
          if (bRes && bRes.ok) {
            const bHtml = await bRes.text();
            const rawMp4b = (bHtml.match(/https?:\/\/[^\s"']+?\.mp4/gi) || [])[0];
            if (rawMp4b) og.video = normalize(rawMp4b);
            else {
              const redirectMatch = bHtml.match(/video_redirect\/\?src=([^"'&>]+)/i);
              if (redirectMatch && redirectMatch[1]) {
                try {
                  const decoded = decodeURIComponent(redirectMatch[1]);
                  og.video = normalize(decoded);
                } catch (e) {
                  og.video = normalize(redirectMatch[1]);
                }
              }
            }
          }
        } catch (e) {
        }
      }
    }
  } catch (e) {
    error = e;
  }
  if (error || !og.title) {
    og = { title: "Post unavailable", description: "This Facebook post could not be loaded.", images: [fallbackImage], video: null };
  }
  const metaParts = [
    `<meta property="og:title" content="${escapeHtml2(og.title)}" />`,
    `<meta property="og:description" content="${escapeHtml2(og.description)}
Watch on Facebook: ${resolvedUrl}" />`
  ];
  for (const img of og.images.slice(0, 4)) metaParts.push(`<meta property="og:image" content="${img}" />`);
  if (og.video) {
    metaParts.push(`<meta property="og:video" content="${og.video}" />`);
    metaParts.push(`<meta property="og:video:secure_url" content="${og.video}" />`);
    metaParts.push(`<meta property="og:video:type" content="video/mp4" />`);
    metaParts.push(`<meta name="twitter:card" content="player" />`);
  }
  const metaTags = metaParts.join("\n	");
  const htmlOut = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>${escapeHtml2(og.title)}</title>
	${metaTags}
</head>
<body>
	<h2>${escapeHtml2(og.title)}</h2>
	<p>${escapeHtml2(og.description)}</p>
	${og.images[0] ? `<img src="${og.images[0]}" alt="Post image" style="max-width:400px;display:block;" />` : ""}
	${og.video ? `<video src="${og.video}" controls style="max-width:400px;display:block;"></video>` : ""}
	<p><a href="${resolvedUrl}" target="_blank">Watch on Facebook</a></p>
</body>
</html>`;
  return new Response(htmlOut, { headers: { "Content-Type": "text/html" } });
}
__name(onRequest4, "onRequest");
function escapeHtml2(s) {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
__name(escapeHtml2, "escapeHtml");

// ../.wrangler/tmp/pages-gA9neX/functionsRoutes-0.1643461876156005.mjs
var routes = [
  {
    routePath: "/share/r/:id",
    mountPath: "/share/r",
    method: "",
    middlewares: [],
    modules: [onRequest]
  },
  {
    routePath: "/share/v/:id",
    mountPath: "/share/v",
    method: "",
    middlewares: [],
    modules: [onRequest2]
  },
  {
    routePath: "/api/embed",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest3]
  },
  {
    routePath: "/share/:id",
    mountPath: "/share",
    method: "",
    middlewares: [],
    modules: [onRequest4]
  }
];

// C:/Users/ADMIN/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// C:/Users/ADMIN/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");

// C:/Users/ADMIN/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// C:/Users/ADMIN/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// ../.wrangler/tmp/bundle-MdT9Q3/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;

// C:/Users/ADMIN/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// ../.wrangler/tmp/bundle-MdT9Q3/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=functionsWorker-0.16715680175253822.mjs.map
