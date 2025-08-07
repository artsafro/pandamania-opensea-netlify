/**
 * GET /.netlify/functions/opensea?slug=<collection-slug>
 * Env: OPENSEA_API_KEY
 */
const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json"
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: HEADERS, body: "" };
  }

  try {
    const slug = event.queryStringParameters?.slug || "";
    if (!slug) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: "Missing collection slug" }) };

    const key = process.env.OPENSEA_API_KEY;
    if (!key) return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: "Missing OPENSEA_API_KEY env var" }) };

    const h = { "X-API-KEY": key };

    // 1) v2: metadata
    const v2Resp = await fetch(`https://api.opensea.io/api/v2/collections/${encodeURIComponent(slug)}`, { headers: h });
    const v2OK = v2Resp.ok;
    const v2 = v2OK ? await v2Resp.json() : {};

    // 2) v1: full collection (often includes stats)
    const v1FullResp = await fetch(`https://api.opensea.io/api/v1/collection/${encodeURIComponent(slug)}`, { headers: h });
    const v1FullOK = v1FullResp.ok;
    const v1Full = v1FullOK ? await v1FullResp.json() : {};

    // 3) v1: stats-only
    const v1StatsResp = await fetch(`https://api.opensea.io/api/v1/collection/${encodeURIComponent(slug)}/stats`, { headers: h });
    const v1StatsOK = v1StatsResp.ok;
    const v1Stats = v1StatsOK ? await v1StatsResp.json() : {};

    // Prefer v2 metadata, then v1 full
    const meta = {
      name: v2?.name ?? v1Full?.collection?.name ?? null,
      image_url: v2?.image_url ?? v1Full?.collection?.image_url ?? null,
      description: v2?.description ?? v1Full?.collection?.description ?? null
    };

    // Merge stats from best source available
    const s2 = v2?.stats || {};
    const s1full = v1Full?.collection?.stats || {};
    const s1 = v1Stats?.stats || {};

    const floor_price = s2.floor_price ?? s1full.floor_price ?? s1.floor_price ?? null;
    const total_supply = s2.total_supply ?? s1full.total_supply ?? s1.total_supply ?? null;
    const num_owners   = s2.num_owners   ?? s1full.num_owners   ?? s1.num_owners   ?? null;

    // If all calls failed, surface status codes for debugging
    if (!v2OK && !v1FullOK && !v1StatsOK) {
      return {
        statusCode: 502,
        headers: HEADERS,
        body: JSON.stringify({
          error: "OpenSea calls failed",
          detail: { v2Status: v2Resp.status, v1FullStatus: v1FullResp.status, v1StatsStatus: v1StatsResp.status }
        })
      };
    }

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ slug, ...meta, floor_price, total_supply, num_owners })
    };
  } catch (e) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: "Server error", detail: String(e) }) };
  }
};
