export async function onRequest(context) {
  const { request } = context;
  const urlObj = new URL(request.url);
  const fbUrl = urlObj.searchParams.get('url');
  if (!fbUrl || !/^https?:\/\/(www\.)?facebook\.com\//.test(fbUrl)) {
    return new Response(JSON.stringify({ error: 'Invalid or missing Facebook URL.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  try {
    // Fetch the Facebook page (public posts only)
    const fbRes = await fetch(fbUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await fbRes.text();
    // TODO: Parse the HTML to extract post content, author, timestamp, images, etc.
    // For now, just return a placeholder
    return new Response(JSON.stringify({
      html: `<div style='border:1px solid #ccc;padding:1em;border-radius:8px;'>\n  <strong>Facebook Post Preview</strong><br>\n  <em>Parsing not implemented yet.</em>\n  <br>URL: <a href='${fbUrl}' target='_blank'>${fbUrl}</a>\n</div>`
    }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to fetch or parse Facebook content.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
