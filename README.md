# PandaMania • OpenSea Function (Netlify)

Serverless function + simple test page to fetch OpenSea collection stats from the browser via Netlify.

## Structure
```
netlify.toml
netlify/functions/opensea.js
index.html (optional test UI)
```

## Deploy (GitHub → Netlify)
1. Create a new GitHub repo and add these files.
2. On Netlify, **Add new site → Import from Git**, select your repo.
3. In **Site settings → Environment variables**, add:
   - `OPENSEA_API_KEY = YOUR_REAL_KEY` (select **All deploy contexts**)
4. Deploy. Netlify will expose your function at:
   `https://YOUR-SITE.netlify.app/.netlify/functions/opensea?slug=bamboo-buddies`

## Use in Beaver Builder
```html
<div id="bamboo-buddies-info">Loading…</div>
<script>
(async () => {
  const res = await fetch("https://YOUR-SITE.netlify.app/.netlify/functions/opensea?slug=bamboo-buddies");
  const data = await res.json();
  document.getElementById("bamboo-buddies-info").innerHTML = `
    🧩 Items: ${data.total_supply}<br>
    👥 Holders: ${data.num_owners}<br>
    💰 Floor: ${data.floor_price} ETH
  `;
})();
</script>
```

## Notes
- The function replies with CORS headers (`Access-Control-Allow-Origin: *`) so you can call it from any domain.
- If OpenSea adjusts fields, check `data.stats` shape and update mapping.
- For multiple collections, just change the `slug` query param.