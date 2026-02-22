<script setup lang="ts">
import { ref, computed } from "vue";
import { Icon } from "@iconify/vue";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchFunds } from "@/lib/api";
import type { Fund } from "@/lib/types";
import { Period, Colors } from "@/lib/types";
import { useDataStore } from "@/stores/data";

const dataStore = useDataStore();

// State
const searchQuery = ref("");
const searchedFunds = ref<Fund[]>([]);
const isSearching = ref(false);
let searchTimeout: ReturnType<typeof setTimeout> | null = null;

const performSearch = async () => {
  if (!searchQuery.value.trim()) {
    searchedFunds.value = [];
    return;
  }

  isSearching.value = true;
  try {
    const results = await searchFunds(searchQuery.value);
    searchedFunds.value = results.filter(
      (fund) =>
        !dataStore.selectedFunds.some((f) => f.schemeCode === fund.schemeCode),
    );
  } finally {
    isSearching.value = false;
  }
};

const getLastNav = (schemeCode: number): number | null => {
  const navArray = dataStore.fundData.get(schemeCode)?.nav;
  if (!navArray || navArray.length === 0) return null;
  const lastNav = navArray[navArray.length - 1];
  return lastNav ? lastNav.nav : null;
};

const getReturn = (schemeCode: number, period: Period): number | string => {
  const navArray = dataStore.fundData.get(schemeCode)?.nav;
  if (!navArray || navArray.length === 0) return "--";

  // Take last entry for end date
  const endNavEntry = navArray[navArray.length - 1];

  // Determine the start date
  const startDateStr = new Date(period.start.getTime() + 86400000)
    .toISOString()
    .split("T")[0]; // Format as 'YYYY-MM-DD'
  const startNavEntry = navArray.find((entry) => entry.date === startDateStr);

  if (!startNavEntry || !endNavEntry) return "--";

  return parseFloat(
    (((endNavEntry.nav - startNavEntry.nav) / startNavEntry.nav) * 100).toFixed(
      0,
    ),
  );
};

// Return a Tailwind text color class based on value sign
const getReturnClass = (val: number | string) => {
  if (typeof val === "number")
    return val >= 0 ? "text-green-600" : "text-red-600";
  return "text-muted-foreground";
};

const formatReturn = (val: number | string) =>
  typeof val === "number" ? `${val}%` : val;

const isFundLimitReached = computed(
  () => dataStore.selectedFunds.length >= dataStore.MAX_FUNDS,
);
const searchPlaceholder = computed(() => {
  if (dataStore.isLoading) return "Loading chart...";
  else
    return isFundLimitReached.value
      ? `Maximum ${dataStore.MAX_FUNDS} funds reached`
      : "Search for a fund...";
});

// Handlers
const onSearch = () => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(performSearch, 500);
};

const onSelectFund = (fund: Fund) => {
  dataStore.addFund(fund.schemeCode);
  searchQuery.value = "";
  searchedFunds.value = [];
};
</script>

<template>
  <div class="space-y-4">
    <div
      class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
    >
      <div class="relative w-full sm:w-64">
        <Input
          v-model="searchQuery"
          @input="onSearch"
          :placeholder="searchPlaceholder"
          :disabled="isFundLimitReached || dataStore.isLoading"
        />
        <Transition name="fade">
          <div
            v-if="searchedFunds.length > 0"
            class="absolute top-11 left-0 right-0 z-50 rounded-md border bg-popover shadow-md overflow-hidden"
          >
            <div
              v-for="fund in searchedFunds.slice(0, 8)"
              :key="fund.schemeCode"
              class="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
              @click="onSelectFund(fund)"
            >
              {{ fund.schemeName }}
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <div class="hidden sm:block">
      <Table class="w-full table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead class="w-72">Fund Name</TableHead>
            <TableHead class="w-28 text-right px-2">NAV ₹</TableHead>
            <TableHead
              v-for="symbol in Period._SYMBOLS"
              :key="symbol"
              class="w-16 text-right px-2"
            >
              {{ symbol }} (%)
            </TableHead>
            <TableHead class="w-12 text-right px-2"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="dataStore.selectedFunds.length === 0">
            <TableCell
              :colspan="9"
              class="text-center py-8 text-muted-foreground"
            >
              No funds added yet. Search for a fund above to get started.
            </TableCell>
          </TableRow>
          <template
            v-for="(fund, index) in dataStore.selectedFunds"
            :key="fund.schemeCode"
          >
            <!-- Compact row: Fund Name + Action (other columns hidden on small screens) -->
            <TableRow>
              <TableCell class="font-medium min-w-0 w-72">
                <div class="flex items-center gap-2">
                  <div
                    class="flex-none w-2 h-2 rounded-full"
                    :style="{ backgroundColor: Colors.get(index) }"
                  ></div>
                  <span class="block break-words whitespace-normal">{{
                    fund.schemeName
                  }}</span>
                </div>
              </TableCell>
              <TableCell class="w-28 text-right py-1 px-2">
                {{ getLastNav(fund.schemeCode) }}
              </TableCell>
              <TableCell
                v-for="symbol in Period._SYMBOLS"
                :key="symbol"
                class="w-16 text-right py-1 px-2"
              >
                <span
                  :class="
                    getReturnClass(
                      getReturn(fund.schemeCode, Period.getFromSymbol(symbol)),
                    )
                  "
                >
                  {{
                    formatReturn(
                      getReturn(fund.schemeCode, Period.getFromSymbol(symbol)),
                    )
                  }}
                </span>
              </TableCell>
              <TableCell class="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  @click="dataStore.removeFund(fund.schemeCode)"
                  class="h-8 w-8 text-muted-foreground"
                >
                  <Icon icon="lucide:trash-2" class="h-4 w-4 text-red-600" />
                </Button>
              </TableCell>
            </TableRow>
          </template>
        </TableBody>
      </Table>
    </div>

    <!-- Mobile: render a stack of cards instead of the table -->
    <div class="sm:hidden space-y-2">
      <Card
        v-for="(fund, index) in dataStore.selectedFunds"
        :key="fund.schemeCode"
        class="px-2"
      >
        <CardHeader class="px-2 py-0">
          <CardTitle class="min-w-0">
            <div class="flex items-center gap-2">
              <div
                class="flex-none w-2 h-2 rounded-full"
                :style="{ backgroundColor: Colors.get(index) }"
              ></div>
              <span class="break-words whitespace-normal">{{
                fund.schemeName
              }}</span>
            </div>
          </CardTitle>
          <CardAction>
            <Button
              variant="ghost"
              size="icon"
              @click="dataStore.removeFund(fund.schemeCode)"
              class="h-8 w-8"
            >
              <Icon icon="lucide:trash-2" class="h-4 w-4 text-red-600" />
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent class="px-2">
          <div class="grid grid-cols-3 gap-x-6 gap-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-muted-foreground">NAV ₹</span>
              <span>{{ getLastNav(fund.schemeCode) }}</span>
            </div>
            <div />
            <div />
            <div
              v-for="symbol in Period._SYMBOLS"
              :key="symbol"
              class="flex justify-between"
            >
              <span class="text-muted-foreground">{{ symbol }} (%)</span>
              <span
                :class="
                  getReturnClass(
                    getReturn(fund.schemeCode, Period.getFromSymbol(symbol)),
                  )
                "
              >
                {{
                  formatReturn(
                    getReturn(fund.schemeCode, Period.getFromSymbol(symbol)),
                  )
                }}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
