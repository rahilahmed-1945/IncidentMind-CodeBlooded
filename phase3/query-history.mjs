// Butterfly / PreMortem — Phase 3b: historical incident recall (the KILLER feature)
// Asks Cognee whether changing a symbol has caused incidents before, by
// traversing code-node -> incident-node in the graph.
//
// GRAPH_COMPLETION is the locked answer (synthesizes the incident history);
// CHUNKS is the provenance fallback (raw stored incident facts, proving the
// answer came from the graph). Run:  node query-history.mjs "User"
// (TEMPORAL was dropped — it 500s on this tenant's Postgres backend.)

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
const DATASET = process.env.BUTTERFLY_DATASET || "butterfly_code_v2";
const HEADERS = { "Content-Type": "application/json", "X-Api-Key": KEY, "X-Tenant-Id": TENANT };

async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method, headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed; try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { ok: res.ok, status: res.status, body: parsed };
}

async function main() {
  const symbol = process.argv[2] || "User";
  const query =
    `Has changing the code symbol \`${symbol}\` caused any production incidents ` +
    `before? If so, describe each incident: when it happened, its severity, what ` +
    `broke, and how it was resolved. How many times has \`${symbol}\` caused incidents?`;

  console.log(`Butterfly Phase 3b — historical recall for: ${symbol}`);
  console.log(`dataset: ${DATASET}\n`);

  for (const st of ["GRAPH_COMPLETION", "CHUNKS"]) {
    console.log(`\n════════ searchType: ${st} ════════`);
    const r = await req("POST", "/api/v1/search", { searchType: st, query, datasets: [DATASET] });
    if (!r.ok) { console.log(`  status ${r.status}: ${JSON.stringify(r.body).slice(0, 300)}`); continue; }
    const out = typeof r.body === "string" ? r.body : JSON.stringify(r.body, null, 2);
    console.log(out.slice(0, 2000));
  }

  console.log(
    `\n\nWin condition: the answer names the real incidents (March SEV-1 + June SEV-2 ` +
    `for User) and says it happened TWICE. That's the historical warning, sourced ` +
    `from the graph. Paste both outputs back.`
  );
}
main();
