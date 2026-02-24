
import type { RouteLocationNormalizedLoaded, Router } from "vue-router";
import { type RouteParams } from "./types";

// Parse URL parameters
// schemeCode is a comma-separated list of numbers, e.g. "123,456,789"
// selectedPeriod is 2 datestrings (YYYY-MM-DD) separated by a comma, e.g. "2023-01-01,2023-12-31"
export const parseRouteParams = (route: RouteLocationNormalizedLoaded): RouteParams => {
  const { schemeCode, selectedPeriod } = route.query;

  // Parse schemeCode
  let parsedSchemeCode: number[] | null;
  try {
    parsedSchemeCode = (schemeCode as string)
      .split(",")
      .map((s) => s.trim())
      .map(Number)
      .filter((n) => !isNaN(n));
  } catch (e) {
    parsedSchemeCode = null;
  }

  // Parse selectedPeriod
  let parsedSelectedPeriod: string[] | null;
  try {
    let [startDate, endDate] = (selectedPeriod as string)
      .split(",")
      .map((s) => s.trim());

    // Check for valid date format (YYYY-MM-DD)
    if (
      startDate !=
        new Date(Date.parse(startDate!)).toISOString().slice(0, 10) ||
      endDate != new Date(Date.parse(endDate!)).toISOString().slice(0, 10)
    ) {
      throw new Error("Invalid date format");
    }

    // endDate cannot be after today
    const today = new Date()
    if (new Date(endDate) > today) {
      endDate = today.toISOString().slice(0, 10);
    }

    // Check if startDate is before endDate
    if (new Date(startDate) >= new Date(endDate)) {
      throw new Error("Start date must be before end date");
    }

    parsedSelectedPeriod = [startDate, endDate];
  } catch (e) {
    parsedSelectedPeriod = null;
  }

  return {
    schemeCode: parsedSchemeCode,
    selectedPeriod: parsedSelectedPeriod
  };
};

// Write to URL parameters
export const setRouteParams = (router: Router, params: RouteParams) => {
  const { schemeCode, selectedPeriod } = params;
  let q: Record<string, string> = {};

  if (schemeCode && schemeCode.length > 0) {
    q.schemeCode = schemeCode.join(",");
  }

  if (selectedPeriod && selectedPeriod.length === 2) {
    q.selectedPeriod = selectedPeriod.join(",");
  }

  router.replace({ query: q }).catch(() => {});
};
