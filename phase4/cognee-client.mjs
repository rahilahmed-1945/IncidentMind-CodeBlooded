// Butterfly / PreMortem — Phase 4: Cognee client (the proven queries, wrapped)
// Turns the two working Phase 2/3 searches into clean functions the API + UI use.
// Caches responses to disk so UI iteration doesn't re-hit Cognee every time.
//
// Exports: premortem(symbol) -> { symbol, blastRadius, incidents, incidentCount, raw }
//
// Env (same as prior phases): COGNEE_API_BASE, COGNEE_API_KEY, COGNEE_TENANT_ID,
//   BUTTERFLY_DATASET (default butterfly_code_v2)

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  try {
    const raw = readFileSync(join(__dir, ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch { /* env may be set externally */ }
}
loadEnv();

const BASE = (process.env.COGNEE_API_BASE || "").replace(/\/$/, "");
const KEY = process.env.COGNEE_API_KEY || "";
const TENANT = process.env.COGNEE_TENANT_ID || "";
const DATASET = process.env.BUTTERFLY_DATASET || "butterfly_code_v2";

const HEADERS = { "Content-Type": "application/json", "X-Api-Key": KEY, "X-Tenant-Id": TENANT };
const CACHE_DIR = join(__dir, ".cache");
if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });

async function search(searchType, query) {
  const res = await fetch(BASE + "/api/v1/search", {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ searchType, query, datasets: [DATASET] }),
  });
  const text = await res.text();
  let parsed; try { parsed = JSON.parse(text); } catch { parsed = text; }
  if (!res.ok) throw new Error(`search ${searchType} -> ${res.status}: ${JSON.stringify(parsed).slice(0, 200)}`);
  return parsed;
}

// Pull dotted module names like app.api.routes.users out of free text.
function extractModules(text) {
  const s = typeof text === "string" ? text : JSON.stringify(text);
  const found = new Set();
  const re = /\bapp(?:\.[a-zA-Z_][\w]*)+/g;
  let m;
  while ((m = re.exec(s)) !== null) found.add(m[0]);
  return [...found].sort();
}

// Pull incident IDs like INC-2026-03-14-001 out of free text.
// GRAPH_COMPLETION often renders IDs with typographic hyphens (‑ – — −) instead
// of ASCII '-', so normalize all dash variants before matching.
function extractIncidents(text) {
  const s = (typeof text === "string" ? text : JSON.stringify(text))
    .replace(/[‐-―−]/g, "-");
  const ids = new Set();
  const re = /INC-\d{4}-\d{2}-\d{2}-\d{3}/g;
  let m;
  while ((m = re.exec(s)) !== null) ids.add(m[0]);
  return [...ids].sort();
}

function answerText(resp) {
  // Cognee search returns [{ dataset_id, ..., search_result: [ "...md..." ] }].
  // Unwrap search_result first, then fall back to common answer keys.
  if (typeof resp === "string") return resp;
  if (Array.isArray(resp)) return resp.map(answerText).join("\n");
  if (resp && typeof resp === "object") {
    if (Array.isArray(resp.search_result)) return resp.search_result.map(answerText).join("\n");
    return resp.answer || resp.result || resp.text || JSON.stringify(resp);
  }
  return String(resp);
}

export async function premortem(symbol, { useCache = true } = {}) {
  const cacheFile = join(CACHE_DIR, `${symbol.replace(/[^\w]/g, "_")}.json`);
  if (useCache && existsSync(cacheFile)) {
    return JSON.parse(readFileSync(cacheFile, "utf8"));
  }

  const blastQuery =
    `If the code symbol \`${symbol}\` is changed, which modules and components are ` +
    `directly affected? List every dependent module.`;
  const historyQuery =
    `Has changing the code symbol \`${symbol}\` caused any production incidents before? ` +
    `If so, describe each: date, severity, what broke, resolution. How many times total?`;

  const [blastResp, histResp] = await Promise.all([
    search("GRAPH_COMPLETION", blastQuery),
    search("GRAPH_COMPLETION", historyQuery),
  ]);

  const blastText = answerText(blastResp);
  const histText = answerText(histResp);

  const result = {
    symbol,
    blastRadius: extractModules(blastText),
    blastNarrative: blastText,
    incidents: extractIncidents(histText),
    incidentCount: extractIncidents(histText).length,
    historyNarrative: histText,
    raw: { blast: blastResp, history: histResp },
    generatedAt: new Date().toISOString(),
  };

  writeFileSync(cacheFile, JSON.stringify(result, null, 2));
  return result;
}

// CLI: node cognee-client.mjs User
// (pathToFileURL makes the "is main module" check work on Windows too, where
//  argv[1] is a backslash path and import.meta.url is a file:// URL.)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const sym = process.argv[2] || "User";
  const noCache = process.argv.includes("--fresh");
  premortem(sym, { useCache: !noCache })
    .then((r) => {
      console.log(`\nPreMortem for \`${r.symbol}\``);
      console.log(`  blast radius: ${r.blastRadius.length} modules`);
      r.blastRadius.forEach((m) => console.log(`    - ${m}`));
      console.log(`  incidents: ${r.incidentCount} (${r.incidents.join(", ") || "none"})`);
      console.log(`\n  history narrative:\n    ${r.historyNarrative.slice(0, 400)}...`);
    })
    .catch((e) => { console.error("error:", e.message); process.exit(1); });
}
