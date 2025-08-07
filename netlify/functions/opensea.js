/**
 * GET /.netlify/functions/opensea?slug=<collection-slug>
 * Needs env: OPENSEA_API_KEY
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
    if (!slug) {
      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: "Missing collection slug" }) };
    }

    const apiKey = process.env.OPENSEA_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: "Missing OPENSEA_API_KEY env var" }) };
    }

    // 1) v2 collection (metadata)
    const v2Url = `https://api.opensea.io/api/v2/collections/${encodeURIComponent(slug)}`;
    const v2Resp = await fetch(v2Url, { headers: { "X-API-KEY": apiKey } });
    const v2Ok = v2Resp.ok;
    const v2 = v2Ok ? await v2Resp.json() : {};

    // 2) v1 stats (fallback for floor/owners/supply)
    //    v1 returns: { stats: { floor_price, num_owners, total_supply, ... } }
    const v1Url = `https://api.opensea.io/api/v1/collection/${encodeURIComponent(slug)}/stats`;
    const v1Resp = await fetch(v1Url, { headers: { "X-API-KEY": apiKey } });
    const v1Ok = v1Resp.ok;
    const v1 = v1Ok ? await v1Resp.json() : {};

    // prefer v2 if present, else fallback to v1.stats
    const floor_price = v2?.stats?.floor_price ?? v1?.stats?.floor_price ?? null;
    const total_supply = v2?.stats?.total_supply ?? v1?.stats?.total_supply ?? null;
    const num_owners   = v2?.stats?.num_owners   ?? v1?.stats?.num_owners   ?? null;

    const payload = {
      name: v2?.name ?? null,
      slug,
      image_url: v2?.image_url ?? null,
      description: v2?.description ?? null,
      floor_price,
      total_supply,
      num_owners
    };

    // If both calls failed, bubble an error for easier debugging
    if (!v2Ok && !v1Ok) {
      return {
        statusCode: 502,
        headers: HEADERS,
        body: JSON.stringify({ error: "OpenSea calls failed", detail: { v2Status: v2Resp.status, v1Status: v1Resp.status } })
      };
    }

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(payload) };
  } catch (err) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: "Server error", detail: String(err) }) };
  }
};
