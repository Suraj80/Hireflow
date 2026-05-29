import { format, formatDistanceToNow } from "date-fns";

export const formatDashboardDate = (value?: string | null, fallback = "No date") => {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return format(date, "MMM d, yyyy");
};

export const formatDashboardDateTime = (value?: string | null, fallback = "No date scheduled") => {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return format(date, "MMM d, yyyy h:mm a");
};

export const formatDashboardRelative = (value?: string | null, fallback = "just now") => {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return formatDistanceToNow(date, { addSuffix: true });
};

export const formatDashboardNumber = (value: number) => new Intl.NumberFormat().format(value);
