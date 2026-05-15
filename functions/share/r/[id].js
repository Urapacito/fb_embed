// Cloudflare Pages Function for /share/r/:id
export async function onRequest(context) {
  const { params, request } = context;
  let og = {};
  let error = null;
  try {
    const fbRes = await fetch(fbUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await fbRes.text();
    const ogTag = (name) => {
      const regex = new RegExp(`<meta[^>]+property=["']og:${name}["'][^>]+content=["']([^"']+)["']`, 'i');
      const match = html.match(regex);
      return match ? match[1] : null;
    };
    og.title = ogTag('title') || 'Facebook Post';
    og.description = ogTag('description') || '';
    og.image = ogTag('image') || fallbackImage;
    og.video = ogTag('video') || null;

    // Try to extract direct video URL from embedded JSON if og:video is not found
    if (!og.video) {
      // Look for videoData JSON in the HTML (common in Facebook video pages)
      const videoDataMatch = html.match(/"playable_url":"(https:[^\"]+\.mp4)"/);
      if (videoDataMatch) {
        og.video = videoDataMatch[1].replace(/\\u0025/g, '%').replace(/\\/g, '');
      }
    }
  } catch (e) {
    error = e;
  }

  let og = {};
  let error = null;
  try {
    const fbRes = await fetch(fbUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const fbHtml = await fbRes.text();
    const ogTag = (name) => {
      const regex = new RegExp(`<meta[^>]+property=["']og:${name}["'][^>]+content=["']([^"']+)["']`, 'i');
      const match = fbHtml.match(regex);
      return match ? match[1] : null;
    };
    og.title = ogTag('title') || 'Facebook Post';
    og.description = ogTag('description') || '';
    og.image = ogTag('image') || fallbackImage;
    og.video = ogTag('video') || null;

    // Try to extract direct video URL from embedded JSON if og:video is not found
    if (!og.video) {
      const videoDataMatch = fbHtml.match(/"playable_url":"(https:[^\"]+\.mp4)"/);
      if (videoDataMatch) {
        og.video = videoDataMatch[1].replace(/\\u0025/g, '%').replace(/\\/g, '');
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

  let metaTags = `
    <meta property="og:title" content="${og.title}" />
    <meta property="og:description" content="${og.description}\nWatch on Facebook: ${fbUrl}" />
    <meta property="og:image" content="${og.image}" />
  `;
  if (og.video) {
    metaTags += `\n    <meta property="og:video" content="${og.video}" />`;
  }

  const htmlOut = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${og.title}</title>
  ${metaTags}
</head>

  <h2>${og.title}</h2>
  <p>${og.description}</p>
  <img src="${og.image}" alt="Post image" style="max-width:400px;display:block;" />
  ${og.video ? `<video src="${og.video}" controls style="max-width:400px;display:block;"></video>` : ''}
  <p><a href="${fbUrl}" target="_blank">Watch on Facebook</a></p>
</body>
</html>`;

  return new Response(htmlOut, { headers: { 'Content-Type': 'text/html' } });
  return new Response(html, { headers: { 'Content-Type': 'text/html' } });
}
