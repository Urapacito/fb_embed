// Cloudflare Pages Function for /share/r/:id
export async function onRequest(context) {
  // Extract the post ID from the route
  const { params } = context;
  const postId = params.id;

  // Placeholder Open Graph data
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Test Embed</title>
  <meta property="og:title" content="Test Embed for ${postId}" />
  <meta property="og:description" content="This is a test embed for post ID: ${postId}." />
  <meta property="og:image" content="https://i.imgur.com/2IrN8Ux.png" />
</head>
<body>
  <h2>Embed test for ${postId}</h2>
</body>
</html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html' } });
}
