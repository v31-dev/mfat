<script setup lang="ts">
import { onMounted, watch, ref, nextTick } from "vue";
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
  PopoverContent,
} from "@/components/ui/popover";
import Calendar from "@/components/ui/calendar/Calendar.vue";
import { fromDate } from "@internationalized/date";
import ButtonGroup from "@/components/ui/button-group/ButtonGroup.vue";
import { dateToString, calendarDateToDate, changeDateByDays } from "@/lib/utils";
import PopoverAnchor from "@/components/ui/popover/PopoverAnchor.vue";

const route = useRoute();
const router = useRouter();
const dataStore = useDataStore();
const changePeriodPopoverOpen = ref(false);
const changePeriodCalendarDate = ref<any>();
const changePeriodCalendar = ref<any>({
  start: null,
  end: null,
  clicked: null as "start" | "end" | null,
});

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
  router.replace({ query: q }).catch(() => { });
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
const onChangePeriodCalendar = (value: any) => {
  if (changePeriodCalendar.value.clicked === "start") {
    dataStore.changePeriodStart(calendarDateToDate(value));
  } else if (changePeriodCalendar.value.clicked === "end") {
    dataStore.changePeriodEnd(calendarDateToDate(value));
  } else {
    return
  }

  changePeriodPopoverOpen.value = false;
  changePeriodCalendarDate.value = null;
  changePeriodCalendar.value.clicked = null;
};

const onClickChangePeriodStartDate = async () => {
  changePeriodCalendarDate.value = fromDate(dataStore.selectedPeriod.start, "IST");
  changePeriodCalendar.value.start = dataStore.allowedPeriod.start;
  changePeriodCalendar.value.end = changeDateByDays(dataStore.selectedPeriod.end, - 1);
  changePeriodCalendar.value.clicked = "start";
  await nextTick()
  changePeriodPopoverOpen.value = true;
};

const onClickChangePeriodEndDate = async () => {
  changePeriodCalendarDate.value = fromDate(dataStore.selectedPeriod.end, "IST");
  changePeriodCalendar.value.start = changeDateByDays(dataStore.selectedPeriod.start, 1);
  changePeriodCalendar.value.end = dataStore.allowedPeriod.end;
  changePeriodCalendar.value.clicked = "end";
  await nextTick()
  changePeriodPopoverOpen.value = true;
};

// Watch the calendar popover close to reset the clicked state
watch(changePeriodPopoverOpen, (val) => {
  if (!val) {
    changePeriodCalendar.value.clicked = null;
  }
});
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- Header -->
    <Header />

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto sm:px-2 sm:py-2 sm:py-4">
      <!-- Chart Section -->
      <Card class="py-2 py-4 sm:py-6">
        <CardHeader class="px-4 sm:px-6 flex items-center justify-between">
          <CardTitle class="truncate">Fund Performance</CardTitle>
          <CardAction v-if="dataStore.selectedFunds.length > 0" class="flex items-center space-x-2 ml-4 flex-shrink-0">
            <Popover v-model:open="changePeriodPopoverOpen">
              <PopoverAnchor>
                <ButtonGroup>
                  <Button :variant="changePeriodCalendar.clicked === 'start' ? 'default' : 'outline'"
                    :disabled="changePeriodCalendar.clicked == 'end'" @click="onClickChangePeriodStartDate">{{
                      dateToString(dataStore.selectedPeriod.start)
                    }}</Button>
                  <Button :variant="changePeriodCalendar.clicked === 'end' ? 'default' : 'outline'"
                    :disabled="changePeriodCalendar.clicked == 'start'" @click="onClickChangePeriodEndDate">{{
                      dateToString(dataStore.selectedPeriod.end)
                    }}</Button>
                </ButtonGroup>
              </PopoverAnchor>
              <PopoverContent class="w-auto p-0">
                <Calendar v-model="changePeriodCalendarDate" :initial-focus="true" :layout="'month-and-year'"
                  :pagedNavigation="true" :max-value="fromDate(changePeriodCalendar.end, 'IST')"
                  :min-value="fromDate(changePeriodCalendar.start, 'IST')"
                  @update:model-value="onChangePeriodCalendar" />
              </PopoverContent>
            </Popover>
          </CardAction>
        </CardHeader>
        <CardContent class="px-2 sm:px-4 py-2 sm:py-0">
          <ChartViewer :data="dataStore.filteredFundData" :funds="dataStore.selectedFunds"
            :period="dataStore.selectedPeriod" :loading="dataStore.isLoading" />
        </CardContent>
        <CardContent v-if="dataStore.selectedFunds.length > 0"
          class="flex w-full px-2 sm:px-4 sm:w-auto justify-between sm:justify-end">
          <ButtonGroup class="w-full sm:w-auto flex">
            <Button v-for="(symbol, _) in Period._SYMBOLS" :key="symbol" class="flex-1 sm:flex-none" :variant="dataStore.selectedPeriod.equals(Period.getFromSymbol(symbol))
              ? 'default'
              : 'outline'
              " :disabled="!dataStore.allowedPeriod.startsBefore(
                Period.getFromSymbol(symbol),
              )
                " @click="dataStore.changePeriodBySymbol(symbol)">
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