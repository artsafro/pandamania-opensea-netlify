# 🚀 NFT Stats Fetcher - Deployment Checklist

## ✅ Pre-Deployment Status

- [x] **Repository cloned** - ✅ Complete
- [x] **All files present** - ✅ Complete  
- [x] **Node.js available** - ✅ Complete (v22.18.0)
- [x] **Moralis API key** - ✅ Working
- [x] **OpenSea API key** - ✅ Working
- [x] **API tests passed** - ✅ Complete

## 🔑 Your API Keys (Ready for Netlify)

| Service | API Key | Status |
|---------|---------|--------|
| **Moralis** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6ImU5NTE4YzU5LTdjMDMtNGQyYS1iNDI5LWRjMmU4ODA4MTg0OSIsIm9yZ0lkIjoiNDY1NTYxIiwidXNlcklkIjoiNDc4OTYzIiwidHlwZUlkIjoiYTUxOGZlYWItYjJiMy00MzA4LWI2NWEtM2FlNzkzYWRjNmQxIiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3NTU0MTU2MjIsImV4cCI6NDkxMTE3NTYyMn0.gJH47fRTHPe_YUTa4bqm7qADcFmxb9SAvi4YopNn9Tc` | ✅ Working |
| **OpenSea** | `ed56acab1fc14931b8382ab3daadc702` | ✅ Working |

## 🌐 Deployment Steps

### Step 1: Push to GitHub
```bash
# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/pandamania-opensea-netlify.git
git add .
git commit -m "Initial commit with working API keys"
git push -u origin main
```

### Step 2: Deploy to Netlify
1. Go to [Netlify](https://netlify.com/) and sign in
2. Click "New site from Git"
3. Choose GitHub and select your repository
4. Leave build settings empty (not needed for serverless functions)
5. Click "Deploy site"

### Step 3: Set Environment Variables in Netlify
1. In your Netlify dashboard, go to **Site settings** → **Environment variables**
2. Add these exact values:

| Variable | Value |
|----------|-------|
| `MORALIS_API_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6ImU5NTE4YzU5LTdjMDMtNGQyYS1iNDI5LWRjMmU4ODA4MTg0OSIsIm9yZ0lkIjoiNDY1NTYxIiwidXNlcklkIjoiNDc4OTYzIiwidHlwZUlkIjoiYTUxOGZlYWItYjJiMy00MzA4LWI2NWEtM2FlNzkzYWRjNmQxIiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3NTU0MTU2MjIsImV4cCI6NDkxMTE3NTYyMn0.gJH47fRTHPe_YUTa4bqm7qADcFmxb9SAvi4YopNn9Tc` |
| `OPENSEA_API_KEY` | `ed56acab1fc14931b8382ab3daadc702` |

### Step 4: Update Frontend Configuration
1. Get your Netlify site URL (e.g., `https://your-site-name.netlify.app`)
2. Edit `pm-fetch.js` and update line 2:
```javascript
const PM_ENDPOINT = "https://your-site-name.netlify.app/.netlify/functions/opensea";
```

### Step 5: Test Your Live Deployment
1. Visit your Netlify site
2. Test the function directly: `https://your-site.netlify.app/.netlify/functions/opensea?slug=pandamanianftcollection&addr=0x29be0951309805ddcfa90592c3bf765925871344&debug=1`

## 🧪 Test Collections Ready

These collections are ready to test with your deployment:

| Collection | Slug | Contract Address |
|------------|------|------------------|
| PandaMania | `pandamanianftcollection` | `0x29be0951309805ddcfa90592c3bf765925871344` |
| Red Panda Pals | `redpandapals` | `0x870b1fa5d36696af7b3cfa0e2721872efd790b51` |

## 🎯 Quick Test Commands

Once deployed, test these URLs:

```bash
# Test basic function
curl "https://your-site.netlify.app/.netlify/functions/opensea?slug=pandamanianftcollection&addr=0x29be0951309805ddcfa90592c3bf765925871344"

# Test with debug info
curl "https://your-site.netlify.app/.netlify/functions/opensea?slug=pandamanianftcollection&addr=0x29be0951309805ddcfa90592c3bf765925871344&debug=1"
```

## 🚀 Ready to Deploy!

Your project is fully configured and ready for deployment. All API keys are working and tested. Follow the steps above to get your NFT stats fetcher live on the web! 🐼✨
