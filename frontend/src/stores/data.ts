import { ref, computed } from "vue";
import { defineStore } from "pinia";
import type { Fund, FundData } from "@/lib/types";
import { Period, type NavData, CHART_TYPES } from "@/lib/types";
import { getNavHistory, getFundDetails } from "@/lib/api";
import { toast } from "vue-sonner";

// Calculates rolling returns for an array of numbers, omitting initial nulls.
function getRollingReturns(data: NavData[], period: number): NavData[] {
  const returns: NavData[] = [];
  // Start the loop exactly at the 'period' index to skip the unavailable lookback window
  for (let i = period; i < data.length; i++) {
    const currentValue = data[i]?.nav;
    const pastValue = data[i - period]?.nav;

    // Prevent division by zero, undefined currentValue, or undefined pastValue. Adjust this fallback (e.g., 0) based on your needs.
    if (
      pastValue === 0 ||
      currentValue === undefined ||
      pastValue === undefined
    ) {
      returns.push({ date: data[i]!.date, nav: 0 });
      console.error(
        `Invalid data at index ${i}: currentValue=${currentValue}, pastValue=${pastValue}. Returning 0 for this point.`,
      );
    } else {
      // if the rolling period is more than 1 yr then return cagr
      let nav;
      if (period >= 365) {
        nav = (Math.pow(currentValue / pastValue, 365 / period) - 1) * 100;
      } else {
        nav = ((currentValue - pastValue) / pastValue) * 100;
      }
      returns.push({
        date: data[i]!.date,
        nav: nav,
      });
    }
  }

  return returns;
}

export const useDataStore = defineStore("data", () => {
  // Constants
  const MAX_FUNDS = 5;

  // State
  const isLoading = ref(false);
  const chartType = ref<string>("absolute");

  // Funds added by user and their NAV data
  // This is the source of truth data
  const fundData = ref<Map<number, FundData>>(new Map());

  // Period selected by user
  const selectedPeriod = ref<Period>(
    new Period(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), new Date()),
  );

  // List of Fund metadata
  const selectedFunds = computed<Fund[]>(() => {
    return Array.from(fundData.value.values()).map(({ fund }) => fund);
  });

  // Period allowed based on fund data
  const allowedPeriod = computed<Period>(() => {
    // Determine the earliest start date across all funds to restrict period options
    let startDate = new Date("1970-01-01"); // Start with a very old date
    fundData.value.forEach(({ nav: fundNavs }, _) => {
      if (fundNavs && fundNavs.length > 0) {
        const firstNav = fundNavs[0];
        if (firstNav && firstNav.date) {
          const fundStartDate = new Date(firstNav.date);
          if (fundStartDate > startDate) {
            startDate = fundStartDate;
          }
        }
      }
    });

    // Determine the latest end date across all funds to restrict period options
    let endDate = new Date();
    fundData.value.forEach(({ nav: fundNavs }, _) => {
      if (fundNavs && fundNavs.length > 0) {
        const lastNav = fundNavs[fundNavs.length - 1];
        if (lastNav && lastNav.date) {
          const fundEndDate = new Date(lastNav.date);
          if (fundEndDate < endDate) {
            endDate = fundEndDate;
          }
        }
      }
    });

    // If the currently selected period is outside the allowed range, reset it to the allowed range
    const _allowedPeriod = new Period(startDate, endDate);
    if (selectedPeriod.value.startsBefore(_allowedPeriod)) {
      selectedPeriod.value = _allowedPeriod;
    }

    return _allowedPeriod;
  });

  const numberFilteredDataPoints = ref(0);

  // Chart type allowed based on allowed period and fund data
  const allowedChartTypes = computed<any>(() => {
    return CHART_TYPES.filter((type) => {
      if (type.days == 0) return true;
      else {
        // Put a tolerance at least minimum data points
        return type.days < numberFilteredDataPoints.value - 10;
      }
    });
  });

  // Funds can have different starting & end dates
  // So we filter the date before sending it to the chart components
  const filteredFundData = computed<Map<number, FundData>>(() => {
    const filtered = new Map<number, FundData>();

    // Validate the chart type
    // If it is a rolling period but the user has selected a period shorter than the rolling period, reset to absolute returns
    let rollingPeriod = 1;
    if (chartType.value.startsWith("rolling-")) {
      const days = parseInt(chartType.value.split("-")[1] ?? "");
      if (isNaN(days) || days >= numberFilteredDataPoints.value - 10) {
        chartType.value = "absolute";
        toast.error(
          "Invalid chart type selected for the current data range. Resetting to absolute returns.",
        );
      } else {
        rollingPeriod = days;
      }
    }

    // Filter the data for each fund based on the determined date range
    for (const [schemeCode, { nav: fundNavs }] of fundData.value) {
      const filteredArray = fundNavs.filter((d) => {
        const date = new Date(d.date);
        return (
          date >= selectedPeriod.value.start && date <= selectedPeriod.value.end
        );
      });

      if (filteredArray.length > 0) {
        let _filteredArray = filteredArray;
        // Apply the rolling period on the filtered data
        if (rollingPeriod > 1) {
          _filteredArray = getRollingReturns(filteredArray, rollingPeriod);
        }
        filtered.set(schemeCode, {
          ...fundData.value.get(schemeCode)!,
          nav: _filteredArray,
        });
      }
    }

    // Count of total data points
    numberFilteredDataPoints.value =
      rollingPeriod +
      Math.min(...Array.from(filtered.values()).map(({ nav }) => nav.length));

    return filtered;
  });

  // Actions
  async function addFund(schemeCode: number) {
    if (fundData.value.size >= MAX_FUNDS) return;
    if (!fundData.value.has(schemeCode)) {
      isLoading.value = true;
      const navData = await getNavHistory(schemeCode);
      const fundDetails = await getFundDetails(schemeCode);
      isLoading.value = false;
      if (fundDetails && navData && navData.length > 0) {
        fundData.value.set(schemeCode, { fund: fundDetails, nav: navData });
      } else {
        toast.error("Failed to fetch fund data. Please try again.");
      }
    }
  }

  function removeFund(schemeCode: number) {
    fundData.value.delete(schemeCode);
  }

  function changePeriod(period: Period) {
    selectedPeriod.value = period;
  }

  function changePeriodStart(date: Date) {
    selectedPeriod.value = new Period(date, selectedPeriod.value.end);
  }

  function changePeriodEnd(date: Date) {
    selectedPeriod.value = new Period(selectedPeriod.value.start, date);
  }

  function changePeriodBySymbol(symbol: string) {
    const p = Period.getFromSymbol(symbol);
    if (p) {
      selectedPeriod.value = p;
    }
  }

  return {
    // Constants
    MAX_FUNDS,
    // Properties
    fundData,
    chartType,
    filteredFundData,
    selectedFunds,
    selectedPeriod,
    allowedPeriod,
    isLoading,
    allowedChartTypes,
    // Actions
    addFund,
    removeFund,
    changePeriod,
    changePeriodStart,
    changePeriodEnd,
    changePeriodBySymbol,
  };
});
