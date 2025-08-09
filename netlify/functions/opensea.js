/**
 * GET /.netlify/functions/opensea?slug=<collection-slug>&addr=<contract-address>&chain=eth[&debug=1]
 *
 * Env vars:
 *  - MORALIS_API_KEY (required)  // NEVER hardcode keys
 *  - OPENSEA_API_KEY (optional)  // for nicer metadata by slug
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

  const qs = event.queryStringParameters || {};
  const slug = qs.slug || "";
  const addr = (qs.addr || "").toLowerCase();
  const chain = (qs.chain || "eth").toLowerCase();
  const debug = qs.debug === "1";

  try {
    const moralisKey = process.env.MORALIS_API_KEY || "";
    const openseaKey = process.env.OPENSEA_API_KEY || "";

    if (!addr) {
      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: "Missing ?addr=<contract-address>" }) };
    }
    if (!moralisKey) {
      return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: "Missing MORALIS_API_KEY env var" }) };
    }

    // --- Optional: OpenSea metadata by slug
    let name = null, image_url = null, description = null, osStatus = null;
    if (slug && openseaKey) {
      const osUrl = `https://api.opensea.io/api/v2/collections/${encodeURIComponent(slug)}`;
      const osResp = await fetch(osUrl, { headers: { "X-API-KEY": openseaKey } });
      osStatus = osResp.status;
      if (osResp.ok) {
        const j = await osResp.json();
        name = j?.name ?? null;
        image_url = j?.image_url ?? null;
        description = j?.description ?? null;
      }
    }

    // --- Moralis stats (owners, supply) & floor
    const base = "https://deep-index.moralis.io/api/v2.2";
    const mh = { "X-API-Key": moralisKey };

    const statsUrl = `${base}/nft/${addr}/stats?chain=${encodeURIComponent(chain)}`;
    const floorUrl = `${base}/nft/${addr}/floor-price?chain=${encodeURIComponent(chain)}&marketplace=opensea`;

    const [statsResp, floorResp] = await Promise.all([
      fetch(statsUrl, { headers: mh }),
      fetch(floorUrl, { headers: mh }),
    ]);

    const statsStatus = statsResp.status;
    const floorStatus = floorResp.status;

    const statsJson = statsResp.ok ? await statsResp.json() : null;
    const floorJson = floorResp.ok ? await floorResp.json() : null;

    const num_owners =
      statsJson?.num_owners ?? statsJson?.owners ?? statsJson?.owner_count ?? statsJson?.ownerCount ?? null;

    const total_supply =
      statsJson?.total_supply ?? statsJson?.token_count ?? statsJson?.tokenCount ?? null;

    let floor_price = null;
    if (floorJson) {
      floor_price =
        (typeof floorJson.floor_price === "string" ? parseFloat(floorJson.floor_price) : floorJson.floor_price) ??
        floorJson?.nativePrice?.value ??
        floorJson?.price?.amount?.decimal ?? null;
    }

    const body = {
      slug: slug || null,
      address: addr,
      chain,
      name, image_url, description,
      floor_price, total_supply, num_owners
    };

    if (debug) {
      body.debug = {
        statuses: { opensea: osStatus, moralisStats: statsStatus, moralisFloor: floorStatus },
        endpoints: { statsUrl, floorUrl }
      };
    }

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(body) };
  } catch (e) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: "Server error", detail: String(e) }) };
  }
};