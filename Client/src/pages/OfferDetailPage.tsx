import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Copy,
  Download,
  LoaderCircle,
  MailCheck,
  Pencil,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { offersApi } from "@/features/offers/api";
import {
  formatOfferDate,
  formatOfferMoney,
  offerStatusTone,
  triggerBlobDownload,
} from "@/features/offers/helpers";
import { Offer, OfferStatus } from "@/features/offers/types";

function LoadingState() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 rounded-[28px]" />
      <Skeleton className="h-[640px] rounded-[28px]" />
    </div>
  );
}

export default function OfferDetailPage() {
  const { offerId = "" } = useParams();
  const navigate = useNavigate();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const loadOffer = async () => {
    try {
      setLoading(true);
      const response = await offersApi.getById(offerId);
      setOffer(response);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load offer");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOffer();
  }, [offerId]);

  const handleCopyLink = async () => {
    if (!offer) {
      return;
    }

    try {
      await navigator.clipboard.writeText(offer.shareUrl);
      toast.success("Offer link copied");
    } catch (_error) {
      toast.error("Unable to copy offer link");
    }
  };

  const handleDownloadPdf = async () => {
    if (!offer) {
      return;
    }

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

  const handleSendOffer = async () => {
    if (!offer) {
      return;
    }

    try {
      setWorking(true);
      const updatedOffer = await offersApi.send(offer.id);
      setOffer(updatedOffer);
      toast.success("Offer marked as sent");
    } catch (sendError) {
      const message =
        (sendError as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (sendError instanceof Error ? sendError.message : "Unable to send offer");
      toast.error(message);
    } finally {
      setWorking(false);
    }
  };

  const handleUpdateStatus = async (status: OfferStatus) => {
    if (!offer) {
      return;
    }

    try {
      setWorking(true);
      const updatedOffer = await offersApi.updateStatus(offer.id, status);
      setOffer(updatedOffer);
      toast.success(`Offer marked ${status.toLowerCase()}`);
    } catch (statusError) {
      const message =
        (statusError as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (statusError instanceof Error ? statusError.message : "Unable to update offer");
      toast.error(message);
    } finally {
      setWorking(false);
    }
  };

  const handleDelete = async () => {
    if (!offer) {
      return;
    }

    if (!window.confirm(`Delete the offer for ${offer.candidate?.name || "this candidate"}?`)) {
      return;
    }

    try {
      setWorking(true);
      await offersApi.remove(offer.id);
      toast.success("Offer deleted");
      navigate("/offers");
    } catch (deleteError) {
      const message =
        (deleteError as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (deleteError instanceof Error ? deleteError.message : "Unable to delete offer");
      toast.error(message);
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  if (error || !offer) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <Link to="/offers">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Offer Details</h1>
            <p className="mt-1 text-muted-foreground">Review the full offer from a dedicated page.</p>
          </div>
        </div>

        <Alert variant="destructive" className="rounded-[28px]">
          <AlertTitle>Unable to load offer</AlertTitle>
          <AlertDescription>{error || "Offer not found"}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <Link to="/offers">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{offer.candidate?.name || "Offer Details"}</h1>
            <p className="mt-1 text-muted-foreground">
              Review offer status, letter content, version history, and candidate decision details.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-2xl" onClick={() => navigate("/offers")}>
            Back
          </Button>
          <Button variant="outline" className="rounded-2xl" onClick={() => navigate(`/offers/${offer.id}/edit`)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-[28px] border border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>Offer Letter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: offer.letterHtml }} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-[28px] border border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle>Status and Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge variant="outline" className={`rounded-full border ${offerStatusTone[offer.status]}`}>
                {offer.status}
              </Badge>
              <p className="text-sm"><strong>Candidate:</strong> {offer.candidate?.name || "Candidate"}</p>
              <p className="text-sm"><strong>Role:</strong> {offer.title}</p>
              <p className="text-sm"><strong>Job:</strong> {offer.job?.title || "No job linked"}</p>
              <p className="text-sm"><strong>Department:</strong> {offer.job?.department || "Not set"}</p>
              <p className="text-sm"><strong>Compensation:</strong> {formatOfferMoney(offer.salaryAmount, offer.currency)}</p>
              <p className="text-sm"><strong>Bonus:</strong> {formatOfferMoney(offer.bonusAmount, offer.currency)}</p>
              <p className="text-sm"><strong>Equity:</strong> {offer.equity || "Not set"}</p>
              <p className="text-sm"><strong>Start:</strong> {formatOfferDate(offer.startDate)}</p>
              <p className="text-sm"><strong>Expires:</strong> {formatOfferDate(offer.expiresAt)}</p>
              <p className="text-sm"><strong>Version:</strong> v{offer.version}</p>
              <p className="text-sm"><strong>Share link:</strong> <span className="break-all text-muted-foreground">{offer.shareUrl}</span></p>
              {offer.decisionName ? (
                <p className="text-sm"><strong>Decision by:</strong> {offer.decisionName}</p>
              ) : null}
              {offer.decisionMessage ? (
                <p className="text-sm"><strong>Decision note:</strong> {offer.decisionMessage}</p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="outline" className="rounded-2xl" onClick={() => void handleCopyLink()}>
                <Copy className="mr-2 h-4 w-4" />
                Copy link
              </Button>
              <Button variant="outline" className="rounded-2xl" disabled={working} onClick={() => void handleDownloadPdf()}>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
              {offer.status === "Draft" ? (
                <Button className="rounded-2xl" disabled={working} onClick={() => void handleSendOffer()}>
                  <MailCheck className="mr-2 h-4 w-4" />
                  Mark sent
                </Button>
              ) : null}
              {offer.status === "Sent" ? (
                <>
                  <Button variant="outline" className="rounded-2xl" disabled={working} onClick={() => void handleUpdateStatus("Accepted")}>
                    Accept
                  </Button>
                  <Button variant="outline" className="rounded-2xl" disabled={working} onClick={() => void handleUpdateStatus("Declined")}>
                    Decline
                  </Button>
                  <Button variant="outline" className="rounded-2xl" disabled={working} onClick={() => void handleUpdateStatus("Withdrawn")}>
                    <XCircle className="mr-2 h-4 w-4" />
                    Withdraw
                  </Button>
                </>
              ) : null}
              <Button variant="outline" className="rounded-2xl text-destructive" disabled={working} onClick={() => void handleDelete()}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="rounded-[28px] border border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle>Version History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {offer.versions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No amendments recorded yet.</p>
          ) : (
            offer.versions.map((version) => (
              <div key={`${version.version}-${version.changedAt}`} className="rounded-[18px] border border-border/80 p-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-medium">Version {version.version}</p>
                  <p className="text-xs text-muted-foreground">{new Date(version.changedAt).toLocaleString()}</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {version.changedBy?.name || "Unknown"} | {formatOfferMoney(version.salaryAmount, version.currency)}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
