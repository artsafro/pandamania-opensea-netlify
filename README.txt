
# Moralis + OpenSea Netlify Function (for PandaMania)

This function serves NFT stats by **contract** using Moralis, and (optionally) metadata by **slug** using OpenSea v2.

## Deploy
1) Upload this folder to a GitHub repo and connect it to Netlify (Add new site → Import from Git).
2) In Netlify → Site settings → Environment variables:
   - MORALIS_API_KEY = <your Moralis key>
   - (Optional) OPENSEA_API_KEY = <your OpenSea key>
   - Select **All deploy contexts** and Save.
3) Trigger a deploy (or Clear cache & deploy).

## Test
Open `moralis-test.html` locally or host it; it calls the function at:
https://nft-stats-fetcher.netlify.app/.netlify/functions/opensea?slug=<slug>&addr=<contract>&chain=eth

## Endpoint usage
/.netlify/functions/opensea?slug=<slug>&addr=<contract>&chain=eth
Add `&debug=1` to see status codes.

## Security
Never paste API keys into code. Keep them only in Netlify env vars.
