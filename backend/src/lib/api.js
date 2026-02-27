import axios from "axios";

const API_URL = "https://api.mfapi.in/mf";

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
  const disallowedKeywords = ["regular", "idcw", "income distribution", "capital withdrawal", "bonus option", "dividend option"];

  return response.data
    .filter(
      (fund) => 
        fund.isinGrowth != null &&
        !disallowedKeywords.some((keyword) => fund.schemeName.toLowerCase().includes(keyword))
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
      nav: lastNAV ? lastNAV : null,
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  // There are some funds whose data needs to be corrected because of splits
  let navCorrectionApplied = 0;
  // Reverse walk to normalize pre-split values to post-split values 
  for (let i = filledData.length - 2; i >= 0; i--) {
    // If the NAV changed drastically then it's likely a 1:10 split happened
    if (filledData[i].nav > filledData[i + 1].nav * 8) {
      filledData[i].nav = parseFloat(filledData[i].nav / 10).toFixed(2);
      navCorrectionApplied++;
    } else {
      // Convert to 2 decimal places for consistency
      filledData[i].nav = parseFloat(filledData[i].nav).toFixed(2);
    }
  }

  if (navCorrectionApplied > 0) {
    console.log(`[NAV CACHE] Applied NAV correction for schemeCode ${schemeCode} for ${navCorrectionApplied} entries`);
  }

  return filledData; // [{ date, nav }, ...]
}

export { fetchAllFunds, fetchNAVHistory };
