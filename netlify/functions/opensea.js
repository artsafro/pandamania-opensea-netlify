/**
 * Netlify Function: OpenSea Collection Proxy
 * Usage: /.netlify/functions/opensea?slug=bamboo-buddies
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
    const slug = (event.queryStringParameters && event.queryStringParameters.slug) || "";
    if (!slug) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: "Missing collection slug" }) };

    const apiKey = process.env.OPENSEA_API_KEY;
    if (!apiKey) return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: "Missing OPENSEA_API_KEY env var" }) };

    const url = `https://api.opensea.io/api/v2/collections/${encodeURIComponent(slug)}`;
    const resp = await fetch(url, { headers: { "X-API-KEY": apiKey } });

    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      return { statusCode: resp.status, headers: HEADERS, body: JSON.stringify({ error: "Failed to fetch from OpenSea", status: resp.status, detail: txt }) };
    }

    const data = await resp.json();
    const payload = {
      name: data?.name ?? null,
      slug,
      image_url: data?.image_url ?? null,
      description: data?.description ?? null,
      floor_price: data?.stats?.floor_price ?? null,
      total_supply: data?.stats?.total_supply ?? null,
      num_owners: data?.stats?.num_owners ?? null
    };

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(payload) };
  } catch (err) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: "Server error", detail: String(err) }) };
  }
};