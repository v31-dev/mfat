import express from "express";

import { cache, refreshNAVCache } from "../lib/cache.js";

const router = express.Router();

// Fuzzy search funds
router.get("/search", (req, res) => {
  const { q } = req.query;

  if (!q || q.length < 1) {
    return res.json([]);
  }

  try {
    const results = cache.fuse.search(q).map((r) => r.item);
    res.json(results);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: "Search failed" });
  }
});

// Get details for specified scheme code
router.get("/mf/:schemeCode", async (req, res) => {
  let { schemeCode } = req.params;
  schemeCode = parseInt(schemeCode, 10);

  const fund = cache.funds.find((f) => f.schemeCode === schemeCode);
  // Check if it is a valid code
  if (!fund) {
    return res.status(404).json({ error: "Scheme code not found" });
  }

  res.json(fund);
});

// Get NAV history for specified scheme code
router.get("/nav/:schemeCode", async (req, res) => {
  let { schemeCode } = req.params;
  schemeCode = parseInt(schemeCode, 10);

  // Check if it is a valid code
  if (!cache.funds.find((f) => f.schemeCode === schemeCode)) {
    return res.status(404).json({ error: "Scheme code not found" });
  }

  // Get from cache if available otherwise return null for that scheme code
  if (!cache.nav[schemeCode]) {
    // Trigger refresh for this scheme code if not in cache
    await refreshNAVCache(schemeCode);
  }

  res.json(cache.nav[schemeCode]);
});

export default router;
