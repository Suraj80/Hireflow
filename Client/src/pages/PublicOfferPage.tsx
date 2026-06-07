import { useEffect, useState } from "react";
import { CheckCircle, FileText, LoaderCircle, XCircle, Zap } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { offersApi } from "@/features/offers/api";
import { PublicOffer } from "@/features/offers/types";

export default function PublicOfferPage() {
  const { token = "" } = useParams();
  const [offer, setOffer] = useState<PublicOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [message, setMessage] = useState("");
  const [completed, setCompleted] = useState<{ status: string; candidateName: string; jobTitle: string } | null>(null);

  useEffect(() => {
    const loadOffer = async () => {
      try {
        setLoading(true);
        const response = await offersApi.getPublic(token);
        setOffer(response);
        setError(null);
      } catch (loadError) {
        const messageText =
          (loadError as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "This offer is unavailable";
        setError(messageText);
      } finally {
        setLoading(false);
      }
    };

    void loadOffer();
  }, [token]);

  const handleDecision = async (decision: "Accepted" | "Declined") => {
    if (!signatureName.trim()) {
      setError("Please enter your full name before responding.");
      return;
    }

    try {
      setWorking(true);
      setError(null);
      const response = await offersApi.respondPublic(token, {
        decision,
        signatureName: signatureName.trim(),
        message: message.trim(),
      });
      setCompleted({
        status: response.status,
        candidateName: response.candidateName,
        jobTitle: response.jobTitle,
      });
    } catch (decisionError) {
      const messageText =
        (decisionError as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (decisionError instanceof Error ? decisionError.message : "Unable to record your decision");
      setError(messageText);
    } finally {
      setWorking(false);
    }
  };

  if (completed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full border border-border animate-scale-in">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-xl font-bold mb-2">Offer Response Recorded</h2>
            <p className="text-muted-foreground text-sm mb-2">
              {completed.candidateName} has {completed.status.toLowerCase()} the offer for {completed.jobTitle}.
            </p>
            <Link to="/">
              <Button className="mt-4 w-full">Back to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="container flex h-14 items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-primary">
              <Zap className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-bold">HireFlow</span>
          </Link>
        </div>
      </nav>

      <div className="container max-w-4xl py-12">
        {loading ? (
          <Card className="border border-border">
            <CardContent className="flex items-center gap-3 p-8 text-muted-foreground">
              <LoaderCircle className="h-5 w-5 animate-spin" />
              Loading offer details...
            </CardContent>
          </Card>
        ) : error && !offer ? (
          <Card className="border border-border">
            <CardContent className="p-8">
              <h1 className="text-xl font-semibold">Offer unavailable</h1>
              <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        ) : !offer ? null : (
          <div className="space-y-6">
            <Card className="border border-border">
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{offer.department}</Badge>
                  <Badge variant="outline">Version {offer.version}</Badge>
                  <Badge variant="outline">{offer.status}</Badge>
                </div>
                <CardTitle className="mt-2 text-2xl">{offer.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-border/80 p-4">
                    <p className="text-sm text-muted-foreground">Candidate</p>
                    <p className="mt-1 font-medium">{offer.candidateName}</p>
                  </div>
                  <div className="rounded-2xl border border-border/80 p-4">
                    <p className="text-sm text-muted-foreground">Company</p>
                    <p className="mt-1 font-medium">{offer.companyName}</p>
                  </div>
                  <div className="rounded-2xl border border-border/80 p-4">
                    <p className="text-sm text-muted-foreground">Compensation</p>
                    <p className="mt-1 font-medium">
                      {offer.salaryAmount === null ? "Not listed" : `${offer.currency} ${offer.salaryAmount.toLocaleString()}`}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/80 p-4">
                    <p className="text-sm text-muted-foreground">Start / expires</p>
                    <p className="mt-1 font-medium">
                      {(offer.startDate && new Date(offer.startDate).toLocaleDateString()) || "Start date not set"} |{" "}
                      {(offer.expiresAt && new Date(offer.expiresAt).toLocaleDateString()) || "No expiry"}
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl border border-border/80 p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">Offer letter</p>
                  </div>
                  <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: offer.letterHtml }} />
                </div>
              </CardContent>
            </Card>

            {offer.status === "Sent" ? (
              <Card className="border border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Respond to this offer</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="signature">Full name</Label>
                    <Input id="signature" className="mt-1.5" value={signatureName} onChange={(event) => setSignatureName(event.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="message">Message</Label>
                    <Textarea id="message" className="mt-1.5 min-h-[120px]" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Optional note for the hiring team" />
                  </div>
                  {error ? <p className="text-sm text-destructive">{error}</p> : null}
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button className="flex-1" disabled={working} onClick={() => void handleDecision("Accepted")}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Accept offer
                    </Button>
                    <Button variant="outline" className="flex-1" disabled={working} onClick={() => void handleDecision("Declined")}>
                      <XCircle className="mr-2 h-4 w-4" />
                      Decline offer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border border-border">
                <CardContent className="p-8">
                  <p className="font-medium">This offer is currently {offer.status.toLowerCase()}.</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    If you expected to respond here, please contact the recruiting team directly.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
