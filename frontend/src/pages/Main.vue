<script setup lang="ts">
import { onMounted, watch, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/Header.vue";
import ChartViewer from "@/components/ChartViewer.vue";
import DataTable from "@/components/DataTable.vue";
import { useDataStore } from "@/stores/data";
import CardHeader from "@/components/ui/card/CardHeader.vue";
import CardTitle from "@/components/ui/card/CardTitle.vue";
import CardAction from "@/components/ui/card/CardAction.vue";
import { Button } from "@/components/ui/button";
import { Period } from "@/lib/types";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import Calendar from "@/components/ui/calendar/Calendar.vue";
import { fromDate, CalendarDate } from "@internationalized/date";
import ButtonGroup from "@/components/ui/button-group/ButtonGroup.vue";

const route = useRoute();
const router = useRouter();
const dataStore = useDataStore();
const periodPopoverOpen = ref(false);
const calendarValue = ref<any>(undefined);
// Parse CSV schemeCode from router
const parseSchemeCodesFromRoute = (max = dataStore.MAX_FUNDS): number[] => {
  try {
    const schemeCodeParam = route.query.schemeCode;
    if (!schemeCodeParam || typeof schemeCodeParam !== "string") return [];
    return schemeCodeParam
      .split(",")
      .map((s) => s.trim())
      .slice(0, max)
      .map(Number)
      .filter((n) => !isNaN(n));
  } catch (e) {
    return [];
  }
};

// Write a single comma-separated `schemeCode` param to router
const setSchemeCodesToRoute = (codes: number[]) => {
  const q = { ...route.query };
  const list = codes
    .slice(0, dataStore.MAX_FUNDS)
    .map((c) => String(c))
    .join(",");
  if (list.length > 0) {
    q.schemeCode = list;
  } else {
    delete q.schemeCode;
  }
  router.replace({ query: q }).catch(() => {});
};

// Load funds from URL
const loadFromCodes = async (codes: number[]) => {
  if (!codes || codes.length === 0) return;
  codes.forEach((code) => dataStore.addFund(code));
  setSchemeCodesToRoute(dataStore.selectedFunds.map((f) => f.schemeCode));
};

// On mount, try to load from router query (if present)
onMounted(async () => {
  const codes = parseSchemeCodesFromRoute(5);
  if (codes.length > 0) await loadFromCodes(codes);
});

// Keep URL in sync when selectedFunds changes
watch(
  dataStore.fundData,
  (fundData) => {
    setSchemeCodesToRoute(
      Array.from(fundData.values()).map(
        (entry: { fund: { schemeCode: number } }) => entry.fund.schemeCode,
      ),
    );
  },
  { deep: true },
);

// Handlers
const onCalendarSelect = (value: CalendarDate[]) => {
  // Let the user select both start and end dates before applying the filter
  if (value.length >= 2 && value[0] !== undefined && value[1] !== undefined) {
    if (value[1] < value[0]) {
      // Swap if end date is before start date
      dataStore.changePeriod(Period.getFromCalendarDate(value[1], value[0]));
    } else {
      dataStore.changePeriod(Period.getFromCalendarDate(value[0], value[1]));
    }
    periodPopoverOpen.value = false;
    calendarValue.value = undefined;
  }
};

// Watch the calendar v-model instead of passing @select to avoid Vue warnings
watch(calendarValue, (val) => {
  if (val !== undefined) onCalendarSelect(val);
});
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- Header -->
    <Header />

    <!-- Main Content -->
    <main
      class="max-w-7xl mx-auto sm:px-2 sm:py-2 sm:py-4"
    >
      <!-- Chart Section -->
      <Card class="py-2 py-4 sm:py-6">
        <CardHeader class="px-4 sm:px-6 flex items-center justify-between">
          <CardTitle class="truncate">Fund Performance</CardTitle>
          <CardAction
            v-if="dataStore.selectedFunds.length > 0"
            class="flex items-center space-x-2 ml-4 flex-shrink-0"
          >
            <Popover v-model:open="periodPopoverOpen">
              <PopoverTrigger asChild>
                <Button :variant="'outline'">{{
                  dataStore.selectedPeriod
                }}</Button>
              </PopoverTrigger>
              <PopoverContent class="w-auto p-0">
                <Calendar
                  v-model="calendarValue"
                  :layout="'month-and-year'"
                  :multiple="true"
                  :pagedNavigation="true"
                  :max-value="fromDate(dataStore.allowedPeriod.end, 'IST')"
                  :min-value="fromDate(dataStore.allowedPeriod.start, 'IST')"
                />
              </PopoverContent>
            </Popover>
          </CardAction>
        </CardHeader>
        <CardContent class="px-2 sm:px-4 py-2 sm:py-0">
          <ChartViewer
            :data="dataStore.filteredFundData"
            :funds="dataStore.selectedFunds"
            :period="dataStore.selectedPeriod"
            :loading="dataStore.isLoading"
          />
        </CardContent>
        <CardContent
          v-if="dataStore.selectedFunds.length > 0"
          class="flex w-full px-2 sm:px-4 sm:w-auto justify-between sm:justify-end"
        >
          <ButtonGroup class="w-full sm:w-auto flex">
            <Button
              v-for="(symbol, _) in Period._SYMBOLS"
              :key="symbol"
              class="flex-1 sm:flex-none"
              :variant="
                dataStore.selectedPeriod.equals(Period.getFromSymbol(symbol))
                  ? 'default'
                  : 'outline'
              "
              :disabled="
                !dataStore.allowedPeriod.startsBefore(
                  Period.getFromSymbol(symbol),
                )
              "
              @click="dataStore.changePeriodBySymbol(symbol)"
            >
              {{ symbol }}
            </Button>
          </ButtonGroup>
        </CardContent>
        <CardContent class="px-2 sm:px-4 py-0">
          <DataTable />
        </CardContent>
      </Card>
    </main>
  </div>
</template>
