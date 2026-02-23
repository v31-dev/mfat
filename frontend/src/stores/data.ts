import { ref, computed } from "vue";
import { defineStore } from "pinia";
import type { Fund, FundData } from "@/lib/types";
import { Period } from "@/lib/types";
import { getNavHistory, getFundDetails } from "@/lib/api";

export const useDataStore = defineStore("data", () => {
  // Constants
  const MAX_FUNDS = 5;

  // State
  const isLoading = ref(false);

  // Funds added by user and their NAV data
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

  // Funds can have different starting & end dates
  // So we filter the date before sending it to the chart and table components
  const numberDataPoints = ref(0);
  const filteredFundData = computed<Map<number, FundData>>(() => {
    const filtered = new Map<number, FundData>();

    // Filter the data for each fund based on the determined date range
    for (const [schemeCode, { nav: fundNavs }] of fundData.value) {
      const filteredArray = fundNavs.filter((d) => {
        const date = new Date(d.date);
        return (
          date >= selectedPeriod.value.start && date <= selectedPeriod.value.end
        );
      });

      if (filteredArray.length > 0) {
        filtered.set(schemeCode, {
          ...fundData.value.get(schemeCode)!,
          nav: filteredArray,
        });
      }
    }

    numberDataPoints.value = Math.min(...Array.from(filtered.values()).map(({ nav }) => nav.length));
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
      if (fundDetails && navData) {
        fundData.value.set(schemeCode, { fund: fundDetails, nav: navData });
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
    filteredFundData,
    selectedFunds,
    selectedPeriod,
    allowedPeriod,
    isLoading,
    numberDataPoints,
    // Actions
    addFund,
    removeFund,
    changePeriod,
    changePeriodStart,
    changePeriodEnd,
    changePeriodBySymbol,
  };
});
