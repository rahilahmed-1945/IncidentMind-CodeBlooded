// Butterfly / PreMortem — Phase 2b: blast-radius query + searchType shootout
// Proves the blast radius comes from COGNEE (search over the cognified graph),
// NOT from reading facts.json. This is the load-bearing recall.
//
// Run:  node query.mjs "User"
//       node query.mjs "get_repository"
//
// GRAPH_COMPLETION is the locked blast-radius searchType (synthesized, complete
// module list from the graph). CHUNKS is kept as a provenance fallback — it
// echoes the raw stored fact, proving the answer came from Cognee, not facts.json.

import { readFileSync } from "node:fs";

function loadEnv() {
  try {
    const raw = readFileSync(new URL("./.env", import.meta.url), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch { console.error("No .env found."); process.exit(1); }
}
loadEnv();

const BASE = (process.env.COGNEE_API_BASE || "").replace(/\/$/, "");
const KEY = process.env.COGNEE_API_KEY || "";
const TENANT = process.env.COGNEE_TENANT_ID || "";
const DATASET = process.env.BUTTERFLY_DATASET || "butterfly_code";

const HEADERS = {
  "Content-Type": "application/json",
  "X-Api-Key": KEY,
  "X-Tenant-Id": TENANT,
};

async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method, headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed; try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { ok: res.ok, status: res.status, body: parsed };
}

// GRAPH_COMPLETION = locked answer; CHUNKS = provenance fallback.
// (INSIGHTS removed — not a valid searchType on this Cognee tenant.)
const SEARCH_TYPES = ["GRAPH_COMPLETION", "CHUNKS"];

async function main() {
  const symbol = process.argv[2] || "User";
  const query =
    `If the code symbol \`${symbol}\` is changed, which modules and components ` +
    `are directly affected? List every dependent module.`;

  console.log(`Butterfly Phase 2b — blast-radius recall for: ${symbol}`);
  console.log(`dataset: ${DATASET}\nquery: ${query}\n`);

  for (const st of SEARCH_TYPES) {
    console.log(`\n════════ searchType: ${st} ════════`);
    const r = await req("POST", "/api/v1/search", {
      searchType: st,
      query,
      datasets: [DATASET],
    });
    if (!r.ok) {
      console.log(`  status ${r.status}: ${JSON.stringify(r.body).slice(0, 300)}`);
      continue;
    }
    const out = typeof r.body === "string"
      ? r.body
      : JSON.stringify(r.body, null, 2);
    console.log(out.slice(0, 1500));
  }

  console.log(
    `\n\nGRAPH_COMPLETION is the locked blast-radius answer; CHUNKS above is the ` +
    `raw stored fact it was synthesized from (provenance).`
  );
}
main();
