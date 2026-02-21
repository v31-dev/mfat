import cron from "node-cron";
import Fuse from "fuse.js";

import { fetchAllFunds, fetchNAVHistory } from "./api.js";

let cache = {
  funds: [], // { schemeCode, schemeName, isinGrowth }
  nav: {}, // { schemeCode: [{ date, nav }, ...] }
  fuse: null,
  refreshPromises: {}, // Track in-flight API requests per schemeCode
};

// This is a lazy cache implementation. NAV data is fetched on demand when client
// requests for a scheme code that's not in cache
// The promise is tracked to avoid multiple simultaneous requests for the same scheme code
async function refreshNAVCache(schemeCode) {
  // Return existing promise if request is already in flight
  if (cache.refreshPromises[schemeCode]) {
    return cache.refreshPromises[schemeCode];
  }

  // Create new promise for this schemeCode
  cache.refreshPromises[schemeCode] = (async () => {
    try {
      const navHistory = await fetchNAVHistory(schemeCode);
      cache.nav[schemeCode] = navHistory;
      console.log(
        `[NAV CACHE] Updated NAV for schemeCode ${schemeCode} with ${navHistory.length} entries`,
      );
    } catch (error) {
      console.error(
        `[NAV CACHE] Error updating NAV for schemeCode ${schemeCode}:`,
        error.message,
      );
    } finally {
      // Clean up promise after request completes
      delete cache.refreshPromises[schemeCode];
    }
  })();

  return cache.refreshPromises[schemeCode];
}

async function refreshFundCache() {
  // Fetch all funds
  const funds = await fetchAllFunds();

  // Update cache
  cache.funds = funds;

  // Update fuse
  cache.fuse = new Fuse(funds, {
    keys: ["schemeCode", "schemeName", "isinGrowth"],
    threshold: 0.3,
    distance: 50,
    ignoreLocation: true,
    includeScore: true,
    minMatchCharLength: 2,
  });
  // Clear the NAV cache since data is updated daily
  cache.nav = {};

  console.log(`[FUND CACHE] Cache refreshed with ${funds.length} funds`);
}

// Initialize cache
async function initializeCache() {
  console.log("[FUND CACHE] Initializing");
  try {
    await refreshFundCache();
    console.log("[FUND CACHE] Initialization complete");
  } catch (error) {
    console.error("[FUND CACHE] Error initializing:", error.message);
  }

  // Schedule cache refresh every 24 hours
  cron.schedule("0 0 * * *", async () => {
    console.log("[FUND CACHE] Refresh triggered");
    try {
      await refreshFundCache();
      console.log("[FUND CACHE] Refresh complete");
    } catch (error) {
      console.error("[FUND CACHE] Error refreshing:", error.message);
    }
  });
}

export { cache, initializeCache, refreshNAVCache };
