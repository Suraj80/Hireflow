import { OfferStatus } from "@/features/offers/types";

export const offerStatusTone: Record<OfferStatus, string> = {
  Draft: "bg-slate-500/10 text-slate-700 border-slate-500/20",
  Sent: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  Accepted: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  Declined: "bg-red-500/10 text-red-700 border-red-500/20",
  Withdrawn: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  Expired: "bg-zinc-500/10 text-zinc-700 border-zinc-500/20",
};

export const formatOfferMoney = (amount: number | null, currency: string) =>
  amount === null ? "Not set" : `${currency} ${amount.toLocaleString()}`;

export const formatOfferDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString() : "Not set";

export const triggerBlobDownload = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = filename;
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
