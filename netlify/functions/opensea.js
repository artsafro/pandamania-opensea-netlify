/**
 * GET /.netlify/functions/opensea?slug=<slug>&addr=<contract>&chain=eth[&debug=1][&nofloor=1][&nometa=1]
 *
 * Env (Netlify → Site settings → Environment variables):
 *   MORALIS_API_KEY  (required)
 *   OPENSEA_API_KEY  (required for OpenSea fallbacks)
 *   ALCHEMY_API_KEY  (optional; used ONLY if total_supply still missing on Ethereum)
 */
const VERSION = "alchemy-fallback-1";
const hasAlchemy = !!process.env.ALCHEMY_API_KEY;

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
  "Cache-Control": "no-store"
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const toNumberish = (v) => {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const n = Number(v.replace?.(/,/g, "") ?? v);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof v === "object") {
    const cand = v.current ?? v.total ?? v.value ?? v.count ?? v.amount ?? v.supply ?? v.items;
    return cand != null ? toNumberish(cand) : null;
  }
  return null;
};

const fetchJson = async (url, opts = {}, timeoutMs = 10000) => {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    const status = res.status;
    const ok = res.ok;
    let json = null;
    if (ok) {
      try { json = await res.json(); } catch { json = null; }
    }
    return { status, ok, json };
  } catch (e) {
    return { status: 0, ok: false, json: null, error: String(e) };
  } finally {
    clearTimeout(id);
  }
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: HEADERS, body: "" };
  }

  const qs = event.queryStringParameters || {};
  const slug   = (qs.slug || "").trim();
  const addr   = (qs.addr || "").toLowerCase().trim();
  const chain  = (qs.chain || "eth").toLowerCase().trim();
  const debug  = qs.debug === "1";
  const nofloor = qs.nofloor === "1";  // optional: skip floor calls to save API budget
  const nometa  = qs.nometa === "1";   // optional: skip OpenSea v2 metadata

  try {
    const MORALIS = process.env.MORALIS_API_KEY || "";
    const OPENSEA = process.env.OPENSEA_API_KEY || "";
    const ALCHEMY = process.env.ALCHEMY_API_KEY || "";

    if (!addr)    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: "Missing ?addr=<contract-address>" }) };
    if (!MORALIS) return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: "Missing MORALIS_API_KEY env var" }) };

    let name=null, image_url=null, description=null, osV2Status=null;

    // ---- OpenSea v2 metadata (optional; skip with &nometa=1) ----
    if (!nometa && slug && OPENSEA) {
      const v2Url = `https://api.opensea.io/api/v2/collections/${encodeURIComponent(slug)}`;
      const v2 = await fetchJson(v2Url, { headers: { "X-API-KEY": OPENSEA } }, 8000);
      osV2Status = v2.status;
      if (v2.ok && v2.json) {
        name = v2.json?.name ?? null;
        image_url = v2.json?.image_url ?? null;
        description = v2.json?.description ?? null;
      }
    }

    // ---- Moralis base endpoints ----
    const mBase = "https://deep-index.moralis.io/api/v2.2";
    const mh = { "X-API-Key": MORALIS };
    const statsUrl = `${mBase}/nft/${addr}/stats?chain=${encodeURIComponent(chain)}`;
    const metaUrl  = `${mBase}/nft/${addr}?chain=${encodeURIComponent(chain)}`;

    const stats = await fetchJson(statsUrl, { headers: mh }, 10000);
    const statsStatus = stats.status;
    const statsJson = stats.ok ? stats.json : null;

    const ownersRaw =
      statsJson?.num_owners ?? statsJson?.owners ?? statsJson?.owner_count ??
      statsJson?.ownerCount ?? statsJson?.ownersCount ?? null;
    const num_owners = toNumberish(ownersRaw);

    let supplyRaw =
      statsJson?.total_supply ?? statsJson?.token_count ?? statsJson?.tokenCount ??
      statsJson?.supply ?? statsJson?.tokens ?? statsJson?.total ?? null;

    // If missing, try Moralis metadata as a secondary source
    let metaStatus = null, metaJson = null;
    if (supplyRaw == null) {
      const meta = await fetchJson(metaUrl, { headers: mh }, 10000);
      metaStatus = meta.status;
      metaJson = meta.ok ? meta.json : null;
      supplyRaw = metaJson?.total_supply ?? metaJson?.totalSupply ?? supplyRaw;
    }
    let total_supply = toNumberish(supplyRaw);

    // ---- Floor price via Moralis with gentle retries (unless skipped) ----
    let floor_price = null, moralisFloorStatus = null;
    if (!nofloor) {
      const floorUrl = `${mBase}/nft/${addr}/floor-price?chain=${encodeURIComponent(chain)}&marketplace=opensea`;
      for (let attempt = 0; attempt < 4; attempt++) {
        const resp = await fetchJson(floorUrl, { headers: mh }, 10000);
        moralisFloorStatus = resp.status;
        if (resp.ok && resp.json) {
          floor_price =
            toNumberish(resp.json.floor_price) ??
            toNumberish(resp.json?.nativePrice?.value) ??
            toNumberish(resp.json?.price?.amount?.decimal) ?? null;
          break;
        }
        if (moralisFloorStatus !== 202) break; // 202 = still processing
        await sleep(500 * (attempt + 1));      // 0.5s, 1s, 1.5s backoff
      }
    }

    // ---- OpenSea v1 stats fallback (only if needed) ----
    let osV1Status = null;
    if (slug && OPENSEA && (total_supply == null || (!nofloor && floor_price == null))) {
      const v1Url = `https://api.opensea.io/api/v1/collection/${encodeURIComponent(slug)}/stats`;
      const v1 = await fetchJson(v1Url, { headers: { "X-API-KEY": OPENSEA } }, 8000);
      osV1Status = v1.status;
      if (v1.ok && v1.json?.stats) {
        const s = v1.json.stats;
        if (total_supply == null) total_supply = toNumberish(s.total_supply);
        if (!nofloor && floor_price == null) floor_price = toNumberish(s.floor_price);
      }
    }

    // ---- Alchemy fallback for total_supply (ONLY if still missing, on Ethereum, and key present) ----
    let alchemyStatus = null;
    if (total_supply == null && chain === "eth" && ALCHEMY) {
      const aUrl = `https://eth-mainnet.g.alchemy.com/nft/v2/${ALCHEMY}/getContractMetadata?contractAddress=${addr}`;
      const a = await fetchJson(aUrl, {}, 8000);
      alchemyStatus = a.status;
      if (a.ok && a.json) {
        const sup = a.json?.contractMetadata?.totalSupply ?? a.json?.contract?.totalSupply;
        const supNum = toNumberish(sup);
        if (supNum != null) total_supply = supNum;
      }
    }

    // ---- Final RPC fallback: call totalSupply() via Alchemy JSON-RPC ----
    let alchemyRPCStatus = null;
    if (total_supply == null && chain === "eth" && ALCHEMY) {
      const rpcUrl = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY}`;
      try {
        const rpcRes = await fetch(rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "eth_call",
            params: [
              { to: addr, data: "0x18160ddd" }, // totalSupply() selector
              "latest"
            ]
          })
        });
        alchemyRPCStatus = rpcRes.status;
        if (rpcRes.ok) {
          const rj = await rpcRes.json();
          const hex = rj?.result || null; // e.g., "0x1388"
          if (hex && hex !== "0x") {
            try {
              const n = Number(BigInt(hex));
              if (Number.isFinite(n)) total_supply = n;
            } catch { /* ignore parse errors */ }
          }
        }
      } catch {
        alchemyRPCStatus = "error";
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
        version: VERSION,
        hasAlchemy,
        statuses: {
          osV2Meta: osV2Status,
          moralisStats: statsStatus,
          moralisMeta: metaStatus,
          moralisFloor: nofloor ? "skipped" : moralisFloorStatus,
          osV1Stats: osV1Status,
          alchemyMeta: alchemyStatus,
          alchemyRPC: alchemyRPCStatus
        },
        endpoints: {
          statsUrl, metaUrl,
          floorUrl: nofloor ? null : `${mBase}/nft/${addr}/floor-price?chain=${encodeURIComponent(chain)}&marketplace=opensea`,
          osV1StatsUrl: slug ? `https://api.opensea.io/api/v1/collection/${slug}/stats` : null,
          alchemyUrl: (chain === "eth" && ALCHEMY)
            ? `https://eth-mainnet.g.alchemy.com/nft/v2/[KEY]/getContractMetadata?contractAddress=${addr}`
            : null,
          alchemyRpcUrl: (chain === "eth" && ALCHEMY)
            ? `https://eth-mainnet.g.alchemy.com/v2/[KEY]`
            : null
        },
        toggles: { nofloor, nometa }
      };
    }

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(body) };
  } catch (e) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: "Server error", detail: String(e) }) };
  }
};
