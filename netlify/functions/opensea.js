/**
 * GET /.netlify/functions/opensea?slug=<slug>&addr=<contract>&chain=eth[&debug=1]
 * Env: MORALIS_API_KEY (required), OPENSEA_API_KEY (optional for metadata)
 */
const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
  "Cache-Control": "no-store"
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function toNumberish(v) {
  if (v == null) return null;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v.replace?.(/,/g, "") ?? v);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof v === "object") {
    const cand = v.current ?? v.value ?? v.count ?? v.total ?? v.amount;
    return cand != null ? toNumberish(cand) : null;
  }
  return null;
}

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

    // Optional metadata from OpenSea
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

    // Moralis endpoints
    const base = "https://deep-index.moralis.io/api/v2.2";
    const mh = { "X-API-Key": moralisKey };

    const statsUrl = `${base}/nft/${addr}/stats?chain=${encodeURIComponent(chain)}`;
    const floorUrl = `${base}/nft/${addr}/floor-price?chain=${encodeURIComponent(chain)}&marketplace=opensea`;

    const statsResp = await fetch(statsUrl, { headers: mh });
    const statsStatus = statsResp.status;
    const statsJson = statsResp.ok ? await statsResp.json() : null;

    // Normalize owners & supply from multiple possible shapes
    const ownersRaw =
      statsJson?.num_owners ??
      statsJson?.owners ??
      statsJson?.owner_count ??
      statsJson?.ownerCount ??
      statsJson?.ownersCount ??
      null;

    const supplyRaw =
      statsJson?.total_supply ??
      statsJson?.token_count ??
      statsJson?.tokenCount ??
      statsJson?.supply ??
      statsJson?.tokens ??
      null;

    const num_owners = toNumberish(ownersRaw);
    const total_supply = toNumberish(supplyRaw);

    // Floor with one retry on 202
    let floorResp = await fetch(floorUrl, { headers: mh });
    let floorStatus = floorResp.status;
    if (floorStatus === 202) {
      await sleep(1200);
      floorResp = await fetch(floorUrl, { headers: mh });
      floorStatus = floorResp.status;
    }
    const floorJson = floorResp.ok ? await floorResp.json() : null;

    let floor_price = null;
    if (floorJson) {
      floor_price =
        toNumberish(floorJson.floor_price) ??
        toNumberish(floorJson?.nativePrice?.value) ??
        toNumberish(floorJson?.price?.amount?.decimal) ??
        null;
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
        endpoints: { statsUrl, floorUrl },
        rawShapes: {
          ownersType: typeof ownersRaw,
          supplyType: typeof supplyRaw
        }
      };
    }

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(body) };
  } catch (e) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: "Server error", detail: String(e) }) };
  }
};
