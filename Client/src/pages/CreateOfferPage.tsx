import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { offersApi } from "@/features/offers/api";
import { Offer, OfferFormValues, OfferMetaResponse } from "@/features/offers/types";
import { settingsApi } from "@/features/settings/api";

const currencyOptions = ["USD", "INR", "EUR", "GBP", "AED", "SGD", "AUD", "CAD"];

const defaultForm: OfferFormValues = {
  candidateId: "",
  title: "",
  salaryAmount: "",
  bonusAmount: "",
  equity: "",
  currency: "USD",
  startDate: "",
  expiresAt: "",
  letterHtml: "",
  notes: "",
};

const defaultMeta: OfferMetaResponse = {
  candidates: [],
  statuses: ["Draft", "Sent", "Accepted", "Declined", "Withdrawn", "Expired"],
};

const toFormValues = (offer: Offer): OfferFormValues => ({
  candidateId: offer.candidate?.id || "",
  title: offer.title,
  salaryAmount: offer.salaryAmount === null ? "" : String(offer.salaryAmount),
  bonusAmount: offer.bonusAmount === null ? "" : String(offer.bonusAmount),
  equity: offer.equity,
  currency: offer.currency,
  startDate: offer.startDate ? new Date(offer.startDate).toISOString().slice(0, 10) : "",
  expiresAt: offer.expiresAt ? new Date(offer.expiresAt).toISOString().slice(0, 10) : "",
  letterHtml: offer.letterHtml,
  notes: offer.notes,
});

export default function CreateOfferPage() {
  const { offerId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [meta, setMeta] = useState<OfferMetaResponse>(defaultMeta);
  const [form, setForm] = useState<OfferFormValues>({
    ...defaultForm,
    candidateId: searchParams.get("candidateId") || "",
  });
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [workspaceCurrency, setWorkspaceCurrency] = useState(defaultForm.currency);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [metaResponse, offerResponse, workspaceResponse] = await Promise.all([
          offersApi.meta(),
          offerId ? offersApi.getById(offerId) : Promise.resolve(null),
          settingsApi.getWorkspace().catch(() => null),
        ]);

        setMeta(metaResponse);
        const nextWorkspaceCurrency = workspaceResponse?.defaultCurrency || defaultForm.currency;
        setWorkspaceCurrency(nextWorkspaceCurrency);

        if (offerResponse) {
          setOffer(offerResponse);
          setForm(toFormValues(offerResponse));
        } else if (searchParams.get("candidateId")) {
          setForm((current) => ({
            ...current,
            candidateId: searchParams.get("candidateId") || "",
            currency: current.currency === defaultForm.currency ? nextWorkspaceCurrency : current.currency,
          }));
        } else {
          setForm((current) => ({
            ...current,
            currency: current.currency === defaultForm.currency ? nextWorkspaceCurrency : current.currency,
          }));
        }

        setError(null);
      } catch (loadError) {
        const message =
          (loadError as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          (loadError instanceof Error ? loadError.message : "Unable to load offer form");
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [offerId, searchParams]);

  const candidateOptions = useMemo(
    () => meta.candidates.filter((candidate) => candidate.job),
    [meta.candidates]
  );

  const selectedCandidate = useMemo(
    () => candidateOptions.find((candidate) => candidate.id === form.candidateId) || null,
    [candidateOptions, form.candidateId]
  );

  const handleCandidateSelect = (candidateId: string) => {
    const candidate = candidateOptions.find((entry) => entry.id === candidateId) || null;
    setForm((current) => ({
      ...current,
      candidateId,
      title: current.title || candidate?.job?.title || "",
      currency: current.currency === defaultForm.currency ? workspaceCurrency : current.currency,
    }));
  };

  const handleSave = async () => {
    if (!form.candidateId || !form.title.trim()) {
      toast.error("Candidate and offer title are required");
      return;
    }

    try {
      setWorking(true);
      if (offerId) {
        await offersApi.update(offerId, form);
        toast.success("Offer updated");
      } else {
        await offersApi.create(form);
        toast.success("Offer created");
      }
      navigate("/offers");
    } catch (saveError) {
      const message =
        (saveError as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (saveError instanceof Error ? saveError.message : "Unable to save offer");
      toast.error(message);
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/offers">
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{offerId ? "Edit offer" : "Create offer"}</h1>
          <p className="mt-1 text-muted-foreground">
            {offerId
              ? "Update terms, expiry, and letter content without cramming the workflow into a modal."
              : "Draft offer terms, expiry, and candidate-facing content in a full-page editor."}
          </p>
        </div>
      </div>

      {loading ? (
        <Card className="rounded-[28px] border border-border/80 shadow-sm">
          <CardContent className="flex items-center gap-3 p-10 text-muted-foreground">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            Loading offer workspace...
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="rounded-[28px] border border-destructive/20 shadow-sm">
          <CardContent className="p-10">
            <p className="font-medium text-destructive">Unable to load this offer form</p>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="rounded-[28px] border border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle>Offer terms</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Candidate</Label>
                <Select value={form.candidateId} onValueChange={handleCandidateSelect} disabled={Boolean(offerId)}>
                  <SelectTrigger className="h-11 rounded-2xl">
                    <SelectValue placeholder="Select candidate" />
                  </SelectTrigger>
                  <SelectContent>
                    {candidateOptions.map((candidate) => (
                      <SelectItem key={candidate.id} value={candidate.id}>
                        {candidate.name} {candidate.job ? `| ${candidate.job.title}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Offer title</Label>
                <Input
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  className="h-11 rounded-2xl"
                  placeholder="Senior Product Designer"
                />
              </div>
              <div className="space-y-2">
                <Label>Base salary</Label>
                <Input
                  value={form.salaryAmount}
                  onChange={(event) => setForm((current) => ({ ...current, salaryAmount: event.target.value }))}
                  className="h-11 rounded-2xl"
                  placeholder="120000"
                />
              </div>
              <div className="space-y-2">
                <Label>Bonus</Label>
                <Input
                  value={form.bonusAmount}
                  onChange={(event) => setForm((current) => ({ ...current, bonusAmount: event.target.value }))}
                  className="h-11 rounded-2xl"
                  placeholder="10000"
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select
                  value={form.currency}
                  onValueChange={(value) => setForm((current) => ({ ...current, currency: value }))}
                >
                  <SelectTrigger className="h-11 rounded-2xl">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencyOptions.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Currency defaults to the workspace setting{workspaceCurrency ? ` (${workspaceCurrency})` : ""}.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Equity</Label>
                <Input
                  value={form.equity}
                  onChange={(event) => setForm((current) => ({ ...current, equity: event.target.value }))}
                  className="h-11 rounded-2xl"
                  placeholder="0.10%"
                />
              </div>
              <div className="space-y-2">
                <Label>Start date</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
                  className="h-11 rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Expires on</Label>
                <Input
                  type="date"
                  value={form.expiresAt}
                  onChange={(event) => setForm((current) => ({ ...current, expiresAt: event.target.value }))}
                  className="h-11 rounded-2xl"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Offer notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  className="rounded-2xl min-h-[140px]"
                  placeholder="Internal negotiation context, approver notes, or amendment guidance"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle>Candidate context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[22px] border border-border/80 p-4">
                <p className="text-sm text-muted-foreground">Candidate</p>
                <p className="mt-1 font-medium">{selectedCandidate?.name || "Select a candidate"}</p>
                <p className="mt-2 text-sm text-muted-foreground">Stage</p>
                <p className="mt-1 font-medium">{selectedCandidate?.stage || "Not set"}</p>
              </div>
              <div className="rounded-[22px] border border-border/80 p-4">
                <p className="text-sm text-muted-foreground">Job</p>
                <p className="mt-1 font-medium">{selectedCandidate?.job?.title || "No linked job"}</p>
                <p className="mt-2 text-sm text-muted-foreground">Department</p>
                <p className="mt-1 font-medium">{selectedCandidate?.job?.department || "Not set"}</p>
              </div>
              <div className="rounded-[22px] border border-border/80 p-4">
                <p className="text-sm text-muted-foreground">Recruiter</p>
                <p className="mt-1 font-medium">{selectedCandidate?.recruiterAssigned?.name || "Unassigned"}</p>
                <p className="mt-2 text-sm text-muted-foreground">Email</p>
                <p className="mt-1 font-medium break-all">{selectedCandidate?.email || "Not available"}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border border-border/80 shadow-sm xl:col-span-2">
            <CardHeader>
              <CardTitle>Offer letter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={form.letterHtml}
                onChange={(event) => setForm((current) => ({ ...current, letterHtml: event.target.value }))}
                className="rounded-2xl min-h-[360px] font-mono text-sm"
                placeholder="<p>Dear candidate...</p>"
              />
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="ghost" className="rounded-2xl" onClick={() => navigate("/offers")}>
                  Cancel
                </Button>
                <Button className="rounded-2xl" disabled={working} onClick={() => void handleSave()}>
                  {offerId ? "Save changes" : "Create offer"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
