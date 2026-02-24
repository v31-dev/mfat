<script setup lang="ts">
import { computed } from "vue";
import { Icon } from "@iconify/vue";
import type { Fund, FundData, ChartDataPoint } from "@/lib/types";
import { Period, Colors } from "@/lib/types";
import type { ChartConfig } from "@/components/ui/chart";
import { CurveType } from "@unovis/ts";
import { VisAxis, VisLine, VisXYContainer } from "@unovis/vue";
import {
  ChartContainer,
  ChartCrosshair,
  ChartTooltip,
  ChartTooltipContent,
  componentToString,
} from "@/components/ui/chart";

interface Props {
  data: Map<number, FundData>;
  funds: Fund[];
  period: Period;
  percentage: boolean;
  loading: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  percentage: false,
});

const chartConfig = computed<ChartConfig>(() => {
  const config: ChartConfig = {};
  props.funds.forEach((fund, index) => {
    config[`${fund.schemeCode}_label`] = {
      label: fund.schemeName,
      color: Colors.get(index),
    };
  });

  return config;
});

const chartData = computed<ChartDataPoint[]>(() => {
  if (!props.data) return [];

  const dataPoints: ChartDataPoint[] = [];
  const schemeCodes = props.funds.map((fund) => fund.schemeCode);

  // All funds have the same dates, we can take the dates from the first fund
  const firstSchemeCode = schemeCodes[0];
  const firstFundData =
    firstSchemeCode !== undefined
      ? props.data.get(firstSchemeCode)?.nav || []
      : [];

  // Merge data into a single array of { date, [schemeCode]: nav, [schemeCode]_percentage: percentage }
  firstFundData.forEach((navEntry, index) => {
    const dataPoint: ChartDataPoint = { date: new Date(navEntry.date) };

    schemeCodes.forEach((schemeCode) => {
      const fundData = props.data?.get(schemeCode)?.nav;
      dataPoint[schemeCode] =
        fundData && fundData[index] ? fundData[index].nav : 0;

      // If data is alreadya a percentage (i.e. rolling returns)
      if (props.percentage) {
        dataPoint[`${schemeCode}_percentage`] =
          fundData && fundData[index] ? fundData[index].nav : 0;

        dataPoint[`${schemeCode}_label`] =
          `${Number(dataPoint[`${schemeCode}_percentage`]).toFixed(2)}%`;
      } else {
        // Data is absolute, calculate percentage change from first point
        dataPoint[`${schemeCode}_percentage`] =
          fundData && fundData[index] && fundData[0]
            ? ((fundData[index].nav - fundData[0].nav) / fundData[0].nav) * 100
            : 0;

        dataPoint[`${schemeCode}_label`] =
          `${dataPoint[schemeCode]} (${Number(dataPoint[`${schemeCode}_percentage`]).toFixed(2)}%)`;
      }
    });

    dataPoints.push(dataPoint);
  });

  return dataPoints;
});
</script>

<template>
  <ChartContainer :config="chartConfig" class="h-80 px-4 touch-pan-y">
    <template v-if="props.loading">
      <div class="flex items-center justify-center h-64">
        <div class="text-center text-muted-foreground">
          <Icon icon="lucide:loader-2" class="h-12 w-12 mx-auto mb-2 animate-spin opacity-50" />
          <p class="text-sm">Loading chart...</p>
        </div>
      </div>
    </template>

    <template v-else-if="props.funds.length === 0">
      <div class="flex items-center justify-center h-64">
        <div class="text-center text-muted-foreground">
          <Icon icon="lucide:chart-line" class="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p class="text-sm">Select funds to see chart</p>
        </div>
      </div>
    </template>

    <template v-else>
      <VisXYContainer :data="chartData" :margin="{ left: -24, top: 0 }" :y-domain="[
        Math.min(
          ...chartData.map((d: any) =>
            Math.min(
              ...props.funds.map((f) => d[`${f.schemeCode}_percentage`] ?? 0),
            ),
          ),
        ),
        Math.max(
          ...chartData.map((d: any) =>
            Math.max(
              ...props.funds.map((f) => d[`${f.schemeCode}_percentage`] ?? 0),
            ),
          ),
        ),
      ]">
        <VisLine v-for="(fund, index) in props.funds" :key="fund.schemeCode" :x="(d: ChartDataPoint) => d.date"
          :y="(d: ChartDataPoint) => d[`${fund.schemeCode}_percentage`]" :color="Colors.get(index)"
          :curve-type="CurveType.Linear" />
        <VisAxis type="x" :x="(d: ChartDataPoint) => d.date" :num-ticks="4" :tick-format="(d: number) => {
          const date = new Date(d);
          return date.toLocaleDateString('en-IN', {
            month: 'short',
            year: 'numeric',
          });
        }
          " />
        <VisAxis type="y" :num-ticks="4" :label="'Change (%)'" :tick-format="(d: number) => `${d.toFixed(0)}%`" />
        <ChartTooltip />
        <!-- Key is required to force re-render of tooltip on funds change -->
        <ChartCrosshair :key="JSON.stringify(chartConfig)" :template="componentToString(chartConfig, ChartTooltipContent, {
          labelFormatter: (d) => {
            return new Date(d).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });
          },
        })
          " :color="(_: any, i: number) => Colors.get(i)" />
      </VisXYContainer>
    </template>
  </ChartContainer>
</template>