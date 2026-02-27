import type { CalendarDate } from "@internationalized/date";
import { dateToString, calendarDateToDate } from "@/lib/utils";

export interface Fund {
  schemeCode: number;
  schemeName: string;
  isinGrowth?: string;
}

export interface NavData {
  date: string; // YYYY-MM-DD
  nav: number;
}

export interface FundData {
  fund: Fund;
  nav: NavData[];
}

export class Period {
  static _SYMBOLS = ["1M", "3M", "6M", "1Y", "3Y", "5Y"];

  public start: Date;
  public end: Date;

  constructor(start: Date, end: Date) {
    this.start = new Date(start.toISOString().slice(0, 10));
    this.end = new Date(end.toISOString().slice(0, 10));
  }

  static getFromDateString(start: string, end: string): Period {
    return new Period(new Date(start), new Date(end));
  }

  static getFromCalendarDate(start: CalendarDate, end: CalendarDate): Period {
    return new Period(calendarDateToDate(start), calendarDateToDate(end));
  }

  static getFromSymbol(symbol: string, endDate: Date): Period {
    let start: Date;
    switch (symbol) {
      case "1M":
        start = new Date(endDate);
        start.setMonth(start.getMonth() - 1);
        return new Period(start, endDate);
      case "3M":
        start = new Date(endDate);
        start.setMonth(start.getMonth() - 3);
        return new Period(start, endDate);
      case "6M":
        start = new Date(endDate);
        start.setMonth(start.getMonth() - 6);
        return new Period(start, endDate);
      case "1Y":
        start = new Date(endDate);
        start.setFullYear(start.getFullYear() - 1);
        return new Period(start, endDate);
      case "3Y":
        start = new Date(endDate);
        start.setFullYear(start.getFullYear() - 3);
        return new Period(start, endDate);
      case "5Y":
        start = new Date(endDate);
        start.setFullYear(start.getFullYear() - 5);
        return new Period(start, endDate);
      default:
        throw new Error(`Unknown period symbol: ${symbol}`);
    }
  }

  // Format like 1 Jan 2020 - 31 Dec 2020
  toString(): string {
    return `${dateToString(this.start)} - ${dateToString(this.end)}`;
  }

  equals(other: Period): boolean {
    return this.toString() === other.toString();
  }

  startsBefore(other: Period): boolean {
    return this.start < other.start;
  }

  endsAfter(other: Period): boolean {
    return this.end > other.end;
  }

  // Reutrn duration in days
  duration(): number {
    return (this.end.getTime() - this.start.getTime()) / (1000 * 60 * 60 * 24);
  }
}

export class Colors {
  static _COLORS = [
    "#3b82f6", // Blue
    "#ef4444", // Red
    "#10b981", // Green
    "#f59e0b", // Amber
    "#8b5cf6", // Violet
  ];

  static get(index: number): string | undefined {
    return Colors._COLORS[index % Colors._COLORS.length];
  }
}

export interface ChartDataPoint {
  date: Date;
  [key: string]: number | Date | string;
}

export interface RouteParams {
  schemeCode: number[] | null;
  selectedPeriod: string[] | null;
}

export const CHART_TYPES = [
  {
    days: 0,
    value: "absolute",
    label: "Absolute",
  },
  {
    days: 30,
    value: "rolling-30",
    label: "Rolling (30D)",
  },
  {
    days: 90,
    value: "rolling-90",
    label: "Rolling (3M)",
  },
  {
    days: 180,
    value: "rolling-180",
    label: "Rolling (6M)",
  },
  {
    days: 365,
    value: "rolling-365",
    label: "Rolling (1Y)",
  },
  {
    days: 1095,
    value: "rolling-1095",
    label: "Rolling (3Y)",
  },
  {
    days: 1825,
    value: "rolling-1825",
    label: "Rolling (5Y)",
  }
];