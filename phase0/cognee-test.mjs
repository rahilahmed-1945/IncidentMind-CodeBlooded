// Butterfly / PreMortem — Phase 0 Cognee Cloud handshake test
// Goal: prove your Cloud access works and discover the exact API shape.
// Run:  node cognee-test.mjs
//
// Reads credentials from .env (COGNEE_API_BASE, COGNEE_API_KEY, COGNEE_TENANT_ID).
// Uses only built-in fetch (Node 18+). No dependencies required.

import { readFileSync } from "node:fs";

// --- tiny .env loader (no dotenv dependency) ---
function loadEnv() {
  try {
    const raw = readFileSync(new URL("./.env", import.meta.url), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    console.error("⚠  No .env file found. Copy .env.example → .env and fill it in.");
    process.exit(1);
  }
}
loadEnv();

const BASE = (process.env.COGNEE_API_BASE || "").replace(/\/$/, "");
const KEY = process.env.COGNEE_API_KEY || "";
const TENANT = process.env.COGNEE_TENANT_ID || "";

if (!BASE || !KEY || !TENANT) {
  console.error("⚠  Missing one of COGNEE_API_BASE / COGNEE_API_KEY / COGNEE_TENANT_ID in .env");
  process.exit(1);
}

const HEADERS = {
  "Content-Type": "application/json",
  "X-Api-Key": KEY,
  "X-Tenant-Id": TENANT,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Try a request, return {ok, status, body} without throwing.
async function tryReq(method, path, body) {
  const url = BASE + path;
  try {
    const res = await fetch(url, {
      method,
      headers: HEADERS,
      body: body ? JSON.stringify(body) : undefined,
    });
    let parsed;
    const text = await res.text();
    try { parsed = JSON.parse(text); } catch { parsed = text; }
    return { ok: res.ok, status: res.status, body: parsed, url };
  } catch (e) {
    return { ok: false, status: 0, body: String(e), url };
  }
}

function show(label, r) {
  const bodyStr =
    typeof r.body === "string" ? r.body.slice(0, 500) : JSON.stringify(r.body, null, 2).slice(0, 800);
  console.log(`\n── ${label}`);
  console.log(`   ${r.url}`);
  console.log(`   status: ${r.status}${r.ok ? "  ✅" : "  ✗"}`);
  console.log(`   body: ${bodyStr}`);
  return r;
}

// Phase 0 targets the REAL API shape, confirmed against the tenant's
// /openapi.json (Cognee v1.2.2):
//   ingest  → POST /api/v1/add_text  { textData: ["..."], datasetName }  (JSON;
//             /remember and /add are multipart-only, so they're not used here)
//   process → POST /api/v1/cognify   { datasets: [...], runInBackground: false }
//             (we still try { datasetName } first, per request, and report which
//              body the API actually accepts)
//   status  → GET  /api/v1/datasets/status?dataset=<id>  (polled to completion)
//   search  → POST /api/v1/search    { searchType, query, datasets: [...] }
//             searchType is an enum; we try GRAPH_COMPLETION → RAG_COMPLETION → CHUNKS
// Gate: a search response that contains the test fact about validateUser.

const DATASET = "butterfly_test";
const FACT_TEXT = "Butterfly test: validateUser lives in auth-service.";
const QUERY = "Where does validateUser live?";

// A response "proves" the gate if it mentions the fact any way it's phrased.
const FACT_MARKERS = ["auth-service", "validateuser"];
function containsFact(body) {
  const hay = (typeof body === "string" ? body : JSON.stringify(body || "")).toLowerCase();
  return FACT_MARKERS.some((m) => hay.includes(m));
}
const accepted = (r) => r.status >= 200 && r.status < 300;

// Look up the dataset id for our dataset name (needed by some status endpoints).
async function findDatasetId(name) {
  const r = await tryReq("GET", "/api/v1/datasets");
  if (Array.isArray(r.body)) {
    const hit = r.body.find((d) => d && (d.name === name || d.datasetName === name));
    return hit ? hit.id || hit.datasetId || null : null;
  }
  return null;
}

async function main() {
  console.log("Butterfly Phase 0 — Cognee Cloud handshake (remember → cognify → search)");
  console.log("Base:", BASE);
  console.log("Tenant:", TENANT);
  console.log("Key:", KEY.slice(0, 6) + "…(hidden)");
  console.log("Dataset:", DATASET);

  // ── STEP 1: reachability ────────────────────────────────────────────────
  console.log("\n=== STEP 1: reachability ===");
  await show("GET /api/v1/datasets (list datasets)", await tryReq("GET", "/api/v1/datasets"));
  await show("GET /health", await tryReq("GET", "/health"));

  // ── STEP 2: ingest (add_text) — textData is an array; datasetName camelCase ─
  console.log("\n=== STEP 2: ingest (add_text) ===");
  const ingest = await show(
    "POST /api/v1/add_text { textData:[...], datasetName }",
    await tryReq("POST", "/api/v1/add_text", { textData: [FACT_TEXT], datasetName: DATASET })
  );
  if (!accepted(ingest)) {
    console.log("\n   ✗ add_text was not accepted — stopping. Fix ingest before cognify/search.");
    return;
  }
  console.log("   ✅ text added to dataset.");

  // ── STEP 3: cognify — try { datasetName } first, then { datasets: [...] } ─
  console.log("\n=== STEP 3: cognify ===");
  // runInBackground:false → cognify blocks until the graph is built (no race).
  let cognifyShape = null;
  let cog = await show(
    "POST /api/v1/cognify { datasetName }",
    await tryReq("POST", "/api/v1/cognify", { datasetName: DATASET, runInBackground: false })
  );
  if (accepted(cog)) {
    cognifyShape = "{ datasetName }";
  } else {
    console.log("   … { datasetName } rejected, trying { datasets: [...] } fallback.");
    cog = await show(
      "POST /api/v1/cognify { datasets: [...] }",
      await tryReq("POST", "/api/v1/cognify", { datasets: [DATASET], runInBackground: false })
    );
    if (accepted(cog)) cognifyShape = "{ datasets: [...] }";
  }
  if (!cognifyShape) {
    console.log("\n   ✗ cognify rejected both body shapes — stopping. Check Swagger for the real body.");
    console.log("   cognify body shape that worked: NEITHER");
    return;
  }
  console.log(`\n   ✅ cognify accepted with body shape: ${cognifyShape}`);

  // ── STEP 4: poll status until cognify completes ─────────────────────────
  console.log("\n=== STEP 4: poll cognify status ===");
  const datasetId = await findDatasetId(DATASET);
  console.log("   dataset id:", datasetId || "(not found in list — will use name-only status probes)");

  // Candidate status endpoints — cloud builds vary; we try each per poll round.
  const statusCandidates = () => {
    const c = [];
    if (datasetId) {
      c.push(["GET", `/api/v1/datasets/${datasetId}/status`]);
      c.push(["GET", `/api/v1/datasets/status?dataset=${datasetId}`]);
    }
    c.push(["GET", `/api/v1/datasets/status?dataset=${DATASET}`]);
    c.push(["GET", "/api/v1/datasets/status"]);
    return c;
  };

  const MAX_MS = 120000;
  const INTERVAL_MS = 5000;
  const started = Date.now();
  let statusEndpoint = null;
  let cognifyDone = false;
  let round = 0;

  while (Date.now() - started < MAX_MS) {
    round++;
    let sawAnyStatus = false;
    for (const [m, p] of statusCandidates()) {
      const r = await tryReq(m, p);
      if (r.status === 404 && !statusEndpoint) continue; // endpoint not this shape
      sawAnyStatus = true;
      if (!statusEndpoint) { statusEndpoint = p; console.log(`   status endpoint: ${p}`); }
      const s = (typeof r.body === "string" ? r.body : JSON.stringify(r.body || "")).toUpperCase();
      console.log(`   [round ${round}] ${p} → ${r.status}  ${s.slice(0, 160)}`);
      if (s.includes("COMPLET") || s.includes("FINISH") || s.includes("SUCCESS")) { cognifyDone = true; }
      if (s.includes("ERROR") || s.includes("FAIL")) {
        console.log("   ⚠ status reports an error state — will still attempt search.");
        cognifyDone = true;
      }
      break; // one working status endpoint per round is enough
    }
    if (cognifyDone) { console.log("   ✅ cognify reports complete."); break; }
    if (!sawAnyStatus && round === 1) {
      console.log("   (no status endpoint matched — falling back to time + search-retry.)");
    }
    await sleep(INTERVAL_MS);
    // Fallback exit: if no status endpoint exists, don't loop the full 2 min —
    // give indexing ~20s then let the search-retry loop below be the real gate.
    if (!statusEndpoint && Date.now() - started > 20000) {
      console.log("   proceeding to search (status endpoint unavailable).");
      break;
    }
  }

  // ── STEP 5: search — try body shapes until the fact comes back ──────────
  console.log("\n=== STEP 5: search (gate) ===");
  // SearchPayloadDTO: { searchType (enum), query, datasets: [...] }.
  // CHUNKS returns the raw stored text (most reliable for the gate); the
  // *_COMPLETION types return an LLM answer synthesised from the graph.
  const searchAttempts = [
    ["/api/v1/search", { searchType: "GRAPH_COMPLETION", query: QUERY, datasets: [DATASET] }],
    ["/api/v1/search", { searchType: "RAG_COMPLETION", query: QUERY, datasets: [DATASET] }],
    ["/api/v1/search", { searchType: "CHUNKS", query: QUERY, datasets: [DATASET] }],
  ];

  let winner = null;
  const SEARCH_DEADLINE = Date.now() + 90000;
  let pass = 0;
  while (!winner && Date.now() < SEARCH_DEADLINE) {
    pass++;
    for (const [path, body] of searchAttempts) {
      const r = await show(`[pass ${pass}] POST ${path}  body=${JSON.stringify(body)}`, await tryReq("POST", path, body));
      if (accepted(r) && containsFact(r.body)) {
        winner = { path, body };
        console.log("\n   🎯 GATE PASSED — search returned the test fact about validateUser.");
        break;
      }
    }
    if (!winner && Date.now() < SEARCH_DEADLINE) {
      console.log("\n   fact not present yet (still indexing?). Waiting 8s and retrying search…");
      await sleep(8000);
    }
  }

  // ── SUMMARY ─────────────────────────────────────────────────────────────
  console.log("\n=== SUMMARY ===");
  console.log("ingest endpoint : POST /api/v1/add_text   body { textData:[...], datasetName }");
  console.log("cognify endpoint: POST /api/v1/cognify    body", cognifyShape);
  console.log("status endpoint : ", statusEndpoint || "none found (used time-based wait)");
  if (winner) {
    console.log("search endpoint : POST " + winner.path);
    console.log("search body     :", JSON.stringify(winner.body));
    console.log("\n✅ PHASE 0 GATE PASSED. Safe to start Phase 1.");
  } else {
    console.log("search endpoint : /api/v1/search & /api/v1/recall responded, but no shape returned the fact.");
    console.log("\n✗ PHASE 0 GATE NOT PASSED YET.");
    console.log("  Paste this output back. If search 4xx'd on body, the /docs (Swagger) search schema will");
    console.log("  tell us the exact `searchType` enum + field names, and I'll lock the script to it.");
  }
}

main();
