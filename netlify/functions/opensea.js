/**
 * GET /.netlify/functions/opensea?slug=<collection-slug>[&debug=1]
 * Needs env: OPENSEA_API_KEY
 */
const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
  "Cache-Control": "no-store"
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: HEADERS, body: "" };
  }

  const debug = event.queryStringParameters?.debug === "1";

  try {
    const slug = event.queryStringParameters?.slug || "";
    if (!slug) {
      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: "Missing collection slug" }) };
    }

    const apiKey = process.env.OPENSEA_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: "Missing OPENSEA_API_KEY env var" }) };
    }

    const H = { "X-API-KEY": apiKey };

    // v2: metadata
    const v2Url = `https://api.opensea.io/api/v2/collections/${encodeURIComponent(slug)}`;
    const v2Resp = await fetch(v2Url, { headers: H });
    const v2Status = v2Resp.status;
    const v2Json = v2Resp.ok ? await v2Resp.json() : null;

    // v1: full collection
    const v1FullUrl = `https://api.opensea.io/api/v1/collection/${encodeURIComponent(slug)}`;
    const v1FullResp = await fetch(v1FullUrl, { headers: H });
    const v1FullStatus = v1FullResp.status;
    const v1FullJson = v1FullResp.ok ? await v1FullResp.json() : null;

    // v1: stats only
    const v1StatsUrl = `https://api.opensea.io/api/v1/collection/${encodeURIComponent(slug)}/stats`;
    const v1StatsResp = await fetch(v1StatsUrl, { headers: H });
    const v1StatsStatus = v1StatsResp.status;
    const v1StatsJson = v1StatsResp.ok ? await v1StatsResp.json() : null;

    // pick metadata
    const name =
      v2Json?.name ??
      v1FullJson?.collection?.name ?? null;

    const image_url =
      v2Json?.image_url ??
      v1FullJson?.collection?.image_url ?? null;

    const description =
      v2Json?.description ??
      v1FullJson?.collection?.description ?? null;

    // merge stats
    const s2 = v2Json?.stats || {};
    const s1full = v1FullJson?.collection?.stats || {};
    const s1 = v1StatsJson?.stats || {};

    const floor_price =
      s2.floor_price ?? s1full.floor_price ?? s1.floor_price ?? null;

    const total_supply =
      s2.total_supply ?? s1full.total_supply ?? s1.total_supply ?? null;

    const num_owners =
      s2.num_owners ?? s1full.num_owners ?? s1.num_owners ?? null;

    // If ALL requests failed, bubble that
    if (!v2Resp.ok && !v1FullResp.ok && !v1StatsResp.ok) {
      return {
        statusCode: 502,
        headers: HEADERS,
        body: JSON.stringify({
          error: "OpenSea calls failed",
          statuses: { v2Status, v1FullStatus, v1StatsStatus }
        })
      };
    }

    const result = {
      slug, name, image_url, description,
      floor_price, total_supply, num_owners,
      // helpful hints if null
      hints: {
        floor_price: floor_price === null ? "Floor may be unset OR stats call failed" : undefined,
        total_supply: total_supply === null ? "Supply missing from API" : undefined,
        num_owners: num_owners === null ? "Owners missing from API" : undefined
      }
    };

    if (debug) {
      // include just enough raw info to diagnose, not the full payloads
      result.debug = {
        endpoints: { v2Url, v1FullUrl, v1StatsUrl },
        statuses: { v2Status, v1FullStatus, v1StatsStatus },
        shapes: {
          v2HasStats: !!v2Json?.stats,
          v1FullHasStats: !!v1FullJson?.collection?.stats,
          v1StatsHasStats: !!v1StatsJson?.stats
        }
      };
    }

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(result) };
  } catch (e) {
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ error: "Server error", detail: String(e) })
    };
  }
};
