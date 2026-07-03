// Butterfly / PreMortem — Phase 4: Express endpoint
// Mount this into IncidentMind's existing Express server (or run standalone).
// POST /premortem { symbol } -> { symbol, blastRadius[], incidents[], incidentCount, ... }
//
// Standalone run:  node server-premortem.mjs   (listens on PORT or 3100)

import express from "express";
import cors from "cors";
import { pathToFileURL } from "node:url";
import { premortem } from "./cognee-client.mjs";

export function mountPremortem(app) {
  app.post("/premortem", express.json(), async (req, res) => {
    const symbol = (req.body && req.body.symbol || "").trim();
    if (!symbol) return res.status(400).json({ error: "symbol required" });
    const fresh = req.body.fresh === true; // bypass cache when true
    try {
      const result = await premortem(symbol, { useCache: !fresh });
      res.json(result);
    } catch (e) {
      res.status(502).json({ error: "cognee query failed", detail: e.message });
    }
  });
  return app;
}

// Standalone mode (so you can build the UI before touching IncidentMind's server)
// (pathToFileURL keeps this main-module check working on Windows too.)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const app = express();
  app.use(cors());
  mountPremortem(app);
  app.get("/health", (_req, res) => res.json({ ok: true }));
  const PORT = process.env.PORT || 3100;
  app.listen(PORT, () => console.log(`Butterfly premortem API on :${PORT}`));
}
