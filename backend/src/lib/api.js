import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import axios from "axios";

const API_URL = "https://api.mfapi.in/mf";

// Load NAV corrections from a local file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const NAV_CORRECTIONS = fs.readFileSync(path.resolve(__dirname, "nav_corrections.csv"), "utf-8").split("\n").reduce((acc, line) => {
  const [schemeCode, date, multiplier] = line.split(",");
  if (schemeCode && date && multiplier) {
    acc[schemeCode] = { date: new Date(date), multiplier: isNaN(multiplier) ? 1 : parseFloat(multiplier) };
  }
  return acc;
}, {});

// Since we're filtering only Direct Growth Plans
// Clean the scheme name as they get quite long
// Ex Parag Parikh Liquid Fund- Direct Plan- Growth => Parag Parikh Liquid Fund
function cleanSchemeName(name) {
  return name
    .replace(/Direct Plan/gi, "")
    .replace(/Growth/gi, "")
    .replace(/-/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/Direct$/g, " ");
}

async function fetchAllFunds() {
  const response = await axios.get(API_URL);
  if (response.status !== 200) {
    throw new Error(`Failed to fetch funds: ${response.statusText}`);
  }

  // Only fetch Direct Growth funds and relevant fields
  return response.data
    .filter(
      (fund) =>
        fund.isinGrowth != null &&
        !fund.schemeName.toLowerCase().includes("regular") &&
        !fund.schemeName.toLowerCase().includes("idcw") &&
        !fund.schemeName.toLowerCase().includes("income distribution"),
    )
    .map(({ schemeCode, schemeName, isinGrowth }) => ({
      schemeCode,
      schemeName: cleanSchemeName(schemeName),
      isinGrowth,
    }));
}

// Parse DD-MM-YYYY format YYYY-MM-DD
const parseDate = (dateStr) => {
  const [day, month, year] = dateStr.split("-");
  return new Date(
    parseInt(year, 10),
    parseInt(month, 10) - 1,
    parseInt(day, 10),
  );
};

async function fetchNAVHistory(schemeCode) {
  const response = await axios.get(`${API_URL}/${schemeCode}`);
  if (response.status !== 200) {
    throw new Error(
      `Failed to fetch NAV history for schemeCode ${schemeCode}: ${response.statusText}`,
    );
  }

  const data = response.data.data;
  // Data is in descending order
  const startDate = parseDate(data[data.length - 1].date);
  const endDate = parseDate(data[0].date);

  // Create a map for quick lookup of existing dates
  const dataMap = new Map(
    data.map((d) => [parseDate(d.date).toISOString().split("T")[0], d.nav]),
  );

  const filledData = [];
  let lastNAV = null;
  let currentDate = new Date(startDate);

  // Data will have gaps for weekends and holidays, gap fill them with last known NAV
  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split("T")[0];

    if (dataMap.has(dateStr)) {
      lastNAV = dataMap.get(dateStr);
    }

    filledData.push({
      date: dateStr,
      nav: lastNAV ? parseFloat(lastNAV).toFixed(2) : null,
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  // There are some funds whose data needs to be corrected because of splits
  if (NAV_CORRECTIONS[schemeCode]) {
    const { date: correctionDate, multiplier } = NAV_CORRECTIONS[schemeCode];
    console.log(`[NAV CACHE] Applying NAV correction for schemeCode ${schemeCode} from date ${correctionDate.toISOString().split("T")[0]} with multiplier ${multiplier}`);
    for (let i = 0; i < filledData.length; i++) {
      const entryDate = new Date(filledData[i].date);
      if (entryDate >= correctionDate) {
        filledData[i].nav = filledData[i].nav
          ? (filledData[i].nav * multiplier).toFixed(2)
          : null;
      }
    }
  }

  return filledData; // [{ date, nav }, ...]
}

export { fetchAllFunds, fetchNAVHistory };
