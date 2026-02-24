<script setup lang="ts">
import { onMounted, watch, ref, computed, nextTick } from "vue";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toaster } from "vue-sonner";
import { useColorMode } from "@vueuse/core";
import { useRoute, useRouter } from "vue-router";
import { parseRouteParams, setRouteParams } from "@/lib/url";


const route = useRoute();
const router = useRouter();
const mode = useColorMode();
const dataStore = useDataStore();
const changePeriodPopoverOpen = ref(false);
const changePeriodCalendarDate = ref<any>();
const changePeriodCalendar = ref<any>({
  start: null,
  end: null,
  clicked: null as "start" | "end" | null,
});

// On mount, try to load from router query (if present)
onMounted(async () => {
  const { schemeCode, selectedPeriod } = parseRouteParams(route);

  if (schemeCode) {
    await Promise.all(schemeCode.map((code) => dataStore.addFund(code)));
  }

  if (selectedPeriod) {
    const [start, end] = selectedPeriod;
    dataStore.changePeriod(Period.getFromDateString(start!, end!));
    await nextTick();
  }
});

// Keep URL in sync
watch(
  [() => dataStore.selectedFunds, () => dataStore.selectedPeriod],
  ([funds, period]) => {
    setRouteParams(router, {
      schemeCode: funds.map((f: any) => f.schemeCode),
      selectedPeriod: [period.start.toISOString().slice(0, 10), period.end.toISOString().slice(0, 10)]
    });
  },
  { deep: true }
);

// Handlers for changing period via calendar popover
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
  changePeriodPopoverOpen.value = true;
};

const onClickChangePeriodEndDate = async () => {
  changePeriodCalendarDate.value = fromDate(dataStore.selectedPeriod.end, "IST");
  changePeriodCalendar.value.start = changeDateByDays(dataStore.selectedPeriod.start, 1);
  changePeriodCalendar.value.end = dataStore.allowedPeriod.end;
  changePeriodCalendar.value.clicked = "end";
  changePeriodPopoverOpen.value = true;
};

// Watch the calendar popover close to reset the clicked state
watch(changePeriodPopoverOpen, (val) => {
  if (!val) {
    changePeriodCalendar.value.clicked = null;
  }
});

// Period symbol buttons
const activePeriodSymbol = computed(() => {
  return Period._SYMBOLS.find(symbol =>
    dataStore.selectedPeriod.equals(Period.getFromSymbol(symbol))
  );
});
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- Header -->
    <Header />

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto sm:px-2 sm:py-4">
      <!-- Chart Section -->
      <Card class="sm:gap-4 py-4">
        <CardHeader class="px-4 sm:px-4 flex items-center justify-between">
          <CardTitle class="truncate">
            <Select v-model="dataStore.chartType">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <template v-for="{ value, label } in dataStore.allowedChartTypes" :key="value">
                  <SelectItem :value="value">
                    {{ label }}
                  </SelectItem>
                </template>
              </SelectContent>
            </Select>
          </CardTitle>
          <CardAction v-if="dataStore.selectedFunds.length > 0" class="flex items-center space-x-2 ml-4 flex-shrink-0">
            <Popover v-model:open="changePeriodPopoverOpen">
              <PopoverAnchor>
                <ButtonGroup>
                  <Button :variant="changePeriodCalendar.clicked === 'start' ? 'default' : 'outline'" class="px-3"
                    :disabled="changePeriodCalendar.clicked == 'end'" @click="onClickChangePeriodStartDate">{{
                      dateToString(dataStore.selectedPeriod.start)
                    }}</Button>
                  <Button :variant="changePeriodCalendar.clicked === 'end' ? 'default' : 'outline'" class="px-3"
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
        <CardContent class="px-0 sm:px-0 py-0">
          <ChartViewer :data="dataStore.filteredFundData" :funds="dataStore.selectedFunds"
            :period="dataStore.selectedPeriod" :percentage="dataStore.chartType.startsWith('rolling-')"
            :loading="dataStore.isLoading" />
        </CardContent>
        <CardContent v-if="dataStore.selectedFunds.length > 0"
          class="flex w-full px-4 sm:px-4 sm:w-auto justify-between sm:justify-end">
          <ButtonGroup class="w-full sm:w-auto flex">
            <Button v-for="symbol in Period._SYMBOLS" :key="symbol" class="flex-1 sm:flex-none"
              :variant="activePeriodSymbol === symbol ? 'default' : 'outline'"
              :disabled="!dataStore.allowedPeriod.startsBefore(Period.getFromSymbol(symbol))"
              @click="dataStore.changePeriodBySymbol(symbol)">
              {{ symbol }}
            </Button>
          </ButtonGroup>
        </CardContent>
        <CardContent class="px-4 sm:px-4 py-0">
          <DataTable />
        </CardContent>
      </Card>
    </main>
    <Toaster position="top-center" :theme="mode as 'light' | 'dark'" />
  </div>
</template>