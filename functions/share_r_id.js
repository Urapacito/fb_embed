// Cloudflare Pages Function: Handles /share/r/:id and similar pretty URLs
// Responds with HTML containing Open Graph meta tags for Discord embedding

export async function onRequest(context) {
  const { request, params } = context;
  // Extract the post ID from the path
  const path = new URL(request.url).pathname;
  // Match /share/r/:id (with or without trailing slash or query)
  const match = path.match(/^\/share\/r\/([^\/\?]+)(?:[\/\?]|$)/);
  const postId = match ? match[1] : null;
  if (!postId) {
    return new Response('Invalid Facebook share URL.', { status: 400 });
  }
  // Reconstruct the Facebook URL
  const fbUrl = 'https://www.facebook.com/share/r/' + postId + '/';

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
  const html = `<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <title>${post.title}</title>\n  <meta property=\"og:title\" content=\"${post.title}\" />\n  <meta property=\"og:description\" content=\"${post.description}\\n${post.stats}\" />\n  <meta property=\"og:image\" content=\"${post.image}\" />\n  <meta property=\"og:url\" content=\"${post.url}\" />\n  <meta name=\"twitter:card\" content=\"summary_large_image\" />\n</head>\n<body>\n  <h2>${post.title}</h2>\n  <img src=\"${post.image}\" alt=\"Post image\" style=\"max-width:400px;display:block;\" />\n  <p>${post.description}</p>\n  <p>${post.stats}</p>\n  <a href=\"${post.url}\" target=\"_blank\">View on Facebook</a>\n</body>\n</html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html' } });
}