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

// Candidate endpoint shapes we probe. Cloud REST may use any of these.
// We'll learn which one your tenant actually implements.
const INGEST_CANDIDATES = [
  { path: "/api/v1/remember", body: { data: "Butterfly test: validateUser lives in auth-service.", dataset_name: "butterfly_test" } },
  { path: "/api/v1/add", body: { data: "Butterfly test: validateUser lives in auth-service.", dataset_name: "butterfly_test" } },
  { path: "/v1/remember", body: { data: "Butterfly test: validateUser lives in auth-service.", dataset_name: "butterfly_test" } },
  { path: "/remember", body: { data: "Butterfly test: validateUser lives in auth-service.", dataset_name: "butterfly_test" } },
];

const RECALL_CANDIDATES = [
  { path: "/api/v1/recall", body: { query_text: "Where does validateUser live?", datasets: ["butterfly_test"] } },
  { path: "/api/v1/search", body: { query_text: "Where does validateUser live?", datasets: ["butterfly_test"] } },
  { path: "/v1/recall", body: { query_text: "Where does validateUser live?", datasets: ["butterfly_test"] } },
  { path: "/recall", body: { query: "Where does validateUser live?" } },
];

async function main() {
  console.log("Butterfly Phase 0 — Cognee Cloud handshake");
  console.log("Base:", BASE);
  console.log("Tenant:", TENANT);
  console.log("Key:", KEY.slice(0, 6) + "…(hidden)");

  // Step 1: sanity — can we reach the tenant at all? Try a couple of harmless GETs.
  console.log("\n=== STEP 1: reachability ===");
  await show("GET / (root)", await tryReq("GET", "/"));
  await show("GET /api/v1/datasets (list datasets)", await tryReq("GET", "/api/v1/datasets"));
  await show("GET /health", await tryReq("GET", "/health"));

  // Step 2: try to ingest ("remember") — find the endpoint that works.
  console.log("\n=== STEP 2: ingest (remember) ===");
  let ingestOK = null;
  for (const c of INGEST_CANDIDATES) {
    const r = await show(`POST ${c.path}`, await tryReq("POST", c.path, c.body));
    if (r.ok || (r.status && r.status !== 404 && r.status !== 405)) { ingestOK = c; break; }
  }
  if (ingestOK) {
    console.log(`\n   → ingest endpoint that responded: ${ingestOK.path}`);
  } else {
    console.log("\n   → none of the guessed ingest endpoints worked. Check your Swagger and paste me the real one.");
  }

  // Give the pipeline a moment (Cloud indexes async).
  console.log("\n   waiting 8s for indexing…");
  await sleep(8000);

  // Step 3: try to recall/search.
  console.log("\n=== STEP 3: recall (search) ===");
  let recallOK = null;
  for (const c of RECALL_CANDIDATES) {
    const r = await show(`POST ${c.path}`, await tryReq("POST", c.path, c.body));
    if (r.ok || (r.status && r.status !== 404 && r.status !== 405)) { recallOK = c; break; }
  }

  // Summary
  console.log("\n=== SUMMARY ===");
  console.log("ingest endpoint:", ingestOK ? ingestOK.path : "UNKNOWN — check Swagger");
  console.log("recall endpoint:", recallOK ? recallOK.path : "UNKNOWN — check Swagger");
  console.log(
    "\nNext: paste the STEP 2 and STEP 3 outputs back to me. I'll lock every later phase to your real API shape.\n" +
    "If everything 404'd, open your tenant Swagger (the /docs URL in your dashboard) and paste me the ingest + search endpoint names + request bodies."
  );
}

main();
