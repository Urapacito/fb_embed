Apify actor quick-run example

Overview
- This repo includes `scripts/run-apify-actor.js`, a small Node script that calls Apify actor run-sync endpoint.
- The script reads `APIFY_TOKEN` from the environment. Do NOT commit your token.

Usage

1) Set your token (PowerShell, temporary):

```
$env:APIFY_TOKEN = "your_token_here"
```

2) Run the script:

```
node scripts/run-apify-actor.js scrapearchitect~facebook-video-downloader "https://www.facebook.com/..."
```

3) Alternative: use `curl` (POSIX shells):

```
curl -X POST "https://api.apify.com/v2/acts/scrapearchitect~facebook-video-downloader/run-sync?token=$APIFY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.facebook.com/..."}'
```

Notes
- Actor input schemas vary by actor — consult the actor's page for exact input parameters.
- For production, store `APIFY_TOKEN` in CI/CD secrets or platform env-vars (Cloudflare Pages, Vercel, etc).
- This script uses the run-sync endpoint which waits for the actor to finish and returns the result. For long-running actors, prefer asynchronous runs.
