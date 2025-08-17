// Point to YOUR Netlify function — full URL, not relative
const PM_ENDPOINT = "https://visionary-pegasus-4ccd32.netlify.app/.netlify/functions/opensea";

// Simple formatters
const fmtNum = (v) => (v == null || isNaN(Number(v)) ? "—" : Number(v).toLocaleString());
const fmtEth = (v) => (v == null || isNaN(Number(v)) ? "—" : (Number(v) >= 0.01 ? Number(v).toFixed(3) : Number(v).toPrecision(2)).replace(/0+$/,'').replace(/\.$/, ''));

/**
 * Works with BOTH:
 *  A) our Beaver block (single .pm-line)
 *  B) a 3-span layout: .floor, .items, .owners
 *
 * @param {string} containerId - element id of the card
 * @param {string} slug - OpenSea slug
 * @param {string} addr - contract address
 * @param {string} chain - default 'eth'
 */
async function pmFetchStats(containerId, slug, addr, chain = "eth") {
  const el = document.getElementById(containerId);
  if (!el) return;

  const line = el.querySelector(".pm-line");
  if (line) line.textContent = "Loading…";

  try {
    const url = `${PM_ENDPOINT}?slug=${encodeURIComponent(slug)}&addr=${encodeURIComponent(addr)}&chain=${encodeURIComponent(chain)}`;
    const res = await fetch(url, { cache: "no-store" });
    const d = await res.json();
    if (!res.ok) throw new Error(d?.error || "Request failed");

    const items  = d.total_supply;
    const owners = d.num_owners;
    const floor  = d.floor_price;

    // 3-span layout support
    const spanFloor  = el.querySelector(".floor");
    const spanItems  = el.querySelector(".items");
    const spanOwners = el.querySelector(".owners");
    if (spanFloor)  spanFloor.textContent  = fmtEth(floor);
    if (spanItems)  spanItems.textContent  = fmtNum(items);
    if (spanOwners) spanOwners.textContent = fmtNum(owners);

    // Single-line layout support
    if (line) {
      line.innerHTML =
        `🧩 Items: ${fmtNum(items)}<br>` +
        `👥 Holders: ${fmtNum(owners)}<br>` +
        `💰 Floor: ${fmtEth(floor)} ETH`;
      line.classList.remove("pm-err");
    }
  } catch (e) {
    console.error("pmFetchStats error:", e);
    if (line) {
      line.classList.add("pm-err");
      line.textContent = `Error: ${e.message}`;
    }
  }
}
