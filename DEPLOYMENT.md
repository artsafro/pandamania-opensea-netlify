# 🚀 NFT Stats Fetcher - Deployment Guide

## 📋 Prerequisites

1. **GitHub Account** - To host the repository
2. **Netlify Account** - To deploy the serverless functions
3. **API Keys** - From Moralis and OpenSea

## 🔑 Required API Keys

### 1. Moralis API Key
- Visit [Moralis.io](https://moralis.io/)
- Sign up and create a new project
- Copy your API key from the dashboard

### 2. OpenSea API Key
- Visit [OpenSea API](https://docs.opensea.io/)
- Sign up for API access
- Get your API key

### 3. Alchemy API Key (Optional)
- Visit [Alchemy.com](https://www.alchemy.com/)
- Create a new app
- Copy your API key

## 🌐 Deployment Steps

### Step 1: Push to GitHub
```bash
# If you haven't already, push this repository to GitHub
git remote add origin https://github.com/YOUR_USERNAME/pandamania-opensea-netlify.git
git add .
git commit -m "Initial commit"
git push -u origin main
```

### Step 2: Deploy to Netlify
1. Go to [Netlify](https://netlify.com/) and sign in
2. Click "New site from Git"
3. Choose GitHub and select your repository
4. Configure build settings:
   - **Build command**: Leave empty (not needed for serverless functions)
   - **Publish directory**: Leave empty (not needed for serverless functions)
5. Click "Deploy site"

### Step 3: Configure Environment Variables
1. In your Netlify dashboard, go to **Site settings** → **Environment variables**
2. Add the following variables:

| Variable | Value | Required |
|----------|-------|----------|
| `MORALIS_API_KEY` | Your Moralis API key | ✅ Yes |
| `OPENSEA_API_KEY` | Your OpenSea API key | ✅ Yes |
| `ALCHEMY_API_KEY` | Your Alchemy API key | ❌ Optional |
| `SUPPLY_OVERRIDES_JSON` | JSON mapping of contract addresses to supply | ❌ Optional |

Example for `SUPPLY_OVERRIDES_JSON`:
```json
{
  "0x29be0951309805ddcfa90592c3bf765925871344": 921,
  "0x870b1fa5d36696af7b3cfa0e2721872efd790b51": 378
}
```

### Step 4: Update Frontend Configuration
1. Get your Netlify site URL (e.g., `https://your-site-name.netlify.app`)
2. Edit `pm-fetch.js` and update the `PM_ENDPOINT`:
```javascript
const PM_ENDPOINT = "https://your-site-name.netlify.app/.netlify/functions/opensea";
```

### Step 5: Test Your Deployment
1. Open `test.html` in your browser
2. Check the browser console for any errors
3. Try calling the function with a real NFT collection

## 🔧 Usage Examples

### Single Collection Card
```html
<div id="my-nft-card" class="pm-card">
  <div class="pm-name">My NFT Collection</div>
  <div class="pm-line">Loading…</div>
</div>

<script>
pmFetchStats(
  "my-nft-card",
  "your-collection-slug",
  "0x1234567890abcdef..."
);
</script>
```

### Multiple Collections Dashboard
```html
<div id="nft-dashboard"></div>

<script>
const collections = [
  { name: "Collection 1", slug: "collection1", addr: "0x123..." },
  { name: "Collection 2", slug: "collection2", addr: "0x456..." }
];

collections.forEach(c => {
  const div = document.createElement("div");
  div.id = `card-${c.addr}`;
  div.className = "pm-card";
  div.innerHTML = `<div class="pm-name">${c.name}</div><div class="pm-line">Loading…</div>`;
  document.getElementById("nft-dashboard").appendChild(div);
  pmFetchStats(div.id, c.slug, c.addr);
});
</script>
```

## 🐛 Troubleshooting

### Common Issues

1. **"Missing MORALIS_API_KEY" error**
   - Check that environment variables are set correctly in Netlify
   - Redeploy the site after adding variables

2. **CORS errors**
   - The function includes CORS headers, but check your domain is allowed

3. **API rate limits**
   - Moralis has usage limits on free tier
   - Consider upgrading or using Alchemy fallback

4. **Function not found**
   - Ensure `netlify.toml` is in the root directory
   - Check that `netlify/functions/opensea.js` exists

### Debug Mode
Add `&debug=1` to your function URL to get detailed information:
```
https://your-site.netlify.app/.netlify/functions/opensea?slug=test&addr=0x123&debug=1
```

## 📊 Performance Tips

- Use caching strategies (localStorage, server-side caching)
- Limit API calls by refreshing stats periodically
- Use `SUPPLY_OVERRIDES_JSON` to avoid extra API calls
- Consider using Alchemy-only mode to reduce Moralis usage

## 🔗 Useful Links

- [Moralis Documentation](https://docs.moralis.io/)
- [OpenSea API Documentation](https://docs.opensea.io/)
- [Alchemy Documentation](https://docs.alchemy.com/)
- [Netlify Functions Documentation](https://docs.netlify.com/functions/overview/)
