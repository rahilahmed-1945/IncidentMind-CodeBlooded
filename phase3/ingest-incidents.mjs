// Butterfly / PreMortem — Phase 3a: ingest incident history into the SAME graph
// Incidents become nodes linked to code symbols, so a query about `User` can
// traverse code-node -> incident-node ("this area has hurt us before").
//
// Uses the proven background-cognify + polling path.
// Run:  node ingest-incidents.mjs ./incidents.json

import { readFileSync } from "node:fs";

function loadEnv() {
  try {
    const raw = readFileSync(new URL("./.env", import.meta.url), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch { console.error("No .env found (copy phase2/.env here)."); process.exit(1); }
}
loadEnv();

const BASE = (process.env.COGNEE_API_BASE || "").replace(/\/$/, "");
const KEY = process.env.COGNEE_API_KEY || "";
const TENANT = process.env.COGNEE_TENANT_ID || "";
// IMPORTANT: same dataset as the code graph, so incidents link to code nodes.
const DATASET = process.env.BUTTERFLY_DATASET || "butterfly_code_v2";

const HEADERS = { "Content-Type": "application/json", "X-Api-Key": KEY, "X-Tenant-Id": TENANT };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function req(method, path, body, timeoutMs = 60000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(BASE + path, {
      method, headers: HEADERS,
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    const text = await res.text();
    let parsed; try { parsed = JSON.parse(text); } catch { parsed = text; }
    return { ok: res.ok, status: res.status, body: parsed };
  } finally { clearTimeout(t); }
}

async function datasetId() {
  const r = await req("GET", "/api/v1/datasets");
  if (Array.isArray(r.body)) {
    const d = r.body.find((x) => x.name === DATASET || x.dataset_name === DATASET);
    return d ? (d.id || d.dataset_id) : null;
  }
  return null;
}

async function main() {
  const path = process.argv[2] || "./incidents.json";
  const data = JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
  const incidents = data.incidents || [];
  console.log(`Butterfly Phase 3a — ingest ${incidents.length} incidents into ${DATASET}`);

  // one add_text per incident (each incident = one coherent cluster)
  let sent = 0;
  for (const inc of incidents) {
    const r = await req("POST", "/api/v1/add_text", {
      textData: inc.facts,
      datasetName: DATASET,
    });
    if (r.ok) { sent++; console.log(`  ingested ${inc.id} (${inc.symbol})`); }
    else console.log(`  ! failed ${inc.id}: ${r.status} ${JSON.stringify(r.body).slice(0,160)}`);
  }
  console.log(`ingested ${sent}/${incidents.length} incidents`);

  // re-cognify in background so incidents get woven into the existing graph
  console.log(`re-cognify (background)…`);
  const cog = await req("POST", "/api/v1/cognify", { datasets: [DATASET], runInBackground: true });
  console.log(`  cognify kickoff: ${cog.status}`);

  const id = await datasetId();
  if (!id) { console.log("  (couldn't resolve dataset id to poll; check status manually)"); return; }
  for (let i = 0; i < 90; i++) {
    await sleep(10000);
    const st = await req("GET", `/api/v1/datasets/status?dataset=${encodeURIComponent(id)}`);
    const val = st.body && typeof st.body === "object" ? Object.values(st.body)[0] : st.body;
    process.stdout.write(`  poll ${i + 1}: ${val}\n`);
    if (String(val).includes("COMPLETED")) { console.log("✓ incidents woven into graph"); break; }
    if (String(val).includes("ERROR") || String(val).includes("FAILED")) { console.log("✗ processing error"); break; }
  }
  console.log(`\nNext: node query-history.mjs "User"`);
}
main();
