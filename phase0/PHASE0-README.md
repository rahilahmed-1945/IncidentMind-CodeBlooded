# Phase 0 — Cognee Cloud handshake

Goal: prove your Cognee Cloud access works and discover the exact API shape,
before we build anything on it.

## Steps

1. Copy the template and fill in your real key:
   ```
   cp .env.example .env
   ```
   Then edit `.env` and paste your real `COGNEE_API_KEY`.
   (Base URL and Tenant ID are already prefilled from your dashboard — double-check them.)

2. Make sure `.env` is gitignored (it already is here). Never commit it.

3. Run the test (needs Node 18+; no npm install required):
   ```
   node cognee-test.mjs
   ```

## What it does

- Checks it can reach your tenant.
- Tries several likely "ingest / remember" endpoints and reports which responds.
- Waits for indexing, then tries several "recall / search" endpoints.
- Prints raw responses so we can lock the real API shape.

## What to send back to me

Paste the **STEP 2** and **STEP 3** output blocks. From those I'll know:
- the exact ingest endpoint + request body your tenant wants
- the exact recall endpoint + response shape

If everything returned 404/405, open your tenant's Swagger docs
(the `/docs` URL shown on your API Keys page) and paste me the names +
request bodies of the ingest and search endpoints. Then I'll rewrite this
script to match exactly, and we move to Phase 1.

## Success gate

We're done with Phase 0 when a `recall`/`search` call returns the test fact
("validateUser lives in auth-service"). Don't start Phase 1 until that works.
