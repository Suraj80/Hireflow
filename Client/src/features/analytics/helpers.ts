import { format } from "date-fns";

export const analyticsChartColors = [
  "hsl(215 90% 52%)",
  "hsl(200 90% 45%)",
  "hsl(262 83% 58%)",
  "hsl(43 96% 56%)",
  "hsl(142 71% 45%)",
  "hsl(355 78% 56%)",
];

export const formatNumber = (value: number) => new Intl.NumberFormat().format(value);

export const formatPercent = (value: number) => `${value.toFixed(1)}%`;

export const formatCompact = (value: number) =>
  new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(value);

export const formatInterviewDate = (value: string) => format(new Date(value), "MMM d, yyyy h:mm a");

export const getEmptyChartMessage = (count: number, message: string) => (count > 0 ? null : message);
