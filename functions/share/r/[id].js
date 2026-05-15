// Cloudflare Pages Function for /share/r/:id
export async function onRequest(context) {
  const { params, request } = context;
  const postId = params.id;
  const fallbackImage = 'https://fb-embed.pages.dev/image-not-found.png';
  let fbUrl = `https://www.facebook.com/share/r/${postId}/`;
  // If the URL contains "/v/", treat as video
  if (request.url.includes('/share/v/')) {
    fbUrl = `https://www.facebook.com/share/v/${postId}/`;
  }

  let og = {};
  let error = null;
  try {
    const fbRes = await fetch(fbUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await fbRes.text();
    // Parse Open Graph tags
    const ogTag = (name) => {
      const regex = new RegExp(`<meta[^>]+property=["']og:${name}["'][^>]+content=["']([^"']+)["']`, 'i');
      const match = html.match(regex);
      return match ? match[1] : null;
    };
    og.title = ogTag('title') || 'Facebook Post';
    og.description = ogTag('description') || '';
    og.image = ogTag('image') || fallbackImage;
    og.video = ogTag('video') || null;
  } catch (e) {
    error = e;
  }

  // Fallback if fetch or parse failed
  if (error || !og.title) {
    og = {
      title: 'Post unavailable',
      description: 'This Facebook post could not be loaded.',
      image: fallbackImage,
      video: null,
    };
  }

  // Build Open Graph HTML
  let metaTags = `
    <meta property="og:title" content="${og.title}" />
    <meta property="og:description" content="${og.description}" />
    <meta property="og:image" content="${og.image}" />
  `;
  if (og.video) {
    metaTags += `\n    <meta property="og:video" content="${og.video}" />`;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${og.title}</title>
  ${metaTags}
</head>
<body>
  <h2>${og.title}</h2>
  <p>${og.description}</p>
  <img src="${og.image}" alt="Post image" style="max-width:400px;display:block;" />
  ${og.video ? `<video src="${og.video}" controls style="max-width:400px;display:block;"></video>` : ''}
</body>
</html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html' } });
}
