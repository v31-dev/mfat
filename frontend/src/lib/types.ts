import type { CalendarDate } from "@internationalized/date";

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
    this.start = start;
    this.end = end;
  }

  static getFromCalendarDate(start: CalendarDate, end: CalendarDate): Period {
    return new Period(
      new Date(start.year, start.month - 1, start.day),
      new Date(end.year, end.month - 1, end.day),
    );
  }

  static getFromSymbol(symbol: string): Period {
    const end = new Date();
    let start: Date;
    switch (symbol) {
      case "1M":
        start = new Date(end);
        start.setMonth(start.getMonth() - 1);
        return new Period(start, end);
      case "3M":
        start = new Date(end);
        start.setMonth(start.getMonth() - 3);
        return new Period(start, end);
      case "6M":
        start = new Date(end);
        start.setMonth(start.getMonth() - 6);
        return new Period(start, end);
      case "1Y":
        start = new Date(end);
        start.setFullYear(start.getFullYear() - 1);
        return new Period(start, end);
      case "3Y":
        start = new Date(end);
        start.setFullYear(start.getFullYear() - 3);
        return new Period(start, end);
      case "5Y":
        start = new Date(end);
        start.setFullYear(start.getFullYear() - 5);
        return new Period(start, end);
      default:
        throw new Error(`Unknown period symbol: ${symbol}`);
    }
  }

  // Format like 1 Jan 2020 - 31 Dec 2020
  toString(): string {
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const fmt = (d: Date) =>
      `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    return `${fmt(this.start)} - ${fmt(this.end)}`;
  }

  equals(other: Period): boolean {
    return this.toString() === other.toString();
  }

  startsBefore(other: Period): boolean {
    return this.start < other.start;
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
