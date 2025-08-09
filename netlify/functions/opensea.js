/**
 * GET /.netlify/functions/opensea?slug=<slug>&addr=<contract>&chain=eth[&debug=1]
 * Env: MORALIS_API_KEY (required), OPENSEA_API_KEY (optional)
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
    const cand = v.current ?? v.total ?? v.value ?? v.count ?? v.amount ?? v.supply ?? v.items;
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
    if (!addr) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: "Missing ?addr=<contract-address>" }) };
    if (!moralisKey) return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: "Missing MORALIS_API_KEY env var" }) };

    // Optional metadata from OpenSea (by slug)
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
    const metaUrl  = `${base}/nft/${addr}?chain=${encodeURIComponent(chain)}`;           // NEW: for total_supply fallback
    const floorUrl = `${base}/nft/${addr}/floor-price?chain=${encodeURIComponent(chain)}&marketplace=opensea`;

    // --- Stats (owners, maybe supply)
    const statsResp = await fetch(statsUrl, { headers: mh });
    const statsStatus = statsResp.status;
    const statsJson = statsResp.ok ? await statsResp.json() : null;

    const ownersRaw =
      statsJson?.num_owners ?? statsJson?.owners ?? statsJson?.owner_count ??
      statsJson?.ownerCount ?? statsJson?.ownersCount ?? null;
    const num_owners = toNumberish(ownersRaw);

    let supplyRaw =
      statsJson?.total_supply ?? statsJson?.token_count ?? statsJson?.tokenCount ??
      statsJson?.supply ?? statsJson?.tokens ?? statsJson?.total ?? null;

    // --- Contract metadata (for clean total_supply)
    let metaStatus = null, metaJson = null;
    if (supplyRaw == null) {
      const metaResp = await fetch(metaUrl, { headers: mh });
      metaStatus = metaResp.status;
      metaJson = metaResp.ok ? await metaResp.json() : null;
      supplyRaw = metaJson?.total_supply ?? metaJson?.totalSupply ?? supplyRaw;
    }
    const total_supply = toNumberish(supplyRaw);

    // --- Floor with up to 5 retries on 202
    let floor_price = null, floorStatus = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const resp = await fetch(floorUrl, { headers: mh });
      floorStatus = resp.status;
      if (resp.ok) {
        const floorJson = await resp.json();
        floor_price =
          toNumberish(floorJson.floor_price) ??
          toNumberish(floorJson?.nativePrice?.value) ??
          toNumberish(floorJson?.price?.amount?.decimal) ?? null;
        break;
      }
      if (floorStatus !== 202) break;       // only retry 202 (processing)
      await sleep(600 * (attempt + 1));     // 600ms, 1200ms, 1800ms, ...
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
        statuses: { opensea: osStatus, moralisStats: statsStatus, moralisMeta: metaStatus, moralisFloor: floorStatus },
        endpoints: { statsUrl, metaUrl, floorUrl }
      };
    }

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(body) };
  } catch (e) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: "Server error", detail: String(e) }) };
  }
};
