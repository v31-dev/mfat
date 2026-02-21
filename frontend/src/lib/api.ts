import axios from "axios";
import type { Fund, NavData } from "./types";

const API_BASE = "/api";

const api = axios.create({
  baseURL: API_BASE,
});

// Cache search results to avoid redundant API calls for the same query
const searchCache = new Map<string, Fund[]>();
export const searchFunds = async (query: string): Promise<Fund[]> => {
  if (!query || query.length < 1) {
    return [];
  }
  if (searchCache.has(query)) {
    return searchCache.get(query) || [];
  }
  try {
    const response = await api.get("/search", {
      params: { q: query },
    });
    const funds = response.data;
    searchCache.set(query, funds);
    return funds;
  } catch (error) {
    console.error("Search error:", error);
    return [];
  }
};

// Cache search results to avoid redundant API calls for the same query
const fundCache = new Map<number, Fund>();
export const getFundDetails = async (
  schemeCode: number,
): Promise<Fund | null> => {
  if (fundCache.has(schemeCode)) {
    return fundCache.get(schemeCode) || null;
  }
  try {
    const response = await api.get(`/mf/${schemeCode}`);
    const fund = response.data;
    fundCache.set(schemeCode, fund);
    return fund;
  } catch (error) {
    console.error(`Error fetching fund details for ${schemeCode}:`, error);
    return null;
  }
};

// Cache NAV history in case user selects the same fund multiple times
const navCache = new Map<number, NavData[]>();
export const getNavHistory = async (schemeCode: number): Promise<NavData[]> => {
  if (navCache.has(schemeCode)) {
    return navCache.get(schemeCode) || [];
  }
  try {
    const response = await api.get(`/nav/${schemeCode}`);
    const navData = response.data.map((entry: any) => ({
      date: entry.date,
      nav: parseFloat(entry.nav),
    }));
    navCache.set(schemeCode, navData);
    return navData;
  } catch (error) {
    console.error(`Error fetching NAV for ${schemeCode}:`, error);
    return [];
  }
};

export default api;
