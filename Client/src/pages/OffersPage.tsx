import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Download, Eye, FileText, LoaderCircle, MailCheck, Pencil, Plus, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { offersApi } from "@/features/offers/api";
import { Offer, OfferMetaResponse, OfferStatus } from "@/features/offers/types";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

const defaultMeta: OfferMetaResponse = {
  candidates: [],
  statuses: ["Draft", "Sent", "Accepted", "Declined", "Withdrawn", "Expired"],
};

const statusTone: Record<OfferStatus, string> = {
  Draft: "bg-slate-500/10 text-slate-700 border-slate-500/20",
  Sent: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  Accepted: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  Declined: "bg-red-500/10 text-red-700 border-red-500/20",
  Withdrawn: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  Expired: "bg-zinc-500/10 text-zinc-700 border-zinc-500/20",
};

const formatMoney = (amount: number | null, currency: string) =>
  amount === null ? "Not set" : `${currency} ${amount.toLocaleString()}`;

const formatDate = (value: string | null) => (value ? new Date(value).toLocaleDateString() : "Not set");

const triggerBlobDownload = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = filename;
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

function LoadingState() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-20 rounded-[28px]" />
      <Skeleton className="h-[520px] rounded-[28px]" />
    </div>
  );
}

export default function OffersPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Offer[]>([]);
  const [meta, setMeta] = useState<OfferMetaResponse>(defaultMeta);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 1500);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10 as 10 | 25 | 50 | 100, total: 0, totalPages: 1 });
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [working, setWorking] = useState(false);

  const loadPageData = async () => {
    try {
      setLoading(true);
      const [listResponse, metaResponse] = await Promise.all([
        offersApi.list({
          page,
          limit: pagination.limit,
          status: statusFilter,
          search: debouncedSearch,
        }),
        offersApi.meta(),
      ]);

      setItems(listResponse.items);
      setPagination(listResponse.pagination);
      setMeta(metaResponse);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load offers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPageData();
  }, [debouncedSearch, page, pagination.limit, statusFilter]);

  const handleCopyLink = async (offer: Offer) => {
    try {
      await navigator.clipboard.writeText(offer.shareUrl);
      toast.success("Offer link copied");
    } catch (_error) {
      toast.error("Unable to copy offer link");
    }
  };

  const handleSendOffer = async (offer: Offer) => {
    try {
      setWorking(true);
      const updatedOffer = await offersApi.send(offer.id);
      setSelectedOffer(updatedOffer);
      toast.success("Offer marked as sent");
      await loadPageData();
    } catch (sendError) {
      const message =
        (sendError as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (sendError instanceof Error ? sendError.message : "Unable to send offer");
      toast.error(message);
    } finally {
      setWorking(false);
    }
  };

  const handleUpdateStatus = async (offer: Offer, status: OfferStatus) => {
    try {
      setWorking(true);
      const updatedOffer = await offersApi.updateStatus(offer.id, status);
      setSelectedOffer(updatedOffer);
      toast.success(`Offer marked ${status.toLowerCase()}`);
      await loadPageData();
    } catch (statusError) {
      const message =
        (statusError as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (statusError instanceof Error ? statusError.message : "Unable to update offer");
      toast.error(message);
    } finally {
      setWorking(false);
    }
  };

  const handleDelete = async (offer: Offer) => {
    if (!window.confirm(`Delete the offer for ${offer.candidate?.name || "this candidate"}?`)) {
      return;
    }

    try {
      setWorking(true);
      await offersApi.remove(offer.id);
      toast.success("Offer deleted");
      setDetailsOpen(false);
      await loadPageData();
    } catch (deleteError) {
      const message =
        (deleteError as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (deleteError instanceof Error ? deleteError.message : "Unable to delete offer");
      toast.error(message);
    } finally {
      setWorking(false);
    }
  };

  const handleDownloadPdf = async (offer: Offer) => {
    try {
      setWorking(true);
      const blob = await offersApi.downloadPdf(offer.id);
      const fileName = `${(offer.candidate?.name || "candidate").replace(/\s+/g, "-").toLowerCase()}-offer-v${offer.version}.pdf`;
      triggerBlobDownload(blob, fileName);
      toast.success("Offer PDF downloaded");
    } catch (downloadError) {
      const message =
        (downloadError as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (downloadError instanceof Error ? downloadError.message : "Unable to download offer PDF");
      toast.error(message);
    } finally {
      setWorking(false);
    }
  };

  const openDetails = async (offerId: string) => {
    try {
      setWorking(true);
      const detail = await offersApi.getById(offerId);
      setSelectedOffer(detail);
      setDetailsOpen(true);
    } catch (detailError) {
      const message =
        (detailError as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (detailError instanceof Error ? detailError.message : "Unable to load offer");
      toast.error(message);
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Offers</h1>
          <p className="text-muted-foreground">
            Create, version, send, and track candidate offers from one operational workspace.
          </p>
        </div>
        <Button className="h-11 rounded-2xl" onClick={() => navigate("/offers/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Create offer
        </Button>
      </div>

      <Card className="rounded-[28px] border border-border/80 shadow-sm">
        <CardContent className="grid gap-3 p-5 md:grid-cols-[minmax(0,1fr)_220px]">
          <Input
            value={searchInput}
            onChange={(event) => {
              setPage(1);
              setSearchInput(event.target.value);
            }}
            placeholder="Search by candidate, role, or job"
            autoComplete="off"
            className="h-11 rounded-2xl"
          />
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setPage(1);
              setStatusFilter(value);
            }}
          >
            <SelectTrigger className="h-11 rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {meta.statuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="destructive" className="rounded-[28px]">
          <AlertTitle>Unable to load offers</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : items.length === 0 ? (
        <Card className="rounded-[28px] border border-dashed border-border/80 bg-card/70">
          <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h2 className="mt-5 text-xl font-semibold">No offers in this view</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Start with a candidate in late-stage review, then generate the first draft offer from here.
            </p>
            <Button className="mt-6 h-11 rounded-2xl" onClick={() => navigate("/offers/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Create offer
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-[28px] border border-border/80 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Compensation</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((offer) => (
                  <TableRow key={offer.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{offer.candidate?.name || "Candidate"}</p>
                        <p className="text-xs text-muted-foreground">{offer.job?.title || "No job linked"}</p>
                      </div>
                    </TableCell>
                    <TableCell>{offer.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`rounded-full border ${statusTone[offer.status]}`}>
                        {offer.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatMoney(offer.salaryAmount, offer.currency)}</TableCell>
                    <TableCell>{formatDate(offer.startDate)}</TableCell>
                    <TableCell>{formatDate(offer.expiresAt)}</TableCell>
                    <TableCell>v{offer.version}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="icon" className="h-9 w-9 rounded-2xl" onClick={() => void openDetails(offer.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-9 w-9 rounded-2xl" onClick={() => navigate(`/offers/${offer.id}/edit`)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-9 w-9 rounded-2xl" onClick={() => void handleDownloadPdf(offer)}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-9 w-9 rounded-2xl" onClick={() => void handleCopyLink(offer)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        {offer.status === "Draft" && (
                          <Button variant="outline" size="icon" className="h-9 w-9 rounded-2xl" onClick={() => void handleSendOffer(offer)}>
                            <MailCheck className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {items.length > 0 && (
        <div className="flex flex-col gap-3 rounded-[28px] border border-border/80 bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages} | {pagination.total} total offers
          </p>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-2xl" disabled={pagination.page <= 1} onClick={() => setPage(pagination.page - 1)}>
              Previous
            </Button>
            <Button variant="outline" className="rounded-2xl" disabled={pagination.page >= pagination.totalPages} onClick={() => setPage(pagination.page + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-5xl rounded-[28px]">
          <DialogHeader>
            <DialogTitle>{selectedOffer?.candidate?.name || "Offer details"}</DialogTitle>
            <DialogDescription>
              Review offer status, copy the share link, and track versions or candidate decisions.
            </DialogDescription>
          </DialogHeader>
          {selectedOffer ? (
            <div className="space-y-6">
              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <Card className="rounded-[24px] border border-border/80 shadow-none">
                  <CardHeader>
                    <CardTitle>Letter preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: selectedOffer.letterHtml }} />
                  </CardContent>
                </Card>
                <div className="space-y-4">
                  <Card className="rounded-[24px] border border-border/80 shadow-none">
                    <CardHeader>
                      <CardTitle>Status and terms</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Badge variant="outline" className={`rounded-full border ${statusTone[selectedOffer.status]}`}>
                        {selectedOffer.status}
                      </Badge>
                      <p className="text-sm"><strong>Role:</strong> {selectedOffer.title}</p>
                      <p className="text-sm"><strong>Compensation:</strong> {formatMoney(selectedOffer.salaryAmount, selectedOffer.currency)}</p>
                      <p className="text-sm"><strong>Bonus:</strong> {formatMoney(selectedOffer.bonusAmount, selectedOffer.currency)}</p>
                      <p className="text-sm"><strong>Equity:</strong> {selectedOffer.equity || "Not set"}</p>
                      <p className="text-sm"><strong>Start:</strong> {formatDate(selectedOffer.startDate)}</p>
                      <p className="text-sm"><strong>Expires:</strong> {formatDate(selectedOffer.expiresAt)}</p>
                      <p className="text-sm"><strong>Version:</strong> v{selectedOffer.version}</p>
                      <p className="text-sm"><strong>Share link:</strong> <span className="break-all text-muted-foreground">{selectedOffer.shareUrl}</span></p>
                    </CardContent>
                  </Card>

                  <Card className="rounded-[24px] border border-border/80 shadow-none">
                    <CardHeader>
                      <CardTitle>Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                      <Button variant="outline" className="rounded-2xl" onClick={() => void handleCopyLink(selectedOffer)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy link
                      </Button>
                      <Button variant="outline" className="rounded-2xl" disabled={working} onClick={() => void handleDownloadPdf(selectedOffer)}>
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                      </Button>
                      {selectedOffer.status === "Draft" && (
                        <Button className="rounded-2xl" disabled={working} onClick={() => void handleSendOffer(selectedOffer)}>
                          <MailCheck className="mr-2 h-4 w-4" />
                          Mark sent
                        </Button>
                      )}
                      {selectedOffer.status === "Sent" && (
                        <>
                          <Button variant="outline" className="rounded-2xl" disabled={working} onClick={() => void handleUpdateStatus(selectedOffer, "Accepted")}>
                            Accept
                          </Button>
                          <Button variant="outline" className="rounded-2xl" disabled={working} onClick={() => void handleUpdateStatus(selectedOffer, "Declined")}>
                            Decline
                          </Button>
                          <Button variant="outline" className="rounded-2xl" disabled={working} onClick={() => void handleUpdateStatus(selectedOffer, "Withdrawn")}>
                            <XCircle className="mr-2 h-4 w-4" />
                            Withdraw
                          </Button>
                        </>
                      )}
                      <Button variant="outline" className="rounded-2xl" onClick={() => { setDetailsOpen(false); navigate(`/offers/${selectedOffer.id}/edit`); }}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button variant="outline" className="rounded-2xl text-destructive" disabled={working} onClick={() => void handleDelete(selectedOffer)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <Card className="rounded-[24px] border border-border/80 shadow-none">
                <CardHeader>
                  <CardTitle>Version history</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedOffer.versions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No amendments recorded yet.</p>
                  ) : (
                    selectedOffer.versions.map((version) => (
                      <div key={`${version.version}-${version.changedAt}`} className="rounded-[18px] border border-border/80 p-4">
                        <div className="flex items-center justify-between gap-4">
                          <p className="font-medium">Version {version.version}</p>
                          <p className="text-xs text-muted-foreground">{new Date(version.changedAt).toLocaleString()}</p>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {version.changedBy?.name || "Unknown"} | {formatMoney(version.salaryAmount, version.currency)}
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
