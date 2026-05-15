// Cloudflare Pages Function: Handles all /share/r/... and similar pretty URLs
// Responds with HTML containing Open Graph meta tags for Discord embedding

export async function onRequest(context) {
  const { request, params } = context;
  // Reconstruct the Facebook URL from the pretty path
  // e.g. /share/r/18PN3to9BN/ => https://www.facebook.com/share/r/18PN3to9BN/
  const path = new URL(request.url).pathname;
  const fbUrl = 'https://www.facebook.com' + path;

  // TODO: Fetch and parse the Facebook post for real data
  // For now, use placeholder data
  const post = {
    title: 'Coding Omega',
    description: 'facebed by pi.kt - embed with s/book/bed',
    image: 'https://i.imgur.com/2IrN8Ux.png', // Example image
    url: fbUrl,
    author: 'Coding Omega',
    stats: '❤️ 2K · 💬 69 · 🔗 1.3K · 2024/11/07 12:56:14 UTC+07',
  };

  // HTML with Open Graph meta tags
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${post.title}</title>
  <meta property="og:title" content="${post.title}" />
  <meta property="og:description" content="${post.description}\n${post.stats}" />
  <meta property="og:image" content="${post.image}" />
  <meta property="og:url" content="${post.url}" />
  <meta name="twitter:card" content="summary_large_image" />
</head>
<body>
  <h2>${post.title}</h2>
  <img src="${post.image}" alt="Post image" style="max-width:400px;display:block;" />
  <p>${post.description}</p>
  <p>${post.stats}</p>
  <a href="${post.url}" target="_blank">View on Facebook</a>
</body>
</html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html' } });
}
