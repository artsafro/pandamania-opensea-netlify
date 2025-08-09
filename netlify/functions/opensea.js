/**
 * GET /.netlify/functions/opensea?slug=<slug>&addr=<contract>&chain=eth[&debug=1]
 * Env:
 *   MORALIS_API_KEY (required)
 *   OPENSEA_API_KEY (required for OpenSea fallbacks + v2 metadata)
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
    const MORALIS = process.env.MORALIS_API_KEY || "";
    const OPENSEA = process.env.OPENSEA_API_KEY || "";
    if (!addr) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: "Missing ?addr=<contract-address>" }) };
    if (!MORALIS) return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: "Missing MORALIS_API_KEY env var" }) };

    // ---------- Optional: OpenSea v2 metadata (nice name/image/desc)
    let name = null, image_url = null, description = null, osV2Status = null;
    if (slug && OPENSEA) {
      const v2Url = `https://api.opensea.io/api/v2/collections/${encodeURIComponent(slug)}`;
      const v2Resp = await fetch(v2Url, { headers: { "X-API-KEY": OPENSEA } });
      osV2Status = v2Resp.status;
      if (v2Resp.ok) {
        const j = await v2Resp.json();
        name = j?.name ?? null;
        image_url = j?.image_url ?? null;
        description = j?.description ?? null;
      }
    }

    // ---------- Moralis: owners/supply + floor
    const base = "https://deep-index.moralis.io/api/v2.2";
    const mh = { "X-API-Key": MORALIS };

    const statsUrl = `${base}/nft/${addr}/stats?chain=${encodeURIComponent(chain)}`;
    const metaUrl  = `${base}/nft/${addr}?chain=${encodeURIComponent(chain)}`;
    const floorUrl = `${base}/nft/${addr}/floor-price?chain=${encodeURIComponent(chain)}&marketplace=opensea`;

    const statsResp = await fetch(statsUrl, { headers: mh });
    const statsStatus = statsResp.status;
    const statsJson = statsResp.ok ? await statsResp.json() : null;

    const ownersRaw =
      statsJson?.num_owners ?? statsJson?.owners ?? statsJson?.owner_count ??
      statsJson?.ownerCount ?? statsJson?.ownersCount ?? null;
    const num_owners = toNumberish(ownersRaw);

    // supply from stats or contract meta
    let supplyRaw =
      statsJson?.total_supply ?? statsJson?.token_count ?? statsJson?.tokenCount ??
      statsJson?.supply ?? statsJson?.tokens ?? statsJson?.total ?? null;

    let metaStatus = null, metaJson = null;
    if (supplyRaw == null) {
      const metaResp = await fetch(metaUrl, { headers: mh });
      metaStatus = metaResp.status;
      metaJson = metaResp.ok ? await metaResp.json() : null;
      supplyRaw = metaJson?.total_supply ?? metaJson?.totalSupply ?? supplyRaw;
    }
    let total_supply = toNumberish(supplyRaw);

    // floor with up to 5 retries on 202
    let floor_price = null, floorStatus = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const resp = await fetch(floorUrl, { headers: mh });
      floorStatus = resp.status;
      if (resp.ok) {
        const j = await resp.json();
        floor_price =
          toNumberish(j.floor_price) ??
          toNumberish(j?.nativePrice?.value) ??
          toNumberish(j?.price?.amount?.decimal) ?? null;
        break;
      }
      if (floorStatus !== 202) break;   // only backoff on "processing"
      await sleep(600 * (attempt + 1)); // 600ms, 1200ms, ...
    }

    // ---------- OpenSea v1 fallbacks (needs slug + OPENSEA)
    let osV1Status = null, osV1Json = null;
    if (slug && OPENSEA && (total_supply == null || floor_price == null)) {
      const v1Url = `https://api.opensea.io/api/v1/collection/${encodeURIComponent(slug)}/stats`;
      const v1Resp = await fetch(v1Url, { headers: { "X-API-KEY": OPENSEA } });
      osV1Status = v1Resp.status;
      if (v1Resp.ok) {
        osV1Json = await v1Resp.json();
        const s = osV1Json?.stats || {};
        if (total_supply == null) total_supply = toNumberish(s.total_supply);
        if (floor_price == null) floor_price = toNumberish(s.floor_price);
      }
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
        statuses: {
          osV2Meta: osV2Status,
          moralisStats: statsStatus,
          moralisMeta: metaStatus,
          moralisFloor: floorStatus,
          osV1Stats: osV1Status
        },
        endpoints: { statsUrl, metaUrl, floorUrl, osV1StatsUrl: slug ? `https://api.opensea.io/api/v1/collection/${slug}/stats` : null }
      };
    }

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(body) };
  } catch (e) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: "Server error", detail: String(e) }) };
  }
};
