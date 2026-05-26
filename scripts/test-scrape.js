import { scrapeFacebookEmbed, normalizeUrl, buildEmbedHtml } from '../functions/share/utils.js';

const url = process.argv[2] || 'https://www.facebook.com/reel/990175153409982';
const fbShort = normalizeUrl(url) || url;

(async () => {
  try {
    console.log('TEST_URL:', url);
    const result = await scrapeFacebookEmbed(url, fbShort, { FB_ACCESS_TOKEN: process.env.FB_ACCESS_TOKEN });
    console.log(JSON.stringify(result, null, 2));
    const html = buildEmbedHtml(result.og, fbShort);
    console.log('\n--- GENERATED HTML ---\n');
    console.log(html);
  } catch (err) {
    console.error('ERROR', err && err.stack ? err.stack : err);
    process.exitCode = 2;
  }
})();
