// Butterfly / PreMortem — Phase 2a: ingest facts into Cognee Cloud
// Flow (locked contract from Phase 0):
//   add_text  -> { textData: [...], datasetName }
//   cognify   -> { datasets: [name], runInBackground: true }    (async — see below)
//   status    -> GET /api/v1/datasets/status?dataset=<id>  (polled to completion)
//
// cognify runs in the BACKGROUND and we poll dataset status until
// DATASET_PROCESSING_COMPLETED. A synchronous cognify over a large dataset
// exceeds Node's ~5-min fetch headers timeout (UND_ERR_HEADERS_TIMEOUT) even
// though the server finishes fine; polling short status requests avoids that.
//
// Strategy: group facts by their subject symbol so each add_text chunk is a
// coherent cluster of relationships -> sharper graph, better recall.
//
// Run:  node ingest.mjs ../phase1/facts.json
// Reads creds from ./.env (same shape as Phase 0).

import { readFileSync } from "node:fs";

function loadEnv() {
  try {
    const raw = readFileSync(new URL("./.env", import.meta.url), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    console.error("No .env found. Copy Phase 0's .env here.");
    process.exit(1);
  }
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(60000),
  });
  const text = await res.text();
  let parsed; try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { ok: res.ok, status: res.status, body: parsed };
}

// Resolve the dataset's UUID — the status endpoint keys off the id, not the name.
async function datasetId(name) {
  const r = await req("GET", "/api/v1/datasets");
  const ds = Array.isArray(r.body) ? r.body.find((d) => d.name === name) : null;
  return ds ? ds.id : null;
}

// Group facts so each chunk centers on one symbol.
// A fact mentions symbols in `backticks`; we bucket each fact under the FIRST
// backticked token, which is the subject in our extractor's sentence shape.
function groupBySymbol(facts) {
  const groups = new Map();
  for (const f of facts) {
    const m = f.match(/`([^`]+)`/);
    const key = m ? m[1] : "_misc";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(f);
  }
  return groups;
}

async function main() {
  const factsPath = process.argv[2] || "../phase1/facts.json";
  const raw = JSON.parse(readFileSync(new URL(factsPath, import.meta.url), "utf8"));
  const facts = raw.facts || [];
  if (!facts.length) { console.error("No facts in " + factsPath); process.exit(1); }

  console.log(`Butterfly Phase 2a — ingest`);
  console.log(`facts: ${facts.length}  dataset: ${DATASET}`);

  const groups = groupBySymbol(facts);
  console.log(`grouped into ${groups.size} symbol-chunks`);

  // add_text each chunk (each chunk = one coherent cluster of facts)
  let sent = 0, failed = 0;
  for (const [sym, chunk] of groups) {
    const r = await req("POST", "/api/v1/add_text", {
      textData: chunk,            // array of sentences about this symbol
      datasetName: DATASET,
    });
    if (r.ok) sent++;
    else { failed++; if (failed <= 3) console.log(`  ! add_text failed for ${sym}: ${r.status} ${JSON.stringify(r.body).slice(0,160)}`); }
    if (sent % 20 === 0 && sent) console.log(`  …${sent} chunks ingested`);
  }
  console.log(`ingested ${sent} chunks (${failed} failed)`);

  // cognify in the BACKGROUND — returns immediately with a pipeline run id,
  // so a long graph build never trips the client's fetch timeout.
  console.log(`cognify (background)…`);
  const cog = await req("POST", "/api/v1/cognify", {
    datasets: [DATASET],
    runInBackground: true,
  });
  console.log(`  cognify kickoff: ${cog.status} ${cog.ok ? "started" : JSON.stringify(cog.body).slice(0,200)}`);

  // Poll dataset status until DATASET_PROCESSING_COMPLETED (or an error state).
  const id = await datasetId(DATASET);
  if (!id) {
    console.log(`  ! could not resolve dataset id for "${DATASET}" — skipping status poll.`);
  } else {
    console.log(`  dataset id: ${id}  — polling status…`);
    const seen = (x) => JSON.stringify(x || "").toUpperCase();
    const done = (x) => seen(x).includes("COMPLET");
    const errored = (x) => /ERROR|FAIL/.test(seen(x));
    const deadline = Date.now() + 15 * 60 * 1000;   // generous ceiling
    let s, n = 0;
    while (Date.now() < deadline) {
      const st = await req("GET", `/api/v1/datasets/status?dataset=${encodeURIComponent(id)}`);
      s = st.body;
      console.log(`  [poll ${++n}] ${JSON.stringify(s).slice(0,160)}`);
      if (done(s) || errored(s)) break;
      await sleep(10000);
    }
    console.log(
      done(s) ? `  ✅ DATASET_PROCESSING_COMPLETED`
      : errored(s) ? `  ⚠ cognify reported an error state`
      : `  … still processing (poll ceiling reached)`
    );
  }

  console.log(`\nDone. Next: node query.mjs "User"  to test blast-radius recall.`);
}
main();
