import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Download, Eye, FileText, MailCheck, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { formatOfferDate, formatOfferMoney, offerStatusTone, triggerBlobDownload } from "@/features/offers/helpers";
import { Offer, OfferMetaResponse, OfferStatus } from "@/features/offers/types";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

const defaultMeta: OfferMetaResponse = {
  candidates: [],
  statuses: ["Draft", "Sent", "Accepted", "Declined", "Withdrawn", "Expired"],
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
      await offersApi.send(offer.id);
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
      await offersApi.updateStatus(offer.id, status);
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
                      <Badge variant="outline" className={`rounded-full border ${offerStatusTone[offer.status]}`}>
                        {offer.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatOfferMoney(offer.salaryAmount, offer.currency)}</TableCell>
                    <TableCell>{formatOfferDate(offer.startDate)}</TableCell>
                    <TableCell>{formatOfferDate(offer.expiresAt)}</TableCell>
                    <TableCell>v{offer.version}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 rounded-2xl"
                          onClick={() => navigate(`/offers/view/${offer.id}`)}
                          aria-label={`View offer for ${offer.candidate?.name || "candidate"}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-9 w-9 rounded-2xl" onClick={() => navigate(`/offers/${offer.id}/edit`)} aria-label={`Edit offer for ${offer.candidate?.name || "candidate"}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-9 w-9 rounded-2xl" onClick={() => void handleDownloadPdf(offer)} aria-label={`Download PDF for ${offer.candidate?.name || "candidate"}`}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-9 w-9 rounded-2xl" onClick={() => void handleCopyLink(offer)} aria-label={`Copy offer link for ${offer.candidate?.name || "candidate"}`}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        {offer.status === "Draft" && (
                          <Button variant="outline" size="icon" className="h-9 w-9 rounded-2xl" onClick={() => void handleSendOffer(offer)} aria-label={`Mark offer as sent for ${offer.candidate?.name || "candidate"}`}>
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
    </div>
  );
}
